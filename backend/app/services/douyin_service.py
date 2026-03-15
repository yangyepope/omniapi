import logging
import re
from datetime import datetime
from typing import Any

from app.core.http_client import get_client
from app.core.third_party_config import third_party_settings
from app.schemas.douyin import Statistics, VideoData, VideoResponse

logger = logging.getLogger(__name__)

# 预编译正则，提升高频调用性能
URL_PATTERN = re.compile(r"https?://[^\s<>\"']+")


def _format_time(timestamp: int | None) -> str | None:
    """格式化时间戳"""
    if timestamp is None:
        return None
    try:
        return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(timestamp)


def _safe_get(data: Any, *paths: list[Any]) -> Any:
    """
    更直观的取值工具：尝试多个路径，直到拿到第一个非空值。
    用法示例: _safe_get(data, ["aweme_detail", "desc"], ["description"])
    """
    for path in paths:
        try:
            current = data
            for key in path:
                current = current[key]
            if current is not None:
                return current
        except (KeyError, IndexError, TypeError):
            continue
    return None


async def fetch_video_data(link: str) -> VideoResponse:
    try:
        # 1. 前置校验与参数提取
        api_token = third_party_settings.TIKHUB_API_TOKEN
        if not link:
            return VideoResponse(message="请输入有效的视频链接")

        if not api_token or "your_default" in api_token:
            return VideoResponse(message="系统维护中 (Token未配置)")

        match = URL_PATTERN.search(str(link))
        share_url = match.group(0) if match else str(link).strip()

        # 2. 发起请求
        url = third_party_settings.TIKHUB_DOUYIN_VIDEO_URL
        headers = {"accept": "application/json", "Authorization": f"Bearer {api_token}"}

        client = await get_client()
        response = await client.get(
            url, headers=headers, params={"share_url": share_url}, timeout=30.0
        )

        # 3. 状态检查
        if response.status_code == 402:
            logger.warning("Tikhub API 服务余额不足")
            return VideoResponse(message="解析服务额度已耗尽，请稍后再试")

        if response.status_code != 200:
            return VideoResponse(
                message=f"服务响应异常 (Status: {response.status_code})"
            )

        payload = response.json()
        if payload.get("code") != 200:
            return VideoResponse(message=payload.get("msg") or "解析失败")

        # 4. 数据解析 (使用重写的 _safe_get)
        data = payload.get("data", {})
        item = data.get("aweme_detail", {})
        stats = item.get("statistics", {})

        # 填充结构
        statistics = Statistics(
            collect_count=stats.get("collect_count", 0),
            comment_count=stats.get("comment_count", 0),
            digg_count=stats.get("digg_count", 0),
            share_count=stats.get("share_count", 0),
        )

        result_data = VideoData(
            aweme_id=item.get("aweme_id"),
            title=item.get("desc"),
            desc=_safe_get(item, ["desc"], ["description"]),
            duration=item.get("duration"),
            create_time=_format_time(item.get("create_time")),
            # 复杂的嵌套路径使用 _safe_get
            audio_url=_safe_get(item, ["music", "play_url", "url_list", 0]),
            cover_url=_safe_get(item, ["author", "cover_url", 0, "url_list", 0]),
            video_url=_safe_get(
                item,
                ["video", "play_addr_h264", "url_list", 0],
                ["video", "play_addr", "url_list", 0],
            ),
            statistics=statistics,
        )

        if not result_data.video_url:
            return VideoResponse(message="无法获取视频播放地址")

        return VideoResponse(message="解析成功", data=result_data)

    except Exception as e:
        logger.error(f"Douyin Service Error: {e}", exc_info=True)
        return VideoResponse(message="系统繁忙，请稍后重试")
