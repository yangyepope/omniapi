"""
joern-runner FastAPI 包装器。

执行流程：
1. 接收 aisec-worker 的 POST /analyze 请求
2. 调用 joern-parse 把指定目录构建为 cpg.bin
3. 用 joern --script extract_cpg.sc 跑 CPGQL 脚本，输出 JSON
4. 解析 JSON 并返回给调用方

要求 src_dir 在容器内可读（共享卷 /var/cache/aisec）。
"""
import asyncio
import json
import logging
import os
import shutil
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("joern-runner")

CACHE_ROOT = Path("/var/cache/aisec/cpg")
SCRIPT_PATH = Path("/app/scripts/extract_cpg.sc")
JOERN_HEAP = os.environ.get("JOERN_HEAP_SIZE", "4g")

app = FastAPI(title="joern-runner", version="0.1.0")


class AnalyzeRequest(BaseModel):
    service_name: str
    src_dir: str
    commit_hash: str


class ClearCacheRequest(BaseModel):
    service_name: str
    commit_hash: Optional[str] = None


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def _service_cache_dir(service: str, commit: str) -> Path:
    short = (commit or "HEAD")[:12]
    return CACHE_ROOT / service / short


async def _run_subprocess(cmd: list[str], cwd: Optional[Path] = None) -> tuple[int, str, str]:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=str(cwd) if cwd else None,
        env={**os.environ, "JAVA_OPTS": f"-Xmx{JOERN_HEAP}"},
    )
    out, err = await proc.communicate()
    return proc.returncode or 0, out.decode("utf-8", "replace"), err.decode("utf-8", "replace")


@app.post("/analyze")
async def analyze(req: AnalyzeRequest) -> dict[str, Any]:
    src = Path(req.src_dir)
    if not src.exists():
        raise HTTPException(status_code=400, detail=f"src_dir not found: {src}")

    cache = _service_cache_dir(req.service_name, req.commit_hash)
    cache.mkdir(parents=True, exist_ok=True)
    cpg_bin = cache / "cpg.bin"
    out_json = cache / "extract.json"

    # ── Step 1: joern-parse 生成 cpg.bin（若不存在则构建） ──
    if not cpg_bin.exists():
        logger.info("joern-parse %s -> %s", src, cpg_bin)
        rc, stdout, stderr = await _run_subprocess(
            ["joern-parse", "--language", "JAVASRC", str(src), "--output", str(cpg_bin)],
        )
        if rc != 0:
            logger.error("joern-parse failed rc=%d stderr=%s", rc, stderr[-2000:])
            raise HTTPException(
                status_code=500,
                detail=f"joern-parse failed: {stderr[-500:]}",
            )

    # ── Step 2: 执行 extract_cpg.sc 导出节点 / 路径 ──
    logger.info("joern --script %s", SCRIPT_PATH)
    rc, stdout, stderr = await _run_subprocess(
        [
            "joern",
            "--script",
            str(SCRIPT_PATH),
            "--params",
            f"cpgPath={cpg_bin},outPath={out_json},service={req.service_name}",
        ],
    )
    if rc != 0:
        logger.error("joern script failed rc=%d stderr=%s", rc, stderr[-2000:])
        raise HTTPException(
            status_code=500,
            detail=f"joern script failed: {stderr[-500:]}",
        )

    if not out_json.exists():
        # 脚本未输出有效 JSON：返回空骨架
        return {
            "service_name": req.service_name,
            "commit_hash": req.commit_hash,
            "cpg_path": str(cpg_bin),
            "nodes": {
                "endpoints": [],
                "controllers": [],
                "methods": [],
                "calls": [],
                "sql_sinks": [],
                "feign_calls": [],
            },
            "paths": [],
            "warning": "extract_cpg.sc produced no output",
        }

    try:
        data = json.loads(out_json.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("invalid output json: %s", exc)
        data = {}

    return {
        "service_name": req.service_name,
        "commit_hash": req.commit_hash,
        "cpg_path": str(cpg_bin),
        "nodes": data.get("nodes") or {
            "endpoints": [],
            "controllers": [],
            "methods": [],
            "calls": [],
            "sql_sinks": [],
            "feign_calls": [],
        },
        "paths": data.get("paths") or [],
    }


@app.post("/clear-cache")
async def clear_cache(req: ClearCacheRequest) -> dict[str, Any]:
    target = CACHE_ROOT / req.service_name
    if req.commit_hash:
        target = target / req.commit_hash[:12]
    if target.exists():
        shutil.rmtree(target, ignore_errors=True)
        return {"status": "removed", "path": str(target)}
    return {"status": "noop", "path": str(target)}
