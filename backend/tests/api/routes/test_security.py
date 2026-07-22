"""安全控制台代理路由(/api/v1/security/*)的转发 + 错误映射测试。

这些路由是薄代理:把请求转发到 gitlab-scanner 的 /api/admin/* REST 面。
测试策略:patch 掉 `app.api.routes.security.ScannerClient`,断言
  ① 路由把参数/body 正确转发给 ScannerClient 方法(含 updated_by 服务端注入);
  ② `_call_scanner` 把 scanner 抛的 httpx.HTTPStatusError(409/404/400)映射为同码。
不打真实网络。覆盖本次新增的 B(规则库/skills/自定义规则)+ D(接口画像/服务
profile/ai-context)端点。
"""
from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
from fastapi.testclient import TestClient

_PREFIX = "/api/v1/security"


def _http_error(status_code: int, text: str = "boom") -> httpx.HTTPStatusError:
    """构造一个 scanner 侧会抛出的 HTTPStatusError(带 response)。"""
    request = httpx.Request("GET", "http://scanner/api/admin/x")
    response = httpx.Response(status_code, text=text, request=request)
    return httpx.HTTPStatusError(text, request=request, response=response)


@contextmanager
def _patch_scanner(**methods):
    """patch ScannerClient 为异步上下文管理器,注入指定的 AsyncMock 方法。

    用法:
        with _patch_scanner(list_rules=<dict or exc>) as inst:
            ...
    每个 kwarg 的值:普通对象 → 作为 return_value;Exception 实例 → 作为
    side_effect(触发 _call_scanner 的错误映射)。
    返回内部 client mock(inst),可断言调用参数。
    """
    inst = MagicMock()
    for name, val in methods.items():
        if isinstance(val, BaseException):
            setattr(inst, name, AsyncMock(side_effect=val))
        else:
            setattr(inst, name, AsyncMock(return_value=val))
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=inst)
    cm.__aexit__ = AsyncMock(return_value=False)
    with patch(
        "app.api.routes.security.ScannerClient", MagicMock(return_value=cm),
    ):
        yield inst


# ── B: 规则库 / skills(只读)────────────────────────────────────────


def test_list_rules_forwards_query_params(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    payload = {"total": 1, "limit": 5, "offset": 0, "items": []}
    with _patch_scanner(list_rules=payload) as inst:
        r = client.get(
            f"{_PREFIX}/ai/rules",
            params={"q": "sql", "cwe": "CWE-89", "limit": 5, "offset": 0},
            headers=superuser_token_headers,
        )
    assert r.status_code == 200
    assert r.json() == payload
    kwargs = inst.list_rules.call_args.kwargs
    assert kwargs["q"] == "sql"
    assert kwargs["cwe"] == "CWE-89"
    assert kwargs["limit"] == 5
    assert kwargs["offset"] == 0


def test_get_rule_with_slash_id(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    detail = {"source": "master_rules", "rule_id": "a/b", "description": "d"}
    with _patch_scanner(get_rule=detail) as inst:
        r = client.get(
            f"{_PREFIX}/ai/rules/master_rules/a/b",
            headers=superuser_token_headers,
        )
    assert r.status_code == 200
    inst.get_rule.assert_awaited_once_with("master_rules", "a/b")


def test_list_skills_ok(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    payload = {"total": 0, "limit": 50, "offset": 0, "items": []}
    with _patch_scanner(list_skills=payload) as inst:
        r = client.get(
            f"{_PREFIX}/ai/skills",
            params={"subdomain": "web"},
            headers=superuser_token_headers,
        )
    assert r.status_code == 200
    assert inst.list_skills.call_args.kwargs["subdomain"] == "web"


# ── B: 自定义规则(CRUD)────────────────────────────────────────────


def test_create_custom_rule_injects_updated_by(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    created = {"rule_id": "R1", "title": "t", "description": "d"}
    with _patch_scanner(create_custom_rule=created) as inst:
        r = client.post(
            f"{_PREFIX}/ai/custom-rules",
            json={"rule_id": "R1", "title": "t", "description": "d",
                  "cwes": ["CWE-89"]},
            headers=superuser_token_headers,
        )
    assert r.status_code == 201
    args, kwargs = inst.create_custom_rule.call_args
    # 第一个位置参:body dict;updated_by 由服务端注入(不取自请求体)。
    assert args[0]["rule_id"] == "R1"
    assert args[0]["cwes"] == ["CWE-89"]
    assert isinstance(kwargs["updated_by"], str) and kwargs["updated_by"]


def test_create_custom_rule_conflict_maps_409(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    with _patch_scanner(create_custom_rule=_http_error(409, "duplicate")):
        r = client.post(
            f"{_PREFIX}/ai/custom-rules",
            json={"rule_id": "R1", "title": "t", "description": "d"},
            headers=superuser_token_headers,
        )
    assert r.status_code == 409


def test_update_custom_rule_partial(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    updated = {"rule_id": "R1", "enabled": False}
    with _patch_scanner(update_custom_rule=updated) as inst:
        r = client.put(
            f"{_PREFIX}/ai/custom-rules/R1",
            json={"enabled": False},
            headers=superuser_token_headers,
        )
    assert r.status_code == 200
    args, kwargs = inst.update_custom_rule.call_args
    assert args[0] == "R1"
    # exclude_unset:只转发真正传了的字段。
    assert args[1] == {"enabled": False}
    assert isinstance(kwargs["updated_by"], str) and kwargs["updated_by"]


def test_delete_custom_rule_204(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    with _patch_scanner(delete_custom_rule=None) as inst:
        r = client.delete(
            f"{_PREFIX}/ai/custom-rules/R1", headers=superuser_token_headers,
        )
    assert r.status_code == 204
    inst.delete_custom_rule.assert_awaited_once_with("R1")


def test_delete_custom_rule_404(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    with _patch_scanner(delete_custom_rule=_http_error(404, "nope")):
        r = client.delete(
            f"{_PREFIX}/ai/custom-rules/nope", headers=superuser_token_headers,
        )
    assert r.status_code == 404


# ── D: 项目理解(接口画像 / 服务 profile / ai-context)──────────────


def test_update_interface_forwards_changes_no_updated_by(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    resp = {"id": 7, "human_locked": True}
    with _patch_scanner(update_interface=resp) as inst:
        r = client.put(
            f"{_PREFIX}/interfaces/7",
            json={"risk_level": "P0"},
            headers=superuser_token_headers,
        )
    assert r.status_code == 200
    args, _ = inst.update_interface.call_args
    assert args[0] == 7
    # scanner PUT 忽略 updated_by,代理不注入;只转发 exclude_unset 后的字段。
    assert args[1] == {"risk_level": "P0"}


def test_get_service_profile_ok(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    prof = {"service_name": "svc", "business_summary": None, "description": None}
    with _patch_scanner(get_service_profile=prof) as inst:
        r = client.get(
            f"{_PREFIX}/services/svc/profile", headers=superuser_token_headers,
        )
    assert r.status_code == 200
    inst.get_service_profile.assert_awaited_once_with("svc")


def test_update_service_profile_injects_updated_by(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    prof = {"service_name": "svc", "business_summary": "b", "description": "d"}
    with _patch_scanner(update_service_profile=prof) as inst:
        r = client.put(
            f"{_PREFIX}/services/svc/profile",
            json={"business_summary": "b", "description": "d"},
            headers=superuser_token_headers,
        )
    assert r.status_code == 200
    args, kwargs = inst.update_service_profile.call_args
    assert args[0] == "svc"
    assert args[1] == {"business_summary": "b", "description": "d"}
    assert isinstance(kwargs["updated_by"], str) and kwargs["updated_by"]


def test_delete_service_profile_204(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    with _patch_scanner(delete_service_profile=None) as inst:
        r = client.delete(
            f"{_PREFIX}/services/svc/profile", headers=superuser_token_headers,
        )
    assert r.status_code == 204
    inst.delete_service_profile.assert_awaited_once_with("svc")


def test_get_ai_context_forwards_sha(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    ctx = {"service_name": "svc", "sha": "abc", "context": "..."}
    with _patch_scanner(get_ai_context=ctx) as inst:
        r = client.get(
            f"{_PREFIX}/services/svc/ai-context",
            params={"sha": "abc"},
            headers=superuser_token_headers,
        )
    assert r.status_code == 200
    inst.get_ai_context.assert_awaited_once_with("svc", sha="abc")


# ── engines catalog (DISC-004, read-only) ────────────────────────────


def test_list_engines_forwards(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    payload = {
        "items": [
            {
                "name": "semgrep",
                "display": "Semgrep",
                "kind": "sast",
                "enabled": True,
                "binary_present": True,
                "optional": True,
                "config_keys": ["SEMGREP_TIMEOUT_SECONDS"],
            },
        ],
    }
    with _patch_scanner(list_engines=payload) as inst:
        r = client.get(f"{_PREFIX}/engines", headers=superuser_token_headers)
    assert r.status_code == 200
    assert r.json() == payload
    inst.list_engines.assert_awaited_once_with()


def test_list_engines_scanner_unconfigured_maps_503(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    with _patch_scanner(list_engines=_http_error(503, "not configured")):
        r = client.get(f"{_PREFIX}/engines", headers=superuser_token_headers)
    assert r.status_code == 503


# ── system profile (系统画像) ─────────────────────────────────────────


def test_get_system_profile_forwards(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    payload = {"service_name": "svc", "sha": "abc", "narrative": "n",
               "framework": {}, "surface": {}, "flow": {}, "risks": {}}
    with _patch_scanner(get_system_profile=payload) as inst:
        r = client.get(
            f"{_PREFIX}/services/svc/system-profile",
            params={"sha": "abc"},
            headers=superuser_token_headers,
        )
    assert r.status_code == 200
    assert r.json() == payload
    kwargs = inst.get_system_profile.call_args.kwargs
    assert kwargs["sha"] == "abc"
    assert inst.get_system_profile.call_args.args == ("svc",)


def test_get_system_profile_missing_maps_404(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    with _patch_scanner(get_system_profile=_http_error(404, "no profile")):
        r = client.get(
            f"{_PREFIX}/services/svc/system-profile",
            headers=superuser_token_headers,
        )
    assert r.status_code == 404


def test_system_profile_history_forwards(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    payload = {"items": [{"sha": "abc", "generator_version": "v1+x",
                          "generated_at": "2026-07-11T00:00:00"}]}
    with _patch_scanner(system_profile_history=payload) as inst:
        r = client.get(
            f"{_PREFIX}/services/svc/system-profile/history",
            headers=superuser_token_headers,
        )
    assert r.status_code == 200
    assert r.json() == payload
    inst.system_profile_history.assert_awaited_once()


def test_regenerate_system_profile_forwards(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    payload = {"service_name": "svc", "sha": "abc", "narrative": "fresh",
               "framework": {}, "surface": {}, "flow": {}, "risks": {}}
    with _patch_scanner(regenerate_system_profile=payload) as inst:
        r = client.post(
            f"{_PREFIX}/services/svc/system-profile/regenerate",
            headers=superuser_token_headers,
        )
    assert r.status_code == 200
    assert r.json()["narrative"] == "fresh"
    assert inst.regenerate_system_profile.call_args.args == ("svc",)


def test_regenerate_system_profile_missing_maps_404(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    with _patch_scanner(
        regenerate_system_profile=_http_error(404, "run a scan first"),
    ):
        r = client.post(
            f"{_PREFIX}/services/svc/system-profile/regenerate",
            headers=superuser_token_headers,
        )
    assert r.status_code == 404


# ── 按 GitLab 组地址导入项目(scanner FEAT-030 代理)────────────────


def test_discover_group_forwards_body(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    payload = {"group_path": "iam/mg", "total": 1, "items": [
        {"repo_url": "http://g/iam/mg/auth.git", "status": "new"},
    ]}
    with _patch_scanner(discover_group=payload) as inst:
        r = client.post(
            f"{_PREFIX}/projects/discover-group",
            json={"group_path": "iam/mg", "project_key": "iam-mg"},
            headers=superuser_token_headers,
        )
    assert r.status_code == 200
    assert r.json() == payload
    body = inst.discover_group.call_args.args[0]
    assert body["group_path"] == "iam/mg"
    assert body["project_key"] == "iam-mg"


def test_discover_group_bad_group_maps_404(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    with _patch_scanner(discover_group=_http_error(404, "group not found")):
        r = client.post(
            f"{_PREFIX}/projects/discover-group",
            json={"group_path": "nope/nope"},
            headers=superuser_token_headers,
        )
    assert r.status_code == 404


def test_import_group_injects_created_by_and_forwards(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    resp = {"project": {"key": "iam-mg"}, "created": 1, "skipped": 0, "items": [
        {"repo_url": "http://g/iam/mg/auth.git", "outcome": "created",
         "webhook": "created"},
    ]}
    with _patch_scanner(import_group=resp) as inst:
        r = client.post(
            f"{_PREFIX}/projects/import-group",
            json={
                "project_key": "iam-mg", "project_name": "IAM MG",
                "group_path": "iam/mg",
                "repos": [{
                    "project_id": 1,
                    "repo_url": "http://g/iam/mg/auth.git",
                    "name": "auth", "group_name": "iam-mg",
                }],
            },
            headers=superuser_token_headers,
        )
    assert r.status_code == 201
    body = inst.import_group.call_args.args[0]
    assert body["project_key"] == "iam-mg"
    assert body["repos"][0]["repo_url"] == "http://g/iam/mg/auth.git"
    # created_by 由服务端注入(请求体没给)
    assert isinstance(body["created_by"], str) and body["created_by"]


def test_import_group_webhook_failure_passthrough(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    # scanner 200 返回、webhook 逐仓库标 failed —— 代理原样透传,不报错。
    resp = {"project": {"key": "iam-mg"}, "created": 1, "skipped": 0, "items": [
        {"repo_url": "http://g/iam/mg/auth.git", "outcome": "created",
         "webhook": "failed", "detail": "insufficient_scope"},
    ]}
    with _patch_scanner(import_group=resp):
        r = client.post(
            f"{_PREFIX}/projects/import-group",
            json={"project_key": "iam-mg", "group_path": "iam/mg", "repos": [{
                "project_id": 1, "repo_url": "http://g/iam/mg/auth.git",
                "name": "auth"}]},
            headers=superuser_token_headers,
        )
    assert r.status_code == 201
    assert r.json()["items"][0]["webhook"] == "failed"


def test_sync_group_forwards_key_and_body(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    resp = {"project_key": "iam-mg", "added": 1, "skipped": 1, "conflicts": 0,
            "items": []}
    with _patch_scanner(sync_group=resp) as inst:
        r = client.post(
            f"{_PREFIX}/projects/iam-mg/sync-group",
            json={"group_path": "iam/mg"},
            headers=superuser_token_headers,
        )
    assert r.status_code == 200
    args = inst.sync_group.call_args.args
    assert args[0] == "iam-mg"
    assert args[1]["group_path"] == "iam/mg"


def test_sync_group_missing_project_maps_404(
    client: TestClient, superuser_token_headers: dict,
) -> None:
    with _patch_scanner(sync_group=_http_error(404, "project not found")):
        r = client.post(
            f"{_PREFIX}/projects/ghost/sync-group",
            json={"group_path": "iam/mg"},
            headers=superuser_token_headers,
        )
    assert r.status_code == 404
