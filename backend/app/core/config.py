import secrets  # 生成安全随机字符串（用于默认 SECRET_KEY）
import warnings  # 本地环境下对不安全默认配置发出警告
from typing import (  # 类型注解：Annotated/Any 以及环境枚举 Literal
    Annotated,
    Any,
    Literal,
)

from pydantic import (
    AnyUrl,  # 允许的 URL 类型（用于 CORS origins 等）
    BeforeValidator,  # 在字段校验前执行的预处理器（解析 CORS）
    EmailStr,  # 邮箱字符串类型（带格式校验）
    HttpUrl,  # HTTP/HTTPS URL 类型（用于 Sentry DSN 等）
    PostgresDsn,  # Postgres DSN 类型（用于 SQLALCHEMY_DATABASE_URI）
    computed_field,  # 计算字段：由其他字段派生出来
    model_validator,  # 模型级校验器：用于跨字段约束
)
from pydantic_settings import (  # Settings：从环境变量/.env 加载配置
    BaseSettings,
    SettingsConfigDict,
)
from typing_extensions import (
    Self,  # 返回 self 的类型提示（兼容 pydantic 的 validator 返回类型）
)


def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith(
        "["
    ):  # 兼容 "a,b,c" 形式（不是 JSON 数组字符串）
        return [i.strip() for i in v.split(",") if i.strip()]  # 按逗号拆分并去除空白项
    elif isinstance(v, list | str):  # 已经是 list 或 JSON 数组字符串形式则直接返回
        return v  # 让 Pydantic 继续做后续解析/校验
    raise ValueError(v)  # 其他类型视为非法输入，抛出错误


class Settings(BaseSettings):
    model_config = SettingsConfigDict(  # Pydantic Settings 配置：定义 env 加载与字段处理策略
        # Use top level .env file (one level above ./backend/)  # 从 backend 上一级目录读取 .env
        env_file="../.env",  # .env 路径：便于本地/容器共享同一套配置
        env_ignore_empty=True,  # 忽略空字符串环境变量：避免把默认值覆盖为空
        extra="ignore",  # 额外的环境变量忽略：避免启动时因多余变量报错
    )
    API_V1_STR: str = "/api/v1"  # API 路由统一前缀（FastAPI include_router 会使用）
    SECRET_KEY: str = secrets.token_urlsafe(
        32
    )  # JWT/安全相关的默认密钥（生产应显式配置）
    # 60 minutes * 24 hours * 8 days = 8 days  # token 过期时间默认 8 天
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # JWT access token 的有效期（分钟）
    FRONTEND_HOST: str = "http://localhost:5173"  # 前端默认地址（用于 CORS 拼接）

    # ── Celery 配置 ────────────────────────────────────────────────────────────
    # [Why]：显式声明后，Pydantic 会自动从环境变量（如 CELERY_BROKER_URL）加载。
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"

    ENVIRONMENT: Literal["local", "staging", "production"] = (
        "local"  # 环境标识：影响日志/安全策略
    )

    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyUrl] | str,  # 允许 list 或字符串（逗号分隔/JSON 数组字符串）
        BeforeValidator(parse_cors),  # 在字段解析前先规范化输入（转成 list 或原样返回）
    ] = []  # 默认空列表：不额外放行跨域来源

    @computed_field  # type: ignore[prop-decorator]
    @property
    def all_cors_origins(self) -> list[str]:
        return [  # 返回最终允许的 CORS origins（统一去掉尾部 /，避免重复配置差异）
            str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS
        ] + [self.FRONTEND_HOST]  # 同时始终包含 FRONTEND_HOST

    PROJECT_NAME: str  # 项目名：用于 OpenAPI 标题、邮件默认 from name 等
    SENTRY_DSN: HttpUrl | None = None  # Sentry 上报地址（可选）
    POSTGRES_SERVER: str  # 数据库主机名（docker compose 通常为 db）
    POSTGRES_PORT: int = 5432  # 数据库端口（默认 5432）
    POSTGRES_USER: str  # 数据库用户名
    POSTGRES_PASSWORD: str = ""  # 数据库密码（生产必须配置）
    POSTGRES_DB: str = ""  # 数据库名（可为空，由环境决定）

    # ── gitlab-scanner 集成（任务 #181）────────────────
    # security-platform 通过 HTTP REST 调 scanner 的 /api/admin/* endpoints,
    # SCANNER_ADMIN_TOKEN 必须和 scanner 自己 .env 里的 SCANNER_ADMIN_TOKEN
    # 完全一致。未配置 → /security/* 路由全部 503。
    SCANNER_BASE_URL: str | None = None  # 如 "http://gitlab-scanner:8000"
    SCANNER_ADMIN_TOKEN: str | None = None
    # scanner 项目目录,供运维面板「重建+部署 scanner」作 docker compose 的
    # -f / --project-directory。⚠必须是**宿主机真实路径**(不是容器内自定义
    # 挂载点):compose 的相对 bind 挂载(如 ./examples/manifest.yml)由宿主机
    # docker daemon 按 --project-directory 解析成宿主机绝对路径,若给容器内路径
    # (如 /opt/xxx)daemon 在宿主机上找不到 → 自动建空目录 → 挂载错乱。
    # 因此 backend 容器把该宿主机目录挂到**同名路径**(见 compose.yml),使
    # -f 可读、--project-directory 又能在宿主机正确解析。
    SCANNER_PROJECT_DIR: str = "/home/dreamer/gitlab-scanner"
    # compose 项目名,必须与 scanner 原始部署一致(否则 up -d 会与固定
    # container_name=gitlab-scanner 冲突)。默认取 scanner 仓库目录名。
    SCANNER_COMPOSE_PROJECT: str = "gitlab-scanner"

    # ── MCP server 鉴权（任务 #182）─────────────────────
    # security-platform 内嵌的 MCP server 挂在 /mcp/sse,Claude Desktop 等客户端通过
    # Authorization Bearer <token> 调用。token 自己生成(openssl rand -hex 32),
    # Claude Desktop 配置侧持同一份。未配置 → MCP mount 跳过,/mcp/* 全部 503。
    SECURITY_PLATFORM_MCP_TOKEN: str | None = None

    SUPPORT_CONTACT: str = (
        "寻求技术支持请关注 13076908699"  # 对外展示的技术支持联系方式
    )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> PostgresDsn:
        return PostgresDsn.build(  # 拼出 SQLAlchemy 可用的 DSN（由各段配置组成）
            scheme="postgresql+psycopg",  # 使用 psycopg 驱动（SQLAlchemy URL scheme）
            username=self.POSTGRES_USER,  # 用户名
            password=self.POSTGRES_PASSWORD,  # 密码
            host=self.POSTGRES_SERVER,  # 主机
            port=self.POSTGRES_PORT,  # 端口
            path=self.POSTGRES_DB,  # 数据库名（放在 path 部分）
        )  # DSN 构造结束

    SMTP_TLS: bool = True  # 邮件发送是否启用 STARTTLS
    SMTP_SSL: bool = False  # 邮件发送是否使用 SSL（通常与 TLS 二选一）
    SMTP_PORT: int = 587  # SMTP 端口（TLS 常用 587，SSL 常用 465）
    SMTP_HOST: str | None = None  # SMTP 服务器地址（不配置则视为未启用邮件）
    SMTP_USER: str | None = None  # SMTP 用户名
    SMTP_PASSWORD: str | None = None  # SMTP 密码
    EMAILS_FROM_EMAIL: EmailStr | None = None  # 发信人邮箱地址（用于邮件 From）
    EMAILS_FROM_NAME: str | None = None  # 发信人名称（不配则用 PROJECT_NAME）

    @model_validator(mode="after")
    def _set_default_emails_from(self) -> Self:
        if not self.EMAILS_FROM_NAME:  # 如果未显式设置发信人名称
            self.EMAILS_FROM_NAME = self.PROJECT_NAME  # 默认使用项目名作为 From Name
        return self  # validator 必须返回 self（pydantic v2 约定）

    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 48  # 重置密码 token 的有效期（小时）

    @computed_field  # type: ignore[prop-decorator]
    @property
    def emails_enabled(self) -> bool:
        return bool(  # 只要配置了 SMTP_HOST 且配置了 FROM 邮箱，就认为邮件功能启用
            self.SMTP_HOST and self.EMAILS_FROM_EMAIL
        )

    EMAIL_TEST_USER: EmailStr = "test@example.com"  # 测试邮箱用户（用于开发/测试场景）
    FIRST_SUPERUSER: str  # 首个超级管理员登录标识（用户名或邮箱，init_db 会用它初始化用户；放宽自 EmailStr 以支持 admin 这类纯用户名）
    FIRST_SUPERUSER_PASSWORD: str  # 首个超级管理员密码（init_db/initial_data 使用）

    def _check_default_secret(self, var_name: str, value: str | None) -> None:
        if value == "changethis":  # 发现不安全的默认占位值（提醒用户必须更换）
            message = (  # 统一的错误/警告消息
                f'The value of {var_name} is "changethis", '  # 指明哪个变量仍是占位符
                "for security, please change it, at least for deployments."  # 提醒部署时务必更改
            )
            if self.ENVIRONMENT == "local":  # 本地环境：不阻断启动，用 warning 提醒即可
                warnings.warn(
                    message, stacklevel=1
                )  # 发出警告，stacklevel=1 让调用点更清晰
            else:  # 非本地环境：直接抛错，阻止使用不安全配置上线
                raise ValueError(message)  # 抛出 ValueError 让启动失败

    @model_validator(mode="after")
    def _enforce_non_default_secrets(self) -> Self:
        self._check_default_secret(
            "SECRET_KEY", self.SECRET_KEY
        )  # 校验 SECRET_KEY 是否仍为占位符
        self._check_default_secret(
            "POSTGRES_PASSWORD", self.POSTGRES_PASSWORD
        )  # 校验数据库密码是否仍为占位符
        self._check_default_secret(  # 校验首个超管密码是否仍为占位符
            "FIRST_SUPERUSER_PASSWORD",  # 变量名（用于提示）
            self.FIRST_SUPERUSER_PASSWORD,  # 实际值
        )

        return self  # validator 必须返回 self


settings = Settings()  # type: ignore  # 模块级单例：启动时加载一次配置（reload/重启会重新加载）
