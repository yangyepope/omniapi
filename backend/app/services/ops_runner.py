"""Ops runner — rebuild + redeploy the gitlab-scanner container from the UI.

INTERNAL TOOL. This shells out to `docker compose` against the mounted
scanner project dir + host docker socket, so the platform backend can rebuild
and restart the scanner image on operator request. No extra RBAC is applied
(per product decision: internal-only tool) — the `/security/*` routes already
sit behind the platform login; do NOT expose this backend to untrusted
networks (docker.sock = host container control).

The build is long (minutes), so `redeploy_scanner()` kicks a background task
and returns immediately; the UI polls `get_status()`. A single in-flight
redeploy is enforced by a lock — a second request while one runs is a no-op
that returns the current status.
"""
from __future__ import annotations

import asyncio
import logging
from collections import deque
from datetime import datetime
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_MAX_LOG_LINES = 200

# Single-process in-memory state. security-platform backend runs one uvicorn
# process for the API (celery workers are separate and don't import this), so
# a module-level singleton + asyncio.Lock is sufficient to serialize redeploys.
_lock = asyncio.Lock()
_state: dict[str, Any] = {
    "status": "idle",          # idle | running | success | failed
    "started_at": None,
    "finished_at": None,
    "returncode": None,
    "log": deque(maxlen=_MAX_LOG_LINES),
    "step": None,              # build | up | None
}


def get_status() -> dict[str, Any]:
    """Snapshot of the last/current redeploy for the UI to poll."""
    return {
        "status": _state["status"],
        "step": _state["step"],
        "started_at": _state["started_at"],
        "finished_at": _state["finished_at"],
        "returncode": _state["returncode"],
        "log": list(_state["log"]),
    }


def _log(line: str) -> None:
    _state["log"].append(line.rstrip("\n"))


async def _run(cmd: list[str]) -> int:
    """Run a command, streaming combined output into the log. Returns rc."""
    _log(f"$ {' '.join(cmd)}")
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=settings.SCANNER_PROJECT_DIR,
    )
    assert proc.stdout is not None
    async for raw in proc.stdout:
        _log(raw.decode("utf-8", errors="replace"))
    return await proc.wait()


async def _redeploy_worker() -> None:
    project_dir = settings.SCANNER_PROJECT_DIR
    compose_file = f"{project_dir}/docker-compose.yml"
    base = [
        "docker", "compose",
        "-p", settings.SCANNER_COMPOSE_PROJECT,
        "--project-directory", project_dir,
        "-f", compose_file,
    ]
    try:
        _state["step"] = "build"
        rc = await _run([*base, "build", "scanner"])
        if rc != 0:
            _finish("failed", rc)
            return
        _state["step"] = "up"
        rc = await _run([*base, "up", "-d", "scanner"])
        _finish("success" if rc == 0 else "failed", rc)
    except Exception as exc:  # docker missing / socket denied / etc.
        logger.exception("scanner redeploy crashed")
        _log(f"[runner error] {type(exc).__name__}: {exc}")
        _finish("failed", -1)


def _finish(status: str, rc: int) -> None:
    _state["status"] = status
    _state["step"] = None
    _state["returncode"] = rc
    _state["finished_at"] = datetime.now().isoformat()
    logger.info("scanner redeploy finished: status=%s rc=%s", status, rc)


async def redeploy_scanner() -> dict[str, Any]:
    """Kick a background rebuild+redeploy of the scanner. Idempotent while one
    is running: returns {already_running: True, ...status} instead of starting
    a second build."""
    if _lock.locked() or _state["status"] == "running":
        return {"already_running": True, **get_status()}
    # Acquire without holding across the whole build — we gate on status.
    await _lock.acquire()
    try:
        _state["status"] = "running"
        _state["step"] = "build"
        _state["started_at"] = datetime.now().isoformat()
        _state["finished_at"] = None
        _state["returncode"] = None
        _state["log"].clear()
        _log("scanner redeploy started (build + up -d scanner)")
    finally:
        _lock.release()
    asyncio.create_task(_redeploy_worker())
    return {"already_running": False, **get_status()}
