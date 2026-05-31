"""Playground app models — Free-form sandbox sessions."""

import uuid

from django.conf import settings
from django.db import models


class PlaygroundSession(models.Model):
    """
    A free-form sandbox session — no tasks, just a terminal.
    Auto-expires after 4 hours.
    """

    class Status(models.TextChoices):
        PROVISIONING = "provisioning", "Provisioning"
        ACTIVE = "active", "Active"
        STOPPED = "stopped", "Stopped"
        EXPIRED = "expired", "Expired"

    class EnvironmentType(models.TextChoices):
        DOCKER = "docker", "Docker"
        KUBERNETES = "kubernetes", "Kubernetes"
        LINUX = "linux", "Linux"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="playground_sessions"
    )
    environment_type = models.CharField(
        max_length=20, choices=EnvironmentType.choices, default=EnvironmentType.LINUX
    )
    docker_image = models.CharField(max_length=200, default="ubuntu:22.04")
    container_id = models.CharField(max_length=200, blank=True)
    websocket_token = models.CharField(max_length=64, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROVISIONING)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "playground_sessions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Playground({self.user.username}, {self.environment_type}, {self.status})"
