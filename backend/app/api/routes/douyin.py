from fastapi import APIRouter

from app.api.deps import CurrentUserByApiKey
from app.schemas.douyin import VideoRequest, VideoResponse
from app.services.douyin_service import fetch_video_data

router = APIRouter(prefix="/douyin", tags=["douyin"])


@router.post("/fetch-video", response_model=VideoResponse)
async def fetch_video(
    request: VideoRequest, _user: CurrentUserByApiKey
) -> VideoResponse:
    """
    Fetch Douyin video details by share URL.
    Full URL: /api/v1/douyin/fetch-video
    Requires Authentication (API Key only, via X-API-Key header).
    """
    # 简单的参数预检查
    if not request.link.strip():
        return VideoResponse(message="视频链接不能为空")

    # 调用服务层处理核心逻辑，使用系统配置的Token
    return await fetch_video_data(request.link)
