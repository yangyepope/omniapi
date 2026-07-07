# FEAT-005 源码缓存管理(前端)

- **编号**: FEAT-005
- **日期**: 2026-07-06
- **状态**: 已完成
- **类型**: 新功能
- **关联 PR·Issue**: gitlab-scanner FEAT-012 提供接口

## 需求背景

用户需在服务详情页看到该服务**已拉取缓存的代码 hash**,并能手动删除某个,再触发重新拉取 + 扫描。

## 讨论过程

删除语义与用户确认:**删源码缓存 + 清该 sha 的续跑标记(ai_plan_runs/interface_risk_runs/scan_runs)**,findings 保留;下次触发从头重扫。展示 sha + 拉取时间 + 大小 + 是否最近扫描所用。前置:重拉需 scanner 配 `GITLAB_ACCESS_TOKEN`,否则删掉的 sha 会 404(UI 已提示)。

## 技术实现

- `backend/app/services/scanner_client.py`:`list_source_cache(name)` / `evict_source_cache(name, sha)`。
- `backend/app/api/routes/security.py`:`GET /security/services/{name}/source-cache` + `DELETE .../source-cache/{sha}`(DELETE 挡 inactive 用户)。
- `frontend/src/security/api.ts`:`SourceCacheEntry` 类型 + `sourceCache` / `evictSourceCache`。
- `frontend/src/security/hooks.ts`:`useSourceCache(name)`。
- `frontend/src/routes/_layout/security/services/$name.tsx`:新增「源码缓存」tab —— 列 sha/拉取时间/大小/「最近扫描」标记,每行「删除」与「删除并重扫」(window.confirm + useMutation,成功 invalidate source-cache/scan-runs);顶部提示重拉需 token。

## 验证方式

- [x] `tsc --noEmit` + `vite build` 通过;biome 格式化。
- [x] 平台代理 `GET /api/v1/security/services/aam-parent/source-cache` 活体返回缓存 sha `23b50586`(ready/size/is_last_scanned)。
- [ ] 端到端:服务详情「源码缓存」tab 列出 sha;删除后消失且该 sha 续跑标记清空;「删除并重扫」在配 token 后重拉重扫。
