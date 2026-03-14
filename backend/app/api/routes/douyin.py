from fastapi import (  # APIRouter：路由分组；Query：声明查询参数（GET 参数）
    APIRouter,
    Query,
)

from app.api.deps import (
    CurrentUserByApiKey,  # 仅允许 API Key 鉴权：通过 X-API-Key header 调用
)
from app.schemas.douyin import (  # 请求/响应模型：统一接口返回结构
    VideoResponse,
)
from app.services.douyin_service import (
    fetch_video_data,  # 服务层：封装第三方调用与解析逻辑
)

router = APIRouter(
    prefix="/douyin", tags=["douyin"]
)  # 路由前缀：最终路径以 /api/v1/douyin 开头


@router.get("/fetch_one_video_by_share_url", response_model=VideoResponse)
async def fetch_one_video_by_share_url_v3(
    _user: CurrentUserByApiKey,
    share_url: str = Query(..., description="Douyin share URL"),
) -> VideoResponse:
    if not share_url.strip():
        return VideoResponse(message="视频链接不能为空")
    return await fetch_video_data(share_url)


@router.get("/fetch_one_video_by_share_url", response_model=VideoResponse)
async def fetch_one_video_by_share_url(
    _user: CurrentUserByApiKey,
    share_url: str = Query(..., description="Douyin share URL"),
) -> VideoResponse:
    """
    Fetch Douyin video details by share URL.
    Full URL: /api/v1/douyin/fetch_one_video_by_share_url
    Requires Authentication (API Key only, via X-API-Key header).
    """
    if not share_url.strip():  # share_url 为空或全空白
        return VideoResponse(message="视频链接不能为空")  # 返回可读错误
    return await fetch_video_data(
        share_url
    )  # 直接把 share_url 传给服务层处理（内部仍会做 URL 提取/清洗）
