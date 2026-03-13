from fastapi.testclient import TestClient

from app.core.config import settings


def test_create_api_key(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    data = {"name": "Test Key"}
    r = client.post(
        f"{settings.API_V1_STR}/api-keys/",
        headers=normal_user_token_headers,
        json=data,
    )
    assert r.status_code == 200
    created_key = r.json()
    assert created_key["name"] == "Test Key"
    assert created_key["key"].startswith("sk-")
    assert created_key["is_active"] is True

def test_read_api_keys(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    # First create a key
    data = {"name": "Test Key"}
    client.post(
        f"{settings.API_V1_STR}/api-keys/",
        headers=normal_user_token_headers,
        json=data,
    )

    r = client.get(
        f"{settings.API_V1_STR}/api-keys/",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 200
    result = r.json()
    assert result["count"] >= 1
    assert len(result["data"]) >= 1

def test_delete_api_key(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    # Create a key
    data = {"name": "To Delete"}
    r = client.post(
        f"{settings.API_V1_STR}/api-keys/",
        headers=normal_user_token_headers,
        json=data,
    )
    key_id = r.json()["id"]

    # Delete it
    r = client.delete(
        f"{settings.API_V1_STR}/api-keys/{key_id}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["message"] == "API key deleted successfully"

    # Verify it's gone (or at least not in the list if we filtered by active, but here it's hard delete)
    # The current implementation does a hard delete
    r = client.delete(
        f"{settings.API_V1_STR}/api-keys/{key_id}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 404
