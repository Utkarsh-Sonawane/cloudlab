"""
CloudLab ASGI configuration.
Handles both HTTP requests (Django) and WebSocket connections (Channels).
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cloudlab.settings.development")

# Initialize Django ASGI application early to populate app registry.
django_asgi_app = get_asgi_application()

# Import WebSocket URL patterns AFTER Django is initialized
from apps.labs.routing import websocket_urlpatterns as lab_ws_patterns  # noqa: E402
from apps.playground.routing import websocket_urlpatterns as playground_ws_patterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            AuthMiddlewareStack(
                URLRouter(lab_ws_patterns + playground_ws_patterns)
            )
        ),
    }
)
