"""API v1 URL configuration — aggregates all app routers."""

from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # ── Auth ───────────────────────────────────────────────────────────────────
    path("auth/", include("apps.users.urls")),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # ── Labs ───────────────────────────────────────────────────────────────────
    path("labs/", include("apps.labs.urls")),

    # ── Courses ────────────────────────────────────────────────────────────────
    path("courses/", include("apps.courses.urls")),

    # ── Playground ─────────────────────────────────────────────────────────────
    path("playground/", include("apps.playground.urls")),

    # ── Users / Profiles ───────────────────────────────────────────────────────
    path("users/", include("apps.users.profile_urls")),
]
