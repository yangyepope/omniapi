# 低价值接口前端隐藏 + 复核质量修复(跨仓库)[2026-07-06 16:40:00]

跨 gitlab-scanner(FIX-007/008)+ security-platform(FEAT-004)。起因:用户发现接口清单里错误页接口(/404、/500…)是低价值噪音,且其下挂着 semgrep finding;追查发现复核有静默漏判。

## 操作

- [x] 定位:/4xx、/5xx 是 `ExceptionController` 真实 `@RequestMapping`,接口识别正确;预过滤已标 P2/错误页。
- [x] 定位漏洞来源:finding 是 semgrep `unrestricted-request-mapping` 命中同一行 bare `@RequestMapping`,`direct_handler` 归因,非误报凭空。
- [x] 定位 #15 静默漏判 + webErrorCodes 陈旧误标 两个根因(scanner 侧)。

## 改动(本仓库 · FEAT-004)

- [x] `frontend/src/components/security/theme.ts`:`isLowValueInterface`(路径正则,镜像 scanner 预过滤)。
- [x] `frontend/src/routes/_layout/security/scans.tsx`:`InterfacePanel` 默认隐藏低价值接口 + 计数 + 显示/隐藏开关;不触碰 findings。

## 关联改动(gitlab-scanner)

- [x] FIX-007:风险分级 resume 键改 `CLASSIFY_VERSION`(逻辑指纹),旧分级随逻辑变更失效重判。
- [x] FIX-008:复核失败写 `needs_review` 标记(消除静默漏判);`AI_FINDING_REVIEW_ENABLED` 默认 True。
- [x] 规则沉淀 CLAUDE.md《扫描引擎》第 6 条 + BUG-003 防复发档案(2 条 tripwire)。

## 验证

- [x] 前端 `tsc --noEmit` + `vite build` 通过。
- [x] scanner 全量 968 passed(含新增 3 条 tripwire)。
- [ ] 端到端:复核开启后重扫 aam-parent@23b50586 → #15 拿到裁决、webErrorCodes 纠正、错误页接口默认隐藏。
