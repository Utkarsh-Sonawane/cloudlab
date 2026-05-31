"""
Labs app — Django Channels WebSocket Consumer.
Bridges xterm.js frontend terminal ↔ Docker container exec stream.

Message protocol:
  Client → Server:  { "type": "input",  "data": "ls -la\\r" }
                    { "type": "resize", "cols": 80, "rows": 24 }
  Server → Client:  { "type": "output", "data": "..." }
                    { "type": "session_expired" }
                    { "type": "task_validated", "task_id": "...", "passed": true }
                    { "type": "error", "message": "..." }
"""

import asyncio
import json
import logging
import os
import struct

import docker
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger("cloudlab.ws")


class LabTerminalConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for the interactive lab terminal.
    URL: /ws/lab/<session_id>/?token=<websocket_token>
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.session_id = None
        self.session = None
        self.docker_client = None
        self.exec_id = None
        self.exec_socket = None
        self._output_task = None

    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        token = self.scope["query_string"].decode()
        token = dict(p.split("=") for p in token.split("&") if "=" in p).get("token", "")

        # Validate session and token
        self.session = await self._get_session(self.session_id, token)
        if not self.session:
            from apps.labs.models import LabSession
            actual_token = await database_sync_to_async(
                lambda: LabSession.objects.filter(id=self.session_id).values_list("websocket_token", "status").first()
            )()
            logger.warning("WS connect rejected: id=%s received_token=%s db_data=%s", self.session_id, token, actual_token)
            await self.close(code=4001)
            return

        if self.session.is_expired:
            await self.send_json({"type": "session_expired"})
            await self.close(code=4002)
            return

        await self.accept()
        logger.info("WS connected: session=%s user=%s", self.session_id, self.session.user_id)

        # Attach to container exec stream
        await self._attach_to_container()

    async def disconnect(self, close_code):
        logger.info("WS disconnected: session=%s code=%s", self.session_id, close_code)
        if self._output_task:
            self._output_task.cancel()
        
        if self.exec_socket:
            try:
                self.exec_socket.close()
            except Exception:
                pass
        
        if self.docker_client:
            try:
                self.docker_client.close()
            except Exception:
                pass

    async def receive(self, text_data=None, bytes_data=None):
        if not self.exec_socket:
            return

        try:
            if text_data:
                msg = json.loads(text_data)
                msg_type = msg.get("type")

                if msg_type == "input":
                    data = msg.get("data", "")
                    await self._write_to_container(data.encode("utf-8"))

                elif msg_type == "resize":
                    cols = msg.get("cols", 80)
                    rows = msg.get("rows", 24)
                    await self._resize_terminal(cols, rows)

        except Exception as exc:
            logger.error("Error processing WS message: %s", exc)
            await self.send_json({"type": "error", "message": str(exc)})

    # ── Container Interaction ─────────────────────────────────────────────────

    async def _attach_to_container(self):
        """Create a Docker exec instance and start reading output."""
        loop = asyncio.get_event_loop()
        try:
            self.exec_socket = await loop.run_in_executor(None, self._create_exec_socket)
            if self.exec_socket:
                self._output_task = asyncio.create_task(self._stream_output())
            else:
                await self.send_json({"type": "error", "message": "Could not attach to container."})
                await self.close()
        except Exception as exc:
            logger.error("Failed to attach to container: %s", exc)
            await self.send_json({"type": "error", "message": "Failed to connect to lab environment."})
            await self.close()

    def _create_exec_socket(self):
        """Synchronous: create Docker exec and get socket. Run in executor."""
        try:
            self.docker_client = docker.DockerClient(base_url=settings.DOCKER_HOST, timeout=15)
            container = self.docker_client.containers.get(self.session.container_id)
 
            # Detect shell: prefer bash, fallback to sh
            exit_code, _ = container.exec_run("sh -c 'command -v bash'")
            shell = "/bin/bash" if exit_code == 0 else "/bin/sh"
            
            # Interactive login shell
            cmd = [shell, "-l"] if shell == "/bin/bash" else [shell, "-i"]
            logger.info("Starting lab session %s with %s", self.session_id, cmd)
 
            exec_res = self.docker_client.api.exec_create(
                container.id,
                cmd=cmd,
                stdin=True,
                stdout=True,
                stderr=True,
                tty=True,
            )
            self.exec_id = exec_res["Id"]
            sock = self.docker_client.api.exec_start(self.exec_id, detach=False, tty=True, socket=True)
            if hasattr(sock, "_sock"):
                sock._sock.settimeout(None)
            return sock
        except docker.errors.NotFound:
            logger.error("Container not found: %s", self.session.container_id[:12])
            return None
        except Exception as exc:
            logger.error("exec_create error: %s", exc)
            return None

    async def _stream_output(self):
        """Async task: read container stdout and forward to WebSocket."""
        loop = asyncio.get_event_loop()
        try:
            while True:
                chunk = await loop.run_in_executor(None, self._read_chunk)
                if chunk is None:
                    logger.info("Lab shell stream ended for session %s", self.session_id)
                    break
                if chunk:
                    await self.send_json({"type": "output", "data": chunk.decode("utf-8", errors="replace")})

                # Check session expiry periodically
                if self.session and self.session.is_expired:
                    await self.send_json({"type": "session_expired"})
                    break
            
            await self.close()
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("Output stream error: %s", exc)

    def _read_chunk(self):
        try:
            if not self.exec_socket:
                return None
            if hasattr(self.exec_socket, "_sock"):
                return self.exec_socket._sock.recv(4096)
            return self.exec_socket.read(4096)
        except Exception as exc:
            logger.debug("Lab read error: %s", exc)
            return None

    async def _write_to_container(self, data: bytes):
        if not self.exec_socket:
            return
        loop = asyncio.get_event_loop()
        try:
            if hasattr(self.exec_socket, "_sock"):
                await loop.run_in_executor(None, self.exec_socket._sock.sendall, data)
            else:
                await loop.run_in_executor(None, self.exec_socket.write, data)
        except Exception as exc:
            logger.error("Lab write error: %s", exc)

    async def _resize_terminal(self, cols: int, rows: int):
        """Resize the container tty."""
        if not self.exec_id or not self.docker_client:
            return
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: self.docker_client.api.exec_resize(self.exec_id, height=rows, width=cols))
        except Exception as exc:
            logger.warning("Failed to resize terminal: %s", exc)

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def send_json(self, data: dict):
        await self.send(text_data=json.dumps(data))

    @database_sync_to_async
    def _get_session(self, session_id, token):
        from apps.labs.models import LabSession
        try:
            return LabSession.objects.select_related("lab", "user").get(
                id=session_id,
                websocket_token=token,
                status=LabSession.Status.ACTIVE,
            )
        except LabSession.DoesNotExist:
            return None
