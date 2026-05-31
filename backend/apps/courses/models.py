"""Courses app models — Course, Module, Lesson, Progress."""

import uuid

from django.conf import settings
from django.db import models


class Course(models.Model):
    """A structured learning path composed of modules and lessons."""

    class Difficulty(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, db_index=True)
    description = models.TextField()
    short_description = models.CharField(max_length=300, blank=True)
    thumbnail_url = models.URLField(blank=True)

    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.BEGINNER)
    duration_hours = models.PositiveSmallIntegerField(default=1)

    is_free = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)

    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="courses_taught"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    total_enrollments = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "courses"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class CourseModule(models.Model):
    """A module (chapter) within a course."""

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="modules")
    order = models.PositiveSmallIntegerField(default=0)
    title = models.CharField(max_length=200)

    class Meta:
        db_table = "course_modules"
        ordering = ["course", "order"]
        unique_together = ("course", "order")

    def __str__(self):
        return f"{self.course.title} — Module {self.order}: {self.title}"


class Lesson(models.Model):
    """A single lesson within a module (video, article, quiz, or embedded lab)."""

    class ContentType(models.TextChoices):
        VIDEO = "video", "Video"
        ARTICLE = "article", "Article"
        LAB = "lab", "Embedded Lab"
        QUIZ = "quiz", "Quiz"

    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE, related_name="lessons")
    order = models.PositiveSmallIntegerField(default=0)
    title = models.CharField(max_length=200)

    content_type = models.CharField(max_length=20, choices=ContentType.choices)
    content_url = models.URLField(blank=True, help_text="URL for video content")
    content_md = models.TextField(blank=True, help_text="Markdown content for articles")

    # Optional embedded lab
    lab = models.ForeignKey(
        "labs.Lab", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="embedded_in_lessons"
    )

    duration_minutes = models.PositiveSmallIntegerField(default=5)
    is_free_preview = models.BooleanField(default=False)

    class Meta:
        db_table = "lessons"
        ordering = ["module", "order"]
        unique_together = ("module", "order")

    def __str__(self):
        return f"{self.module.title} — Lesson {self.order}: {self.title}"


class UserCourseProgress(models.Model):
    """Tracks a user's enrollment and progress in a course."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_progress"
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    progress_percent = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "user_course_progress"
        unique_together = ("user", "course")

    def __str__(self):
        return f"{self.user.username} → {self.course.title} ({self.progress_percent}%)"


class UserLessonProgress(models.Model):
    """Tracks whether a user has completed a specific lesson."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lesson_progress"
    )
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="completions")
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_lesson_progress"
        unique_together = ("user", "lesson")

    def __str__(self):
        return f"{self.user.username} completed {self.lesson.title}"
