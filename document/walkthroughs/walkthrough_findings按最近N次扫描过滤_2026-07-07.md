# Walkthrough — findings 按最近 N 次扫描过滤 [2026-07-07 16:30:28]

> 跨服务改动(gitlab-scanner + security-platform 后端代理 + 前端)。
> 需求:服务详情页 Findings 标签目前显示全量历史累积 finding,用户要「只看最近 3 次扫描的结果」。

## 根因 / 设计

- [x] findings 走 dedup_key upsert 跨扫描累积、从不删除,`findings` 表与 `scan_runs` **无任何关联** → 无法筛「最近 N 次扫描」。
- [x] 方案:给 finding 加 `last_seen_scan_run_id`(最后观测到的 run),单列即可支持「最近 N 次」(last_seen 恒为最近观测);存精确 run id 而非按 sha 反推(同 commit 重复扫描会误判)。
- [x] 「最近 N 次」口径经用户确认:**按真正产出过 finding 的扫描计名额**,失败/空扫不占位(实测 aam-parent 最近两次扫描失败,字面口径下 recent_runs=1 会返回 0)。
- [x] 左侧「问题计数」卡片保持全量(用户确认),不改 `list_services` 计数。

## 改动详情

### gitlab-scanner(能力主体,FEAT-013)
- [x] `app/db/models.py`：`FindingRow` 加 `last_seen_scan_run_id`(FK→scan_runs, SET NULL）+ 索引 `ix_findings_last_run`。
- [x] `app/db/migrations/versions/c3f9a1e4d7b2_*.py`：batch 加列/索引/FK + 历史回填(按 service+last_seen_sha 匹配最新 run）。
- [x] `app/services/findings/writer.py`：`upsert_finding(..., scan_run_id)` 两条路径都落,None 不清空。
- [x] `app/services/scan.py`：`_run_engine(..., run_id=resume.run_id)` → upsert 传 `scan_run_id`。
- [x] `app/api/routes/admin.py`：`list_findings` 加 `recent_runs`(1–20),子查询取「被 finding 引用过的 run」中最近 N 个过滤;仅 service+recent_runs 同时给出才生效。
- [x] 测试：`test_writer.py` +3 用例、`test_admin.py` +2 用例(含失败空扫不占名额）。
- [x] 文档：`docs/changelog/FEAT-013-*` + `docs/features/findings-recent-runs.md` + README 索引。

### security-platform(代理 + 前端,FEAT-006)
- [x] `backend/app/services/scanner_client.py`：`list_findings` 增 `recent_runs` 转发。
- [x] `backend/app/api/routes/security.py`：`GET /security/findings` 增 `recent_runs` 透传。
- [x] `frontend/src/security/api.ts`：`listFindings` opts 增 `recent_runs?`。
- [x] `frontend/src/security/hooks.ts`：`useServiceFindings` 传 `recent_runs=RECENT_SCAN_RUNS`(常量=3)。
- [x] 文档：`document/changelog/FEAT-006-*` + README 索引 + 本 walkthrough。

## 验证结果

- [x] scanner `pytest app/tests/services/findings/ app/tests/api/test_admin.py` → 113 passed;`-k scan` → 79 passed。
- [x] Postgres 迁移 `alembic upgrade head`:列/索引/FK 就位;回填 639 行(dev DB 因容器 auto-upgrade 早于数据对齐,手动补跑同一回填语句 UPDATE 639）。
- [x] 重建并重启 scanner 镜像(代码烘进镜像、非挂载),加载最终代码。
- [x] scanner 直连:`recent_runs=1/3/全量` 对 aam-parent 均返回 639(该服务仅 1 次产出扫描,符合「按产出计名额」——即便最新两次扫描失败也不空)。
- [x] 平台代理:`/api/v1/security/findings?service=aam-parent&recent_runs=3` 返回有效 JSON、total 一致。
- [x] 前端 `bunx biome check src/security/{hooks,api}.ts` 通过。

## 备注

- dev DB 回填靠迁移在 fresh 部署时自动完成;本机因容器 auto-upgrade 时序早于数据,已手动补跑等价 UPDATE(幂等)。
- aam-parent 近期扫描失败是环境问题,与本次改动无关;「按产出结果计名额」口径正是为此类场景设计。
