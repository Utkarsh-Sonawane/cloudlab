"""Playground app — Views, Consumer, and URLs."""

# ── Views ─────────────────────────────────────────────────────────────────────

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from cloudlab.core.utils.response import created_response, error_response, success_response
from tasks.lab_tasks import provision_playground_container

from .models import PlaygroundSession


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_playground(request):
    """POST /api/v1/playground/start/ — Provision a free sandbox."""
    env_type = request.data.get("environment_type", "linux")
    image = request.data.get("docker_image", "ubuntu:22.04")

    # Limit: 1 active playground per user
    existing = PlaygroundSession.objects.filter(
        user=request.user, status=PlaygroundSession.Status.ACTIVE
    ).first()
    if existing:
        # Verify the container is actually still running before returning it
        container_alive = False
        if existing.container_id:
            try:
                import docker
                from django.conf import settings
                client = docker.DockerClient(base_url=settings.DOCKER_HOST, timeout=5)
                container = client.containers.get(existing.container_id)
                container.reload()
                container_alive = container.status in ("running", "restarting")
            except Exception:
                container_alive = False

        if container_alive:
            return success_response(data={
                "id": str(existing.id),
                "status": existing.status,
                "websocket_token": existing.websocket_token,
                "expires_at": existing.expires_at,
            }, message="You already have an active playground session.")
        else:
            # Container died — mark the stale session stopped and fall through
            existing.status = PlaygroundSession.Status.STOPPED
            existing.save(update_fields=["status"])

    import uuid
    session = PlaygroundSession.objects.create(
        user=request.user,
        environment_type=env_type,
        docker_image=image,
        websocket_token=uuid.uuid4().hex,
    )
    provision_playground_container.delay(str(session.id))

    return created_response(data={
        "id": str(session.id),
        "status": session.status,
        "environment_type": session.environment_type,
    }, message="Playground is being provisioned.")


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def stop_playground(request, session_id):
    """DELETE /api/v1/playground/<id>/stop/ — Stop a playground session."""
    try:
        session = PlaygroundSession.objects.get(id=session_id, user=request.user)
    except PlaygroundSession.DoesNotExist:
        return error_response("Session not found.", status_code=404)

    if session.container_id:
        from cloudlab.services.docker_service.manager import cleanup_container
        try:
            cleanup_container(session.container_id)
        except Exception:
            pass

    session.status = PlaygroundSession.Status.STOPPED
    session.save(update_fields=["status"])
    return success_response(message="Playground session stopped.")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_playground_status(request):
    """GET /api/v1/playground/status/ — Return the user's current active/provisioning session."""
    session = PlaygroundSession.objects.filter(
        user=request.user,
        status__in=[
            PlaygroundSession.Status.ACTIVE,
            PlaygroundSession.Status.PROVISIONING,
        ],
    ).order_by("-created_at").first()

    if not session:
        return error_response("No active session.", status_code=404)

    # If the session is ACTIVE, sanity-check that the container is still running.
    # If it has exited (e.g. Docker restart), mark it stopped so the UI resets.
    if session.status == PlaygroundSession.Status.ACTIVE and session.container_id:
        try:
            import docker
            from django.conf import settings
            client = docker.DockerClient(base_url=settings.DOCKER_HOST, timeout=5)
            container = client.containers.get(session.container_id)
            container.reload()
            if container.status not in ("running", "restarting"):
                session.status = PlaygroundSession.Status.STOPPED
                session.save(update_fields=["status"])
                return error_response("Session container has stopped.", status_code=404)
        except Exception:
            # If we can't reach Docker or the container is gone, treat as stopped
            session.status = PlaygroundSession.Status.STOPPED
            session.save(update_fields=["status"])
            return error_response("Session container not found.", status_code=404)

    return success_response(data={
        "id": str(session.id),
        "status": session.status,
        "environment_type": session.environment_type,
        "websocket_token": session.websocket_token,
        "expires_at": session.expires_at,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_session_status(request, session_id):
    """GET /api/v1/playground/<id>/status/ — Poll a specific session's status."""
    try:
        session = PlaygroundSession.objects.get(id=session_id, user=request.user)
    except PlaygroundSession.DoesNotExist:
        return error_response("Session not found.", status_code=404)

    return success_response(data={
        "id": str(session.id),
        "status": session.status,
        "environment_type": session.environment_type,
        "websocket_token": session.websocket_token,
        "expires_at": session.expires_at,
    })
