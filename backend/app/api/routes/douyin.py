from fastapi import APIRouter, Depends
from app.schemas.douyin import VideoRequest, VideoResponse
from app.services.douyin_service import fetch_video_data
from app.api.deps import CurrentUserOrApiKey

router = APIRouter(prefix="/douyin", tags=["douyin"])

@router.post("/fetch-video", response_model=VideoResponse)
async def fetch_video(
    request: VideoRequest,
    user: CurrentUserOrApiKey
) -> VideoResponse:
    """
    Fetch Douyin video details by share URL.
    Full URL: /api/v1/douyin/fetch-video
    Requires Authentication (Supports OAuth2 JWT or API Key).
    """
    # 简单的参数预检查
    if not request.link.strip():
        return VideoResponse(message="视频链接不能为空")
    
    # 调用服务层处理核心逻辑，使用系统配置的Token
    return await fetch_video_data(request.link)
