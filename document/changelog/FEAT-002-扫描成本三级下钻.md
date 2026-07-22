# FEAT-002 扫描成本三级下钻(全部 / 单服务 / 单次扫描)

- **编号**: FEAT-002
- **日期**: 2026-07-06
- **状态**: 已完成
- **类型**: 新功能
- **关联 PR·Issue**: 无

> 跨服务改动:gitlab-scanner(数据与聚合的唯一真相源)+ security-platform(后端代理 + 前端页面)。

## 需求背景

「扫描成本」页(scanner FEAT-009)全是 0。排查结论:**前端、平台代理、类型、hooks 早已建好且正确**,页面渲染 0 是**数据源为空**,不是前端 bug:

- 成本数据在独立的 **gitlab-scanner** 服务(`http://172.17.0.1:8000`),平台后端只是薄代理(`/api/v1/security/cost-stats` → scanner `/api/admin/cost-stats`)。
- scanner 的 `scan_engine_runs` 表 **0 行**。4 次真正跑完的扫描(run id 6–9,2026-06-26~07-01)**早于 FEAT-009 成本记录代码**,没采集 token;此后的扫描(id 10–25)全部 `aborted`/`running`,无一完成 → 无新记录。
- 写入链路 `record_engine_run`(scan_resume.py)← AI 引擎 / risk_classify / finding_review 的 token 记账**完整且正确**——扫描一旦正常完成,成本会自动落库。**历史 4 次成功扫描无法回填 token**(当时未采集),这是既定事实,不是 bug。

用户诉求在原有「全局统计」基础上再补两级下钻:**②细化到单个服务;③细到单次扫描,并显示具体那次什么时间**。

## 讨论过程

- 呈现方式:选定「单页分区 + 行内展开」(全局 KPI → 按引擎图表 → 按服务表`点行联动筛选` → 单次扫描明细`行内展开看逐引擎`),而非标签页或抽屉。
- 数据验证:聚合逻辑用单元/接口测试核对(可临时插入测试行);真实数据由用户之后正常跑扫描自然产生,本次不主动触发线上扫描。
- 正面修复:聚合能力下沉到 scanner(唯一真相源),不在平台侧循环调用 per-service 拼装(避免双轨/N+1)。

## 技术实现

**gitlab-scanner**(`/home/dreamer/gitlab-scanner/backend`,全 async):
- `app/api/routes/admin.py`:`/cost-stats` 响应新增 `by_service: list[ServiceCost]`(join `scan_runs` 按 `service_name` 分组;`runs=count(distinct scan_run_id)` 去重扫描次数,`last_run_at=max(started_at)`)。
- 新增 `GET /api/admin/cost-runs`:返回最近 `limit` 次有成本记录的扫描(`RunCost`),每条含 `started_at`/服务/sha/状态 + 汇总 + 逐引擎明细 `EngineRunDetail`;按 `started_at` 倒序,按 run 数分页。
- `app/tests/api/test_admin_config_cost.py`:新增 by_service / cost-runs 分组、倒序、service/days/limit 过滤断言(12 passed)。

**security-platform/backend**:
- `app/services/scanner_client.py`:新增 `cost_runs(service, days, limit)`(镜像 `cost_stats`)。
- `app/api/routes/security.py`:新增 `GET /security/cost-runs` 代理(`days` 1..365、`limit` 1..200);`/cost-stats` 无需改(dict 透传自动带上 `by_service`)。

**security-platform/frontend**:
- `src/security/api.ts`:`CostStats` 增 `by_service`;新增 `ServiceCost`/`RunCost`/`EngineRunDetail` 类型;`SecurityApi.costRuns`。
- `src/security/hooks.ts`:新增 `useCostRuns`。
- `src/security/CostPage.tsx` 重写为纯编排;拆出 `src/security/cost/`:`format.ts`、`CostByEngine.tsx`、`CostByService.tsx`(点行 → `setService` 联动)、`CostRuns.tsx`(`Set<run_id>` 行内展开逐引擎)。复用 `components/security/{ui,theme,badges}`,严守 F-004 字面亮色类。

## 验证方式

- [x] scanner 单测:`uv run pytest app/tests/api/test_admin_config_cost.py` → 12 passed。
- [x] scanner 重建镜像 + 重启容器,`/api/admin/cost-stats`(临时插 3 行数据)返回正确 `by_engine` + `by_service`(aam-parent runs=2、findings=22、last_run_at=07-01);`/api/admin/cost-runs?limit=5` 按次分组、倒序、逐引擎明细正确;测试行已 `DELETE` 还原。
- [x] 平台代理:`/api/v1/security/cost-stats` 带 `by_service`、`/api/v1/security/cost-runs` 逐引擎明细透传正确;新端点与既有 `/cost-stats` 行为一致。
- [x] 前端:`biome check` 无错、`tsc --noEmit` 成本相关文件无类型错误;三分区结构 + 行内展开 + 点服务联动筛选。
- [ ] 真实数据:交付后由用户正常跑一次完整扫描,`scan_engine_runs` 落行后页面出现真实数字(本功能不主动触发扫描)。
