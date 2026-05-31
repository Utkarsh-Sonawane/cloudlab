"""
Redis-backed rate limiting middleware for lab session starts.
Enforces per-user hourly limits based on subscription plan.
"""

import logging
import time

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger("cloudlab.rate_limit")

# Endpoints to rate-limit for lab starts
LAB_START_PATHS = ["/api/v1/labs/"]


class RateLimitMiddleware:
    """
    Rate limits lab start requests.
    Free users: LAB_START_RATE_FREE starts/hour
    Pro users: LAB_START_RATE_PRO starts/hour
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.free_limit = getattr(settings, "LAB_START_RATE_FREE", 5)
        self.pro_limit = getattr(settings, "LAB_START_RATE_PRO", 20)

    def __call__(self, request):
        # Only rate-limit POST to lab start endpoints
        if request.method == "POST" and self._is_lab_start(request.path):
            user = getattr(request, "user", None)
            if user and user.is_authenticated:
                result = self._check_rate_limit(user)
                if not result["allowed"]:
                    logger.warning(
                        "Rate limit exceeded for user %s (plan=%s)",
                        user.id,
                        user.plan,
                    )
                    return JsonResponse(
                        {
                            "success": False,
                            "message": f"Rate limit exceeded. Max {result['limit']} lab starts per hour.",
                            "data": None,
                            "errors": {"retry_after": result["retry_after"]},
                        },
                        status=429,
                    )

        return self.get_response(request)

    def _is_lab_start(self, path):
        return path.endswith("/start/") and any(p in path for p in LAB_START_PATHS)

    def _check_rate_limit(self, user):
        """Check and increment the user's hourly lab-start counter."""
        plan = getattr(user, "plan", "free")
        limit = self.pro_limit if plan in ("pro", "enterprise") else self.free_limit
        cache_key = f"rate_limit:lab_start:{user.id}"
        window = 3600  # 1 hour

        current = cache.get(cache_key, 0)
        if current >= limit:
            ttl = cache.ttl(cache_key) if hasattr(cache, "ttl") else window
            return {"allowed": False, "limit": limit, "retry_after": ttl}

        # Increment counter; set expiry only on first request in window
        pipe = getattr(cache.client, "pipeline", None)
        if pipe:
            # django-redis pipeline
            with cache.client.pipeline() as p:
                p.incr(cache_key)
                p.expire(cache_key, window)
                p.execute()
        else:
            new_val = current + 1
            cache.set(cache_key, new_val, timeout=window)

        return {"allowed": True, "limit": limit, "retry_after": 0}
