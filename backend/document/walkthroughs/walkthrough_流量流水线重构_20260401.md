# 流量处理流水线重构 - 工作总结 [2026-04-01]

## 变更描述
按照 V3.0 三阶段流量架构要求，重构了从镜像流量摄入到资产精选沉淀的全链路逻辑。

### 1. 核心架构改进
- **Stage 1 (Raw Ingestion)**: 修改 `collect.py`，实现流量到达即入库 `RawFlow` 表。
    - 服务名自动识别：`/api/v1/users` -> `api`。
    - 即时存库：先记录完整报文，减少处理时延。
- **Stage 2 (MD5 Deduplication)**: 在 `worker.py` 中引入异步去重指纹逻辑。
    - **Header 排除列表**: `Date`, `Cookie`, `Authorization`, `X-Timestamp` 等。
    - **Body 排除列表**: `timestamp`, `nonce`, `sign`, `random` 等。
- **Stage 3 (Original Storage)**: 遵循“原样存储”原则，在 `FilteredFlow` 中完整保留 Header 和 Body。

### 2. 关键代码变更
- [models.py](file:///root/security-platform/backend/app/models.py): 更新数据模型定义。
- [discovery.py](file:///root/security-platform/backend/app/services/discovery.py): 封装字段过滤引擎与 MD5 算法。
- [worker.py](file:///root/security-platform/backend/app/worker.py): 重构异步任务逻辑。

## 验证结果

### 离线逻辑测试 (uv run python verify_traffic_logic.py)
> [!NOTE]
> 针对两个逻辑相同请求进行碰撞测试（URL 不同 ID、Query 不同、动态 Header/Body 不同）：

```text
✅ 服务名提取: /sts/v1/... -> sts (Success)
✅ 路径归一化: /users/123 -> /users/{id} (Success)
✅ Header 排除: 成功剔除 Authorization, Date 等动态字段 (Success)
✅ Body 排除: 递归成功剔除 timestamp, nonce, random (Success)
✅ MD5 碰撞测试: 指纹完全一致 -> 去重机制生效！ (Success)
```

## 维护建议
- **TTL 管理**: 定期检查 `RawFlow` 表的自动清理（建议留存 7 天）。
- **指纹扩展**: 若业务引入新的动态字段（如 `v-nonce`），可直接在 `discovery.py` 的排除列表中追加。
