"""
Celery tasks — Lab provisioning, cleanup, and session lifecycle.
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger("cloudlab.tasks")


@shared_task(bind=True, max_retries=3, default_retry_delay=10, name="tasks.lab_tasks.provision_lab_container")
def provision_lab_container(self, session_id: str):
    """
    Async task: spin up a Docker container for a lab session.
    Called immediately after LabSession is created with status=provisioning.
    """
    from apps.labs.models import LabSession
    from cloudlab.services.docker_service.manager import (
        cleanup_container,
        create_lab_container,
        generate_websocket_token,
    )

    try:
        session = LabSession.objects.select_related("lab", "user").get(id=session_id)
    except LabSession.DoesNotExist:
        logger.error("LabSession not found: %s", session_id)
        return

    if session.status not in ("pending", "provisioning"):
        logger.warning("Session %s already in status %s — skipping", session_id, session.status)
        return

    logger.info("Provisioning container for session %s (lab=%s)", session_id, session.lab.slug)

    try:
        container_id = create_lab_container(
            session_id=str(session.id),
            user_id=str(session.user.id),
            image=session.lab.docker_image,
        )

        token = generate_websocket_token()

        session.container_id = container_id
        session.websocket_token = token
        session.status = LabSession.Status.ACTIVE
        session.expires_at = timezone.now() + timedelta(minutes=session.lab.duration_minutes)
        session.save(update_fields=["container_id", "websocket_token", "status", "expires_at"])

        logger.info("Session %s is now ACTIVE (container=%s)", session_id, container_id[:12])

    except Exception as exc:
        logger.error("Failed to provision container for session %s: %s", session_id, exc)
        session.status = LabSession.Status.FAILED
        session.save(update_fields=["status"])
        raise self.retry(exc=exc)


@shared_task(name="tasks.lab_tasks.cleanup_session")
def cleanup_session(session_id: str):
    """
    Async task: stop and remove the Docker container for a specific session.
    """
    from apps.labs.models import LabSession
    from cloudlab.services.docker_service.manager import cleanup_container

    try:
        session = LabSession.objects.get(id=session_id)
    except LabSession.DoesNotExist:
        logger.warning("LabSession not found for cleanup: %s", session_id)
        return

    if session.container_id:
        logger.info("Cleaning up container %s for session %s", session.container_id[:12], session_id)
        try:
            cleanup_container(session.container_id)
        except Exception as exc:
            logger.error("Cleanup failed for container %s: %s", session.container_id[:12], exc)

    if session.status not in ("completed", "failed"):
        session.status = LabSession.Status.EXPIRED
    session.container_id = ""
    session.save(update_fields=["status", "container_id"])


@shared_task(name="tasks.lab_tasks.cleanup_expired_sessions")
def cleanup_expired_sessions():
    """
    Periodic task (every 5 min via Celery beat): find all expired sessions
    and queue their container cleanup.
    """
    from apps.labs.models import LabSession

    now = timezone.now()
    expired = LabSession.objects.filter(
        status=LabSession.Status.ACTIVE,
        expires_at__lte=now,
    ).values_list("id", flat=True)

    count = len(expired)
    logger.info("Found %d expired sessions to clean up.", count)

    for session_id in expired:
        cleanup_session.delay(str(session_id))

    return f"Queued cleanup for {count} sessions."



@shared_task(name="tasks.lab_tasks.provision_playground_container")
def provision_playground_container(session_id: str):
    """
    Async task: spin up a Docker container for a playground session.
    """
    from datetime import timedelta

    from apps.playground.models import PlaygroundSession
    from cloudlab.services.docker_service.manager import (
        create_lab_container,
        generate_websocket_token,
    )

    try:
        session = PlaygroundSession.objects.select_related("user").get(id=session_id)
    except PlaygroundSession.DoesNotExist:
        logger.error("PlaygroundSession not found: %s", session_id)
        return

    try:
        container_id = create_lab_container(
            session_id=str(session.id),
            user_id=str(session.user.id),
            image=session.docker_image,
        )
        token = generate_websocket_token()

        session.container_id = container_id
        session.websocket_token = token
        session.status = PlaygroundSession.Status.ACTIVE
        session.expires_at = timezone.now() + timedelta(hours=1)  # 1-hour limit
        session.save(update_fields=["container_id", "websocket_token", "status", "expires_at"])

        logger.info("Playground session %s ACTIVE (container=%s)", session_id, container_id[:12])

    except Exception as exc:
        logger.error("Failed to provision playground container: %s", exc)
        session.status = PlaygroundSession.Status.EXPIRED
        session.save(update_fields=["status"])
        raise


@shared_task(name="tasks.lab_tasks.cleanup_expired_playground_sessions")
def cleanup_expired_playground_sessions():
    """
    Periodic task (every 5 min via Celery beat): find all expired playground
    sessions and stop + remove their containers, then mark them expired.
    """
    from apps.playground.models import PlaygroundSession
    from cloudlab.services.docker_service.manager import cleanup_container

    now = timezone.now()
    expired = PlaygroundSession.objects.filter(
        status=PlaygroundSession.Status.ACTIVE,
        expires_at__lte=now,
    )

    count = 0
    for session in expired:
        logger.info("Expiring playground session %s (container=%s)", session.id, session.container_id[:12] if session.container_id else "none")
        if session.container_id:
            try:
                cleanup_container(session.container_id)
            except Exception as exc:
                logger.warning("Could not cleanup playground container %s: %s", session.container_id[:12], exc)
        session.status = PlaygroundSession.Status.EXPIRED
        session.container_id = ""
        session.save(update_fields=["status", "container_id"])
        count += 1

    logger.info("Expired %d playground session(s).", count)
    return f"Expired {count} playground session(s)."
