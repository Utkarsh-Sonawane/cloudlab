"""Playground app — URL routing."""

from django.urls import path

from .views import get_playground_status, get_session_status, start_playground, stop_playground

urlpatterns = [
    path("start/", start_playground, name="playground-start"),
    path("status/", get_playground_status, name="playground-current-status"),
    path("<uuid:session_id>/stop/", stop_playground, name="playground-stop"),
    path("<uuid:session_id>/status/", get_session_status, name="playground-session-status"),
]
