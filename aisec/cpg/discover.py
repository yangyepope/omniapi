"""
Activity 4：接口发现（v3.0 §2.2）。

输入：当前扫描的服务列表
输出：{service_name: [{cls, method, http_method, path, file, line, signature}]}
实现：先 Neo4j 查询；查不到回退到本地正则扫描。
"""
import logging
import re
from pathlib import Path
from typing import Any

from aisec.cpg.neo4j_client import run_query

logger = logging.getLogger(__name__)

_REQUEST_MAPPING_RE = re.compile(
    r"@(?:RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)"
    r"\s*(?:\(([^)]*)\))?",
    re.DOTALL,
)
_METHOD_DECL_RE = re.compile(
    r"(?:public|protected|private)?\s*[\w<>,\[\]\?\s]+\s+(\w+)\s*\("
)
_CLASS_RE = re.compile(r"\b(?:class|interface)\s+(\w+)")
_HTTP_BY_ANNO = {
    "GetMapping": "GET",
    "PostMapping": "POST",
    "PutMapping": "PUT",
    "DeleteMapping": "DELETE",
    "PatchMapping": "PATCH",
}
_PATH_PATTERN = re.compile(r"(?:value|path)\s*=\s*\"([^\"]+)\"")


async def discover_endpoints_via_neo4j(service_name: str) -> list[dict[str, Any]]:
    rows = await run_query(
        """
        MATCH (c:CONTROLLER {service: $service})
        RETURN c.cls AS cls, c.method AS method,
               c.http_method AS http_method, c.path AS path,
               c.file AS file, c.line AS line, c.signature AS signature
        ORDER BY c.cls, c.method
        """,
        {"service": service_name},
    )
    return rows


def _scan_file_for_endpoints(path: Path, base_path: str = "") -> list[dict[str, Any]]:
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    cls_match = _CLASS_RE.search(content)
    cls_name = cls_match.group(1) if cls_match else path.stem

    out: list[dict[str, Any]] = []
    for m in _REQUEST_MAPPING_RE.finditer(content):
        anno_args = m.group(1) or ""
        full = m.group(0)
        method_match = _METHOD_DECL_RE.search(content[m.end():])
        if not method_match:
            continue
        method_name = method_match.group(1)
        line = content.count("\n", 0, m.start()) + 1

        anno_name_m = re.search(r"@(\w+)", full)
        http_method = "ANY"
        if anno_name_m:
            http_method = _HTTP_BY_ANNO.get(anno_name_m.group(1), "ANY")

        path_m = _PATH_PATTERN.search(anno_args)
        if path_m:
            local_path = path_m.group(1)
        else:
            inline = re.search(r"\"([^\"]+)\"", anno_args)
            local_path = inline.group(1) if inline else ""

        full_path = (base_path + local_path) if local_path.startswith("/") else \
            f"{base_path}/{local_path}".replace("//", "/")

        out.append(
            {
                "cls": cls_name,
                "method": method_name,
                "http_method": http_method,
                "path": full_path,
                "file": str(path),
                "line": line,
                "signature": f"{cls_name}.{method_name}",
            }
        )
    return out


async def discover_endpoints_via_files(root: Path) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for path in root.rglob("*.java"):
        try:
            head = path.read_text(encoding="utf-8", errors="replace")[:2000]
        except OSError:
            continue
        if "@RestController" not in head and "@Controller" not in head:
            continue
        cls_anno = re.search(
            r"@RequestMapping\s*\(([^)]*)\)\s*(?:public|abstract)?\s*class",
            path.read_text(encoding="utf-8", errors="replace"),
        )
        base_path = ""
        if cls_anno:
            m = _PATH_PATTERN.search(cls_anno.group(1))
            if m:
                base_path = m.group(1)
        out.extend(_scan_file_for_endpoints(path, base_path))
    return out


async def discover_for_services(
    services: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """services 元素：{service_name, root_path}"""
    result: dict[str, list[dict[str, Any]]] = {}
    for s in services:
        name = s["service_name"]
        endpoints = await discover_endpoints_via_neo4j(name)
        if not endpoints and "root_path" in s:
            root = Path(s["root_path"])
            endpoints = await discover_endpoints_via_files(root)
        result[name] = endpoints
        logger.info("interface discovery: service=%s endpoints=%d", name, len(endpoints))
    return result
