"""
Request logging middleware.
Logs method, path, status code, response time, and user for every request.
"""

import logging
import time

logger = logging.getLogger("cloudlab.requests")


class RequestLoggingMiddleware:
    """Log all incoming requests with timing and user information."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.monotonic()

        response = self.get_response(request)

        duration_ms = (time.monotonic() - start_time) * 1000
        user = getattr(request, "user", None)
        user_id = str(user.id) if user and user.is_authenticated else "anonymous"

        logger.info(
            "%s %s %s %.2fms user=%s",
            request.method,
            request.get_full_path(),
            response.status_code,
            duration_ms,
            user_id,
        )

        # Add timing header
        response["X-Response-Time-Ms"] = f"{duration_ms:.2f}"
        return response
