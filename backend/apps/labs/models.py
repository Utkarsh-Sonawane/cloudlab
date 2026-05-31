"""Labs app models — LabCategory, Lab, LabTask, LabSession, LabSessionTask, LabRating."""

import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class LabCategory(models.Model):
    """Top-level category grouping labs (Docker, Kubernetes, Git, etc.)."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, db_index=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Lucide icon name")
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#6366f1", help_text="Hex color for UI badge")
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "lab_categories"
        ordering = ["order", "name"]
        verbose_name_plural = "Lab Categories"

    def __str__(self):
        return self.name


class Lab(models.Model):
    """A structured hands-on lab with tasks and a container environment."""

    class Difficulty(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    class EnvironmentType(models.TextChoices):
        DOCKER = "docker", "Docker"
        KUBERNETES = "kubernetes", "Kubernetes"
        GIT = "git", "Git"
        LINUX = "linux", "Linux"
        TERRAFORM = "terraform", "Terraform"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, db_index=True, max_length=220)
    description = models.TextField(help_text="Supports Markdown")
    short_description = models.CharField(max_length=300, blank=True)
    thumbnail_url = models.URLField(blank=True)

    category = models.ForeignKey(LabCategory, on_delete=models.PROTECT, related_name="labs")
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.BEGINNER)
    duration_minutes = models.PositiveSmallIntegerField(default=30)

    environment_type = models.CharField(
        max_length=20, choices=EnvironmentType.choices, default=EnvironmentType.DOCKER
    )
    docker_image = models.CharField(
        max_length=200, default="ubuntu:22.04",
        help_text="Docker image used to provision the lab container"
    )
    k8s_manifest_template = models.JSONField(
        null=True, blank=True,
        help_text="Kubernetes manifest template for K8s labs (JSON)"
    )

    points_reward = models.PositiveIntegerField(default=100)
    is_free = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="labs_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Aggregated (updated by signals)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    total_completions = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "labs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.category.name}] {self.title}"


class LabTask(models.Model):
    """A single step/task inside a lab that the user must complete."""

    class ValidationType(models.TextChoices):
        SCRIPT = "script", "Bash Script"
        COMMAND_OUTPUT = "command_output", "Command Output Match"
        FILE_EXISTS = "file_exists", "File Exists"
        API_CHECK = "api_check", "HTTP API Check"

    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, related_name="tasks")
    order = models.PositiveSmallIntegerField(default=0)
    title = models.CharField(max_length=200)
    description = models.TextField(help_text="Instructions shown to user (Markdown)")
    hint = models.TextField(blank=True, help_text="Hint shown on request (Markdown)")

    validation_type = models.CharField(
        max_length=20, choices=ValidationType.choices, default=ValidationType.SCRIPT
    )
    validation_script = models.TextField(
        blank=True,
        help_text="Bash script run inside container to validate. Must echo PASS/FAIL and exit 0/1."
    )
    expected_output = models.CharField(
        max_length=500, blank=True,
        help_text="String, regex pattern, or JSON for output comparison"
    )
    points = models.PositiveSmallIntegerField(default=20)

    class Meta:
        db_table = "lab_tasks"
        ordering = ["lab", "order"]
        unique_together = ("lab", "order")

    def __str__(self):
        return f"{self.lab.title} — Task {self.order}: {self.title}"


class LabSession(models.Model):
    """An active or completed user session for a specific lab."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROVISIONING = "provisioning", "Provisioning"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lab_sessions"
    )
    lab = models.ForeignKey(Lab, on_delete=models.PROTECT, related_name="sessions")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Container info (set after provisioning)
    container_id = models.CharField(max_length=200, blank=True)
    container_host = models.CharField(max_length=200, blank=True)
    container_port = models.PositiveIntegerField(null=True, blank=True)

    # WebSocket auth token (single-use, expires with session)
    websocket_token = models.CharField(max_length=64, unique=True, blank=True)

    current_task_index = models.PositiveSmallIntegerField(default=0)

    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "lab_sessions"
        ordering = ["-started_at"]

    def __str__(self):
        return f"Session({self.user.username}, {self.lab.slug}, {self.status})"

    @property
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

    def save(self, *args, **kwargs):
        # Auto-set expires_at based on lab duration
        if not self.expires_at and self.lab_id:
            try:
                duration = self.lab.duration_minutes
                self.expires_at = timezone.now() + timezone.timedelta(minutes=duration)
            except Exception:
                pass
        super().save(*args, **kwargs)


class LabSessionTask(models.Model):
    """Tracks completion of each task within a lab session."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"

    session = models.ForeignKey(LabSession, on_delete=models.CASCADE, related_name="session_tasks")
    task = models.ForeignKey(LabTask, on_delete=models.CASCADE, related_name="session_tasks")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    completed_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "lab_session_tasks"
        unique_together = ("session", "task")
        ordering = ["task__order"]

    def __str__(self):
        return f"SessionTask({self.session_id}, task={self.task.order}, {self.status})"


class LabRating(models.Model):
    """User rating and optional review for a lab."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lab_ratings"
    )
    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, related_name="ratings")
    rating = models.SmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "lab_ratings"
        unique_together = ("user", "lab")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Rating({self.user.username}, {self.lab.slug}, {self.rating}★)"
