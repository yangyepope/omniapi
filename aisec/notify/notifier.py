"""
通知抽象（v3.0 §6 待确认事项）。

支持渠道（按需开启）：
- 飞书：NOTIFY_FEISHU_WEBHOOK
- 钉钉：NOTIFY_DINGTALK_WEBHOOK
- 邮件：NOTIFY_EMAIL_TO（依赖 SMTP_* 由 security-platform 主配置注入）

只在 summary.findings 中存在 ≥ NOTIFY_MIN_SEVERITY 的发现时才推送。
"""
import logging
import os
from typing import Any

import httpx

from aisec.config import get_settings
from aisec.models.vulnerability import ScanSummary

logger = logging.getLogger(__name__)

_SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}


def _meets_severity(summary: ScanSummary, threshold: str) -> bool:
    th = _SEVERITY_ORDER.get(threshold.upper(), 1)
    if summary.critical_count and th >= 0:
        return True
    if summary.high_count and th >= 1:
        return True
    if summary.medium_count and th >= 2:
        return True
    if summary.low_count and th >= 3:
        return True
    return False


def _format_summary_text(scan_id: str, summary: ScanSummary) -> str:
    lines = [
        f"🛡️ AI 安全扫描完成 — scan_id={scan_id[:8]}…",
        f"项目 ID：{summary.project_id}（mode={summary.mode}）",
        f"漏洞总数：{summary.total_findings}（"
        f"CRITICAL={summary.critical_count}, HIGH={summary.high_count}, "
        f"MEDIUM={summary.medium_count}, LOW={summary.low_count}）",
        f"攻击链：{len(summary.attack_chains)} 条",
    ]
    return "\n".join(lines)


# ── 飞书 ──────────────────────────────────────────────────────────

async def _send_feishu(text: str, webhook: str) -> dict[str, Any]:
    payload = {"msg_type": "text", "content": {"text": text}}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(webhook, json=payload)
            resp.raise_for_status()
            return {"channel": "feishu", "status": "ok", "code": resp.status_code}
        except httpx.HTTPError as exc:
            logger.warning("feishu notify failed: %s", exc)
            return {"channel": "feishu", "status": "failed", "error": str(exc)}


# ── 钉钉 ──────────────────────────────────────────────────────────

async def _send_dingtalk(text: str, webhook: str) -> dict[str, Any]:
    payload = {"msgtype": "text", "text": {"content": text}}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(webhook, json=payload)
            resp.raise_for_status()
            return {"channel": "dingtalk", "status": "ok", "code": resp.status_code}
        except httpx.HTTPError as exc:
            logger.warning("dingtalk notify failed: %s", exc)
            return {"channel": "dingtalk", "status": "failed", "error": str(exc)}


# ── 邮件（aiosmtplib + 主项目 SMTP_* 配置） ──────────────────────

async def _send_email(subject: str, body: str, to: list[str]) -> dict[str, Any]:
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    smtp_from = os.environ.get("EMAILS_FROM_EMAIL", smtp_user or "noreply@aisec")
    if not (smtp_host and smtp_user and smtp_password and to):
        return {"channel": "email", "status": "skipped", "reason": "smtp_not_configured"}

    try:
        import aiosmtplib  # type: ignore
        from email.message import EmailMessage

        msg = EmailMessage()
        msg["From"] = smtp_from
        msg["To"] = ", ".join(to)
        msg["Subject"] = subject
        msg.set_content(body)
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=int(os.environ.get("SMTP_PORT", "587")),
            username=smtp_user,
            password=smtp_password,
            start_tls=os.environ.get("SMTP_TLS", "true").lower() == "true",
        )
        return {"channel": "email", "status": "ok", "to": to}
    except Exception as exc:  # noqa: BLE001
        logger.warning("email notify failed: %s", exc)
        return {"channel": "email", "status": "failed", "error": str(exc)}


# ── 入口 ──────────────────────────────────────────────────────────

async def notify_scan_completed(
    scan_id: str,
    summary: ScanSummary,
) -> dict[str, Any]:
    s = get_settings()
    if not _meets_severity(summary, s.NOTIFY_MIN_SEVERITY):
        return {"status": "skipped", "reason": "below_min_severity"}

    text = _format_summary_text(scan_id, summary)
    results: list[dict[str, Any]] = []

    if s.NOTIFY_FEISHU_WEBHOOK:
        results.append(await _send_feishu(text, s.NOTIFY_FEISHU_WEBHOOK))
    if s.NOTIFY_DINGTALK_WEBHOOK:
        results.append(await _send_dingtalk(text, s.NOTIFY_DINGTALK_WEBHOOK))
    if s.NOTIFY_EMAIL_TO:
        recipients = [a.strip() for a in s.NOTIFY_EMAIL_TO.split(",") if a.strip()]
        results.append(
            await _send_email(
                subject=f"[aisec] 安全扫描完成 scan_id={scan_id[:8]}",
                body=text,
                to=recipients,
            )
        )

    return {"status": "ok" if results else "no_channel", "channels": results}
