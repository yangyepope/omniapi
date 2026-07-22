# SecurityPlatform 混合并发架构准则 (Mixed Concurrency Architecture)

## 1. 背景与核心价值
SecurityPlatform 采用“异构并发”模型，旨在同时兼顾 **CPU 密集型（流量去重）** 与 **I/O 密集型（重放攻击）** 任务的最优执行效率。

- **Prefork 模型**：用于流量采集与去重。利用多进程规避 Python GIL，保护计算密集型任务的稳定性。
- **Gevent 模型**：用于重放引擎。通过原生协程模型支持 10,000+ 并发网络 IO，支撑 10 万级重放压测。

## 2. 三层物理隔离协议 (Isolation Protocol)

为了防止 Gevent 的 `monkey_patch` 误伤 Prefork 进程或 FastAPI 主进程，必须严格遵守以下协议：

### 2.1 容器级隔离 (Container Level)
不同的并发任务必须运行在独立的 Docker 容器中。
- `celery-worker-default`: 运行 `prefork` 模式。
- `celery-worker-replay`: 运行 `gevent` 模式（带 `-P gevent` 参数）。

### 2.2 环境级打桩 (Environment Level)
补丁逻辑必须是**条件触发**的，严禁在顶层无条件执行。
- **逻辑实现**：
    ```python
    if os.getenv("CELERY_WORKER_TYPE") == "gevent":
        import gevent.monkey
        gevent.monkey.patch_all()
    ```
- **配置注入**：仅在 `gevent` 容器的 `environment` 中注入该标识。

### 2.3 队列级路由 (Queue Level)
- 严禁将重放任务与去重任务混入同一个物理队列。
- 使用独立的队列（如 `replay`）实现流量的物理分切。

## 3. 并发参数标准 (Scaling Standard)
- **Prefork**: 并发数应等于宿主机 CPU 核心数，避免过高的上下文切换。
- **Gevent**: 单容器并发数可设置为 500-2000，取决于数据库连接池上限。

## 4. 维护规范
- **禁止项**：禁止在 `celery-worker-default` 容器中加入 `-P gevent`。
- **强制项**：所有重放相关的 SQLAlchemy 或 HTTP 调用必须经过 Gevent 的补丁覆盖。
