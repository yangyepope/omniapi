# 导入 Any 类型，用于函数的返回值类型提示，表示返回类型灵活
from typing import Any
# 导入 uuid 模块，用于处理 API 资产的唯一标识符（UUID）
import uuid

# 从 fastapi 框架中导入 APIRouter 用于定义路由，Depends 用于依赖注入，HTTPException 用于抛出 HTTP 异常
from fastapi import APIRouter, Depends, HTTPException
# 从 sqlmodel 中导入 func 用于聚合函数（如 count），select 用于构建查询语句
from sqlmodel import func, select

# 导入自定义的依赖项：CurrentUser 用于获取当前经过身份验证的用户，SessionDep 用于获取数据库会话
from app.api.deps import CurrentUser, SessionDep
# 导入所有需要使用的数据模型和 Pydantic schema，用于数据交互和验证
from app.models import (
    ApiAsset,                  # 数据库模型：API 资产表
    ApiAssetPublic,            # Pydantic 模型：公开的 API 资产信息
    ApiAssetsPublic,           # Pydantic 模型：包含分页信息的 API 资产列表响应
    SecurityTestTask,          # 数据库模型：安全测试任务表
    SecurityTestTaskCreate,    # Pydantic 模型：创建安全测试任务时的入参
    SecurityTestReport,        # 数据库模型：安全测试报告表
    SecurityTestReportsPublic, # Pydantic 模型：包含分页信息的安全测试报告列表响应
    SecurityTestReportPublic   # Pydantic 模型：公开的安全测试报告详细信息
)
# 导入 Celery 异步任务：用于在后台执行安全扫描
from app.worker import run_security_scan_task

# 初始化一个 API 路由实例，所有此路由下的接口均带有 /sec-assets 前缀，并在 Swagger 文档中归类为 "Security Assets"
router = APIRouter(prefix="/sec-assets", tags=["Security Assets"])

# 定义一个 GET 请求路由，路径为 "/"，返回模型指定为 ApiAssetsPublic，用于数据验证和文档生成
@router.get("/", response_model=ApiAssetsPublic)
def read_assets(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    获取通过流量镜像推导出的所有 API 资产
    仅允许超级管理员访问（示例中复用了现有的 current_user，如需严格可以加上 is_superuser 校验）
    """
    # 检查当前用户是否具有超级管理员权限，如果不具备则拒绝访问并抛出 403 异常
    if not current_user.is_superuser:
        # 抛出 HTTP 403 Forbidden 错误，提示权限不足
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # 构建 SQL 聚合查询语句：计算 ApiAsset 表中的记录总数
    count_statement = select(func.count()).select_from(ApiAsset)
    # 在数据库会话中执行查询，并获取唯一的一条结果作为总数
    count = session.exec(count_statement).one()
    
    # 构建分页查询语句：从 ApiAsset 表中查询数据，跳过前 skip 条，限制返回 limit 条
    statement = select(ApiAsset).offset(skip).limit(limit)
    # 在数据库会话中执行分页查询，并获取所有符合条件的数据列表
    assets = session.exec(statement).all()
    
    # 使用获取到的资产列表和总数，实例化并返回 ApiAssetsPublic 响应模型
    return ApiAssetsPublic(data=assets, count=count)

# 定义一个 POST 请求路由，路径为 "/{asset_id}/scan"，用于针对特定资产触发扫描，返回模型为 SecurityTestTask
@router.post("/{asset_id}/scan", response_model=SecurityTestTask)
def trigger_scan(
    asset_id: uuid.UUID,           # 从 URL 路径中提取的资产 ID，类型为 UUID
    session: SessionDep,           # 注入的数据库会话依赖
    current_user: CurrentUser,     # 注入的当前用户依赖
    payload_type: str = "sqli"     # 从查询参数或请求体中获取的扫描负载类型，默认值为 "sqli" (SQL注入)
) -> Any:
    """
    针对指定的 API 资产发起安全测试任务
    """
    # 同样地，验证当前用户是否是超级管理员，只有超级管理员才能触发安全扫描
    if not current_user.is_superuser:
        # 如果不是超级管理员，抛出 HTTP 403 异常并中断请求
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # 根据传入的 asset_id，在数据库中查询对应的 ApiAsset 记录
    asset = session.get(ApiAsset, asset_id)
    # 如果数据库中不存在该资产 ID，说明指定的资产无效
    if not asset:
        # 抛出 HTTP 404 Not Found 异常，提示未找到 API 资产
        raise HTTPException(status_code=404, detail="API Asset not found")
        
    # 实例化一个新的安全测试任务记录对象，关联目标资产 ID，设置负载类型，并将初始状态置为 "pending"（待处理）
    task = SecurityTestTask(target_asset_id=asset.id, payload_type=payload_type, status="pending")
    # 将新创建的任务对象添加到当前数据库会话的事务中
    session.add(task)
    # 提交事务，将新任务实际保存到数据库中
    session.commit()
    # 刷新任务对象，从数据库中获取由数据库自动生成的默认值（如自动递增的主键、时间戳等）
    session.refresh(task)
    
    # 调用 Celery 的 delay 方法，将执行安全扫描任务派发到后台的异步队列中，并传递任务 ID
    # 这里将 UUID 转换为字符串以符合序列化要求
    run_security_scan_task.delay(str(task.id))
    
    # 立即将新创建的任务对象作为 HTTP 响应返回，不阻塞等待扫描完成
    return task

# 定义一个 GET 请求路由，路径为 "/reports"，用于获取安全扫描报告列表，返回模型为 SecurityTestReportsPublic
@router.get("/reports", response_model=SecurityTestReportsPublic)
def read_reports(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    获取安全测试报告列表
    """
    # 再次验证访问权限，确保只有超级管理员可以查看扫描报告
    if not current_user.is_superuser:
        # 权限不足则抛出 HTTP 403 异常
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    # 构建查询语句：计算 SecurityTestReport（安全测试报告）表中的记录总条数
    count_statement = select(func.count()).select_from(SecurityTestReport)
    # 执行该查询并获取确切的一条总数结果
    count = session.exec(count_statement).one()
    
    # 构建分页查询语句：查询 SecurityTestReport 表，设置跳过条数（offset）和最大返回条数（limit）
    statement = select(SecurityTestReport).offset(skip).limit(limit)
    # 执行分页查询，获取所有的报告记录列表
    reports = session.exec(statement).all()
    
    # 组装并返回符合 SecurityTestReportsPublic 模型格式的响应，包含数据列表和记录总数
    return SecurityTestReportsPublic(data=reports, count=count)
