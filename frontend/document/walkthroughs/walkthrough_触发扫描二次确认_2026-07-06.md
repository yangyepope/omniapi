# 触发扫描增加二次确认 + 已运行提示 [2026-07-06 18:50:40]

## 需求
用户在扫描管理/扫描任务/服务详情页手动点「触发扫描」时:
1. 需要**二次确认**,避免误触直接下发。
2. 若该服务已有扫描在运行,确认框内给出**对应提示**。

## 方案与取舍
- **确认框载体**:用 `@radix-ui/react-dialog` 原语(拿焦点陷阱/Esc/遮罩点击等无障碍),
  但**全部套字面亮色类**(`bg-white`/`bg-amber-50`/`text-gray-*`),不用 shadcn `dialog.tsx`
  —— 后者内部是 `bg-background`/语义 `border`/`bg-surface-container-high`,在本项目 `.dark`
  根下会渲染成深色,踩安全区 F-004 坑。
- **运行状态来源**:按钮内部 `useScanRuns(service, 1)` 派生 `isRunning`,与 scans 页同
  query key,react-query 自动去重不多发请求;30s 心跳刷新保持新鲜。
- **已运行时提示但不硬拦**:scanner 侧有 resume/按 SHA 去重逻辑,且 running 状态可能滞后,
  硬性禁用不稳妥 —— 故仅在框内加琥珀色告警,仍允许确认。
- **三处调用点零改动**:逻辑内聚在共享的 `TriggerScanButton`,scans/tasks/services 页
  无需改动即同时获得该行为。

## 改动详情
- `frontend/src/components/security/TriggerScanButton.tsx` — 重写:
  - 点击不再直接 `mutate`,改为打开 Radix Dialog 二次确认框
  - `useScanRuns(service,1)` 判定 `isRunning`,运行中时渲染琥珀提示块
  - 确认框内「确认触发」才 `mutate`;成功后关闭框 + 失效 scan-runs/services query(沿用原逻辑)
  - `disabled` 时原生 button 不响应,框不会打开(保留原禁用语义)

## 验证结果
- [x] `bunx biome check TriggerScanButton.tsx`:无报错
- [x] `bunx tsc --noEmit`:0 error TS
- [x] F-004 tripwire(安全区禁语义 token):通过,无 `bg-card/bg-muted/text-foreground/bg-primary`
- [x] Vite dev server 转译该模块:HTTP 200,产出合法 JS + HMR(无 transform 错)
- [x] **Playwright 实测**(临时 spec,跑完即删):访问 /security/scans → 点「触发扫描」
      弹出「确认触发扫描」框(而非直接下发);默认选中的 aam-parent 处于 running,
      琥珀「已有扫描正在运行中」提示可见(断言返回 true);点「取消」框关闭且未下发。
      截图确认为亮色白卡,与全站视觉一致。

## 关联
- 安全区套件:`components/security/{theme.ts,badges.tsx,ui.tsx}`
- F-004:`.claude/rules/bug-复盘-frontend.md`
- 前置:同批次已同步 scanner FEAT-010 的 `timed_out` 状态(见根 `document/walkthroughs/`)
