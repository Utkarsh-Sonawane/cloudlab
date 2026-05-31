"""Labs app — DRF Views."""

import logging

from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from cloudlab.core.utils.permissions import IsAdmin
from cloudlab.core.utils.response import created_response, error_response, success_response
from tasks.lab_tasks import cleanup_session, provision_lab_container

from .models import Lab, LabCategory, LabRating, LabSession, LabSessionTask
from .serializers import (
    LabCategorySerializer,
    LabDetailSerializer,
    LabListSerializer,
    LabRatingSerializer,
    LabSessionSerializer,
    ValidationResultSerializer,
)

logger = logging.getLogger("cloudlab.labs.views")


class LabCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve lab categories."""
    queryset = LabCategory.objects.all()
    serializer_class = LabCategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = "slug"


class LabViewSet(viewsets.ReadOnlyModelViewSet):
    """Lab catalog — list, filter, search, and detail views."""
    serializer_class = LabListSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = "slug"
    filterset_fields = ["category__slug", "difficulty", "environment_type", "is_free"]
    search_fields = ["title", "description", "short_description"]
    ordering_fields = ["created_at", "avg_rating", "total_completions", "duration_minutes"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            Lab.objects.filter(is_published=True)
            .select_related("category")
            .prefetch_related("tasks")
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return LabDetailSerializer
        return LabListSerializer

    # ── Session Management ────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def start(self, request, slug=None):
        """Start a new lab session — provisions a container asynchronously."""
        lab = self.get_object()

        # Check if user already has an active session for this lab
        existing = LabSession.objects.filter(
            user=request.user, lab=lab, status=LabSession.Status.ACTIVE
        ).first()
        if existing:
            serializer = LabSessionSerializer(existing, context={"request": request})
            return success_response(
                data=serializer.data,
                message="You already have an active session for this lab.",
            )

        # Terminate any other active sessions for this user to ensure only ONE lab runs at once
        other_active_sessions = LabSession.objects.filter(
            user=request.user, status__in=[LabSession.Status.ACTIVE, LabSession.Status.PROVISIONING]
        ).exclude(lab=lab)

        for old_session in other_active_sessions:
            cleanup_session.delay(str(old_session.id))
            old_session.status = LabSession.Status.COMPLETED
            old_session.save(update_fields=["status"])

        # Check concurrent session limit (based on plan)
        from django.conf import settings as django_settings
        max_sessions = django_settings.MAX_CONTAINERS_PER_USER
        active_count = LabSession.objects.filter(
            user=request.user, status=LabSession.Status.ACTIVE
        ).count()
        if active_count >= max_sessions:
            return error_response(
                message=f"Maximum of {max_sessions} concurrent labs allowed. Stop an existing session first.",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        import uuid
        with transaction.atomic():
            session = LabSession.objects.create(
                user=request.user,
                lab=lab,
                status=LabSession.Status.PROVISIONING,
                websocket_token=uuid.uuid4().hex,
            )
            # Create LabSessionTask records for each task
            for task in lab.tasks.order_by("order"):
                LabSessionTask.objects.create(session=session, task=task)

        # Provision container asynchronously
        provision_lab_container.delay(str(session.id))

        serializer = LabSessionSerializer(session, context={"request": request})
        return created_response(
            data=serializer.data,
            message="Lab session is being provisioned. Connect your terminal in a few seconds.",
        )

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="session")
    def get_session(self, request, slug=None):
        """Get the user's current active or recent session for this lab."""
        lab = self.get_object()
        session = LabSession.objects.filter(
            user=request.user, lab=lab
        ).order_by("-started_at").first()

        if not session:
            return error_response("No session found for this lab.", status_code=status.HTTP_404_NOT_FOUND)

        # Refresh session status if container is ACTIVE but might have died
        if session.status == LabSession.Status.ACTIVE and session.is_expired:
            session.status = LabSession.Status.EXPIRED
            session.save(update_fields=["status"])

        serializer = LabSessionSerializer(session, context={"request": request})
        return success_response(data=serializer.data)

    @action(detail=True, methods=["delete"], permission_classes=[IsAuthenticated], url_path="session")
    def stop_session(self, request, slug=None):
        """Stop and clean up the user's active session for this lab."""
        lab = self.get_object()
        session = LabSession.objects.filter(
            user=request.user, lab=lab
        ).order_by("-started_at").first()

        if not session:
            return error_response("No active session found.", status_code=status.HTTP_404_NOT_FOUND)

        # Mark session as completed immediately so frontend sees the change
        session.status = LabSession.Status.COMPLETED
        session.completed_at = timezone.now()
        session.save(update_fields=["status", "completed_at"])

        # Asynchronously clean up the container
        cleanup_session.delay(str(session.id))
        return success_response(message="Lab session stopped.")

    # ── Task Actions ──────────────────────────────────────────────────────────

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated],
            url_path="session/(?P<session_id>[^/.]+)/validate")
    def validate_task(self, request, session_id=None, slug=None):
        """Validate the current task in a lab session."""
        from cloudlab.services.docker_service.validator import validate_task_in_container

        try:
            session = LabSession.objects.select_related("lab", "user").get(
                id=session_id, user=request.user
            )
        except LabSession.DoesNotExist:
            return error_response("Session not found.", status_code=status.HTTP_404_NOT_FOUND)

        if session.status != LabSession.Status.ACTIVE:
            return error_response(f"Session is not active (status={session.status}).")

        tasks = list(session.lab.tasks.order_by("order"))
        idx = session.current_task_index
        if idx >= len(tasks):
            return error_response("All tasks already completed.")

        current_task = tasks[idx]
        result = validate_task_in_container(
            container_id=session.container_id,
            validation_script=current_task.validation_script,
            validation_type=current_task.validation_type,
            expected_output=current_task.expected_output,
        )

        # Update session task record
        session_task = LabSessionTask.objects.get(session=session, task=current_task)
        session_task.attempts += 1

        if result["passed"]:
            session_task.status = LabSessionTask.Status.COMPLETED
            session_task.completed_at = timezone.now()
        session_task.save(update_fields=["status", "completed_at", "attempts"])

        all_done = result["passed"] and (idx + 1 >= len(tasks))

        if result["passed"]:
            session.current_task_index = idx + 1
            if all_done:
                session.status = LabSession.Status.COMPLETED
                session.completed_at = timezone.now()
                # Award points
                _award_points(request.user, session.lab.points_reward)
                _mark_lab_completed(request.user, session.lab)
            session.save(update_fields=["current_task_index", "status", "completed_at"])

        return success_response(data={
            "passed": result["passed"],
            "message": result["message"],
            "task_index": idx,
            "all_tasks_complete": all_done,
            "points_earned": session.lab.points_reward if all_done else 0,
        })

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated],
            url_path="session/(?P<session_id>[^/.]+)/next")
    def next_task(self, request, session_id=None, slug=None):
        """Advance to the next task (admin/instructor skip)."""
        try:
            session = LabSession.objects.get(id=session_id, user=request.user)
        except LabSession.DoesNotExist:
            return error_response("Session not found.", status_code=status.HTTP_404_NOT_FOUND)

        tasks = list(session.lab.tasks.order_by("order"))
        if session.current_task_index >= len(tasks):
            return error_response("Already at the last task.")

        session_task = LabSessionTask.objects.get(
            session=session, task=tasks[session.current_task_index]
        )
        session_task.status = LabSessionTask.Status.SKIPPED
        session_task.save(update_fields=["status"])

        session.current_task_index += 1
        session.save(update_fields=["current_task_index"])

        serializer = LabSessionSerializer(session, context={"request": request})
        return success_response(data=serializer.data, message="Advanced to next task.")

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated],
            url_path="session/(?P<session_id>[^/.]+)/hint")
    def get_hint(self, request, session_id=None, slug=None):
        """Return the hint for the current task."""
        try:
            session = LabSession.objects.select_related("lab").get(
                id=session_id, user=request.user
            )
        except LabSession.DoesNotExist:
            return error_response("Session not found.", status_code=status.HTTP_404_NOT_FOUND)

        tasks = list(session.lab.tasks.order_by("order"))
        idx = session.current_task_index
        if idx >= len(tasks):
            return error_response("No more tasks.")

        hint = tasks[idx].hint or "No hint available for this task."
        return success_response(data={"hint": hint})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def rate(self, request, slug=None):
        """Rate a lab (1-5 stars)."""
        lab = self.get_object()
        serializer = LabRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        rating_obj, created = LabRating.objects.update_or_create(
            user=request.user, lab=lab,
            defaults={
                "rating": serializer.validated_data["rating"],
                "comment": serializer.validated_data.get("comment", ""),
            },
        )
        # Update avg_rating on lab
        _update_lab_rating(lab)
        return success_response(
            data=LabRatingSerializer(rating_obj).data,
            message="Rating submitted.",
        )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _award_points(user, points: int):
    try:
        profile = user.profile
        profile.total_points += points
        profile.save(update_fields=["total_points"])
    except Exception as exc:
        logger.error("Failed to award points: %s", exc)


def _mark_lab_completed(user, lab):
    try:
        profile = user.profile
        profile.total_labs_completed += 1
        profile.save(update_fields=["total_labs_completed"])
        lab.total_completions += 1
        lab.save(update_fields=["total_completions"])
    except Exception as exc:
        logger.error("Failed to mark lab completed: %s", exc)


def _update_lab_rating(lab):
    from django.db.models import Avg
    avg = LabRating.objects.filter(lab=lab).aggregate(avg=Avg("rating"))["avg"]
    lab.avg_rating = avg or 0
    lab.save(update_fields=["avg_rating"])
