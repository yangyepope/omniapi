from collections.abc import AsyncIterator  # 导入异步迭代器类型
from contextlib import asynccontextmanager  # 导入异步上下文管理器装饰器

import sentry_sdk  # 导入 Sentry SDK，用于错误监控和性能追踪
from fastapi import FastAPI  # 导入 FastAPI 主类
from fastapi.routing import APIRoute  # 导入路由类，用于自定义路由处理
from fastapi.responses import HTMLResponse
from starlette.middleware.cors import CORSMiddleware  # 导入 CORS 中间件，处理跨域请求

from app.api.main import api_router  # 导入核心 API 路由
from app.core.config import settings  # 导入全局配置
from app.core.http_client import close_client, get_client  # 导入 HTTP 客户端生命周期管理函数
from app.core.logger import setup_logger  # 导入日志初始化函数

# 初始化自定义日志配置
setup_logger()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # FastAPI 应用启动时执行：初始化全局 HTTP 客户端
    await get_client()
    yield  # 挂起，应用运行期间保持状态
    # FastAPI 应用关闭时执行：清理并关闭 HTTP 客户端资源
    await close_client()


def custom_generate_unique_id(route: APIRoute) -> str:
    # 自定义 OpenAPI 规范中的 operationId 生成规则：使用“标签-路由名称”格式
    if route.tags:
        return f"{route.tags[0]}-{route.name}"
    return route.name

# 如果配置了 Sentry DSN 且当前不是本地开发环境，则初始化 Sentry 监控
if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.PROJECT_NAME,  # 项目名称
    openapi_url=f"{settings.API_V1_STR}/openapi.json",  # OpenAPI Schema 的路径
    generate_unique_id_function=custom_generate_unique_id,  # 绑定自定义的 operationId 生成函数
    lifespan=lifespan,  # 绑定生命周期管理器
    docs_url=None,
    redoc_url=None,
)

# 设置所有允许跨域的源 (CORS)
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,  # 允许的跨域请求来源列表
        allow_credentials=True,  # 允许携带 Cookie 或凭据
        allow_methods=["*"],  # 允许的 HTTP 方法 (GET, POST 等)
        allow_headers=["*"],  # 允许的 HTTP 请求头
    )

# 挂载核心业务的 API 路由，并添加全局的前缀 (如 /api/v1)
app.include_router(api_router, prefix=settings.API_V1_STR)

# 单独挂载 /v1/collect 路由，以匹配 Nginx 镜像请求的路径 (避开全局的 /api/v1 前缀)
from app.api.routes import collect
app.include_router(collect.router, prefix="/v1")


@app.get("/docs", include_in_schema=False)
def custom_scalar():
    html = f"""
    <!doctype html>
    <html>
        <head>
            <title>{settings.PROJECT_NAME} - API Reference</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
                body {{ margin: 0; padding: 0; }}
            </style>
        </head>
        <body>
            <div id="app"></div>
            <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
            <script>
                Scalar.createApiReference("#app", {{
                    "url": "{app.openapi_url}",
                    "_integration": "fastapi"
                }})
            </script>
        </body>
    </html>
    """
    return HTMLResponse(content=html)
