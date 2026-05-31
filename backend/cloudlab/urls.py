"""CloudLab — Root URL Configuration."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({"status": "ok", "service": "cloudlab-api"})


urlpatterns = [
    # Health check
    path("health/", health_check, name="health-check"),

    # Django Admin
    path("django-admin/", admin.site.urls),

    # Prometheus metrics
    path("", include("django_prometheus.urls")),

    # API v1
    path("api/v1/", include("cloudlab.api.v1.urls")),

    # Social Auth
    path("social-auth/", include("social_django.urls", namespace="social")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

    # Debug toolbar
    try:
        import debug_toolbar
        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
