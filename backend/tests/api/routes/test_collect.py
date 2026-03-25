"""
本文件包含与当前模块相关的测试用例或脚本逻辑。
主要用于验证核心功能或提供辅助工具。
"""
"""
测试 /v1/collect 接口 (Nginx Mirror Traffic 收集端)
"""
import pytest
from fastapi.testclient import TestClient

def test_collect_traffic_no_content(client: TestClient) -> None:
    """
    测试正常发送请求时，接口应返回 204 No Content
    """
    test_payload = {"user_id": 123, "action": "click"}
    test_headers = {"X-Mirror-Source": "nginx"}
    
    # [注意]：由于该路由在 app/main.py 中被独立挂载在 /v1，而非全局的 /api/v1，所以路径是 /v1/collect/
    response = client.post(
        "/v1/collect/",
        json=test_payload,
        headers=test_headers
    )
    
    # 验证响应状态码为 204
    assert response.status_code == 204
    # 204 No Content 意味着响应体应该为空
    assert response.content == b""

def test_collect_traffic_invalid_body_handled(client: TestClient) -> None:
    """
    测试发送异常或格式错误的 Body 时，接口仍应捕获异常并返回 204
    (保证 Nginx 镜像流量的失败不影响应用整体状态)
    """
    # 发送不完整的 JSON 字符串
    response = client.post(
        "/v1/collect/",
        content=b"{invalid_json",
        headers={"Content-Type": "application/json"}
    )
    
    # 即使出错也应返回 204
    assert response.status_code == 204

def test_collect_traffic_no_slash(client: TestClient) -> None:
    """
    测试没有 trailing slash 的情况 (请求 /v1/collect)
    """
    response = client.post("/v1/collect")
    assert response.status_code == 204
