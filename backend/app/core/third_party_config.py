from pydantic import Field  # Pydantic 字段声明：用于提供默认值与描述元数据
from pydantic_settings import (  # Pydantic Settings：从环境变量/.env 加载配置
    BaseSettings,
    SettingsConfigDict,
)


class ThirdPartySettings(BaseSettings):
    model_config = SettingsConfigDict(  # Settings 的配置：控制 env 加载与字段处理策略
        # Use top level .env file (one level above ./backend/)  # 从 backend 上一级目录读取 .env
        env_file="../.env",  # 注意：路径以当前工作目录/模块位置解析（用于本地与容器）
        env_ignore_empty=True,  # 忽略空字符串环境变量：避免把默认值覆盖成空
        extra="ignore",  # 环境里多余的变量忽略：避免报错阻断启动
    )  # model_config 结束

    # --- Tikhub API 配置 ---
    # 基础域名，例如: https://api.tikhub.io
    TIKHUB_API_DOMAIN: str = (
        "https://api.tikhub.io"  # Tikhub 服务域名（可通过环境变量覆盖）
    )
    # 具体接口路径，例如: /api/v1/douyin/app/v3/fetch_one_video_by_share_url
    TIKHUB_DOUYIN_VIDEO_PATH: str = (  # 抖音视频解析接口路径（相对域名）
        "/api/v1/douyin/app/v3/fetch_one_video_by_share_url"
    )
    # 认证 Token
    TIKHUB_API_TOKEN: str = Field(  # 访问令牌：用于调用第三方接口的鉴权
        default="yb8ODpIA7U+5pHKUI9KLySrTKzmXcJ1y2TXZjkGibaejp026fWWsVx3EbA==",  # 默认值（建议用 .env 覆盖）
        description="Tikhub API 访问令牌",  # 字段描述（用于文档/自解释）
    )  # Field 结束

    @property
    def TIKHUB_DOUYIN_VIDEO_URL(self) -> str:
        """拼接完整的抖音视频抓取接口地址"""  # 作为派生配置：避免在业务代码中散落拼接逻辑
        return (  # 返回完整 URL：domain 去尾部 / 后再拼 path，避免出现双斜杠
            f"{self.TIKHUB_API_DOMAIN.rstrip('/')}{self.TIKHUB_DOUYIN_VIDEO_PATH}"
        )


third_party_settings = (
    ThirdPartySettings()
)  # 模块级单例：应用启动时加载一次配置（reload/重启会重新加载）
