"""Users app models — Custom User, Profile, Badges."""

import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom manager for the CloudLab User model."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email address is required.")
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    CloudLab custom user model.
    Uses email as the primary identifier instead of username.
    """

    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        INSTRUCTOR = "instructor", "Instructor"
        ADMIN = "admin", "Admin"

    class Plan(models.TextChoices):
        FREE = "free", "Free"
        PRO = "pro", "Pro"
        ENTERPRISE = "enterprise", "Enterprise"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    username = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    avatar_url = models.URLField(blank=True)

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.FREE)

    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    github_username = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def display_name(self):
        return self.full_name or self.username


class UserProfile(models.Model):
    """Extended profile information for a user."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    bio = models.TextField(blank=True)
    linkedin_url = models.URLField(blank=True)
    github_url = models.URLField(blank=True)
    website_url = models.URLField(blank=True)

    # Aggregated stats (updated by signals/periodic tasks)
    total_labs_completed = models.PositiveIntegerField(default=0)
    total_points = models.PositiveIntegerField(default=0)
    streak_days = models.PositiveIntegerField(default=0)
    last_active = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "user_profiles"

    def __str__(self):
        return f"Profile({self.user.username})"


class Badge(models.Model):
    """Achievement badge that can be earned by users."""

    class Category(models.TextChoices):
        LABS = "labs", "Labs"
        COURSES = "courses", "Courses"
        STREAK = "streak", "Streak"
        SPECIAL = "special", "Special"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    icon_url = models.URLField(blank=True)
    category = models.CharField(max_length=20, choices=Category.choices)
    required_count = models.PositiveIntegerField(default=1, help_text="Number of actions needed to earn this badge.")

    class Meta:
        db_table = "badges"
        ordering = ["category", "name"]

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    """A badge that has been earned by a user."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="badges")
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="user_badges")
    earned_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "user_badges"
        unique_together = ("user", "badge")
        ordering = ["-earned_at"]

    def __str__(self):
        return f"{self.user.username} earned {self.badge.name}"
