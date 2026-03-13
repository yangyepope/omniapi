from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.core.config import settings


def test_fetch_video_success(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    mock_response_data = {
        "code": 200,
        "data": {
            "aweme_detail": {
                "desc": "Test Video",
                "create_time": 1678886400,
                "statistics": {
                    "digg_count": 100,
                    "comment_count": 20
                },
                "video": {
                    "play_addr": {
                        "url_list": ["http://video.url"]
                    }
                },
                "author": {
                    "cover_url": [{"url_list": ["http://cover.url"]}]
                }
            }
        }
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_response_data

    # Mock get_client to return a mock client that returns mock_response
    mock_client_instance = AsyncMock()
    mock_client_instance.get.return_value = mock_response

    # Patch get_client in the service module
    with patch("app.services.douyin_service.get_client", new_callable=AsyncMock) as mock_get_client:
        mock_get_client.return_value = mock_client_instance

        # Ensure TIKHUB_API_TOKEN is set for test
        with patch("app.core.config.settings.TIKHUB_API_TOKEN", "test_server_token"):
            response = client.post(
                f"{settings.API_V1_STR}/douyin/fetch-video",
                headers=normal_user_token_headers,
                json={"link": "http://douyin.com/video/123"}
            )

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["title"] == "Test Video"
    assert data["data"]["video_url"] == "http://video.url"
    assert data["data"]["cover_url"] == "http://cover.url"
    assert "寻求技术支持" in data["message"]

def test_fetch_video_missing_params(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    # Use empty strings to simulate missing values that Pydantic string validation allows
    # but application logic rejects
    response = client.post(
        f"{settings.API_V1_STR}/douyin/fetch-video",
        headers=normal_user_token_headers,
        json={"link": ""}
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
        json={"name": "Douyin Test Key"}
    )
    api_key = key_resp.json()["key"]

    # 2. Use API Key to fetch video
    mock_response_data = {
        "code": 200,
        "data": {
            "aweme_detail": {
                "desc": "API Key Video",
                "create_time": 1678886400,
                "video": {
                    "play_addr": {
                        "url_list": ["http://video.url"]
                    }
                },
                "author": {
                    "cover_url": [{"url_list": ["http://cover.url"]}]
                }
            }
        }
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_response_data
    mock_client_instance = AsyncMock()
    mock_client_instance.get.return_value = mock_response

    with patch("app.services.douyin_service.get_client", new_callable=AsyncMock) as mock_get_client:
        mock_get_client.return_value = mock_client_instance
        with patch("app.core.config.settings.TIKHUB_API_TOKEN", "test_server_token"):
            # Use Bearer scheme with API Key
            headers = {"Authorization": f"Bearer {api_key}"}
            response = client.post(
                f"{settings.API_V1_STR}/douyin/fetch-video",
                headers=headers,
                json={"link": "http://douyin.com/video/apikey"}
            )

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["title"] == "API Key Video"
