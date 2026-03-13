import re
from datetime import datetime
from typing import Any

from app.core.config import settings
from app.core.http_client import get_client
from app.core.logger import logger
from app.schemas.douyin import (
    Statistics,
    TikhubRawResponse,
    VideoData,
    VideoResponse,
)


def _format_time(value: int | float | None) -> str | None:
    if value is None:
        return None
    try:
        return datetime.fromtimestamp(value).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(value)


def _get_nested(data: dict | list | Any, path: list[str | int]) -> Any:
    current = data
    for key in path:
        if isinstance(current, dict) and key in current:
            current = current[key]
        elif isinstance(current, list) and isinstance(key, int) and 0 <= key < len(current):
            current = current[key]
        else:
            return None
    return current


async def fetch_video_data(link: str) -> VideoResponse:
    """
    Service logic to fetch and process Douyin video data.
    """
    try:
        api_token = settings.TIKHUB_API_TOKEN

        logger.info(f"【前置校验】link: {link}, using system api_token")
        if not link:
            logger.error("【前置校验失败】link为空")
            return VideoResponse(message="link不能为空")

        if not api_token or api_token == "your_default_token_here_or_load_from_env":
            logger.error("【配置错误】系统未配置 TIKHUB_API_TOKEN")
            return VideoResponse(message="系统配置错误：未配置API Token")

        match = re.search(r"https?://[^\s<>\"']+", str(link))
        share_url = match.group(0) if match else str(link).strip()
        logger.info(f"【链接提取】最终请求的share_url: {share_url}")

        url = settings.TIKHUB_API_URL
        headers = {"accept": "application/json", "Authorization": f"Bearer {api_token}"}
        params = {"share_url": share_url}

        logger.info(f"【即将发起请求】URL: {url}")
        logger.info("【请求中】已发送请求，等待响应")

        client = await get_client()
        response = await client.get(url, headers=headers, params=params, timeout=30.0)

        logger.info(f"【请求完成】响应状态码: {response.status_code}")

        if response.status_code != 200:
            logger.warning(f"【请求失败】状态码: {response.status_code}")
            return VideoResponse(message=f"请求失败，状态码: {response.status_code}")

        try:
            payload = response.json()
        except Exception as e:
            logger.error(f"【响应解析失败】: {str(e)}")
            return VideoResponse(message="响应解析失败")

        # Validate raw response with Pydantic
        # raw_resp = TikhubRawResponse(**payload)
        # Manually validate to avoid double expansion if payload is nested strangely or has extra fields
        raw_resp = TikhubRawResponse.model_validate(payload)

        # Check API specific error codes
        if raw_resp.code not in (None, 0, 200):
             msg = raw_resp.msg or "API Error"
             return VideoResponse(message=msg)

        # Extract data
        # Handle case where 'data' might be the root or inside 'data' field
        data_root = payload.get("data") if isinstance(payload, dict) and "data" in payload else payload
        if data_root is None:
             data_root = {}

        # Extract fields using safer navigation
        aweme_detail = data_root.get("aweme_detail", {})

        # Helper to safely extract nested
        def get_safe(root, path):
             return _get_nested(root, path)

        create_time_raw = (
            aweme_detail.get("create_time") or
            data_root.get("create_time") or
            data_root.get("create_time_str")
        )

        statistics_raw = aweme_detail.get("statistics", {})
        statistics = Statistics(**statistics_raw) if statistics_raw else None

        video_url = (
            get_safe(aweme_detail, ["video", "play_addr_h264", "url_list", 0]) or
            get_safe(aweme_detail, ["video", "play_addr", "url_list", 0])
        )

        cover_url = get_safe(aweme_detail, ["author", "cover_url", 0, "url_list", 0])
        audio_url = get_safe(aweme_detail, ["music", "play_url", "url_list", 0])
        desc = aweme_detail.get("desc") or data_root.get("desc") or data_root.get("description")
        title = aweme_detail.get("desc") # Original logic mapped title to desc as well

        result_data = VideoData(
            audio_url=audio_url,
            aweme_id=aweme_detail.get("aweme_id"),
            cover_url=cover_url,
            create_time=_format_time(create_time_raw),
            desc=desc,
            duration=aweme_detail.get("duration"),
            statistics=statistics,
            title=title,
            video_url=video_url
        )

        # Basic validation if result is empty
        if not any([result_data.video_url, result_data.desc, result_data.aweme_id]):
             return VideoResponse(message="链接可能无效或已过期，视频可能已失效或下架")

        return VideoResponse(
            data=result_data,
            message=settings.SUPPORT_CONTACT
        )

    except Exception as e:
        logger.error(f"【代码执行崩溃】: {str(e)}")
        return VideoResponse(message=f"代码执行出错：{str(e)}")
