"""
Docker service — Container lifecycle manager.
Handles create/start/stop/kill of lab and playground containers.
"""

import logging
import secrets
from typing import Optional

import docker
from django.conf import settings

logger = logging.getLogger("cloudlab.docker")


def _get_client() -> docker.DockerClient:
    """Return a Docker client connected to the configured socket."""
    return docker.DockerClient(base_url=settings.DOCKER_HOST, timeout=30)


# ── Container Labels ──────────────────────────────────────────────────────────

def _build_labels(session_id: str, user_id: str, session_type: str = "lab") -> dict:
    return {
        "cloudlab": "true",
        "cloudlab.session_id": str(session_id),
        "cloudlab.user_id": str(user_id),
        "cloudlab.type": session_type,
    }


# ── Core Lifecycle ────────────────────────────────────────────────────────────

def create_lab_container(
    session_id: str,
    user_id: str,
    image: str,
    memory_limit: Optional[str] = None,
    cpu_quota: Optional[int] = None,
    cpu_period: Optional[int] = None,
    environment: Optional[dict] = None,
) -> str:
    """
    Pull the image (if needed) and create a new lab container.
    Returns the container ID.
    Raises docker.errors.DockerException on failure.
    """
    client = _get_client()
    mem_limit = memory_limit or settings.LAB_CONTAINER_MEMORY_LIMIT
    _cpu_quota = cpu_quota or settings.LAB_CONTAINER_CPU_QUOTA
    _cpu_period = cpu_period or settings.LAB_CONTAINER_CPU_PERIOD

    logger.info("Creating lab container: image=%s session=%s", image, session_id)

    try:
        # Pull image if not present (non-blocking in Celery task context)
        try:
            client.images.get(image)
        except docker.errors.ImageNotFound:
            logger.info("Pulling image: %s", image)
            client.images.pull(image)

        container = client.containers.run(
            image=image,
            detach=True,
            stdin_open=True,
            tty=True,
            # Security
            read_only=False,           # labs need to write files
            security_opt=["no-new-privileges:true"],
            # Resources
            mem_limit=mem_limit,
            memswap_limit=mem_limit,   # disable swap
            cpu_quota=_cpu_quota,
            cpu_period=_cpu_period,
            # Networking — isolated bridge, no internet by default
            network_mode=settings.LAB_CONTAINER_NETWORK,
            # Metadata
            labels=_build_labels(session_id, user_id, "lab"),
            environment=environment or {},
            # Lifecycle
            auto_remove=False,         # we remove explicitly after cleanup
        )
        logger.info("Container created: id=%s session=%s", container.short_id, session_id)
        return container.id

    except docker.errors.DockerException as exc:
        logger.error("Failed to create container for session %s: %s", session_id, exc)
        raise


def stop_container(container_id: str, timeout: int = 10) -> None:
    """Gracefully stop a running container."""
    try:
        client = _get_client()
        container = client.containers.get(container_id)
        container.stop(timeout=timeout)
        logger.info("Stopped container: %s", container_id[:12])
    except docker.errors.NotFound:
        logger.warning("Container not found (already removed?): %s", container_id[:12])
    except docker.errors.DockerException as exc:
        logger.error("Error stopping container %s: %s", container_id[:12], exc)
        raise


def remove_container(container_id: str, force: bool = True) -> None:
    """Remove a container (optionally force-killing first)."""
    try:
        client = _get_client()
        container = client.containers.get(container_id)
        container.remove(force=force)
        logger.info("Removed container: %s", container_id[:12])
    except docker.errors.NotFound:
        logger.warning("Container already removed: %s", container_id[:12])
    except docker.errors.DockerException as exc:
        logger.error("Error removing container %s: %s", container_id[:12], exc)
        raise


def cleanup_container(container_id: str) -> None:
    """Stop and remove a container in one call."""
    stop_container(container_id)
    remove_container(container_id, force=True)


def get_container_status(container_id: str) -> Optional[str]:
    """Return the current status string of a container, or None if not found."""
    try:
        client = _get_client()
        container = client.containers.get(container_id)
        container.reload()
        return container.status  # 'running', 'exited', etc.
    except docker.errors.NotFound:
        return None
    except docker.errors.DockerException as exc:
        logger.error("Error getting container status %s: %s", container_id[:12], exc)
        return None


def list_cloudlab_containers() -> list:
    """Return all active CloudLab-managed containers."""
    try:
        client = _get_client()
        return client.containers.list(filters={"label": "cloudlab=true"})
    except docker.errors.DockerException as exc:
        logger.error("Error listing CloudLab containers: %s", exc)
        return []


def exec_in_container(container_id: str, command: list, workdir: str = "/") -> tuple:
    """
    Run a command inside an existing container.
    Returns (exit_code, output_bytes).
    """
    client = _get_client()
    container = client.containers.get(container_id)
    result = container.exec_run(
        cmd=command,
        stdout=True,
        stderr=True,
        demux=False,
        workdir=workdir,
    )
    return result.exit_code, result.output


def generate_websocket_token() -> str:
    """Generate a secure random WebSocket auth token."""
    return secrets.token_hex(32)
