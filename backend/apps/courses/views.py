"""Courses app — Views, Serializers, and URLs."""

# ── Serializers ───────────────────────────────────────────────────────────────

from rest_framework import serializers

from .models import Course, CourseModule, Lesson, UserCourseProgress, UserLessonProgress


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            "id", "order", "title", "content_type", "content_url",
            "content_md", "duration_minutes", "is_free_preview",
        ]


class CourseModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = CourseModule
        fields = ["id", "order", "title", "lessons"]


class CourseListSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source="instructor.full_name", read_only=True)
    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id", "title", "slug", "short_description", "thumbnail_url",
            "difficulty", "duration_hours", "is_free",
            "instructor_name", "total_enrollments", "lesson_count",
        ]

    def get_lesson_count(self, obj):
        return Lesson.objects.filter(module__course=obj).count()


class CourseDetailSerializer(serializers.ModelSerializer):
    modules = CourseModuleSerializer(many=True, read_only=True)
    instructor_name = serializers.CharField(source="instructor.full_name", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id", "title", "slug", "description", "thumbnail_url",
            "difficulty", "duration_hours", "is_free",
            "instructor_name", "total_enrollments", "modules", "created_at",
        ]


# ── Views ─────────────────────────────────────────────────────────────────────

from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated

from cloudlab.core.utils.response import error_response, success_response, created_response


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CourseListSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = "slug"
    search_fields = ["title", "description"]
    filterset_fields = ["difficulty", "is_free"]
    ordering = ["-total_enrollments"]

    def get_queryset(self):
        return Course.objects.filter(is_published=True).select_related("instructor")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CourseDetailSerializer
        return CourseListSerializer

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def enroll(self, request, slug=None):
        course = self.get_object()
        progress, created = UserCourseProgress.objects.get_or_create(
            user=request.user, course=course
        )
        if created:
            course.total_enrollments += 1
            course.save(update_fields=["total_enrollments"])
            return created_response(message=f"Enrolled in '{course.title}'!")
        return success_response(message="Already enrolled.")

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def progress(self, request, slug=None):
        course = self.get_object()
        try:
            progress = UserCourseProgress.objects.get(user=request.user, course=course)
        except UserCourseProgress.DoesNotExist:
            return error_response("Not enrolled in this course.", status_code=404)

        total_lessons = Lesson.objects.filter(module__course=course).count()
        completed_lessons = UserLessonProgress.objects.filter(
            user=request.user, lesson__module__course=course
        ).count()
        percent = int((completed_lessons / total_lessons * 100)) if total_lessons else 0
        progress.progress_percent = percent
        if percent == 100 and not progress.completed_at:
            progress.completed_at = timezone.now()
        progress.save(update_fields=["progress_percent", "completed_at"])

        return success_response(data={
            "progress_percent": percent,
            "completed_lessons": completed_lessons,
            "total_lessons": total_lessons,
            "completed_at": progress.completed_at,
        })

    @action(detail=True, methods=["patch"], permission_classes=[IsAuthenticated],
            url_path="lessons/(?P<lesson_id>[^/.]+)/complete")
    def complete_lesson(self, request, slug=None, lesson_id=None):
        course = self.get_object()
        try:
            lesson = Lesson.objects.get(id=lesson_id, module__course=course)
        except Lesson.DoesNotExist:
            return error_response("Lesson not found.", status_code=404)

        UserLessonProgress.objects.get_or_create(user=request.user, lesson=lesson)
        return success_response(message="Lesson marked as complete.")


# ── URLs ──────────────────────────────────────────────────────────────────────

from django.urls import include, path
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r"", CourseViewSet, basename="course")

urlpatterns = [
    path("", include(router.urls)),
]
