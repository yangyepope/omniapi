import logging  # 标准库日志：用于输出 402 等可预期异常的告警信息
import re
from datetime import datetime
from typing import Any

from app.core.http_client import get_client
from app.core.third_party_config import third_party_settings
from app.schemas.douyin import (
    Statistics,
    VideoData,
    VideoResponse,
)

logger = logging.getLogger(__name__)  # 模块级 logger：继承应用/uvicorn 的 logging 配置输出


def _format_time(value: int | float | None) -> str | None:
    if value is None:
        return None
    try:
        return datetime.fromtimestamp(value).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(value)


def _get_nested(data: dict[str, Any] | list[Any] | Any, path: list[str | int]) -> Any:
    current = data
    for key in path:
        if isinstance(current, dict) and isinstance(key, str) and key in current:
            current = current[key]
        elif (
            isinstance(current, list)
            and isinstance(key, int)
            and 0 <= key < len(current)
        ):
            current = current[key]
        else:
            return None
    return current


async def fetch_video_data(link: str) -> VideoResponse:
    """
    获取抖音视频数据的核心逻辑
    """
    try:
        # 获取系统配置的 Tikhub API Token
        api_token = third_party_settings.TIKHUB_API_TOKEN

        # 校验: 链接不能为空
        if not link:
            return VideoResponse(message="请输入有效的视频链接")

        # 校验: 系统是否配置了 API Token
        if not api_token or api_token == "your_default_token_here_or_load_from_env":
            return VideoResponse(message="系统维护中，请稍后再试 (Token未配置)")

        # 1. 提取分享文本中的 URL (兼容复制的整段文案)
        # 正则匹配 http/https 开头的链接
        match = re.search(r"https?://[^\s<>\"']+", str(link))
        share_url = match.group(0) if match else str(link).strip()

        # 2. 准备请求 Tikhub 的参数
        # 使用新配置拼接完整的请求地址
        url = third_party_settings.TIKHUB_DOUYIN_VIDEO_URL
        headers = {"accept": "application/json", "Authorization": f"Bearer {api_token}"}
        # Tikhub 接口参数: share_url
        params = {"url": share_url}

        # 3. 发起 HTTP GET 请求
        client = await get_client()
        response = await client.get(url, headers=headers, params=params, timeout=30.0)

        # 4. 处理 HTTP 错误状态码
        if response.status_code != 200:
            if response.status_code == 402:  # 402 Payment Required：常见于第三方接口额度/余额不足
                logger.warning("Tikhub API 服务余额不足 (402 Payment Required)")
            return VideoResponse(
                message=f"解析失败，服务响应异常 (Status: {response.status_code})"
            )

        # 5. 解析响应 JSON
        try:
            payload = response.json()
        except Exception:
            return VideoResponse(message="解析失败，服务返回数据格式错误")

        # 6. 校验业务状态码 (根据 Tikhub 返回结构调整，这里假设 code=200 为成功)
        # 注意：不同服务商字段可能不同，需根据实际情况调整
        if payload.get("code") != 200:
            error_msg = payload.get("msg") or "解析失败，请检查链接是否正确"
            return VideoResponse(message=error_msg)

        # 7. 提取核心数据
        data = payload.get("data", {})

        # 提取视频标题/描述
        desc = data.get("title") or data.get("desc") or ""

        # 提取视频地址 (优先取无水印)
        video_url = data.get("play_url") or data.get("wm_play_url")

        # 提取封面图
        cover_url = data.get("cover_url")

        # 提取音频地址
        audio_url = data.get("music_url")

        # 提取统计数据 (点赞、评论等)
        # 注意：需确认 Tikhub 返回结构是否有这些字段，这里做防御性处理
        statistics = Statistics(
            collect_count=data.get("collect_count", 0),
            comment_count=data.get("comment_count", 0),
            digg_count=data.get("digg_count", 0),
            download_count=data.get("download_count", 0),
            share_count=data.get("share_count", 0),
        )

        # 8. 组装返回数据对象
        result_data = VideoData(
            aweme_id=str(data.get("aweme_id") or ""),
            video_url=video_url,
            cover_url=cover_url,
            audio_url=audio_url,
            desc=desc,
            title=desc,  # 抖音通常只有一个文案，标题即描述
            create_time=_format_time(data.get("create_time")),
            duration=data.get("duration", 0),
            statistics=statistics,
        )

        # 9. 最终校验：如果没有视频地址，视为解析失败
        if not video_url:
            return VideoResponse(
                message="解析成功，但未获取到视频地址，可能视频已被删除或设为私密"
            )

        # 10. 返回成功结果
        return VideoResponse(message="解析成功", data=result_data)

    except Exception:
        # 捕获所有未预料的异常，避免接口崩溃
        # 在生产环境中，建议保留日志记录以便排查问题
        # logger.error(f"解析异常: {str(e)}")
        return VideoResponse(message="系统繁忙，请稍后重试")
