# Walkthrough — 系统画像(System Profile)全栈落地 [2026-07-11 17:30:00]

跨 gitlab-scanner + security-platform 两仓。为被扫描目标系统新增系统级画像层
(框架 / 技术流程 / 暴露面 / 风险点 + AI 叙述)。

## 操作

- [x] 需求澄清:后端+前端都做、对象=被扫描目标系统、独立模块但引用已有明细、
      自动+手动重生成、确定性+AI 合成。
- [x] 探查现状:暴露面(interfaces)/风险(findings)已有;框架派生、技术流程持久化缺失。

## 改动

### gitlab-scanner(FEAT-029)
- [x] 新表 `service_system_profiles`(`app/db/models.py`)+ 迁移 `abb9f11d8aa4_*`。
- [x] 新包 `app/services/profiling/`:version / framework / aggregate / synth /
      builder(build 全量 + rebuild 免源码)/ writer(幂等 upsert + resume)。
- [x] 流水线:`scan.py` 加 `profile_builder=` + `system_profile` 阶段(soft-fail,
      `record_engine_run`),admin `_STAGE_ORDER` 加该阶段。
- [x] 配置 `SYSTEM_PROFILE_ENABLED/_MODEL`(config.py + .env.example + config_store)。
- [x] admin 3 端点:get / history / regenerate。

### security-platform(FEAT-014)
- [x] `scanner_client.py` 3 包装 + `security.py` 3 代理路由。
- [x] 前端 api/hooks + `SystemProfilePanel.tsx` + 服务详情「系统画像」Tab +
      theme 进度阶段。

## 验证

- [x] scanner:全量 `pytest` **1086 passed**(新增 25 条:framework/aggregate/builder/
      writer 单测 + admin 端点 + 2 条扫描阶段测试);迁移 tripwire 绿。
- [x] omniapi:`test_security.py -k system_profile` 4 条转发测试通过;
      前端 `bun run build` + `tsc` + biome 通过。
- [x] 关键设计核对:暴露面存 interface id、风险存 finding id(不双轨);重生成免拉源码
      (复用同 sha 已存 framework);AI 失败降级保留确定性四维。

## 备注

- 早前会话中「扫描引擎页」(engines)为**不同功能**,其代码在工作区但与本次无关。
- `test_security.py::test_get_ai_context_forwards_sha` 为**既有**失败(工作区历史改动
  给 ai-context 加了 `project` 参数,测试未同步),非本次引入。
