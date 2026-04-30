"""
源码同步（v3.0 §2.2 Activity 1）：

按 service+commit 分层缓存：
    {SOURCE_CACHE_DIR}/{project_id}/{service_name}/{commit_short}/{file_path}

commit 命中已存在目录则整服务跳过下载，加快重复扫描。
"""
import asyncio
import hashlib
import logging
from pathlib import Path
from typing import Iterable, Optional

from aisec.config import get_settings, source_cache_dir
from aisec.gitlab.client import GitLabClient

logger = logging.getLogger(__name__)


def service_cache_dir(project_id: int, service_name: str, commit_hash: str) -> Path:
    short = (commit_hash or "HEAD")[:12]
    return source_cache_dir() / str(project_id) / service_name / short


def _file_dest(
    project_id: int, service_name: str, commit_hash: str, file_path: str
) -> Path:
    return service_cache_dir(project_id, service_name, commit_hash) / file_path


async def _fetch_one(
    client: GitLabClient,
    project_id: int,
    service_name: str,
    file_path: str,
    ref: str,
    commit_hash: str,
    sem: asyncio.Semaphore,
) -> Optional[Path]:
    dest = _file_dest(project_id, service_name, commit_hash, file_path)
    if dest.exists():
        return dest
    async with sem:
        if dest.exists():
            return dest
        try:
            content = await client.get_file_content(project_id, file_path, ref)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "download failed: project=%d service=%s file=%s err=%s",
                project_id, service_name, file_path, exc,
            )
            return None
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content, encoding="utf-8")
        return dest


async def sync_service_files(
    project_id: int,
    service_name: str,
    file_paths: Iterable[str],
    ref: str,
    commit_hash: str,
) -> dict[str, Path]:
    """单个微服务级别的批量下载。"""
    client = GitLabClient()
    sem = asyncio.Semaphore(get_settings().AI_AUDIT_GITLAB_FETCH_CONCURRENCY)
    paths = list(file_paths)
    tasks = [
        _fetch_one(client, project_id, service_name, fp, ref, commit_hash, sem)
        for fp in paths
    ]
    results = await asyncio.gather(*tasks)
    return {fp: p for fp, p in zip(paths, results) if p is not None}


async def sync_files(
    project_id: int,
    file_paths: list[str],
    ref: str,
) -> dict[str, Path]:
    """无 service 信息时的扁平接口（兼容旧流程）。"""
    client = GitLabClient()
    sem = asyncio.Semaphore(get_settings().AI_AUDIT_GITLAB_FETCH_CONCURRENCY)
    safe_ref = hashlib.sha1(ref.encode()).hexdigest()[:8]

    async def _legacy(fp: str) -> Optional[Path]:
        dest = source_cache_dir() / str(project_id) / safe_ref / fp
        if dest.exists():
            return dest
        async with sem:
            if dest.exists():
                return dest
            try:
                content = await client.get_file_content(project_id, fp, ref)
            except Exception as exc:  # noqa: BLE001
                logger.warning("download failed: %s err=%s", fp, exc)
                return None
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(content, encoding="utf-8")
            return dest

    results = await asyncio.gather(*[_legacy(fp) for fp in file_paths])
    return {fp: p for fp, p in zip(file_paths, results) if p is not None}
