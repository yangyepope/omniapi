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
    ### 中文说明

    **用途**
    根据分享链接获取单个作品数据。

    **参数**
    - `share_url`：分享链接（Query 参数）

    **返回**
    - `VideoResponse`：包含 `message` 与 `data`

    > 提示：如果接口返回为空，可用同样参数请求 Web 版本接口，查看：
    > `$.data.filter_list[0].reason`

    **reason 参考**
    - `8`：海外版权限制，暂时无法观看（短剧、电影片段等）
    - `8`：视频不存在或已被删除
    - `5`：私人内容，无公开展示权限
    - `10`：部分可见，仅作者选择的部分用户可见
    - 更多状态码请提交给客户支持补充

    ### English

    **Purpose**
    Get a single video data by sharing link.

    **Parameters**
    - `share_url`: Share link (Query param)

    **Return**
    - `VideoResponse`: includes `message` and `data`

    > Tip: If the interface returns empty, request the Web version endpoint with the same
    > params and check: `$.data.filter_list[0].reason`

    **reason reference**
    - `8`: Overseas copyright restriction (short dramas, movie clips, etc.)
    - `8`: The video does not exist or has been deleted
    - `5`: Private content, not publicly accessible
    - `10`: Partially visible, only visible to selected users
    - For more status codes, please contact customer support

    **Example**
    `share_url = "https://v.douyin.com/e3x2fjE/"`
    """
    if not share_url.strip():  # share_url 为空或全空白
        return VideoResponse(message="视频链接不能为空")  # 返回可读错误
    return await fetch_video_data(
        share_url
    )  # 直接把 share_url 传给服务层处理（内部仍会做 URL 提取/清洗）
