# changelog — 变更日志索引

> 新建文档:复制 [_TEMPLATE.md](_TEMPLATE.md) 改写,命名 `{前缀}-{编号}-{描述}.md`,编号在同前缀下递增。
> **新增文档后必须在本索引追加一行**(编号 + 标题链接 + 一句话摘要)。

| 前缀 | 含义 | | 前缀 | 含义 |
|------|------|---|------|------|
| `FEAT-` | 新功能 | | `DISC-` | 调研讨论 |
| `FIX-` | Bug 修复 | | `REFACTOR-` | 重构优化 |
| `OPS-` | 运维操作 | | | |

## FIX(下一编号:FIX-014)

| 编号 | 文档 | 日期 | 摘要 |
|---|---|---|---|
| FIX-001 | [backend序列化500修复](FIX-001-backend序列化500修复.md) | 2026-04-05 | JSON 校验器误放在响应模型导致脏数据查询 500,下沉到 Create/Update 请求模型 |
| FIX-002 | [差异视图语义识别与UI优化](FIX-002-差异视图语义识别与UI优化.md) | 2026-04-05 | 优化 DIFF 视图的语义识别与 UI 表现 |
| FIX-003 | [重放Status0显示空白诊断](FIX-003-重放Status0显示空白诊断.md) | 2026-04-05 | 修复变体重放 Status 0 时显示空白、缺乏诊断信息的问题 |
| FIX-004 | [重放状态0显示与侧边栏布局](FIX-004-重放状态0显示与侧边栏布局.md) | 2026-04-05 | 修复重放"状态 0"显示及侧边栏布局问题 |
| FIX-005 | [剔重后流量显示0](FIX-005-剔重后流量显示0.md) | 2026-04-05 | 修复接口详情页"剔重后流量"显示 0 的问题 |
| FIX-006 | [变体重放NetworkError0误判](FIX-006-变体重放NetworkError0误判.md) | 2026-04-05 | 修复变体重放 Network Error 0 及 UI 误判问题 |
| FIX-007 | [变体重放点击无反应](FIX-007-变体重放点击无反应.md) | 2026-04-05 | 修复变体重放功能"点击无反应"的静默失败 |
| FIX-008 | [侧滑详情页被Header遮挡](FIX-008-侧滑详情页被Header遮挡.md) | 2026-04-05 | 修复侧滑详情页被全局 Header 遮挡的 z-index 层叠上下文问题 |
| FIX-009 | [重放历史分页失效](FIX-009-重放历史分页失效.md) | 2026-04-06 | 前后端脱节的假分页:后端缺 count 字段 + 前端客户端 slice 分页,改为服务端分页 |
| FIX-010 | [流量计数不一致与数据漂移](FIX-010-流量计数不一致与数据漂移.md) | 2026-04-06 | 修复流量计数显示不一致与数据漂移 |
| FIX-011 | [前端API基地址undefined导致登录404](FIX-011-前端API基地址undefined导致登录404.md) | 2026-07-06 | `OpenAPI.BASE` 直接赋未注入的 `VITE_API_URL` 拼出 `/undefined/api/...`,补空串兜底走相对路径由代理转发 |
| FIX-012 | [安全大屏开放问题恒为0](FIX-012-安全大屏开放问题恒为0.md) | 2026-07-08 | 前端手写 `Stats` 类型凭空声明 `open_findings`,scanner `/stats` 从不返回该字段→`?? 0` 恒为 0;改读 `by_status.open`(线上实为 1013),删幽灵字段。误报率 0.0% 经核查非 bug(verifier 仅 low 置信度弱驳回) |
| FIX-013 | [返回按钮硬编码跳大屏](FIX-013-返回按钮硬编码跳大屏.md) | 2026-07-08 | finding/服务详情"返回大屏"用 `<Link to="/security-dashboard">` 写死目标,从任意入口下钻后都甩到大屏;改用 `useCanGoBack()`+`router.history.back()` 回上一步,无历史才兜底回大屏 |

## FEAT(下一编号:FEAT-018)

| 编号 | 文档 | 日期 | 摘要 |
|---|---|---|---|
| FEAT-001 | [前端拆分AI安全与流量劫持并补全扫描任务](FEAT-001-前端拆分AI安全与流量劫持并补全扫描任务.md) | 2026-07-06 | 侧边栏「AI 安全 / 流量劫持」分组;新增扫描任务总览页 `/security/tasks` + 后端聚合端点 `GET /security/scan-runs`;抽出可复用 `TriggerScanButton` 修掉触发扫描静默失败 |
| FEAT-002 | [扫描成本三级下钻](FEAT-002-扫描成本三级下钻.md) | 2026-07-06 | 扫描成本页三级下钻:scanner `/cost-stats` 增 `by_service`、新增 `/cost-runs` 单次明细;平台代理 + 前端拆分 `cost/` 分区(按服务点行联动筛选、单次扫描行内展开逐引擎);根因是历史成功扫描早于成本记录功能、之后扫描未完成故 `scan_engine_runs` 为空 |
| FEAT-003 | [扫描运行详情实时进度](FEAT-003-扫描运行详情实时进度.md) | 2026-07-06 | 点服务名看「当前扫描过程」:scanner `current_stage` 阶段打点 + 单次运行详情接口(FEAT-011),平台代理 `/security/services/{name}/scan-runs/{id}` + 前端 `ScanRunDetailPanel`(阶段进度条 + 逐引擎表 + 心跳,running 时 4s 轮询) |
| FEAT-004 | [低价值接口前端隐藏](FEAT-004-低价值接口前端隐藏.md) | 2026-07-06 | 接口清单默认隐藏错误页/基础设施接口(view-only+开关+计数),按稳定路径正则识别;**不连带隐藏其 finding**(findings 只按裁决过滤,防止把复核漏判连同真漏洞埋掉) |
| FEAT-005 | [源码缓存管理](FEAT-005-源码缓存管理.md) | 2026-07-06 | 服务详情「源码缓存」tab:列出已拉取代码 hash(sha/时间/大小/最近扫描),删除/删除并重扫(scanner FEAT-012:删缓存+清该 sha 续跑标记,保留 findings;重拉需 GITLAB_ACCESS_TOKEN) |
| FEAT-006 | [服务详情Findings只看最近N次扫描](FEAT-006-服务详情Findings只看最近N次扫描.md) | 2026-07-07 | Findings 标签只看最近 3 次扫描(默认全量累积→近期结果);代理透传 `recent_runs` + 前端常量;能力在下游 scanner FEAT-013(`last_seen_scan_run_id`,按产出结果的扫描计名额);左侧计数卡片保持全量 |
| FEAT-007 | [运维面板重建部署scanner](FEAT-007-运维面板重建部署scanner.md) | 2026-07-07 | 扫描配置页「运维操作」一键重建+部署 scanner:后端挂 docker.sock + docker CLI 跑 compose build/up,前端轮询状态+实时日志;踩坑=scanner 仓库须挂**同名宿主机路径**否则 bind 解析错乱崩溃;配合 FIX-009 重建期在跑扫描自动续跑 |
| FEAT-008 | [扫描任务触发来源记录与展示](FEAT-008-扫描任务触发来源记录与展示.md) | 2026-07-08 | 任务列表 + 详情面板展示触发方式(push/MR 自动 / 手动)、触发人、分支+MR、触发时间;数据源 scanner FEAT-016(`scan_runs` 加 5 触发列 + 开新行落库、resume 不覆盖);手动 vs 自动靠 `ChangeEvent.manual` 显式标记而非 `actor=='admin'`;平台纯透传,前端新列/详情块存量任务显示「未知/—」 |
| FEAT-009 | [Findings 按扫描批次筛选](FEAT-009-Findings按扫描批次筛选.md) | 2026-07-08 | 服务详情 Findings 标签在引擎 chip 外再加一排「按扫描批次」pill(最近 3 次 run + 各自产出条数),点选按 `scan_run_id` 过滤;纯前端,消费已有 scanner `/finding-runs`(finding_scan_runs 观测表)+ `/findings?scan_run_id`;pill 计数随引擎筛选联动(方案 C 真实产出口径) |
| FEAT-010 | [AI 扫描规则与知识摄取管理](FEAT-010-AI扫描规则与知识摄取管理.md) | 2026-07-08 | 「AI 安全」控制台加两管理页:AI 扫描规则(Hunt Category,seed 22 条,列表/查看/编辑/启停/新增/删除,builtin 只禁不删、占位符校验、`__TECH_STACK__` 哨兵保留)+ 知识摄取(按服务列出/改分类/编辑/新增/删,`fed_to_ai` 突出、改 ai_context 即纳入 AI);全栈三层——补平台 `ScannerClient` 转发 + `/api/v1/security/*` 代理(`_call_scanner` 补 409 透传)+ 前端安全区亮色套件;数据源 scanner FEAT-018 |
| FEAT-011 | [多项目租户数据隔离前端对接](FEAT-011-多项目租户数据隔离前端对接.md) | 2026-07-09 | 多项目/多租户对接控制台:项目 CRUD 管理页 + 项目下服务管理 + 安全区顶栏「当前项目」选择器(Context+localStorage)+ 数据视图按项目隔离;全栈三层补 `/security/projects*` 代理 + `findings/ai-context` 加 `project=`;当前后端仅 findings/ai-context 原生吃 project,服务视图用「项目→服务」成员清单客户端过滤(改 `useServiceList` 一处),聚合 KPI 暂全局并标注(细分待 scanner M3);repo 跨项目 409 / default 删除 400 由 scanner 透传;数据源 scanner FEAT-024/025 |
| FEAT-012 | [Findings 处置收件箱与扫描回归对比](FEAT-012-Findings处置收件箱与扫描回归对比.md) | 2026-07-09 | 前端两新页:Findings 收件箱(全局 `/security/findings` 可筛选/排序/分页列表,筛选进 URL,行跳详情做 triage)+ 扫描回归对比(选服务的两次扫描,按 `finding.id` 集合 diff 出新增/已修复/遗留);纯前端消费已有后端能力,`useRunFindings` 分页拉全量突破单次 500 上限;侧边栏加两入口 |
| FEAT-013 | [安全控制台IA重组为6大区](FEAT-013-安全控制台IA重组为6大区.md) | 2026-07-10 | 「AI 安全」控制台按 IA 从 11 扁平项收拢为 6 大区(总览/发现/服务/扫描/项目管理/全局配置);含多子块的区用页内 Tab 枢纽(`HubTabs` 原语 + 兄弟路由挂 Tab 条,保留各页 search 状态);服务详情补「接口」「业务知识」两 Tab、大屏补成本概览、新增服务清单页;旧 scans/knowledge 路由重定向、interface 返回改历史驱动(F-006);唯一全栈项=**每项目扫描配置**(平台补 `/projects/{key}/config` 代理 3 方法+3 路由,前端 api/hook + `ProjectScanConfigPanel`,3 键 verify/严重度/并发 覆盖或跟随全局),E2E curl 全流程(GET/PUT/400×2/DELETE/回退)通过 |
| FEAT-014 | [系统画像前端对接](FEAT-014-系统画像前端对接.md) | 2026-07-11 | 配套 scanner FEAT-029:平台代理 3 端点(`/services/{name}/system-profile` GET/history + `POST .../regenerate`)+ 前端服务详情新增「系统画像」Tab(`SystemProfilePanel`,五维卡片:框架/暴露面/技术流程/**渗透视角(入口点/信任边界/注入点候选)**/风险点 + AI 叙述 + 重新生成),暴露面/风险/渗透只展示聚合与引用、明细按 id 下钻到已有接口/finding 端点;进度条补 `system_profile` 阶段 |
| FEAT-015 | [扫描引擎页](FEAT-015-扫描引擎页.md) | 2026-07-11 | 「全局配置 → 扫描引擎」页:代理 `GET /security/engines` + 前端 `EnginesPage`(引擎目录来自后端不硬编码、类别徽章、状态[启用/未启用/缺二进制]、近 N 天成本、行内配置抽屉复用 `/config` 编辑);抽提 `configEditor.tsx` 供引擎页与全局参数页共用;无「新增引擎」按钮、`enabled/binary_present=false` 照常标注;`SettingsHubTabs`+`Sidebar` 加入口 |
| FEAT-016 | [GitLab组导入项目前端对接](FEAT-016-GitLab组导入项目前端对接.md) | 2026-07-16 | 填一个 GitLab 组地址即发现全部仓库并勾选导入(建项目+注册服务+建 webhook),已有项目「同步组」拉新仓库:代理 3 端点 discover/import/sync-group + 前端 `SecurityApi` 三方法 + `ProjectCreateDialog` 加组导入模式 + `SyncGroupDialog`(组地址由现有服务 `deriveGroupPath` 预填);配套 scanner FEAT-030,webhook 失败不阻断导入、冲突逐仓库跳过报告 |
| FEAT-017 | [DAST动态扫描前端对接](FEAT-017-DAST动态扫描前端对接.md) | 2026-07-17 | 补齐 scanner DAST(FEAT-033~036)唯一没同步到控制台的一块:代理 2 端点(`GET/POST services/{name}/dast-runs·dast-scan`)+ `scanner_client` 2 方法 + 前端 `DastRun` 类型/`useDastRuns`/服务详情「DAST」tab(四态配色+逐引擎+skipped 原因,触发走二次确认);顺带修「空项目误当 bug」——大屏对未扫描项目(0 findings+无 last_scan)显式空态 banner。纯透传无 DB 变更;触发路径已接未 prod 实发 |

## DISC(下一编号:DISC-001)

(暂无)

## REFACTOR(下一编号:REFACTOR-002)

| 编号 | 文档 | 日期 | 摘要 |
|---|---|---|---|
| REFACTOR-001 | [规则体系paths按需加载重构](REFACTOR-001-规则体系paths按需加载重构.md) | 2026-07-06 | 规则改为 `.claude/rules/*.md` + `paths:` 按需加载,删子目录 CLAUDE.md,ecc/母版/AGENTS.md 移出自动加载路径 |

## OPS(下一编号:OPS-001)

(暂无)
