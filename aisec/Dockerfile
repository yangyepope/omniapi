# aisec Dockerfile —— 独立 Python 镜像（不复用 omniapi backend 镜像）
#
# 镜像用于两类容器：
#   aisec-api    : uvicorn aisec.main:app
#   aisec-worker : python -m aisec.temporal.worker
# 通过 compose 的 command 字段切换入口。
#
# 项目布局（扁平）：
#   omniapi/aisec/         ← build context = Python 包根
#   ├── Dockerfile
#   ├── pyproject.toml
#   ├── uv.lock            ← 由 uv lock 生成，确保依赖版本可复现
#   ├── __init__.py        ← Python 包入口
#   ├── main.py
#   └── ...
#
# 容器内布局：
#   /app/                  ← WORKDIR，python -m 从这里 import
#   ├── pyproject.toml
#   ├── uv.lock
#   └── aisec/             ← Python 包（COPY . /app/aisec/ 形成）
#       ├── __init__.py
#       ├── main.py
#       └── ...
FROM python:3.11-slim

# 从 uv 官方镜像复制二进制，与 backend/Dockerfile 保持一致
COPY --from=ghcr.io/astral-sh/uv:0.9.26 /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        build-essential libxml2-dev libxslt1-dev curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PATH="/app/.venv/bin:$PATH"

# 先拷依赖元数据以利用缓存层（独立于源码改动）
COPY pyproject.toml uv.lock /app/

# 严格按 uv.lock 安装，版本对不上报错；不安装本项目包本身（源码后面 COPY）
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# 把扁平的 build context 整体作为 aisec 包放到 /app/aisec/
# .dockerignore 已排除 Dockerfile / pyproject.toml / uv.lock / tests / 缓存等
COPY . /app/aisec/

# 防御性清理：万一有 metadata 漏过 .dockerignore 也不会留在 /app/aisec/
RUN rm -f /app/aisec/Dockerfile /app/aisec/pyproject.toml \
          /app/aisec/uv.lock /app/aisec/.env.example \
          /app/aisec/.gitignore /app/aisec/.dockerignore \
          /app/aisec/README.md

# 共享卷挂载点（CPG 缓存）
RUN mkdir -p /var/cache/aisec

EXPOSE 8000

# 默认入口：FastAPI；compose 中 worker 会用 command 覆盖为
#   python -m aisec.temporal.worker
CMD ["uvicorn", "aisec.main:app", "--host", "0.0.0.0", "--port", "8000"]
