"""
Playground WebSocket consumer.
Same as LabTerminalConsumer but without task tracking.
"""

import asyncio
import json
import logging

import docker
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger("cloudlab.ws.playground")


class PlaygroundTerminalConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for the free-form playground terminal."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.session_id = None
        self.session = None
        self.docker_client = None
        self.exec_id = None
        self.socket_io = None
        self._output_task = None
        self._expiry_task = None  # background task that fires when the 1-hour limit hits

    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        token = self.scope["query_string"].decode()
        token = dict(p.split("=") for p in token.split("&") if "=" in p).get("token", "")

        self.session = await self._get_session(self.session_id, token)
        if not self.session:
            await self.close(code=4001)
            return

        # Reject connections to already-expired sessions immediately
        if self.session.expires_at and timezone.now() >= self.session.expires_at:
            await self.accept()
            await self.send(text_data=json.dumps({
                "type": "session_expired",
                "message": "Your playground session has expired.",
            }))
            await self.close(code=4002)
            return

        await self.accept()
        await self._attach_to_container()

        # Schedule automatic expiry at the exact deadline
        if self.session.expires_at:
            self._expiry_task = asyncio.create_task(self._expiry_watcher())

    async def disconnect(self, close_code):
        if self._expiry_task:
            self._expiry_task.cancel()
        if self._output_task:
            self._output_task.cancel()
        
        if self.socket_io:
            try:
                self.socket_io.close()
            except Exception:
                pass
        
        if self.docker_client:
            try:
                self.docker_client.close()
            except Exception:
                pass

    async def receive(self, text_data=None, bytes_data=None):
        if not self.socket_io or not text_data:
            return
        try:
            msg = json.loads(text_data)
            if msg.get("type") == "input":
                await self._write(msg.get("data", "").encode("utf-8"))
            elif msg.get("type") == "resize":
                await self._resize(msg.get("cols", 80), msg.get("rows", 24))
        except Exception as exc:
            logger.error("Playground WS error: %s", exc)

    # ── Expiry watcher ────────────────────────────────────────────────────────

    async def _expiry_watcher(self):
        """Sleep until expires_at, then kick the user out and stop the container."""
        try:
            now = timezone.now()
            delay = (self.session.expires_at - now).total_seconds()
            if delay > 0:
                await asyncio.sleep(delay)

            logger.info("Playground session %s has reached the 1-hour limit — expiring.", self.session_id)

            # Notify the frontend
            try:
                await self.send(text_data=json.dumps({
                    "type": "session_expired",
                    "message": "Your 1-hour playground session has ended. Start a new one anytime.",
                }))
            except Exception:
                pass

            # Stop + remove the container and mark session expired in DB
            await self._expire_session()
            await self.close(code=4002)

        except asyncio.CancelledError:
            pass  # normal on disconnect

    @database_sync_to_async
    def _expire_session(self):
        from apps.playground.models import PlaygroundSession
        from cloudlab.services.docker_service.manager import cleanup_container
        try:
            session = PlaygroundSession.objects.get(id=self.session_id)
            if session.container_id:
                try:
                    cleanup_container(session.container_id)
                except Exception as exc:
                    logger.warning("Cleanup error for playground container: %s", exc)
            session.status = PlaygroundSession.Status.EXPIRED
            session.container_id = ""
            session.save(update_fields=["status", "container_id"])
        except PlaygroundSession.DoesNotExist:
            pass

    # ── Container attachment ──────────────────────────────────────────────────

    async def _attach_to_container(self):
        loop = asyncio.get_event_loop()
        self.socket_io = await loop.run_in_executor(None, self._create_exec_socket)
        if self.socket_io:
            self._output_task = asyncio.create_task(self._stream_output())
        else:
            await self.send(text_data=json.dumps({"type": "error", "message": "Could not connect to playground."}))
            await self.close()

    def _create_exec_socket(self):
        try:
            # Persist client on self to avoid GC
            self.docker_client = docker.DockerClient(base_url=settings.DOCKER_HOST, timeout=15)
            container = self.docker_client.containers.get(self.session.container_id)
 
            # Reload to get the latest container state
            container.reload()
            if container.status != "running":
                logger.info("Restarting playground container %s", container.short_id)
                container.start()
                import time
                for _ in range(10):
                    time.sleep(0.5)
                    container.reload()
                    if container.status == "running": break
                else:
                    return None
 
            # Detect shell: prefer bash, fallback to sh
            exit_code, _ = container.exec_run("sh -c 'command -v bash'")
            shell = "/bin/bash" if exit_code == 0 else "/bin/sh"
            
            # Interactive login shell
            cmd = [shell, "-l"] if shell == "/bin/bash" else [shell, "-i"]
            logger.info("Starting playground session %s with %s", self.session_id, cmd)
 
            exec_res = self.docker_client.api.exec_create(
                container.id,
                cmd=cmd,
                stdin=True, stdout=True, stderr=True, tty=True,
                environment={"TERM": "xterm-256color"},
            )
            self.exec_id = exec_res["Id"]
            
            # Returns a SocketIO wrapper
            socket_io = self.docker_client.api.exec_start(self.exec_id, detach=False, tty=True, socket=True)
            if hasattr(socket_io, "_sock"):
                socket_io._sock.settimeout(None) # Ensure blocking for the executor thread
            return socket_io
        except Exception as exc:
            logger.error("Playground exec error: %s", exc)
            return None

    async def _stream_output(self):
        loop = asyncio.get_event_loop()
        try:
            while True:
                chunk = await loop.run_in_executor(None, self._read_chunk)
                if chunk is None:
                    logger.info("Playground shell stream ended for session %s", self.session_id)
                    break
                if chunk:
                    await self.send(text_data=json.dumps({"type": "output", "data": chunk.decode("utf-8", errors="replace")}))
            
            # If the loop breaks, the shell has exited. Close the WS.
            await self.close()
        except asyncio.CancelledError:
            pass

    def _read_chunk(self):
        try:
            if not self.socket_io:
                return None
            # Use raw socket recv if possible, otherwise read()
            if hasattr(self.socket_io, "_sock"):
                return self.socket_io._sock.recv(4096)
            return self.socket_io.read(4096)
        except Exception as exc:
            logger.debug("Playground read error (expected on disconnect): %s", exc)
            return None

    async def _write(self, data: bytes):
        if not self.socket_io:
            return
        loop = asyncio.get_event_loop()
        try:
            if hasattr(self.socket_io, "_sock"):
                await loop.run_in_executor(None, self.socket_io._sock.sendall, data)
            else:
                await loop.run_in_executor(None, self.socket_io.write, data)
        except Exception as exc:
            logger.error("Playground write error: %s", exc)

    async def _resize(self, cols: int, rows: int):
        if not self.exec_id or not self.docker_client:
            return
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: self.docker_client.api.exec_resize(self.exec_id, height=rows, width=cols))
        except Exception as exc:
            logger.debug("Resize error: %s", exc)

    @database_sync_to_async
    def _get_session(self, session_id, token):
        from apps.playground.models import PlaygroundSession
        try:
            return PlaygroundSession.objects.get(
                id=session_id,
                websocket_token=token,
                status=PlaygroundSession.Status.ACTIVE,
            )
        except PlaygroundSession.DoesNotExist:
            return None
