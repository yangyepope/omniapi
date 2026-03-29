# OmniAPI v3.0 升级任务清单

- [ ] **第一阶段：基础与规范 (Foundation & Specs)**
    - [x] 审查需求文档 v3.0、数据模型及 SQL 脚本
    - [x] 确定技术栈（React/Vite + FastAPI）
    - [x] 搭建后端项目结构 (FastAPI)
    - [x] 使用 `database-init.sql` 初始化 PostgreSQL 数据库

    - [ ] 升级流量接收 API (`/v1/collect/capture`)
        - [ ] 实现异步读取原始 Byte Body 并存入 `raw_flows`
        - [ ] 对接 `GlobalConfig` 的限流与开关配置
        - [ ] **[TEST]** 编写并运行 API 接收测试用例
    - [ ] 实现核心处理逻辑 (`app/services/processing.py`)
        - [ ] 路径归一化匹配引擎 (Regex Pattern)
        - [ ] 去重指纹 MD5 计算逻辑（过滤 Header/Body 动态字段）
        - [ ] **[TEST]** 编写并运行逻辑处理单元测试
    - [ ] 升级 Celery 任务 (`app/worker.py`)
        - [ ] 实现 `process_raw_flow_task` 核心调度
        - [ ] 接口/模块自动发现与关联逻辑
        - [ ] `filtered_flows` 唯一性入库与冗余计数更新
        - [ ] **[TEST]** 编写并运行异步流量流转集成测试
    - [ ] 实现原始流量清理机制 (TTL)

- [ ] **第三阶段：资产核心层 - 后端 (Asset Core Layer)**
    - [ ] 服务管理模块 (Service Management) CRUD
    - [ ] 接口管理模块 (Interface Management) CRUD
    - [ ] Query 参数元数据自动追踪
    - [ ] 基础统计与聚合（总流量数、唯一流量数）

- [ ] **第四阶段：流量与变体管理 - 后端 (Traffic & Variant Management)**
    - [ ] 筛选流量管理与搜索 (PG 全文检索)
    - [ ] 标签管理 (Tag Management)
    - [ ] 变体创建与 Fork 逻辑实现
    - [ ] 变体转换引擎（模板变量/字段修改/脚本执行）

- [ ] **第五阶段：重放执行层 - 后端 (Replay Execution Layer)**
    - [ ] 重放任务管理 (Replay Task Management)
    - [ ] 请求执行引擎（核心并发控制、超时处理）
    - [ ] 执行结果记录与统计
    - [ ] 断路器 (Circuit Breaker) 保护机制

- [ ] **第六阶段：前端页面开发 (Frontend Development)**
    - [ ] 服务列表页（一级页面）
    - [ ] 接口列表页（二级页面）
    - [ ] 流量列表页（三级页面）
    - [ ] 流量/变体详情及覆盖重放 UI
    - [ ] 全局流量跨服务搜索页
    - [ ] 重放任务实时监控面板

- [ ] **第七阶段：系统优化与润色 (Optimization & Polish)**
    - [ ] 集成 "Futuristic Startup" 样式系统
    - [ ] 实现实时通知系统 (WebSocket)
    - [ ] 系统健康状态监控
    - [ ] 核心资产数据导入与导出
    - [ ] 编写核心业务逐行中文注释
