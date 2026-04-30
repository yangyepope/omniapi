"""正则预扫描（v3.0 §2.6 Step3）。"""
import logging
import re
from pathlib import Path
from typing import Iterable

logger = logging.getLogger(__name__)

_DYNAMIC_SQL_RE = re.compile(rb"<\s*(if|foreach|choose|when|otherwise)\b")
_JPA_QUERY_RE = re.compile(rb"@Query\s*\(")
_JDBC_TEMPLATE_RE = re.compile(rb"\b(?:JdbcTemplate|NamedParameterJdbcTemplate)\b")
_FEIGN_NONSTD_RE = re.compile(
    rb"@FeignClient|extends\s+(?:JpaRepository|CrudRepository|PagingAndSortingRepository)"
)


def _read_bytes(p: Path) -> bytes:
    try:
        return p.read_bytes()
    except OSError:
        return b""


def prescan_files(roots: Iterable[Path]) -> dict[str, list[str]]:
    """
    递归扫描每个 root 目录，输出 {pattern_name: [file_path]}。

    pattern_name ∈ {mybatis_dynamic_sql, jpa_query, jdbc_template, feign_nonstd}
    """
    result: dict[str, list[str]] = {
        "mybatis_dynamic_sql": [],
        "jpa_query": [],
        "jdbc_template": [],
        "feign_nonstd": [],
    }
    for root in roots:
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            suffix = path.suffix.lower()
            if suffix == ".xml":
                content = _read_bytes(path)
                if _DYNAMIC_SQL_RE.search(content):
                    result["mybatis_dynamic_sql"].append(str(path))
            elif suffix == ".java":
                content = _read_bytes(path)
                if _JPA_QUERY_RE.search(content):
                    result["jpa_query"].append(str(path))
                if _JDBC_TEMPLATE_RE.search(content):
                    result["jdbc_template"].append(str(path))
                if _FEIGN_NONSTD_RE.search(content):
                    result["feign_nonstd"].append(str(path))
    total = sum(len(v) for v in result.values())
    logger.info("prescan total_hits=%d", total)
    return result
