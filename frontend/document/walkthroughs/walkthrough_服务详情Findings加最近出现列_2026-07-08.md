# 服务详情 Findings 按扫描分组 + 横向切换 [2026-07-08 14:40:00]

## 需求演进(用户逐步澄清)
1. 「findings 需要有最近 3 次的结果,不能只有一次的」
2. 「没有按照三次的分类呀」——要按扫描分组
3. 「做成横向并行的」+「让用户去点击然后切换」——横向排布扫描选择器,点击切换查看某次扫描

## 排查结论
- `recent_runs=3` 过滤链路早已存在:Findings 标签实际已拉 690 条,跨 run 40/39/38。
- 但:① 表格无「哪次扫描」维度;② 三次扫描扫的是**同一 commit**(sha 均为 182c0d86a039),
  故 `last_seen_sha` 无法区分扫描次数,`last_seen_at` 在同一 run 内也跨数分钟——
  **唯一可靠的分组键是 `last_seen_scan_run_id`(run id)**,而该字段此前未对外暴露。

## 改动(跨服务)
### scanner(`gitlab-scanner`,独立服务,需重建镜像)
- `backend/app/api/routes/admin.py`:`FindingItem` 加 `last_seen_scan_run_id: int | None`,
  `_row_to_item` 从 `FindingRow.last_seen_scan_run_id` 映射。平台后端 `list_findings` 以
  `dict[str, Any]` 原样透传,故平台侧无需改 schema。

### 平台前端(`security-platform/frontend`,Vite HMR,无需重建)
- `src/security/api.ts`:`Finding` 类型加 `last_seen_scan_run_id: number | null`。
- `src/routes/_layout/security/services/$name.tsx`:
  - 新增 `groupByRun()`:按 run id 分组,run 大在前(最新扫描在前),组内最新 `last_seen_at` 作代表时间。
  - `FindingsTab` 重写为**横向扫描选择器**:每次扫描一枚 pill(扫描 #id · 时间 · 条数),
    `useState` 记选中下标,默认最新;点击切换,下方 `FindingsTable` 渲染该次扫描的 findings。
  - 抽出 `FindingsTable` 子组件(按扫描复用),四态补齐 loading。

## 验证
- [x] scanner 镜像重建 + `docker compose up -d scanner` 重启
- [x] scanner 接口 `GET /api/admin/findings?service=aam-parent&recent_runs=3` 返回 `last_seen_scan_run_id`,
      200 行分组为 run40=121 / run39=22 / run38=57
- [x] 平台代理 `GET /api/v1/security/findings?...` 透传该字段(`field_present: true`)
- [x] `bunx biome check $name.tsx api.ts` 通过(仓库其余为存量 lint,无关)
- [x] 前端 Vite dev(:5173)HMR 生效

## 已知限制(待用户确认是否要补)
- 单次拉取 `limit=200`、`sort=-id`,最新扫描 #40 实际 611 条,本页仅进入 ~121 条,故其 pill 条数被页上限截断。
- 若需「点开某次扫描看到该次全部 findings」,需给 findings 接口加 `scan_run_id` 过滤参数,
  选中时按 run 单独拉全量。此为下一步可选增强,尚未做。
