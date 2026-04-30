"""
内部 API 路由：仅供 aisec 等同栈服务调用，**不**暴露给外部用户。

约束：
- 必须带 X-Internal-Token 头匹配 INTERNAL_API_TOKEN 环境变量
- 不挂用户级认证（CurrentUser），完全走 service-to-service token

提供：
- POST /internal/security-findings   接收 aisec 的扫描结论
"""
import json
import logging
import os
import re
import uuid as _uuid
from typing import Annotated, Any

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlmodel import Session, select

from app.api.deps import SessionDep
from app.models import ApiEndpoint, FilteredFlow, FlowTag, Variant

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/internal", tags=["internal"])

INTERNAL_TOKEN_ENV = "INTERNAL_API_TOKEN"
_method_path_re = re.compile(
    r"^\s*(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+(.+?)\s*$",
    re.IGNORECASE,
)


# ── 模型 ──────────────────────────────────────────────────────────

class _Finding(BaseModel):
    rule_id: str
    vulnerability_type: str
    severity: str
    endpoint: str
    location: str
    description: str
    evidence: str
    payload_hint: str | None = None
    service: str | None = None


class _AttackChain(BaseModel):
    endpoints: list[str]
    vulnerabilities: list[str]
    combined_severity: str
    description: str


class _Summary(BaseModel):
    scan_id: str
    project_id: int
    mode: str
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    findings: list[_Finding] = Field(default_factory=list)
    attack_chains: list[_AttackChain] = Field(default_factory=list)


class SecurityFindingsRequest(BaseModel):
    scan_id: str
    project_id: int
    summary: _Summary


# ── 工具 ──────────────────────────────────────────────────────────

def _verify_internal_token(token: str | None) -> None:
    expected = os.environ.get(INTERNAL_TOKEN_ENV, "")
    if not expected:
        # 未配置时也要拒绝，强制部署人显式开启
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="INTERNAL_API_TOKEN not configured",
        )
    if token != expected:
        raise HTTPException(status_code=403, detail="Invalid internal token")


def _parse_endpoint(endpoint: str) -> tuple[str | None, str | None]:
    m = _method_path_re.match(endpoint or "")
    if not m:
        return None, None
    return m.group(1).upper(), m.group(2)


# ── 主接口 ────────────────────────────────────────────────────────

@router.post("/security-findings", status_code=status.HTTP_200_OK)
def receive_security_findings(
    body: SecurityFindingsRequest,
    session: SessionDep,
    x_internal_token: Annotated[str | None, Header(alias="X-Internal-Token")] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """
    接收 aisec 推送的扫描结论，落到流量采集平台：
    - 每条 vulnerability → flow_tags（tag = "{rule_id}:{severity}"）
    - 非空 payload_hint → 衍生一条 variants（source_type='scan'）
    """
    # 接受两种 token 头：自定义 X-Internal-Token 或 Authorization Bearer
    token = x_internal_token
    if token is None and authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
    _verify_internal_token(token)

    tagged = 0
    variants_created = 0
    skipped = 0

    for f in body.summary.findings:
        method, path = _parse_endpoint(f.endpoint)
        if not method or not path:
            skipped += 1
            continue

        endpoint_obj = _resolve_endpoint(session, method, path, f.service)
        if endpoint_obj is None:
            skipped += 1
            continue

        flow = _latest_flow_for_endpoint(session, endpoint_obj.id)
        if flow is None:
            skipped += 1
            continue

        tag_value = f"{f.rule_id}:{f.severity}"
        if _ensure_flow_tag(session, flow.id, tag_value):
            tagged += 1

        if f.payload_hint and f.payload_hint.strip():
            _create_scan_variant(session, flow, body.scan_id, f)
            variants_created += 1

    session.commit()
    logger.info(
        "internal/security-findings: scan=%s tagged=%d variants=%d skipped=%d",
        body.scan_id, tagged, variants_created, skipped,
    )
    return {"tagged": tagged, "variants": variants_created, "skipped": skipped}


# ── 内部辅助 ──────────────────────────────────────────────────────

def _resolve_endpoint(
    session: Session,
    method: str,
    path: str,
    service: str | None,
) -> ApiEndpoint | None:
    stmt = select(ApiEndpoint).where(
        ApiEndpoint.method == method, ApiEndpoint.path == path
    )
    if service:
        stmt = stmt.where(ApiEndpoint.service_name == service)
    stmt = stmt.limit(1)
    return session.exec(stmt).first()


def _latest_flow_for_endpoint(
    session: Session, endpoint_id: _uuid.UUID
) -> FilteredFlow | None:
    return session.exec(
        select(FilteredFlow)
        .where(FilteredFlow.endpoint_id == endpoint_id)
        .order_by(FilteredFlow.captured_at.desc())  # type: ignore[attr-defined]
        .limit(1)
    ).first()


def _ensure_flow_tag(
    session: Session, flow_id: _uuid.UUID, tag_value: str
) -> bool:
    """
    幂等插入 FlowTag — 命中已存在则返回 False。

    遵循 04-数据库并发安全铁律：用 INSERT ... WHERE NOT EXISTS 替代查-判-写。
    """
    result = session.exec(  # type: ignore[call-overload]
        text(
            """
            INSERT INTO flow_tags (flow_id, tag, created_at)
            SELECT :flow_id, :tag, NOW()
             WHERE NOT EXISTS (
                SELECT 1 FROM flow_tags WHERE flow_id = :flow_id AND tag = :tag
             )
             RETURNING id
            """
        ),
        {"flow_id": str(flow_id), "tag": tag_value},
    )
    return result.first() is not None


def _create_scan_variant(
    session: Session,
    flow: FilteredFlow,
    scan_id: str,
    finding: _Finding,
) -> None:
    headers = flow.headers or {}
    variant = Variant(
        root_flow_id=flow.id,
        name=f"AISEC-{finding.rule_id}",
        description=f"扫描派生 payload — {finding.vulnerability_type}",
        method=flow.method,
        url=flow.original_path,
        headers=headers if isinstance(headers, dict) else {},
        body_str=finding.payload_hint or "",
        source_type="scan",
        origin=f"aisec/{scan_id}",
        transformations=[
            {"rule_id": finding.rule_id, "evidence": finding.evidence[:500]}
        ],
    )
    session.add(variant)
