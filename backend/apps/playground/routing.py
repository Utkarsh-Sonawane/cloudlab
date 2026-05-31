"""Playground WebSocket URL routing."""

from django.urls import re_path

from .consumers import PlaygroundTerminalConsumer

websocket_urlpatterns = [
    re_path(r"^ws/playground/(?P<session_id>[^/]+)/$", PlaygroundTerminalConsumer.as_asgi()),
]
