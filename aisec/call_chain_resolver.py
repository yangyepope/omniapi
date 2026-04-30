"""
call_chain_resolver.py（v3.0 §2.2 / §2.6）：

补充 Joern 不能完整解析的 Java 模式：
- MyBatis XML mapper 中的 SQL Sink（含动态 SQL）
- Spring Data JPA @Query 原生 SQL
- Feign 跨服务调用边界

输出统一结构 {kind, owner_signature, file, line, ...}，由 cpg/builder.py 喂给 neo4j_writer。
"""
import logging
import re
from pathlib import Path
from typing import Any, Iterable, Optional

logger = logging.getLogger(__name__)

_MYBATIS_TAG_RE = re.compile(
    r"<\s*(select|update|insert|delete)\s+[^>]*id\s*=\s*\"([^\"]+)\"[^>]*>(.*?)<\s*/\s*\1\s*>",
    re.DOTALL | re.IGNORECASE,
)
_MAPPER_NAMESPACE_RE = re.compile(
    r"<mapper[^>]*namespace\s*=\s*\"([^\"]+)\"", re.IGNORECASE
)
_DOLLAR_BRACE_RE = re.compile(r"\$\{[^}]+\}")

_JPA_QUERY_RE = re.compile(
    r"@Query\s*\(\s*(?:value\s*=\s*)?\"((?:[^\"\\]|\\.)*)\"",
    re.DOTALL,
)
_JPA_NATIVE_RE = re.compile(r"nativeQuery\s*=\s*true", re.IGNORECASE)

_FEIGN_CLIENT_RE = re.compile(r"@FeignClient\s*\(([^)]*)\)", re.DOTALL)
_FEIGN_NAME_RE = re.compile(r"(?:name|value)\s*=\s*\"([^\"]+)\"")
_FEIGN_METHOD_RE = re.compile(
    r"@(?:GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)\s*\(([^)]*)\)\s*"
    r"(?:public|protected|private)?\s*[\w<>,\[\]\?\s]+?\s+(\w+)\s*\(",
    re.DOTALL,
)


def _line_of(content: str, offset: int) -> int:
    return content.count("\n", 0, offset) + 1


def _shorten(text: str, limit: int = 800) -> str:
    text = text.strip()
    return text[:limit] + "...(truncated)" if len(text) > limit else text


def parse_mybatis_xml(path: Path) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return out

    ns_match = _MAPPER_NAMESPACE_RE.search(content)
    namespace = ns_match.group(1) if ns_match else path.stem

    for m in _MYBATIS_TAG_RE.finditer(content):
        sql_id = m.group(2)
        body = m.group(3)
        line = _line_of(content, m.start())
        risk = bool(_DOLLAR_BRACE_RE.search(body))
        out.append(
            {
                "kind": "mybatis_xml",
                "owner_signature": f"{namespace}.{sql_id}",
                "file": str(path),
                "line": line,
                "sql_pattern": _shorten(body),
                "has_injection_risk": risk,
            }
        )
    return out


def parse_jpa_repository(path: Path) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return out

    cls_match = re.search(r"\b(?:class|interface)\s+(\w+)", content)
    cls_name = cls_match.group(1) if cls_match else path.stem

    for m in _JPA_QUERY_RE.finditer(content):
        sql = m.group(1)
        line = _line_of(content, m.start())
        tail = content[m.end():]
        method_m = re.search(r"\b([\w<>,\[\]\?\s]+)\s+(\w+)\s*\(", tail)
        method_name = method_m.group(2) if method_m else f"line_{line}"
        is_native = bool(_JPA_NATIVE_RE.search(content[m.start() : m.end() + 200]))
        risk = bool(re.search(r"\?\s*\d|\+\s*\w+", sql))
        out.append(
            {
                "kind": "jpa_query",
                "owner_signature": f"{cls_name}.{method_name}",
                "file": str(path),
                "line": line,
                "sql_pattern": _shorten(sql),
                "has_injection_risk": risk and not is_native,
                "is_native": is_native,
            }
        )
    return out


def parse_feign_interfaces(path: Path) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return out

    cls_match = re.search(r"\b(?:class|interface)\s+(\w+)", content)
    cls_name = cls_match.group(1) if cls_match else path.stem

    fc = _FEIGN_CLIENT_RE.search(content)
    if not fc:
        return out
    name_m = _FEIGN_NAME_RE.search(fc.group(1))
    if not name_m:
        return out
    target_service = name_m.group(1)

    for mm in _FEIGN_METHOD_RE.finditer(content):
        method_name = mm.group(2)
        line = _line_of(content, mm.start())
        out.append(
            {
                "kind": "feign_call",
                "caller_signature": f"{cls_name}.{method_name}",
                "target_service": target_service,
                "target_method": method_name,
                "file": str(path),
                "line": line,
            }
        )
    return out


def resolve_directory(
    root: Path,
    extra_files: Optional[Iterable[Path]] = None,
) -> dict[str, list[dict[str, Any]]]:
    """
    扫描微服务根目录 + 额外指定文件，返回三类节点：
        sql_sinks   : MyBatis + JPA 合并
        feign_calls : Feign 跨服务调用
        diagnostics : 解析失败/缺失的文件路径
    """
    sql_sinks: list[dict[str, Any]] = []
    feign_calls: list[dict[str, Any]] = []
    diagnostics: list[dict[str, Any]] = []

    targets: set[Path] = set()
    for p in root.rglob("*.xml"):
        targets.add(p)
    for p in root.rglob("*.java"):
        targets.add(p)
    if extra_files:
        targets.update(extra_files)

    for path in sorted(targets):
        try:
            if path.suffix.lower() == ".xml":
                sql_sinks.extend(parse_mybatis_xml(path))
            elif path.suffix.lower() == ".java":
                sql_sinks.extend(parse_jpa_repository(path))
                feign_calls.extend(parse_feign_interfaces(path))
        except Exception as exc:  # noqa: BLE001
            diagnostics.append({"file": str(path), "error": str(exc)})

    logger.info(
        "call_chain_resolver: root=%s sql_sinks=%d feign_calls=%d errors=%d",
        root, len(sql_sinks), len(feign_calls), len(diagnostics),
    )
    return {
        "sql_sinks": sql_sinks,
        "feign_calls": feign_calls,
        "diagnostics": diagnostics,
    }
