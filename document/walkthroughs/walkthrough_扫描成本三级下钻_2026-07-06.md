# 扫描成本三级下钻实现 · Walkthrough

**任务**:实现「扫描成本」页三级下钻(全部 → 单服务 → 单次扫描,显示具体时间)
**时间**:[2026-07-06 18:49:50]
**范围**:跨服务(gitlab-scanner + security-platform backend + frontend)

---

## 一、诊断(为什么现在没数据)

- [x] 定位数据源:成本数据在独立 **gitlab-scanner**(`http://172.17.0.1:8000`),平台后端只是薄代理。
- [x] 查库:scanner `scan_engine_runs` **0 行**;`scan_runs` 状态分布 completed=4(id 6–9,2026-06-26~07-01)、aborted=20、running=1。
- [x] 交叉比对 git:成本记录代码在 2026-07-02「Initial import」——**4 次成功扫描都早于它**,当时没采集 token;之后的扫描无一完成 → 无记录。
- [x] 确认写入链路正确:`record_engine_run`(scan_resume.py:169)← AI 引擎(engines/ai/engine.py:376)、risk/review 报告 token 字段,全部已接通。**结论:不是 bug,是"还没有一次完成的扫描"**。
- [x] 确认缺口:scanner 只按引擎聚合,无 by_service、无单次明细——这是本次要补的。

## 二、改动详情

### gitlab-scanner(`/home/dreamer/gitlab-scanner/backend`)
- [x] `app/api/routes/admin.py`:新增 `ServiceCost` 模型;`CostStats` 增 `by_service`;`cost_stats` 加按 `service_name` 分组查询(`runs=count(distinct scan_run_id)`、`last_run_at=max(started_at)`)。
- [x] 新增 `EngineRunDetail`/`RunCost` 模型 + `GET /api/admin/cost-runs`(挑有 engine-run 行的扫描 → 按 started_at 倒序 limit → 拉逐引擎行 → 按 scan_run_id 分组组装)。
- [x] `app/tests/api/test_admin_config_cost.py`:新增 by_service / cost-runs 分组、倒序、service/days/limit 过滤断言。

### security-platform/backend
- [x] `app/services/scanner_client.py`:新增 `cost_runs(service, days, limit)`。
- [x] `app/api/routes/security.py`:新增 `GET /security/cost-runs` 代理。

### security-platform/frontend
- [x] `src/security/api.ts`:`CostStats` 增 `by_service`;新增 `ServiceCost`/`RunCost`/`EngineRunDetail` + `costRuns`。
- [x] `src/security/hooks.ts`:新增 `useCostRuns`。
- [x] `src/security/CostPage.tsx` 重写为纯编排;拆出 `src/security/cost/`:`format.ts`(fmtNum/fmtDuration/fmtDateTime)、`CostByEngine.tsx`、`CostByService.tsx`(点行 `setService` 联动)、`CostRuns.tsx`(`Set<run_id>` 行内展开逐引擎)。
- [x] 复用 `components/security/{ui,theme,badges}`;严守 F-004 字面亮色类。

## 三、验证结果

- [x] scanner 单测:`uv run pytest app/tests/api/test_admin_config_cost.py` → **12 passed**。
- [x] scanner `docker compose build && up -d`,健康检查通过。
- [x] 临时插 3 行成本数据,`curl /api/admin/cost-stats` → by_engine + by_service 正确(aam-parent runs=2、findings=22、last_run_at=07-01);`/api/admin/cost-runs?limit=5` → 按次分组、倒序(run 9 → run 8)、逐引擎明细正确;测试行 `DELETE` 还原,确认回到空。
- [x] 平台代理:`/api/v1/security/cost-stats` 带 by_service、`/api/v1/security/cost-runs` 逐引擎透传正确;新端点与既有 `/cost-stats` 行为一致。
- [x] 前端:`biome check` 无错;`tsc --noEmit` 成本相关文件无类型错误。
- [ ] 真实数据渲染:交由用户正常跑一次完整扫描后自然出现(本次不主动触发线上扫描;登录需邮箱账号,浏览器 E2E 未跑)。

## 四、文档沉淀

- [x] `document/changelog/FEAT-002-扫描成本三级下钻.md` + 更新 changelog README 索引(FEAT 下一编号 → FEAT-003)。
- [x] `document/features/扫描成本.md`(新功能文档)。
- [x] 本 walkthrough。
