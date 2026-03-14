from sqlmodel import Session

from app import crud
from app.models import User, UserCreate

# 这个模块是“业务逻辑层（service layer）”：
# - 只负责业务判断与调用 crud/db 层
# - 不引入 FastAPI 的概念（例如 HTTPException / Depends / 路由装饰器）
#   这样做的好处是：service 更容易被单元测试复用，也更容易被其他入口（脚本、任务队列等）调用。


class UserAlreadyExistsError(Exception):
    # 自定义业务异常：用于表示“邮箱已存在，无法创建用户”
    # 路由层可以捕获它并转换为具体的 HTTP 响应（例如 400/409）。

    def __init__(self, email: str) -> None:
        # 记录冲突邮箱，便于上层决定如何提示或打点
        self.email = email
        # Exception 的 message 只作为调试信息，上层不一定会直接返回给客户端
        super().__init__(f"User with email already exists: {email}")


def create_user_for_internal_test(*, session: Session, user_in: UserCreate) -> User:
    # 仅内部测试用的创建用户逻辑：
    # 1) 先按 email 查重，避免触发数据库 unique 约束异常
    # 2) 若不存在则调用通用 crud.create_user 创建（包含密码哈希等规范逻辑）

    # 1) 查重：同一个 email 只能存在一个用户
    existing_user = crud.get_user_by_email(session=session, email=user_in.email)
    if existing_user:
        # 用业务异常表达“规则不允许”，由路由层决定映射成什么 HTTP 状态码
        raise UserAlreadyExistsError(email=user_in.email)

    # 2) 创建：复用 crud 层，确保与系统其他创建入口（注册/后台创建）行为一致
    user = crud.create_user(session=session, user_create=user_in)
    return user
