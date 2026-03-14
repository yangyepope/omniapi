from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.third_party_config import third_party_settings


def test_fetch_video_success(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    key_resp = client.post(
        f"{settings.API_V1_STR}/api-keys/",
        headers=normal_user_token_headers,
        json={"name": "Douyin Test Key"},
    )
    api_key = key_resp.json()["key"]

    mock_response_data = {
        "code": 200,
        "data": {
            "desc": "Test Video",
            "create_time": 1678886400,
            "play_url": "http://video.url",
            "cover_url": "http://cover.url",
            "digg_count": 100,
            "comment_count": 20,
        },
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_response_data

    mock_client_instance = AsyncMock()
    mock_client_instance.get.return_value = mock_response

    with patch("app.services.douyin_service.get_client", new_callable=AsyncMock) as mock_get_client:
        mock_get_client.return_value = mock_client_instance

        with patch.object(third_party_settings, "TIKHUB_API_TOKEN", "test_server_token"):
            response = client.post(
                f"{settings.API_V1_STR}/douyin/fetch-video",
                headers={"X-API-Key": api_key},
                json={"link": "http://douyin.com/video/123"},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["title"] == "Test Video"
    assert data["data"]["video_url"] == "http://video.url"
    assert data["data"]["cover_url"] == "http://cover.url"
    assert data["message"] == "解析成功"

def test_fetch_video_missing_params(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    key_resp = client.post(
        f"{settings.API_V1_STR}/api-keys/",
        headers=normal_user_token_headers,
        json={"name": "Douyin Test Key"},
    )
    api_key = key_resp.json()["key"]

    response = client.post(
        f"{settings.API_V1_STR}/douyin/fetch-video",
        headers={"X-API-Key": api_key},
        json={"link": ""},
    )

    assert response.status_code == 200
    data = response.json()
    assert "视频链接不能为空" in data["message"]

def test_fetch_video_unauthorized(client: TestClient) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/douyin/fetch-video",
        json={"link": "http://douyin.com/video/123"}
    )
    assert response.status_code == 401

def test_fetch_video_with_api_key(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    # 1. Create API Key
    key_resp = client.post(
        f"{settings.API_V1_STR}/api-keys/",
        headers=normal_user_token_headers,
        json={"name": "Douyin Test Key"},
    )
    api_key = key_resp.json()["key"]

    # 2. Use API Key to fetch video
    mock_response_data = {
        "code": 200,
        "data": {
            "desc": "API Key Video",
            "create_time": 1678886400,
            "play_url": "http://video.url",
            "cover_url": "http://cover.url",
        },
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_response_data
    mock_client_instance = AsyncMock()
    mock_client_instance.get.return_value = mock_response

    with patch("app.services.douyin_service.get_client", new_callable=AsyncMock) as mock_get_client:
        mock_get_client.return_value = mock_client_instance
        with patch.object(third_party_settings, "TIKHUB_API_TOKEN", "test_server_token"):
            headers = {"X-API-Key": api_key}
            response = client.post(
                f"{settings.API_V1_STR}/douyin/fetch-video",
                headers=headers,
                json={"link": "http://douyin.com/video/apikey"},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["title"] == "API Key Video"
