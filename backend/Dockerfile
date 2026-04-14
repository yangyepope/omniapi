# 1. 使用官方 Python 3.11.2 镜像作为基础镜像
FROM python:3.14.0

# 2. 设置环境变量：强制 Python 不使用缓存输出，直接把日志打印到终端（方便你通过 docker logs 查看
ENV PYTHONUNBUFFERED=1

# Install uv
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#installing-uv
# 3. 从 uv 的官方镜像中直接把二进制文件拷贝过来
# 这一步非常高明，不需要通过 pip 安装，直接拿来就能用，速度最快
COPY --from=ghcr.io/astral-sh/uv:0.9.26 /uv /uvx /bin/

# Compile bytecode
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#compiling-bytecode
# 4. 告诉 uv：在安装包时编译字节码（.pyc），这会让你的容器启动时运行得更快
ENV UV_COMPILE_BYTECODE=1

# uv Cache
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#caching
# 5. 告诉 uv：在 Docker 环境中直接拷贝文件而不是链接，这是为了兼容性考虑
ENV UV_LINK_MODE=copy

# 6. 设置容器内的默认工作目录为 /app/
WORKDIR /app/

# Place executables in the environment at the front of the path
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#using-the-environment
# 7. 关键一步：把 uv 创建的虚拟环境路径（.venv/bin）放到系统的 PATH 最前面
# 这样你后面执行 "fastapi" 命令时，它会优先去虚拟环境里找，而不是找系统自带的
ENV PATH="/app/.venv/bin:$PATH"

# Install dependencies
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#intermediate-layers
# 8. 【安装依赖阶段 - 第一部分】
# --mount=type=cache... 这一行是在利用 Docker 缓存 uv 的下载记录
# --mount=type=bind... 这一行是在构建时“临时挂载”账本文件，不把它们永久存入镜像层
# uv sync --frozen: 严格按照 uv.lock 安装，版本对不上就报错（保证环境绝对一致）
# --no-install-workspace: 只装第三方库，先不装你自己的 backend 项目代码
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-workspace --package app

# 9. 拷贝后端的启动脚本
COPY ./backend/scripts /app/backend/scripts
# 10. 拷贝项目配置文件和数据库迁移文件
COPY ./backend/pyproject.toml ./backend/alembic.ini /app/backend/
# 11. 拷贝最重要的业务代码文件夹
COPY ./backend/app /app/backend/app

# Sync the project
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#intermediate-layers
# 12. 【安装依赖阶段 - 第二部分】
# 这一步是为了把你的“项目本身”作为可安装包同步进去，确保所有相对路径 import 都能生效
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --package app

# 13. 切换工作目录到 backend 文件夹   
WORKDIR /app/backend/

# 14. 启动命令：使用 FastAPI 官方命令，开启 4 个工作进程，运行 app/main.py
CMD ["fastapi", "run", "--workers", "4", "app/main.py"]
