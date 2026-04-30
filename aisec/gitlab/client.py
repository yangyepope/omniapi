"""GitLab REST API 封装（v3.0 §1.2 / §1.3 数据来源）。"""
from typing import Any, Optional

import httpx

from aisec.config import get_settings


class GitLabClient:
    def __init__(self) -> None:
        s = get_settings()
        if not s.GITLAB_URL:
            raise RuntimeError("GITLAB_URL is not configured")
        self.base = f"{s.GITLAB_URL.rstrip('/')}/api/v4"
        self.headers = {"PRIVATE-TOKEN": s.GITLAB_ACCESS_TOKEN}

    # ── 仓库结构 / 文件 ─────────────────────────────────────────────

    async def get_repository_tree(
        self,
        project_id: int,
        ref: str = "main",
        path: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        url = f"{self.base}/projects/{project_id}/repository/tree"
        params: dict[str, Any] = {"recursive": True, "ref": ref, "per_page": 100}
        if path:
            params["path"] = path
        files: list[dict[str, Any]] = []
        page = 1
        async with httpx.AsyncClient(timeout=60) as client:
            while True:
                resp = await client.get(
                    url, headers=self.headers, params={**params, "page": page}
                )
                resp.raise_for_status()
                data = resp.json()
                if not data:
                    break
                files.extend(data)
                page += 1
        return files

    async def get_file_content(
        self, project_id: int, file_path: str, ref: str
    ) -> str:
        encoded_path = file_path.replace("/", "%2F")
        url = (
            f"{self.base}/projects/{project_id}/repository/"
            f"files/{encoded_path}/raw"
        )
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=self.headers, params={"ref": ref})
            resp.raise_for_status()
            return resp.text

    # ── MR ─────────────────────────────────────────────────────────

    async def get_mr_changes(
        self, project_id: int, mr_iid: int
    ) -> list[dict[str, Any]]:
        url = f"{self.base}/projects/{project_id}/merge_requests/{mr_iid}/changes"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            return resp.json().get("changes", [])

    # ── Commit hash（v3.0 §2.4 增量）───────────────────────────────

    async def get_last_commit_for_path(
        self, project_id: int, path: str, ref: str
    ) -> Optional[str]:
        url = f"{self.base}/projects/{project_id}/repository/commits"
        params = {"ref_name": ref, "path": path, "per_page": 1}
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(url, headers=self.headers, params=params)
            resp.raise_for_status()
            data = resp.json()
            return data[0].get("id") if data else None

    async def get_project_default_branch(self, project_id: int) -> str:
        url = f"{self.base}/projects/{project_id}"
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            return resp.json().get("default_branch", "main")
