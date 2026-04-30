"""
微服务 / 公共模块识别（v3.0 §2.3）。

判定规则（满足任意 2 条认定为公共模块）：
1. 目录名包含 common / parent / core / base
2. 模块下无 @RestController 或 @Controller 注解
3. 被其他模块 pom.xml 以 <dependency> 引用
"""
import logging
import re
from pathlib import Path
from typing import Iterable

logger = logging.getLogger(__name__)

_COMMON_KEYWORDS = ("common", "parent", "core", "base", "shared", "framework")
_CONTROLLER_PATTERN = re.compile(r"@(?:RestController|Controller)\b")
_POM_DEP_PATTERN = re.compile(
    r"<dependency>.*?<artifactId>(?P<art>[^<]+)</artifactId>.*?</dependency>",
    re.DOTALL,
)


def _has_controller(java_files: Iterable[Path]) -> bool:
    for jf in java_files:
        try:
            content = jf.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if _CONTROLLER_PATTERN.search(content):
            return True
    return False


def _extract_pom_deps(pom: Path) -> set[str]:
    try:
        content = pom.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return set()
    return {m.group("art").strip() for m in _POM_DEP_PATTERN.finditer(content)}


def discover_modules(
    repo_root: Path,
    file_paths: list[str],  # noqa: ARG001 — 预留：根据变更文件做范围裁剪
) -> list[dict]:
    """
    扫描仓库并识别每个模块的属性，返回：
        [{"service_name", "module_kind", "root_path", "has_controller", "referenced_by"}, ...]
    """
    repo_root = repo_root.resolve()
    candidates: dict[str, Path] = {}

    for pom in repo_root.rglob("pom.xml"):
        rel_dir = pom.parent.relative_to(repo_root)
        if str(rel_dir) == ".":
            continue
        candidates[rel_dir.parts[0]] = repo_root / rel_dir.parts[0]

    if not candidates:
        for child in repo_root.iterdir():
            if child.is_dir() and not child.name.startswith("."):
                candidates[child.name] = child

    art_to_module: dict[str, str] = {}
    art_re = re.compile(r"<artifactId>([^<]+)</artifactId>")
    for name, root in candidates.items():
        pom = root / "pom.xml"
        if not pom.exists():
            continue
        try:
            m = art_re.search(pom.read_text(encoding="utf-8", errors="replace"))
            if m:
                art_to_module[m.group(1).strip()] = name
        except OSError:
            continue

    referenced: dict[str, set[str]] = {n: set() for n in candidates}
    for name, root in candidates.items():
        pom = root / "pom.xml"
        if not pom.exists():
            continue
        for art in _extract_pom_deps(pom):
            target = art_to_module.get(art)
            if target and target != name:
                referenced[target].add(name)

    modules: list[dict] = []
    for name, root in candidates.items():
        java_files = list(root.rglob("*.java"))
        has_ctrl = _has_controller(java_files)
        score = 0
        if any(kw in name.lower() for kw in _COMMON_KEYWORDS):
            score += 1
        if not has_ctrl:
            score += 1
        if referenced[name]:
            score += 1
        if score >= 2:
            kind = "common"
        elif name.lower() in ("parent", "build-parent"):
            kind = "parent"
        else:
            kind = "service"
        modules.append(
            {
                "service_name": name,
                "module_kind": kind,
                "root_path": str(root.relative_to(repo_root)),
                "has_controller": has_ctrl,
                "referenced_by": sorted(referenced[name]),
            }
        )

    logger.info("discover_modules: repo=%s found=%d", repo_root, len(modules))
    return modules


def services_to_rebuild(
    modules: list[dict],
    changed_files: list[str],
) -> list[str]:
    """
    根据变更文件清单决定哪些微服务需要重建 CPG（v3.0 §2.3）：
      - 任一公共模块改动 → 全量重建
      - 仅 service 模块改动 → 只重建对应 service
    """
    if not modules:
        return []
    by_root = sorted(
        ((m["root_path"], m["service_name"], m["module_kind"]) for m in modules),
        key=lambda x: -len(x[0]),
    )
    affected_services: set[str] = set()
    common_changed = False
    for fp in changed_files:
        for root, name, kind in by_root:
            if root and (fp == root or fp.startswith(root + "/")):
                if kind == "common":
                    common_changed = True
                affected_services.add(name)
                break

    if common_changed:
        return [m["service_name"] for m in modules if m["module_kind"] == "service"]
    return sorted({s for s in affected_services if any(
        m["service_name"] == s and m["module_kind"] == "service" for m in modules
    )})
