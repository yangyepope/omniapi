# 源码缓存删除:原生 window.confirm → 共享 ConfirmDialog [2026-07-07 15:36:22]

## 背景
服务详情页「源码缓存」tab 的「删除 / 删除并重扫」用了原生 `window.confirm`
(浏览器弹出 `192.168.51.103:5173 says …`),违反 05 规范 §七「破坏性操作统一走共享确认框」。

## 操作
- [x] 在安全区 UI 套件 `frontend/src/components/security/ui.tsx` 新增 `ConfirmDialog`
      —— 基于 `@radix-ui/react-dialog` 原语 + **字面亮色调色板**(白底 / gray-100 边 / 语气红蓝)。
      未复用 shadcn `ui/dialog.tsx`:后者用 `bg-background`、`text-muted-foreground` 等语义 token,
      安全区常带 `.dark` 会渲染成深色(见 bug 档案 F-004)。
- [x] `$name.tsx` 的 `CacheTab` 用受控 `pending` 状态 + `<ConfirmDialog>` 替换 `window.confirm`,
      文案随「是否重扫」切换语气(重扫=品牌蓝,纯删除=危险红),处理中禁用按钮防重复提交。

## 改动详情
- `components/security/ui.tsx`:+`ConfirmDialog`(open/title/description/tone/busy/onConfirm/onOpenChange)。
- `routes/_layout/security/services/$name.tsx`:
  - 新增 `pending` 状态,`run()` 只开弹窗,`handleConfirm()` 执行 `evict.mutate`。
  - 移除 `window.confirm` 与手拼 `msg` 字符串。

## 验证
- [x] `bunx biome check`(两文件)—— No fixes applied,通过。
- [x] `bunx tsc --noEmit` —— 两文件无类型错误。

## 遗留
- `routes/_layout/services/$serviceId/$endpointId/$trafficId/index.tsx:791` 仍有一处原生 `confirm()`
  (「确定要永久移除此变体吗?」),属流量区、非本次范围;后续触碰该文件时一并改共享确认框。
