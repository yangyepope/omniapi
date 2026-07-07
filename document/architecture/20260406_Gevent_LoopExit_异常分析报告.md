# 异常归档：Gevent Monkey Patch 与 FastAPI (uvloop) 冲突分析

**归档日期**：2026-04-06
**异常类型**：`gevent.exceptions.LoopExit: This operation would block forever`
**受限范围**：API 主进程 (`backend` 容器)

---

## 1. 现象描述
在执行“全量 Gevent 归一化”重构后，`backend` 容器在启动时崩溃，抛出如下错误：
```text
backend-1  | gevent.exceptions.LoopExit: This operation would block forever
backend-1  |    Hub: <Hub '' at 0x7f4061801e90 epoll default pending=0 ref=0 fileno=25 thread_ident=0x7f407f...
backend-1  |    Handles: []
```
同时伴随 `MonkeyPatchWarning`，提示 `ssl`, `threading` 等模块在打补丁前已被导入。

## 2. 根源分析 (Root Cause)
1. **多事件循环冲突**：FastAPI (Uvicorn) 默认使用 `uvloop` (基于 `asyncio`)。而重构后的 `worker.py` 在顶层执行了 `gevent.monkey.patch_all()`。
2. **逻辑劫持**：当 `main.py` 导入 `worker.py` 以获取 Celery 实例时，API 进程被强制打了补丁。
3. **Hub 死锁**：Gevent 补丁拦截了标准库的 `threading.join()` 等同步操作，并尝试切换到 Gevent Hub。但由于 API 进程运行在 `uvloop` 上，Gevent Hub 并没有活跃的事件循环在运行，导致 Gevent 认为该操作将永远阻塞，从而触发防御性的 `LoopExit`。

## 3. 修复方案 (Resolution)
**核心原则：解耦 API 进程与 Gevent 补丁。**

1. **精确打桩**：将 `worker.py` 中的 `patch_all()` 修改为由环境变量 `CELERY_WORKER_TYPE` 触发。
2. **隔离编排**：
    - 在 `celery-worker-default` 和 `celery-worker-replay` 容器中注入 `CELERY_WORKER_TYPE=gevent`。
    - 确保 `backend` (API) 容器**不包含**此变量。
3. **收益**：
    - **API 层**：保持原生的 `uvloop` 性能与稳定性。
    - **Worker 层**：享受 Gevent 带来的百万级协程并发能力及低内存开销。

## 4. 经验教训 (Lessons Learned)
- **不要在底层公共模块 (如 `worker.py`) 中执行无条件的全局 Monkey Patch**，特别是当该模块会被 non-gevent 进程（如 FastAPI）引用时。
- 在混合异步架构中，必须通过环境变量进行显式的“运行时探测”。
