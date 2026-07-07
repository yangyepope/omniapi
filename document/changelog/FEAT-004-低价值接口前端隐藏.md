# FEAT-004 低价值接口前端默认隐藏

- **编号**: FEAT-004
- **日期**: 2026-07-06
- **状态**: 已完成
- **类型**: 新功能
- **关联 PR·Issue**: 承接 gitlab-scanner FIX-007/FIX-008(分级/复核质量)

## 需求背景

接口清单里混着一批错误页(`/404`、`/500`、`/501`、`/503` 等 `ExceptionController` 映射)和运维/基础设施端点(actuator/health/metrics),它们是真实映射但非业务攻击面,淹没了真正要看的接口。scanner 侧已把它们标为 P2 并保留完整清单(不丢弃),前端需要默认隐藏、可切换。

## 讨论过程

用户明确:①**保留 P2 + 前端隐藏**(不在入库阶段丢弃,保完整可审计);②**绝不连带隐藏其名下 finding**——findings 只按每条的显式高置信 FP 裁决过滤,open/未判一律显示,否则会把复核漏判(如 scanner #15)连同真漏洞一起埋掉。识别用**稳定的路径正则**(不依赖分级结果新鲜度)。

## 技术实现

- `frontend/src/components/security/theme.ts`:新增 `isLowValueInterface({path, handler})` —— 路径匹配 `^/([45]\d{2}|error|actuator|health|healthz|readyz|livez|metrics|prometheus|info)\b` 或 handler 为 `*Exception/*Error + Controller/Handler/Advice` 类。镜像 scanner `RuleBasedRiskPrefilter` 的正则,注释标注。
- `frontend/src/routes/_layout/security/scans.tsx` `InterfacePanel`:`showLowValue` 状态(默认 false)过滤低价值接口后再分组;顶部条显示"已隐藏 N 个低价值接口(错误页/基础设施)[显示/隐藏]";空态判断改用 `allItems.length`。**不触碰 findings 展示**。

## 验证方式

- [x] `tsc --noEmit` + `vite build` 通过;biome 格式化。
- [ ] 打开 `/security/scans` 选 aam-parent:错误页接口(/404…)默认不出现,顶部提示"已隐藏 N 个";点"显示"后出现;findings 列表不受影响(#15 等仍可在 findings 视图按状态查到)。
