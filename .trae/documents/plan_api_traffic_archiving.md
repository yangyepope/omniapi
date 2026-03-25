# 需求分析与实施计划：API 流量归档与结构对齐

根据 `06-requirement-analysis-and-design.md` 规则，在正式修改代码之前，已对“基于上游 API 结构进行流量归档与采集控制”的需求进行了深度的 MECE 分析与 DDD 架构设计。

## 一、 MECE 需求分析与疑问点确认（先问后写）

在进入执行阶段前，为了确保系统在高并发下的一致性及边界流处理的健壮性，需要与您确认以下 **3个关键问题**：

1. **API 匹配策略与“影子 API”处理 (API Matching & Shadow APIs)**：
   对于带路径参数的真实请求（如 `/api/v1/users/123`），匹配 Apifox 导出的标准路径（如 `/api/v1/users/{id}`）时，平台是否需要内置 URL 参数泛化与正则匹配算法？如果镜像流量中出现了未在 Apifox 中定义的“影子 API”，是直接丢弃，还是归档到一个自动创建的“未知模块”中以便后续安全审计？
2. **流量采集开关粒度与数据保留策略 (Traffic Switch & Retention)**：
   采集开关是全局唯一的（全开/全关），还是需要细化到特定模块/接口级别？此外，既然不对流量做去重，数据量会呈指数级增长。是否需要设定一个自动清理机制（例如：仅保留近 30 天的流量），还是通过冷热数据分离将老旧流量转移？
3. **Apifox 数据同步机制 (Apifox Sync Mechanism)**：
   上游的 API 结构是仅人工全量导入一次，还是需要提供 Webhook/定时任务以持续增量同步？如果是持续同步，当上游删除了某个接口，我们平台中挂载在该接口下的海量历史流量应当如何处理（级联删除，还是接口标记为废弃但保留流量）？

---

## 二、 多维度需求拆解 (Multi-dimensional Breakdown)

### 1. 功能需求 (User Story)
- **API 结构基线建立**：管理员可通过导入功能（如解析 OpenAPI/Apifox JSON），在系统中建立 `模块 (Module)` -> `接口定义 (Endpoint)` 的完整树形目录。
- **采集开关控制**：系统管理员可手动切换“流量接收开关”，或设置特定的时间段进行流量采集。关闭时，`/v1/collect` 接口直接丢弃流量。
- **流量路由与归档**：系统接收到 Nginx 镜像流量后，解析其 URI 和 Method，与系统中的“接口定义”进行精准匹配。匹配成功后，将整条流量快照（请求头、体、时间戳）作为独立记录挂载到该接口下。
- **流量时间轴展示**：安全测试人员可进入任意一个“接口定义”，按时间倒序查看该接口被调用的所有历史真实流量记录。

### 2. 非功能需求 (Non-functional Requirements)
- **性能与存储**：流量写入属于高频 Append-Only 操作。必须使用 Celery/Redis 进行异步削峰，并考虑在数据库层使用批量插入（Batch Insert）或表分区（Table Partitioning）策略，防止数据库 I/O 阻塞。
- **安全性 (敏感数据脱敏)**：采集的流量中必定包含用户的真实 Token、密码等敏感信息。必须在入库前引入敏感字段清洗机制（如正则替换或 Pydantic `exclude`）。
- **可观测性**：需记录因“无法匹配到上游接口”而导致的流量丢弃率，以便监控上游文档的准确性。

### 3. 边界条件 (Boundary Conditions)
- **极端并发**：当上游搞大促，流量瞬间飙升 100 倍时，Celery 队列可能积压。系统需具备**滑动窗口限流**或自动降级丢弃策略，保证平台自身不宕机。
- **非法输入**：遇到超大 Body（如文件上传流量 50MB）或畸形 HTTP 报文，采集接口应在网关层或入参校验层直接截断，避免 OOM (Out Of Memory)。
- **时序混乱**：由于异步处理，流量入库的顺序可能与真实发生顺序存在微小偏差。需严格依赖原始请求中的时间戳（而非入库时间）进行排序。

---

## 三、 架构对齐与 DDD 设计 (Architecture Alignment)

为了应对流量不去重带来的海量数据管理以及复杂的 API 目录结构，系统将严格遵循 **领域驱动设计 (DDD)** 进行重构：

### 1. 核心领域模型识别
- **聚合根：API 目录 (ApiDirectory)**
  - 包含实体：`Module`（模块）和 `Endpoint`（接口定义，即原先的 `ApiAsset` 概念的升级版）。
  - 负责维护上游系统的全量接口规范，是流量归档的“锚点”。
- **聚合根：流量配置 (TrafficConfig)**
  - 管理系统的采集开关状态、定时采集规则以及数据保留策略。
- **实体：流量快照 (TrafficRecord)**
  - **核心改变**：原先的 `ApiAsset` 混杂了接口定义和单次请求。现在拆分为：`Endpoint`（定义，1条）和 `TrafficRecord`（流量，N条）。
  - `TrafficRecord` 包含唯一 ID、时间戳、归属的 `endpoint_id`，以及请求体/响应体快照。

### 2. 设计模式应用
- **异步发件箱模式 / Command Pattern**：
  在 `/v1/collect` 接收到流量后，不立即进行数据库的匹配和写入。而是生成一个 `ProcessTrafficCommand` 发送到 Redis 队列。由 Worker 进程异步执行“URI 泛化匹配 -> 脱敏 -> 归档写入”的重度计算任务。
- **策略模式 (Strategy Pattern)**：
  针对不同的 API 文档导入（Apifox、Swagger、OpenAPI），抽象出 `ApiImportStrategy` 接口，以便未来灵活扩展解析逻辑。

---

## 四、 具体实施步骤 (Implementation Steps)

1. **数据库模型重构**：
   - 创建 `SystemModule` 和 `ApiEndpoint` 模型，用于存储从 Apifox 导入的目录结构。
   - 创建 `TrafficRecord` 模型，关联到 `ApiEndpoint`，用于追加存储不重去的流量。
   - 创建 `GlobalConfig` 模型，存储采集开关（is_collecting）。
2. **流量控制层开发**：
   - 在 `collect.py` 中注入 `GlobalConfig` 的查询。若开关关闭，立即返回 204。
3. **API 归档与泛化匹配逻辑**：
   - 开发 `URI Matcher` 服务，利用正则将真实路径 `/users/123` 映射到定义路径 `/users/{id}`。
4. **异步队列优化**：
   - 更新 Celery Task，将流量作为 `TrafficRecord` 批量入库，取代旧的去重逻辑（`update_or_create`）。
5. **接口开发**：
   - 提供导入 Apifox 数据的 API。
   - 提供开关控制 API。
   - 提供针对特定 `ApiEndpoint` 的历史流量查询 API。