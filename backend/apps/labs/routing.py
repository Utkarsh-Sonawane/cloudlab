"""Labs app — WebSocket URL routing."""

from django.urls import re_path

from .consumers import LabTerminalConsumer

websocket_urlpatterns = [
    re_path(r"^ws/lab/(?P<session_id>[^/]+)/$", LabTerminalConsumer.as_asgi()),
]
