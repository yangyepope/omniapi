"""
call_chain_resolver 的协程接口包装（v3.0 §5 cpg/resolver.py）。
"""
import asyncio
from pathlib import Path
from typing import Any, Iterable, Optional

from aisec import call_chain_resolver as _impl


async def resolve_service_directory(
    root: Path,
    extra_files: Optional[Iterable[Path]] = None,
) -> dict[str, list[dict[str, Any]]]:
    return await asyncio.to_thread(_impl.resolve_directory, root, extra_files)
