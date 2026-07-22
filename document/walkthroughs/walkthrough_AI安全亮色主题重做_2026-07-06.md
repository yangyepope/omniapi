# Walkthrough — AI 安全 5+3 页亮色主题重做 [2026-07-06 17:15:54]

前端纯 UI 重做(仅涉及 frontend),关联 [FEAT-001](../changelog/FEAT-001-前端拆分AI安全与流量劫持并补全扫描任务.md)。

## 背景

用户反馈「AI 安全」区页面太丑,与全站亮色 Material 主题脱节(这些页原是深色 slate 运营台风格,`bg-slate-950` 硬撑,和白色侧边栏/服务管理页割裂)。经确认:统一改为**全站亮色主题**,范围含扫描管理下钻的 3 个详情页,共 8 页。

## ⚠ 关键根因(第一版返工)

第一版用了 shadcn 语义 token(`bg-card`/`bg-muted`/`text-foreground`)+ shadcn `Card`/`Badge`/`Button`/`Select`,截图发现卡片全变**深色**。根因:`main.tsx` 设 `ThemeProvider defaultTheme="dark"`,`<html>` 常带 `.dark`,语义 token 全解析成深色值;而全站(ServiceCard/服务页/侧边栏,17 个文件)一律用**字面亮色调色板**(`bg-white`/`border-gray-100`/`text-gray-900`/`text-blue-600`)强制亮色、无视主题。

**铁律**:安全区(乃至全站新页面)要亮色,必须用字面亮色类,**不能**用会随 `.dark` 翻转的语义 token,也**不能**直接用 shadcn `Card`/`Badge`(其 `bg-card`/`bg-primary` 同样翻转)。徽章/卡片/下拉一律用字面调色板自建或走安全区套件。

## 操作描述

1. 建安全区亮色主题套件(字面调色板,单一真相源):`theme.ts`(chip 类 + 图表色)、`badges.tsx`(SeverityBadge/ScanStatusBadge/RiskBadge/MethodBadge/Tag)、`ui.tsx`(Card/PageHeader/StatCard/SectionCard/四态/KV)、`TriggerScanButton`(blue-600 实心)。
2. 逐页重做:页面不再自撑 `min-h-screen bg-slate-950`,改为纯内容交给 `_layout` 亮色壳;所有深色 slate 类 → 字面亮色;shadcn `Card`/`Badge`/`Button`/`Select` → 套件组件 / 原生控件 / 字面按钮。
3. tsc + biome + vite build + Playwright 截图逐页核对(确认真的亮色、与全站一致)。

## 改动详情

### 新增套件 `frontend/src/components/security/`
- `theme.ts`:severity/scan-status/risk/method 的「色 + 标签 + 徽章变体」映射 + recharts 亮色主题(品牌蓝、浅灰网格、白底 tooltip)。
- `badges.tsx`:`SeverityBadge`/`ScanStatusBadge`/`RiskBadge`/`MethodBadge`(映射与渲染分离,复用 `ui/badge`)。
- `ui.tsx`:`PageHeader`/`StatCard`/`SectionCard`/`LoadingBlock`/`EmptyBlock`/`ErrorBlock`/`KV`(走语义 token + shadcn Card)。
- `TriggerScanButton.tsx`:改用 shadcn `Button`(亮色)。

### 重做 8 页(深色 → 亮色,行为不变)
- `security/SecurityDashboard.tsx`、`security/CostPage.tsx`、`security/ConfigPage.tsx`、`security/MCPPanel.tsx`
- `routes/_layout/security/scans.tsx`、`tasks.tsx`、`services/$name.tsx`、`interfaces/$id.tsx`、`findings/$id.tsx`

要点:图表全部改 recharts 亮色主题;筛选下拉换 shadcn `Select`;KPI 用 `StatCard`;表格用浅灰边 + `hover:bg-muted/40`;状态/严重度/风险/方法统一走徽章组件;四态齐全;顺手修掉 SecurityDashboard 里用 `useMemo` 跑 `setInterval` 的既有 leak(改 `useEffect`)。

## 验证结果

- [x] `bunx tsc --noEmit` → 0 error
- [x] `bunx biome check`(安全区 17 文件)→ 无错(11 文件自动格式化)
- [x] `bunx vite build` → 成功(仅既有大 chunk 警告)
- [x] Playwright 截图逐页核对:大屏/扫描管理/扫描任务/成本/配置 均为亮色,白卡片 + 蓝点缀,与侧边栏/服务页一致

## 备注

- 未改任何数据 hook / API / 后端;纯前端视觉。
- 安全区不再存在深色 slate 硬编码;新代码走语义 token,severity/status hex 作为数据可视化色集中在 `theme.ts`。
