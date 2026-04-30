# AI 驱动安全测试 · GitLab 集成方案

> 版本：v3.0 | 日期：2026-04-29

---

## 一、GitLab 集成

### 1.1 接入时机

```
开发者在 feature/* 分支开发提交
        │ （不触发扫描）
        ▼
提交 MR（申请合并进 main）
        │ ← 扫描在此介入（增量，只扫本次改动）
        ▼
扫描完成，结果推送到流量采集平台记录
        ▼
合并进 main（不阻断，扫描结果仅供参考）
        │ ← 再次触发（全量兜底）
        ▼
每晚定时全量扫描（二次兜底）
```

扫描结果只记录不拦截，团队在流量采集平台查阅和标记处理状态。

### 1.2 工作原理

扫描平台是一个常驻的 Web 服务，GitLab 通过 Webhook 主动推送事件。

```
代码变更（MR / push to main）
        ↓
GitLab 推送 Webhook 事件到扫描平台
        ↓
扫描平台收到事件，从 payload 拿到 project_id、commit、mr_iid
        ↓
用 GitLab API 动态读取仓库结构和源码（无需写死模块名）
        ↓
执行安全分析
        ↓
结果推送到流量采集平台
```

**不需要 `.gitlab-ci.yml`，不需要 GitLab Runner。**

### 1.3 动态模块发现

不需要在任何地方写死模块名，全部从仓库实时读取。

**MR 增量（直接知道改了什么）：**
```
GET /api/v4/projects/:id/merge_requests/:iid/changes
→ 返回本次 MR 改动的文件列表，直接得知涉及哪些模块
```

**全量（动态发现所有模块）：**
```
GET /api/v4/projects/:id/repository/tree?recursive=true&ref=main
→ 返回完整目录结构，扫描平台自动识别模块
```

新增或删除服务，无需改任何配置。

### 1.4 GitLab 配置

**Access Token**

在 GitLab 创建 Access Token，赋予以下权限：

| 权限 | 用途 |
|------|------|
| `read_api` | 读取项目信息、MR 信息 |
| `read_repository` | 读取源码、目录结构、diff |

Token 保存到扫描平台的环境变量，不存入 GitLab。

**Webhook 配置**

```
项目 → Settings → Webhooks → Add new webhook

URL:          http://your-scanner/api/webhook
Secret Token: （扫描平台验证来源用）
触发事件：    ✅ Merge request events
             ✅ Push events（限定 main 分支）
```

### 1.5 触发策略

| 触发场景 | 触发方式 | 扫描范围 |
|---------|---------|---------|
| 提交 MR | Webhook `merge_request` / action: open | 本次 MR 改动文件 |
| 更新 MR | Webhook `merge_request` / action: update | 本次 MR 改动文件 |
| 合并进 main | Webhook `push` / branch: main | 全量 |
| 每晚定时 | Temporal 调度（`SCHEDULED_SCAN_CRON`）| 全量 |

### 1.6 首次接入

项目已有历史代码，接入时手动触发一次全量扫描：

```bash
curl -X POST http://your-scanner/api/scan/full \
  -H "Authorization: Bearer $SCANNER_TOKEN" \
  -d '{"project_id": "123", "ref": "main"}'
```

扫描平台通过 GitLab API 动态读取完整仓库，执行全量扫描。之后由 Webhook 自动接管。

---

## 二、扫描流程

### 2.1 技术选型

| 组件 | 技术 | 用途 |
|------|------|------|
| Web 框架 | FastAPI | 接收 Webhook、提供手动触发接口 |
| 工作流编排 | Temporal | 多阶段任务编排、失败自动重试、并发控制 |
| 静态分析 | Joern | 构建完整 CPG（AST / CFG / PDG / Call Graph） |
| 补充解析 | call_chain_resolver.py | MyBatis XML SQL 节点注入、Feign 跨服务边界节点注入 |
| 图存储 | Neo4j | 持久化存储 CPG，节点属性区分微服务，支持增量更新 |
| 关系型存储 | PostgreSQL | 持久化 AI 分析结果、扫描记录、漏洞 payload |
| 数据建模 | Pydantic | 定义各阶段输入输出数据结构 |
| AI Agent | PydanticAI | 调用 Claude，输出严格符合 Pydantic 模型的 JSON |

### 2.2 整体流程

```
GitLab Webhook 触发
        ↓
重复触发去重：同一 MR 已有扫描在跑则取消旧任务
        ↓
Temporal 工作流启动
        ↓
Activity 1：源码同步到本地缓存目录
           - 按 commit hash 判断是否需要更新
           - 未变更的微服务直接复用缓存，不重新下载
        ↓
Activity 2：Joern 按微服务构建完整 CPG + Claude 兜底补充
           Step 1：Joern 扫描所有 .java 文件 → 生成 AST / CFG / PDG / Call Graph
           Step 2：call_chain_resolver.py 解析 MyBatis XML 标准 SQL 和 Feign 标准写法
           Step 3：正则预扫描，定位 4 类特殊模式文件：
                   - MyBatis XML 动态 SQL（含 <if> / <foreach> / <choose>）
                   - JPA @Query 原生 SQL
                   - JDBC Template 直接拼接 SQL
                   - Spring Data / Feign 非标准写法
           Step 4：[AI 介入] Claude 精读预扫描定位的文件，输出补充节点写入 Neo4j
                   - 补充节点写入方式待确认（需验证 Joern CPG 结构后确定）
        ↓
Activity 3：完整 CPG 存入 Neo4j
           - 节点打 service 标签区分微服务
           - 记录每个微服务对应的 commit hash（用于增量判断）
        ↓
Activity 4：接口发现（按模块分组）
           - 遍历各微服务，查询 Neo4j 各 service 节点下带 @RequestMapping / @GetMapping / @PostMapping 等注解的 Controller 方法
           - 输出按模块分组的接口字典（key 为微服务名，value 为该服务接口列表）
           - 示例：{"sts": [{...}, ...], "authz": [{...}, ...], "mdm": [{...}, ...]}
        ↓
Activity 5：查询 Neo4j，从接口入口提取调用链 / 数据流 / Source→Sink 路径
           - 只提取涉及路径的关键文件列表（Controller / Service / Repository）
        ↓
Activity 6：按漏洞域并发分发给对应 Agent（agents/ 目录）
           - 10 个 Agent，OWASP Top 10 对齐，并发数上限 7
           - Agent 读取本地缓存源码中 Neo4j 指定的关键文件
           - 结合 Neo4j 结构化上下文做语义分析
           - [AI 介入] Claude 按漏洞域批量分析所有接口，输出结构化 JSON
        ↓
Activity 7：AI 分析结果持久化到 PostgreSQL
        ↓
Activity 8：[AI 介入] Claude 汇总归并所有 Agent 结论
           - 去重、合并相关漏洞、评定综合风险等级
        ↓
Activity 9：推送最终结论到流量采集平台
```

任意 Activity 失败，Temporal 自动重试，不从头重跑。

### 2.3 公共模块识别

满足以下 **2 条及以上**即认定为公共模块：

1. 目录名包含 `common` / `parent` / `core` / `base`
2. 模块下无 `@RestController` 或 `@Controller` 注解
3. 被其他模块 `pom.xml` 以 `<dependency>` 引用

**公共模块变更处理：** 检测到公共模块有改动时，触发所有微服务全量 CPG 重建。

### 2.4 CPG 生成与存储

每个微服务单独构建 CPG，存入 Neo4j 时用节点属性区分：

```
本地缓存目录/
├── sts/     → Joern 构建 + call_chain_resolver 注入 → Neo4j（service: "sts", commit: "abc123"）
├── authz/   → Joern 构建 + call_chain_resolver 注入 → Neo4j（service: "authz", commit: "abc123"）
├── mdm/     → Joern 构建 + call_chain_resolver 注入 → Neo4j（service: "mdm", commit: "abc123"）
└── ...
```

微服务目录从 GitLab API 动态识别，不写死。

**增量更新策略：**

- MR 扫描：只重建本次 MR 涉及的微服务 CPG，其余复用 Neo4j 已有数据
- 公共模块变更：触发所有微服务全量重建
- 全量扫描：重建所有微服务 CPG

**Neo4j 查询示例（提取 sts 服务 Controller 层调用链）：**

```cypher
MATCH (m:METHOD {service: "sts"})-[:CALL*]->(n:METHOD)
WHERE m.name CONTAINS "Controller"
RETURN m.name, n.name
```

### 2.5 Activity 5 — Agent 并发分析详细流程

#### 整体执行流程

```
Temporal 调度 Activity 5
        ↓
agent_run.py 从 Neo4j 拉取所有接口的结构化上下文（调用链 / 数据流 / Source→Sink）
        ↓
按漏洞域创建 10 个 Agent 任务（与 OWASP Top 10 对齐）
        ↓
asyncio.Semaphore 控制并发，7-10 个 Agent 同时运行
        ↓
每个 Agent：
    1. 读取 agents/{agent_name}.md 作为角色 prompt，加载关联的多个 rules/*.yaml 合并为完整 system prompt
    2. 组装 user message（Neo4j 上下文 + 关键文件源码）
    3. PydanticAI 调用 Claude 分析
    4. 返回 VulnerabilityResult 列表
        ↓
所有 Agent 结果合并，传入 Activity 6 持久化
```

#### PydanticAI Agent 定义

```python
from pydantic_ai import Agent
from pydantic import BaseModel

class VulnerabilityResult(BaseModel):
    rule_id: str              # 触发的规则 ID，如 RULE-SQL-001；无对应规则填 "CUSTOM"
    vulnerability_type: str
    severity: str             # HIGH / MEDIUM / LOW
    endpoint: str
    location: str             # 文件名:行号
    description: str
    evidence: str             # 触发漏洞的具体代码片段
    payload_hint: str         # 用于后续动态测试生成 payload

agent = Agent(
    model="claude-opus-4-7",
    system_prompt=build_system_prompt(agent_name),   # 合并 agents/*.md + rules/*.yaml
    result_type=list[VulnerabilityResult],
)
```

#### User Message 组装

每次调用传入两部分内容：

```
[Neo4j 结构化上下文 - JSON]
以下是本次需要分析的所有接口调用链和数据流信息：
{neo4j_context_json}

[关键文件源码]
以下是涉及上述接口的关键源码文件：

# UserController.java
{file_content}

# UserService.java
{file_content}

# UserMapper.xml
{file_content}
```

#### Claude 模型参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 模型 | `claude-opus-4-7` | 最强推理能力，适合安全审计 |
| max_tokens | 4096 | 单次分析输出上限 |
| temperature | 0 | 安全分析要求确定性输出，不需要随机性 |

#### 并发控制

```python
AGENT_NAMES = list(AGENT_RULE_MAP.keys())  # 10 个，见第四章
semaphore = asyncio.Semaphore(AGENT_CONCURRENCY)  # 从配置读取，默认 7

async def run_agent(agent_name: str, context: ScanContext):
    async with semaphore:
        agent = Agent(
            model="claude-opus-4-7",
            system_prompt=build_system_prompt(agent_name),
            result_type=list[VulnerabilityResult],
        )
        result = await agent.run(build_user_message(context))
        return result.data  # list[VulnerabilityResult]

all_results = await asyncio.gather(*[
    run_agent(name, context)
    for name in AGENT_NAMES
])
```

#### Temporal 中的执行

Activity 6 在 Temporal 里是单个 Activity，内部通过 asyncio 并发：

```python
@activity.defn
async def run_agents_activity(context: ScanContext) -> list[VulnerabilityResult]:
    activity.heartbeat("starting 10 agent analysis")
    results = await asyncio.gather(
        *[run_agent(name, context) for name in AGENT_NAMES],
        return_exceptions=True
    )
    activity.heartbeat("agent analysis complete")
    findings = []
    for name, r in zip(AGENT_NAMES, results):
        if isinstance(r, Exception):
            activity.logger.warning(f"Agent {name} failed: {r}")
        else:
            findings.extend(r)
    return findings
```

Claude API 限流时 PydanticAI 内置退避重试，Temporal 层面配置重试次数为 2。单个 Agent 失败不中止整批。

#### 输出（Pydantic 模型约束）

```json
{
  "rule_id": "RULE-SQL-001",
  "vulnerability_type": "SQL Injection",
  "severity": "HIGH",
  "endpoint": "POST /api/user/create",
  "location": "UserMapper.xml:42",
  "description": "username 参数通过 ${} 直接拼入 SQL，存在注入风险",
  "evidence": "INSERT INTO user VALUES (${username})",
  "payload_hint": "username=' OR '1'='1"
}
```

`payload_hint` 字段为 Activity 7 汇总后动态测试生成精准 payload 提供依据。

### 2.6 Activity 2 — Claude 兜底补充详细流程

#### 正则预扫描

在 Joern 和 `call_chain_resolver.py` 完成后，对本地缓存目录执行正则扫描，定位 4 类特殊模式文件：

| 模式 | 文件类型 | 识别规则 |
|------|---------|---------|
| MyBatis XML 动态 SQL | `.xml` | 包含 `<if`、`<foreach`、`<choose` |
| JPA `@Query` | `.java` | 包含 `@Query` 注解 |
| JDBC Template | `.java` | 包含 `JdbcTemplate`、`NamedParameterJdbcTemplate` |
| Spring Data / Feign 非标准 | `.java` | 继承 `JpaRepository`/`CrudRepository` 且有自定义方法，或 `@FeignClient` 在继承接口里 |

预扫描只定位文件，不做分析，结果是一个待 Claude 精读的文件列表。

#### Claude 精读输入

```
[待补充分析的文件列表]
以下文件包含 call_chain_resolver.py 和 Joern 无法完整解析的特殊模式，
请识别其中的 SQL Sink、数据流入口、跨服务边界，输出补充节点列表。

# UserMapper.xml（含动态 SQL）
{file_content}

# UserRepository.java（JPA @Query）
{file_content}
```

#### Claude 输出（Pydantic 模型约束）

```json
[
  {
    "type": "sql_sink",
    "file": "UserMapper.xml",
    "method": "findByCondition",
    "sql_pattern": "SELECT * FROM user WHERE <if test='name != null'>name = #{name}</if>",
    "has_injection_risk": false,
    "note": "动态 SQL，参数使用 #{} 安全绑定"
  },
  {
    "type": "sql_sink",
    "file": "UserRepository.java",
    "method": "findByRawSql",
    "sql_pattern": "SELECT * FROM user WHERE name = ?1",
    "has_injection_risk": false,
    "note": "JPA @Query 原生 SQL，使用位置参数绑定"
  }
]
```

#### 写入 Neo4j

Claude 输出的补充节点通过 Neo4j Python 驱动写入图中，与 Joern 已有节点关联（写入方式待确认，见六、待确认事项）。

### 2.7 Activity 7 — Claude 汇总归并详细流程

#### 输入

Activity 6 持久化到 PostgreSQL 的所有 Agent 分析结论，按接口分组后交给 Claude：

```json
{
  "scan_id": "scan-123-mr-456",
  "service": "sts",
  "findings": [
    {
      "agent": "sql_injection",
      "vulnerability_type": "SQL Injection",
      "severity": "HIGH",
      "endpoint": "POST /api/user/create",
      "location": "UserMapper.xml:42",
      "evidence": "INSERT INTO user VALUES (${username})",
      "payload_hint": "username=' OR '1'='1"
    },
    {
      "agent": "broken_access_control",
      "vulnerability_type": "Missing Authorization",
      "severity": "HIGH",
      "endpoint": "POST /api/user/create",
      "location": "UserController.java:35",
      "evidence": "无 @PreAuthorize 注解",
      "payload_hint": "直接调用无需认证"
    }
  ]
}
```

#### Claude 汇总任务

```
[汇总指令]
以下是对同一服务所有接口的安全分析结论，来自 10 个不同漏洞类型的 Agent。
请完成以下任务：
1. 去重：合并同一接口同一位置的重复发现
2. 关联：将同一接口的多个漏洞组合成攻击链（如 SQL 注入 + 未授权 = 高危组合）
3. 评级：基于漏洞组合评定综合风险等级（CRITICAL / HIGH / MEDIUM / LOW）
4. 输出：严格按照 ScanSummary 模型返回
```

#### Claude 输出（Pydantic 模型约束）

```python
class AttackChain(BaseModel):
    endpoints: list[str]        # 涉及的接口
    vulnerabilities: list[str]  # 组合的漏洞类型
    combined_severity: str      # CRITICAL / HIGH / MEDIUM / LOW
    description: str            # 攻击链说明

class ScanSummary(BaseModel):
    scan_id: str
    service: str
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    deduplicated_findings: list[VulnerabilityResult]
    attack_chains: list[AttackChain]
```

#### Temporal 中的执行

```python
@activity.defn
async def summarize_activity(scan_id: str) -> ScanSummary:
    findings = await postgres.get_findings_by_scan(scan_id)
    agent = Agent(
        model="claude-opus-4-7",
        system_prompt=SUMMARIZE_PROMPT,
        result_type=ScanSummary,
    )
    result = await agent.run(build_summary_message(findings))
    return result.data
```

汇总结果写回 PostgreSQL，再由 Activity 8 推送到流量采集平台。

---

## 三、Temporal 工作流

### 3.1 核心概念

| 概念 | 说明 | 在本项目中的对应 |
|------|------|----------------|
| Workflow | 编排逻辑，定义 Activity 的执行顺序和并发 | 整个扫描任务的流程控制 |
| Activity | 可独立重试的执行单元，一个 Python 函数 | 下载源码、Joern 构建、Agent 分析等每个步骤 |
| Worker | 常驻进程，监听并执行 Workflow 和 Activity | 扫描平台启动时同步启动 |
| Task Queue | Worker 监听的任务队列 | `aisec-scan-queue` |

### 3.2 Workflow 结构

```
ScanWorkflow
    ├── Activity 1：源码同步（按微服务独立判断 commit hash）
    ├── Activity 2：Joern CPG 构建 + Claude 兜底（含心跳）
    ├── Activity 3：CPG 存入 Neo4j
    ├── Activity 4：接口发现（按微服务模块分组，查询 Controller 入口）
    ├── Activity 5：Neo4j 查询调用链 / 数据流
    ├── Activity 6：Agent 并发分析（10 个 Agent，并发上限 7）
    ├── Activity 7：AI 结果存入 PostgreSQL
    ├── Activity 8：Claude 汇总归并
    └── Activity 9：推送到流量采集平台
```

Workflow 支持取消信号（Cancel Signal），用于重复触发时取消旧任务。

### 3.3 per-Activity 配置

不同 Activity 耗时差异大，需单独配置超时和重试策略：

| Activity | 预估耗时 | 超时设置 | 重试次数 | 备注 |
|----------|---------|---------|---------|------|
| 1 源码同步 | 1-3 min | 10 min | 3 | 网络失败重试 |
| 2 Joern 构建 | 10-30 min | 60 min | 1 | 开启心跳，代价大不多次重试 |
| 3 Neo4j 存储 | 1-5 min | 15 min | 3 | |
| 4 接口发现 | < 1 min | 5 min | 3 | 按微服务模块分组输出 |
| 5 Agent 分析 | 5-15 min | 30 min | 2 | Claude API 限流时退避重试 |
| 6 PostgreSQL 存储 | < 1 min | 5 min | 3 | |
| 7 Claude 汇总 | 1-3 min | 10 min | 2 | |
| 8 推送结果 | < 1 min | 5 min | 3 | |

### 3.4 Activity Heartbeat

Activity 2（Joern 构建）和 Activity 5（Agent 分析）运行时间长，需要定期发送心跳信号，告知 Temporal Server 任务仍在运行：

```python
from temporalio import activity

async def build_cpg_activity(service: str):
    for microservice in services:
        # 每处理完一个微服务发送心跳
        activity.heartbeat(f"building CPG for {microservice}")
        await run_joern(microservice)
```

心跳间隔通过 `JOERN_HEARTBEAT_SEC` 配置（默认 60s），Joern 构建设为每完成一个微服务发送一次。

### 3.5 重复触发去重

同一 MR 新的 Webhook 触发时，通过 Workflow ID 取消旧任务：

| 触发类型 | Workflow ID 规则 |
|---------|----------------|
| MR 扫描 | `{prefix}-{project_id}-mr-{mr_iid}` |
| push to main | `{prefix}-{project_id}-push-{commit}` |
| 每晚定时 | `{prefix}-{project_id}-scheduled-{date}` |

`prefix` 从配置项 `WORKFLOW_ID_PREFIX` 读取，默认 `scan`。

新任务启动前检查同 ID 的 Workflow 是否在运行，若在运行则发送 Cancel Signal 取消旧任务，再启动新任务。

---

## 四、Agent 设计

### 4.1 Agent 总览

系统共 **10 个 Agent**，与 OWASP Top 10（2021）对齐，A06（易受攻击组件）由依赖扫描工具处理，不建 Agent。每个 Agent 对应同名 `agents/*.md`（角色定义）和一组 `rules/*.yaml`（检测规则），由 `agent_run.py` 在运行时合并为完整 system prompt。

| Agent 文件 | OWASP | 关联规则文件 | 规则数 |
|-----------|-------|------------|--------|
| `access_control.md` | A01 访问控制失效 | broken_access_control · iam_lifecycle · file_security | 47 |
| `crypto_data.md` | A02 加密失败 | cryptographic_failures · data_privacy · information_disclosure | 42 |
| `injection.md` | A03 注入 | sql_injection · xss · injection | 42 |
| `insecure_design.md` | A04 不安全设计 | insecure_design · api_rate_limiting · thread_context_security | 39 |
| `misconfiguration.md` | A05 安全配置错误 | security_misconfiguration · spring_autoconfig · microservice_security · caching_security · protocol_security | 70 |
| `auth_failures.md` | A07 认证失败 | auth_failures | 42 |
| `integrity_failures.md` | A08 数据完整性失败 | deserialization · event_driven_security · third_party_integration | 34 |
| `logging_monitoring.md` | A09 日志监控不足 | logging_failures | 24 |
| `ssrf.md` | A10 SSRF | ssrf | 12 |
| `ai_llm_security.md` | OWASP LLM Top 10 | ai_llm_security | 45 |

**总计：10 个 Agent，397 条规则**

> A06（易受攻击的组件）依赖 CVE 版本扫描工具（如 OWASP Dependency-Check），不在代码语义分析范围内，不建 Agent。

---

### 4.2 每个 Agent 的执行过程

```
1. 加载 system prompt
   agents/{agent}.md              ← 角色定义：安全视角、分析方法、输出注意事项
   rules/{yaml_1}.yaml
   rules/{yaml_2}.yaml  ...       ← 规则清单：id / severity / detection_hint（可多个）

2. 组装 user message
   Neo4j 调用链 JSON（本次扫描接口的 Controller→Service→Repository 路径）
   + 关键源文件内容（.java / .xml，由 Neo4j 查询结果指定）

3. PydanticAI 调用 Claude（claude-opus-4-7, temperature=0）
   输出严格符合 list[VulnerabilityResult] 模型

4. 结果写入 Activity 内存缓冲，等待汇总
```

---

### 4.3 Agent → 规则文件映射

`agent_run.py` 维护一个静态映射表，驱动 system prompt 组装：

```python
AGENT_RULE_MAP = {
    "access_control":    ["broken_access_control", "iam_lifecycle", "file_security"],
    "crypto_data":       ["cryptographic_failures", "data_privacy", "information_disclosure"],
    "injection":         ["sql_injection", "xss", "injection"],
    "insecure_design":   ["insecure_design", "api_rate_limiting", "thread_context_security"],
    "misconfiguration":  ["security_misconfiguration", "spring_autoconfig_security",
                          "microservice_security", "caching_security", "protocol_security"],
    "auth_failures":     ["auth_failures"],
    "integrity_failures":["deserialization", "event_driven_security", "third_party_integration"],
    "logging_monitoring":["logging_failures"],
    "ssrf":              ["ssrf"],
    "ai_llm_security":   ["ai_llm_security"],
}
```

---

### 4.4 system prompt 组装逻辑

```python
def build_system_prompt(agent_name: str) -> str:
    agent_role = load_agent_md(f"agents/{agent_name}.md")
    rule_files = AGENT_RULE_MAP[agent_name]
    all_rules = []
    for rf in rule_files:
        all_rules.extend(load_rules_yaml(f"rules/{rf}.yaml"))
    rules_text = "\n".join(
        f"- [{r['id']}] {r['name']}（{r['severity']}）：{r['detection_hint']}"
        for r in all_rules
    )
    return (
        f"{agent_role}\n\n"
        f"## 本次必须逐条检查的规则清单\n{rules_text}\n\n"
        "检查完规则清单后，结合你的安全知识发现清单之外的潜在风险，一并输出。"
    )
```

`agents/*.md` 只写分析方法和输出格式要求，不写具体规则。  
`rules/*.yaml` 只写规则，不涉及分析逻辑。  
新增规则只需编辑 YAML，无需改 Agent 代码。

---

### 4.5 输出模型

```python
class VulnerabilityResult(BaseModel):
    rule_id: str              # 触发的规则 ID，如 RULE-SQL-001；无对应规则填 "CUSTOM"
    vulnerability_type: str   # 漏洞类型名称
    severity: str             # HIGH / MEDIUM / LOW
    endpoint: str             # 触发漏洞的接口路径，如 POST /api/user/create
    location: str             # 文件名:行号，如 UserMapper.xml:42
    description: str          # 漏洞描述（1-2 句）
    evidence: str             # 触发漏洞的具体代码片段
    payload_hint: str         # 供后续动态测试生成 payload 的提示
```

`rule_id` 字段关联规则库，支持后续统计规则命中率。

---

### 4.6 并发控制代码

```python
AGENT_NAMES = list(AGENT_RULE_MAP.keys())  # 10 个
semaphore = asyncio.Semaphore(AGENT_CONCURRENCY)  # 默认 7

async def run_agent(agent_name: str, context: ScanContext) -> list[VulnerabilityResult]:
    async with semaphore:
        agent = Agent(
            model="claude-opus-4-7",
            system_prompt=build_system_prompt(agent_name),
            result_type=list[VulnerabilityResult],
        )
        result = await agent.run(build_user_message(context))
        return result.data

@activity.defn
async def run_agents_activity(context: ScanContext) -> list[VulnerabilityResult]:
    activity.heartbeat("starting 10 agent analysis")
    results = await asyncio.gather(
        *[run_agent(name, context) for name in AGENT_NAMES],
        return_exceptions=True
    )
    findings = []
    for name, r in zip(AGENT_NAMES, results):
        if isinstance(r, Exception):
            activity.logger.warning(f"Agent {name} failed: {r}")
        else:
            findings.extend(r)
    activity.heartbeat(f"agent analysis complete, {len(findings)} findings")
    return findings
```

单个 Agent 失败不中止整批，失败信息记录到 Temporal Activity 日志。

---

## 五、扫描平台项目结构

> **MVP 阶段**：不引入 Temporal / Joern / Neo4j，用 asyncio 串联，用 `call_chain_resolver.py` 提取调用链，结果直接在内存传递。后期可按第六节路径逐步引入。

```
aisec-gitlab/
├── main.py                      # FastAPI 服务启动入口
├── config.py                    # 所有运行参数从环境变量读取
├── .env.example                 # 环境变量配置示例
├── requirements.txt
├── Dockerfile
├── docker-compose.yml           # 编排：扫描平台 + PostgreSQL
│
├── api/
│   ├── webhook.py               # 接收 GitLab Webhook 事件（MR / push to main）
│   └── scan.py                  # 手动触发接口（POST /api/scan/full）
│
├── gitlab/
│   └── client.py                # GitLab API 封装（读源码、目录、MR diff）
│
├── scanner/
│   ├── service.py               # 编排入口：串联 sync → cpg → agent → summarize → store
│   ├── source_sync.py           # 从 GitLab 下载源文件到本地缓存目录
│   ├── loader.py                # 加载 agents/*.md + rules/*.yaml，组装 system prompt
│   ├── agent_run.py             # 并发运行 10 个 Agent，返回 list[VulnerabilityResult]
│   └── summarizer.py            # 调用 Claude 汇总归并，输出 ScanSummary
│
├── cpg/
│   ├── __init__.py
│   ├── discover.py              # 扫 Java 文件找 @RestController 接口入口（Phase 2）
│   └── resolver.py              # 封装 call_chain_resolver.py 为 Python API（Phase 2）
│
├── agents/                      # 各漏洞域 Agent 角色定义（system prompt）
│   ├── access_control.md        # A01 访问控制失效
│   ├── crypto_data.md           # A02 加密失败
│   ├── injection.md             # A03 注入
│   ├── insecure_design.md       # A04 不安全设计
│   ├── misconfiguration.md      # A05 安全配置错误
│   ├── auth_failures.md         # A07 认证失败
│   ├── integrity_failures.md    # A08 数据完整性失败
│   ├── logging_monitoring.md    # A09 日志监控不足
│   ├── ssrf.md                  # A10 SSRF
│   └── ai_llm_security.md       # OWASP LLM Top 10
│
├── rules/                       # 安全检测规则（YAML，共 24 个文件 397 条规则）
│   ├── sql_injection.yaml
│   ├── xss.yaml
│   ├── ssrf.yaml
│   ├── injection.yaml
│   ├── auth_failures.yaml
│   ├── broken_access_control.yaml
│   ├── cryptographic_failures.yaml
│   ├── security_misconfiguration.yaml
│   ├── insecure_design.yaml
│   ├── logging_failures.yaml
│   ├── deserialization.yaml
│   ├── file_security.yaml
│   ├── information_disclosure.yaml
│   ├── microservice_security.yaml
│   ├── ai_llm_security.yaml
│   ├── protocol_security.yaml
│   ├── iam_lifecycle.yaml
│   ├── api_rate_limiting.yaml
│   ├── third_party_integration.yaml
│   ├── data_privacy.yaml
│   ├── event_driven_security.yaml
│   ├── caching_security.yaml
│   ├── thread_context_security.yaml
│   └── spring_autoconfig_security.yaml
│
├── models/
│   ├── scan.py                  # FullScanRequest / ScanResult 请求模型
│   └── vulnerability.py         # VulnerabilityResult / ScanSummary / AttackChain
│
├── db/
│   ├── postgres.py              # asyncpg 客户端，持久化扫描结果
│   └── repository.py            # 推送最终结论到流量采集平台
│
├── call_chain_resolver.py       # 调用链解析脚本（Phase 2 由 cpg/resolver.py 调用）
└── scripts/
    └── generate_rules.py        # 从安全测试用例 Excel 生成 rules/*.yaml
```

### 5.1 配置清单

| 配置项 | 环境变量 | 说明 |
|--------|---------|------|
| GitLab 地址 | `GITLAB_URL` | |
| GitLab Access Token | `GITLAB_ACCESS_TOKEN` | read_api + read_repository |
| Webhook Secret | `WEBHOOK_SECRET` | GitLab Webhook 来源验证 |
| 本地缓存目录 | `SOURCE_CACHE_DIR` | 源码缓存路径，挂载为 Docker volume |
| Claude API Key | `ANTHROPIC_API_KEY` | |
| Agent 并发数 | `AGENT_CONCURRENCY` | 默认 7，建议 7-10 |
| PostgreSQL DSN | `POSTGRES_DSN` | `postgresql://user:pass@postgres:5432/aisec` |
| 流量采集平台地址 | `TRAFFIC_PLATFORM_URL` | |
| 流量采集平台 Token | `TRAFFIC_PLATFORM_TOKEN` | |
| 定时扫描 Cron | `SCHEDULED_SCAN_CRON` | 默认 `0 2 * * *`（每天凌晨 2 点） |

> **Phase 2 新增配置**（引入调用链解析后启用）：无需新增环境变量，`call_chain_resolver.py` 直接读取 `SOURCE_CACHE_DIR` 下的本地缓存。
>
> **Phase 3 新增配置**（引入 Temporal + Neo4j 后启用）：`TEMPORAL_HOST`、`NEO4J_URI`、`NEO4J_USER`、`NEO4J_PASSWORD`、`JOERN_BIN_PATH`。
| Activity 超时（各项） | `TIMEOUT_*` | 各 Activity 单独配置，见 3.3 节 |

### 5.2 规则管理

#### 规则与 Agent 的关系

```
rules/sql_injection.yaml     ←→     agents/sql_injection.md
（检测什么：具体测试点清单）          （怎么分析：角色定义 + 输出格式）
         ↓                                    ↓
              agent_run.py 在运行时合并为完整 prompt
```

`agents/*.md` 负责定义 Agent 角色和分析方法，`rules/*.yaml` 负责维护具体检测规则，两者职责分离。

#### prompt 组装方式

```python
AGENT_RULE_MAP = {
    "access_control":    ["broken_access_control", "iam_lifecycle", "file_security"],
    "crypto_data":       ["cryptographic_failures", "data_privacy", "information_disclosure"],
    "injection":         ["sql_injection", "xss", "injection"],
    "insecure_design":   ["insecure_design", "api_rate_limiting", "thread_context_security"],
    "misconfiguration":  ["security_misconfiguration", "spring_autoconfig_security",
                          "microservice_security", "caching_security", "protocol_security"],
    "auth_failures":     ["auth_failures"],
    "integrity_failures":["deserialization", "event_driven_security", "third_party_integration"],
    "logging_monitoring":["logging_failures"],
    "ssrf":              ["ssrf"],
    "ai_llm_security":   ["ai_llm_security"],
}

def build_system_prompt(agent_name: str) -> str:
    agent_role = load_agent_md(f"agents/{agent_name}.md")
    all_rules = []
    for rf in AGENT_RULE_MAP[agent_name]:
        all_rules.extend(load_rules_yaml(f"rules/{rf}.yaml"))
    rules_text = "\n".join(
        f"- [{r['id']}] {r['name']}（{r['severity']}）：{r['detection_hint']}"
        for r in all_rules
    )
    return f"{agent_role}\n\n## 本次必须逐条检查的规则清单\n{rules_text}\n\n" \
           "检查完规则清单后，结合你的安全知识发现清单之外的潜在风险，一并输出。"
```

#### 规则扩展方式

新增规则只需编辑对应 YAML 文件，追加一条记录：

```yaml
- id: RULE-SQL-016
  name: 新增规则名称
  type: static        # static（代码审计）/ dynamic（运行时测试，暂不启用）
  severity: HIGH      # HIGH / MEDIUM / LOW
  detection_hint: >
    检测说明：检查什么、怎么判断、关键代码特征...
```

不需要改任何代码，下次扫描任务启动时自动加载新规则。

#### 规则文件说明

| 文件 | 覆盖范围 | 规则数 |
|------|---------|--------|
| `sql_injection.yaml` | SQL 注入（MyBatis/JPA/JdbcTemplate/二阶注入）| 15 |
| `xss.yaml` | XSS（反射/存储/DOM/模板引擎/React/Angular）| 15 |
| `ssrf.yaml` | SSRF（URL 过滤/DNS 重绑定/云元数据/协议限制）| 12 |
| `injection.yaml` | 其他注入（命令/SpEL/SSTI/XXE/LDAP/JNDI）| 12 |
| `auth_failures.yaml` | 认证失败（密码策略/JWT/OAuth2/OIDC/会话/CSRF）| 42 |
| `broken_access_control.yaml` | 访问控制（IDOR/越权/Mass Assignment/RBAC）| 16 |
| `cryptographic_failures.yaml` | 加密失败（弱算法/IV 复用/CBC Oracle/TLS）| 12 |
| `security_misconfiguration.yaml` | 安全配置（CORS/HTTP 头/Actuator/HTTP 走私）| 25 |
| `insecure_design.yaml` | 不安全设计（业务逻辑/竞态/状态机/限额绕过）| 17 |
| `logging_failures.yaml` | 日志缺失（操作审计/PII 记录/安全告警）| 24 |
| `deserialization.yaml` | 反序列化（Java 原生/Fastjson/Jackson/XStream）| 10 |
| `file_security.yaml` | 文件安全（上传校验/路径穿越/Zip Slip/病毒扫描）| 19 |
| `information_disclosure.yaml` | 信息泄露（Swagger/堆栈追踪/硬编码密钥/PII）| 18 |
| `microservice_security.yaml` | 微服务安全（Feign 签名/mTLS/服务发现/熔断）| 10 |
| `ai_llm_security.yaml` | AI/LLM 安全（LLM01-LLM10 全覆盖，MCP/HITL/RAG）| 45 |
| `protocol_security.yaml` | 协议安全（GraphQL/gRPC/WebSocket）| 11 |
| `iam_lifecycle.yaml` | IAM 生命周期（休眠账号/Token 吊销/权限漂移）| 12 |
| `api_rate_limiting.yaml` | 限速/资源防护（双维度限速/ReDoS/分布式计数）| 12 |
| `third_party_integration.yaml` | 第三方集成（Webhook 签名/外部 API/SSL 证书）| 12 |
| `data_privacy.yaml` | 数据隐私（PII 脱敏/导出审计/数据删除/跨境）| 12 |
| `event_driven_security.yaml` | 事件驱动安全（消息验证/防重放/跨租户隔离）| 12 |
| `caching_security.yaml` | 缓存安全（租户隔离/权限失效/缓存击穿/Session）| 12 |
| `thread_context_security.yaml` | 线程上下文安全（@Async/ThreadLocal/虚拟线程）| 10 |
| `spring_autoconfig_security.yaml` | Spring 自动配置（Data REST/Config Server/Gateway）| 12 |

> 当前均为 `type: static` 的静态代码审计规则，共 **397 条**。动态测试规则（`type: dynamic`）待后续阶段补充。

---

## 六、待确认事项

| 事项 | 状态 |
|------|------|
| 扫描平台部署地址（GitLab 需能访问到）| 待确认 |
| GitLab Access Token 由谁创建管理 | 待确认 |
| Webhook Secret Token 生成方式 | 待确认 |
| 扫描结果推送到流量采集平台的接口格式 | 待设计 |
| 通知方式（邮件 / 钉钉 / 飞书）| 待确认 |
| 每晚定时扫描执行时间 | 已有默认值 `0 2 * * *`，可通过 `SCHEDULED_SCAN_CRON` 调整 |
| Joern CPG 节点结构（需搭建环境后验证）| 待确认 |
| call_chain_resolver.py 补充节点写入 CPG 的具体路径（Neo4j 后补充 or Joern HTTP API）| 待确认 |
| Joern 导出 Neo4j 后注解信息是否完整保留（@RequestMapping 等，影响接口入口识别）| 待确认 |
