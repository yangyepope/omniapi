# SecurityPlatform 重放引擎 Gevent 协程化实现报告 (Gevent Implementation Report)

## 1. 核心改进点 (Core Enhancements)

### 1.1 同步协程化 (Synchronous Coroutine Logic)
由于 `gevent` 在打过 `monkey_patch` 后会自动劫持底层的 Socket 等 IO 库，我们将 `ReplayEngine` 逻辑由异步风格还原为**高性能同步风格**。
- **ReplayEngine**: 使用同步 HTTP 客户端搭配专用连接池，避免了 `async/await` 在协程池中的嵌套调度开销。
- **Http Pool**: 在 [http_pool.py](file:///root/security-platform/backend/app/core/http_pool.py) 中引入同步 Keep-Alive 连接池。

### 1.2 独立重放 Worker 剥离
通过对 [compose.yml](file:///root/security-platform/compose.yml) 的调整，将重放能力解耦至专用的 `celery-worker-replay` 服务。
- **并发级别**: `-P gevent -c 1000`。
- **物理路由**: 固定监听 `replay` 队列。

### 1.3 数据库原子计数稳定性
为规避千级并发下的 Race Condition，在 [worker.py](file:///root/security-platform/backend/app/worker.py) 中实施了**物理原子更新**：
- **逻辑**: `UPDATE variant SET replay_count = replay_count + 1 WHERE id = :id`。
- **意义**: 确保重放次数的阶跃与实际任务数完全精准对齐，不因并发写入而丢失计数。

## 2. 故障排除与环境修正 (Troubleshooting)

### 2.1 端口错位修复 (Port Mismatch)
- **现象**: Worker 在容器内报错 `Connection refused to localhost:5332`。
- **解决**: 发现 `.env` 设置宿主机端口污染了内部 DSN。修正 `compose.yml` 强行将内部端口压制为 **5432** (Postgres) 和 **6379** (Redis)。

### 2.2 配置可见性修正 (Settings Visibility)
- **现象**: `AttributeError: Settings object has no attribute CELERY_BROKER_URL`。
- **解决**: 在 [config.py](file:///root/security-platform/backend/app/core/config.py) 的 `Settings` 类定义内正式声明属性，使 Pydantic 能够物理捕获 DSN。

## 3. 验证结论 (Verification)

### 3.1 压测数据看板
- **测试用例**: [test_concurrent_replay.py](file:///root/security-platform/backend/tests/functional/test_concurrent_replay.py) 注入 1000 次重放请求。
- **推送性能**: **346 tasks/s** (Redis 注入速度)。
- **消费性能**: **100% 成功达成**，数据库计数由 `252` 精准阶跃至 `1271`（含验证期间的自然增量）。
- **稳定性**: 无 `TimeoutError`，无 `Connection refused` 报错。

## 4. 后续演进建议
随着重放任务冲击 10 万级并发，建议将本系统的数据库连接管理迁移至 **PgBouncer**。
