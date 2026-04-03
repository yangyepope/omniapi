# new-variant.tsx 组件拆分重构规划

**日期**: 2026-04-03  
**分支**: para  
**任务类型**: 纯重构（零功能变更）

---

## 需求摘要

`new-variant.tsx`（621行）和 `index.tsx`（867行）严重违反"单文件不超过150行"的前端架构铁律，且两文件存在大量重复代码（`METHOD_STYLES`、`copyText` 等）。本次重构将所有可复用逻辑提取到 `src/components/traffic/` 目录，使路由文件仅保留路由注册与主编排逻辑。

---

## 拆分策略

新建目录 `frontend/src/components/traffic/`，按职责拆分为多个独立文件。

### Phase 1 — 瘦身 new-variant.tsx（优先交付）

| 序号 | 新文件路径 | 职责 | 预计行数 |
|------|-----------|------|---------|
| 1 | `src/components/traffic/types.ts` | `VariantPublic`、`VariantsPublic`、`KVPair` 类型定义 | ~30 |
| 2 | `src/components/traffic/constants.ts` | `METHOD_STYLES` 常量（消除两处重复） | ~15 |
| 3 | `src/components/traffic/copy-utils.ts` | `copyViaExecCommand` + `copyText` 工具函数 | ~35 |
| 4 | `src/components/traffic/FieldLabel.tsx` | 左栏标签组件 | ~20 |
| 5 | `src/components/traffic/HeadersEditor.tsx` | KV 逐行编辑器 + JSON 模式切换 | ~150 |
| 6 | `src/components/traffic/BodyEditor.tsx` | 可编辑代码区（格式化/复制/全屏） | ~130 |
| 7 | `src/components/traffic/index.ts` | 桶导出（barrel export） | ~10 |
| — | `new-variant.tsx`（瘦身后） | 路由注册 + `NewVariantPage` 主编排 | ~140 |
| — | `index.tsx`（消除重复） | 删除 `METHOD_STYLES`、`copyText` 重复定义 | ~820 |

### Phase 2 — 瘦身 index.tsx（后续阶段）

| 序号 | 新文件路径 | 职责 | 预计行数 |
|------|-----------|------|---------|
| 8 | `src/components/traffic/format-utils.ts` | `formatAbsoluteTime`、`getVariantBadgeStyle` | ~25 |
| 9 | `src/components/traffic/CodeBlock.tsx` | 通用代码块渲染 | ~15 |
| 10 | `src/components/traffic/MetaRow.tsx` | 基本指标信息行 | ~20 |
| 11 | `src/components/traffic/BodyViewer.tsx` | 只读 Body 查看器（内联+全屏） | ~100 |
| 12 | `src/components/traffic/VariantCard.tsx` | 单张变体卡片 | ~60 |
| 13 | `src/components/traffic/VariantsTab.tsx` | 变体管理 Tab 整体（含列表+Slide-over） | ~180 |
| — | `index.tsx`（瘦身后） | 路由注册 + `TrafficDetailPage` 主编排 | ~150 |

---

## 实施步骤

### Phase 1（共9步）

**Step 1.1** 创建 `types.ts`  
- 提取 `VariantPublic`、`VariantsPublic`（来自 index.tsx）、`KVPair`（来自 new-variant.tsx）
- 完成标准：`tsc --noEmit` 通过

**Step 1.2** 创建 `constants.ts`  
- 提取 `METHOD_STYLES`（两文件各有一份完全相同的副本）
- 完成标准：文件内容正确，无重复

**Step 1.3** 创建 `copy-utils.ts`  
- 提取 `copyViaExecCommand` + `copyText`（两文件各有重复）
- 完成标准：函数签名不变

**Step 1.4** 创建 `FieldLabel.tsx`  
- 提取 `new-variant.tsx` 第88-94行的展示组件
- 完成标准：命名导出正确

**Step 1.5** 创建 `HeadersEditor.tsx`  
- 提取 `new-variant.tsx` 第101-251行（约150行）
- 依赖：`KVPair`（Step 1.1）
- 完成标准：props 接口（`headers` + `onChange`）不变，KV/JSON 模式切换功能正常

**Step 1.6** 创建 `BodyEditor.tsx`  
- 提取 `new-variant.tsx` 第257-372行（约120行）
- 依赖：`copyText`（Step 1.3）
- 完成标准：格式化/复制/全屏功能正常

**Step 1.7** 创建 `index.ts` 桶导出  
- 统一 re-export 上述所有模块
- 完成标准：`import { HeadersEditor } from "@/components/traffic"` 可用

**Step 1.8** 瘦身 `new-variant.tsx`  
- 删除已提取的所有代码，替换为从 `@/components/traffic` 统一导入
- 完成标准：文件行数 ≤150 行，`bun run lint` 通过，页面功能不变

**Step 1.9** 更新 `index.tsx` 消除重复  
- 删除 `METHOD_STYLES`、`copyViaExecCommand`、`copyText` 重复定义，改为从 `@/components/traffic` 导入
- 完成标准：功能不变，lint 通过，行数减少约50行

### Phase 2（共8步，后续执行）

Step 2.1 ~ 2.8 依次提取 `format-utils.ts`、`CodeBlock.tsx`、`MetaRow.tsx`、`BodyViewer.tsx`、`VariantCard.tsx`、`VariantsTab.tsx`，最终将 `index.tsx` 瘦身至 ~150 行。

---

## 风险评估

| 风险 | 严重性 | 缓解措施 |
|------|--------|---------|
| import 路径错误导致白屏 | 高 | 每步提取后立即 `tsc --noEmit` 验证 |
| `VariantPublic` 类型迁移后外部引用断裂 | 中 | `index.tsx` 保留 `export type { VariantPublic }` 兼容层 |
| `HeadersEditor` 状态同步逻辑遗漏 | 中 | props 接口完全不变，内部状态全量搬迁 |
| `VariantsTab` Slide-over 中 refetch 引用 | 中 | `variantsQuery` 定义在 `VariantsTab` 内部，refetch 仍在同一作用域 |

---

## 成功标准

- [x] `new-variant.tsx` 行数 ≤ 150 行（Phase 1）
- [ ] `index.tsx` 行数 ≤ 150 行（Phase 2）
- [ ] 重复代码消除（`METHOD_STYLES`、`copyText` 单一数据源）
- [ ] `bun run lint` 零错误
- [ ] `tsc --noEmit` 零类型错误
- [ ] 所有页面功能与重构前一致
