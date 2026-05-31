"""Development settings — DEBUG=True, relaxed security."""
from .base import *  # noqa: F401, F403

DEBUG = True

# Allow all hosts in dev
ALLOWED_HOSTS = ["*"]

# CORS — allow all origins in dev
CORS_ALLOW_ALL_ORIGINS = True

# Email — just print to console in dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Debug toolbar (optional)
try:
    import debug_toolbar  # noqa: F401

    INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
    MIDDLEWARE.insert(1, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa: F405
    INTERNAL_IPS = ["127.0.0.1", "::1"]
except ImportError:
    pass

# Disable HTTPS redirects in dev
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Disable Whitenoise compression in development
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

