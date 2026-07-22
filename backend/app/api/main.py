from fastapi import APIRouter  # 导入 APIRouter，用于定义和组织路由

# 导入各个业务模块的路由器
from app.api.routes import (
    api_keys,
    douyin,
    internal,
    items,
    login,
    private,
    sec_assets,
    security,
    system_modules,
    traffic_manager,
    users,
    utils,
    variants,
    replays,
)
from app.core.config import settings  # 导入全局配置

# 创建主 API 路由器实例
api_router = APIRouter()

# 注册认证登录相关路由
api_router.include_router(login.router)
# 注册用户管理相关路由
api_router.include_router(users.router)
# 注册工具类接口（如健康检查、测试邮件等）
api_router.include_router(utils.router)
# 注册待办事项/物品管理相关路由
api_router.include_router(items.router)
# 注册抖音第三方服务接口路由
api_router.include_router(douyin.router)
# 注册 API Key 管理相关路由
api_router.include_router(api_keys.router)
# 注册 API 安全资产测试相关路由
api_router.include_router(sec_assets.router)
# 注册流量管理器（Nginx 镜像流量管理/Apifox 导入等）相关路由
api_router.include_router(traffic_manager.router)
# 注册系统模块（接口中心）相关路由
api_router.include_router(system_modules.router)
# 注册变体管理相关路由
api_router.include_router(variants.router)
# 注册攻击重放相关路由
api_router.include_router(replays.router, prefix="/replays", tags=["replays"])
# 注册安全审计控制台（forward 到 gitlab-scanner 的 admin REST,任务 #181）
api_router.include_router(security.router)
# 注册内部 service-to-service 接口（仅供 aisec 等同栈服务调用）
api_router.include_router(internal.router)

# 如果当前环境为本地开发环境，则暴露一些仅供内部测试的私有接口
if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
