# TS 全栈一致性总纲 · 完整母版（React + TS + shadcn/ui + tRPC）

> **这是什么**：一份可移植的 **TypeScript 全栈**一致性母版，覆盖前端 UI、数据展示、以及 tRPC/Zod 的前后端边界。拷贝进任意使用「Next.js + TypeScript + shadcn/ui + tRPC（T3 系）」的新项目，作为 `CLAUDE.md` / `AGENTS.md` 的工程章节，或作为团队规范独立存在。
>
> **唯一目的**：**同一种 UI 模式，全站只有一种实现。** 任何“分页 A 页一种样式、B 页另一种样式”“时间这里 `2026-07-02`、那里 `07/02/2026`”“颜色东一个 `#3b82f6` 西一个 `blue-500`”都视为 bug。
>
> **两条心法**：
> 1. **单一真相源**——每类资产只有一个来源，只准 import，不准重造。
> 2. **先查再写**——动手前先扫「钦定位置表」，能复用就复用，能扩展就扩展，最后才新建。

---

## 0. 适用栈与目录结构

**假设栈**：Next.js App Router · TypeScript · Tailwind · shadcn/ui · lucide-react · tRPC · Zod · react-hook-form · sonner · next-intl。
换栈时只需替换术语（如 `next-intl` → 你的 i18n 方案），结构与纪律不变。

```
src/
├── app/
│   ├── <route-group>/            # 路由组 (marketing) (auth) (console)，不出现在 URL
│   │   ├── layout.tsx
│   │   ├── loading.tsx           # 骨架屏，复用 components/shared
│   │   ├── error.tsx
│   │   └── <segment>/
│   │       ├── page.tsx          # 只做“组合”，不塞实现细节
│   │       └── _components/*     # 该页私有、不可复用的组件（下划线，不参与路由）
│   └── api/**/route.ts           # webhook / oauth / cron 等基础设施层
├── components/
│   ├── ui/*                      # ← shadcn 原语（CLI 生成，不手写）
│   └── shared/*                  # ← 跨功能共享模式组件（唯一来源）
├── lib/
│   ├── utils.ts                  # cn() 等通用工具
│   └── format.ts                 # ← 时间/数字/货币/相对时间 唯一格式化入口
├── server/
│   └── api/routers/
│       ├── <domain>.ts           # tRPC procedure
│       └── <domain>.schema.ts    # ← Zod schema，前后端复用
├── styles/
│   └── globals.css               # ← 设计 token 唯一声明处（@theme）
└── messages/
    ├── en.json                   # ← i18n 文案集中目录
    └── zh.json
```

---

## 1. 钦定位置（Single Source of Truth）

每类资产只有一个来源，**只准 import，禁止重造或复制粘贴**。缺能力时**扩展该来源的 props**，不许另起竞争版本。

| 资产 | 钦定位置 | 铁律 |
|---|---|---|
| shadcn 原语 | `components/ui/*` | 用 `pnpm dlx shadcn@latest add <x>` 生成，不手写；下拉/对话框/tooltip/tabs/select/popover 一律用它 |
| 跨功能共享模式组件 | `components/shared/*` | 见下方「共享组件目录」，每种模式**只有一个文件** |
| 功能私有组件 | `app/<segment>/_components/*` | 仅当确实不可复用 |
| 设计 token | `src/styles/globals.css` 的 `@theme` | 组件里只引用 token，见 §2 |
| 格式化 | `src/lib/format.ts` | 时间/数字/货币/相对时间 全站唯一入口，见 §3 |
| 通用工具（`cn` 等） | `src/lib/utils.ts` | — |
| 枚举 → 标签/徽章 | 数据映射(typed record) 就近于 feature；渲染全站唯一 `<StatusBadge>` | 映射与渲染分离，见 §3 |
| i18n 文案 | `messages/<locale>.json`（`next-intl`） | 禁止 JSX 硬编码可见文案 |
| 表单/接口 Zod schema | `server/api/routers/<domain>.schema.ts` | 前端表单与 tRPC input 复用**同一** schema |

### 动手前的三步决策

```
需要一个 UI 模式 / 一段格式化 / 一个 schema？
  ├─ 钦定位置已有 ────────────→ 直接 import
  ├─ 有但差一个选项 ──────────→ 给它加一个 prop（扩展），不要复制改名
  └─ 完全没有 ────────────────→ 在钦定位置新建“一个”，供全站复用（不要写在页面里）
```

### 共享组件目录（`components/shared/*` 必须唯一）

| 组件 | 说明 |
|---|---|
| `pagination.tsx` | 全站唯一分页；换页面不许换风格 |
| `data-table.tsx` | 表格（表头/排序/空态/加载态一体） |
| `filter-bar.tsx` | 筛选栏 |
| `search-input.tsx` | 搜索框（含 debounce） |
| `status-badge.tsx` | 状态徽章（消费枚举映射，见 §3） |
| `stat-card.tsx` | 统计卡 / KPI |
| `page-header.tsx` | 页头（标题 + 面包屑 + 操作区） |
| `empty-state.tsx` | 空状态 |
| `confirm-dialog.tsx` | 破坏性操作确认框 |
| `detail-drawer.tsx` | 详情抽屉 |
| `skeletons.tsx` | 骨架屏（`loading.tsx` 复用） |

---

## 2. 视觉 token（消灭乱配色 / 乱字号）

- **颜色**：只用语义 token（`bg-primary` / `text-muted-foreground` / `border-destructive`…）。**禁止**裸 `#hex`、`rgb()`、`bg-[#3b82f6]` 任意值类，也不要直接用调色板阶（如 `blue-500`）。
- **间距**：走 4/8px 节奏（`p-2` `gap-4` `space-y-6`）；禁止 `mt-[13px]` 这类任意值。
- **圆角 / 阴影 / 描边**：圆角用 `rounded-md`（对应 `--radius`）；阴影/描边用固定档位。
- **字号**：只用固定阶梯（`text-xs/sm/base/lg/xl/2xl…`）；**禁止** `text-[13px]`、`style={{ fontSize }}`。字重限 400/500/600/700。行高跟随字号 token，例外用 `leading-*` utility。
- **图标**：只用一套（lucide-react），尺寸/线宽统一；**禁止 emoji 当结构性 UI 图标**。

```tsx
// ❌ 裸值、调色板阶、任意字号
<div className="bg-[#111827] text-[13px]" style={{ color: "#6b7280" }} />
<span className="text-blue-500" />

// ✅ 语义 token + 字号阶梯
<div className="bg-background text-sm text-muted-foreground" />
<span className="text-primary" />
```

`globals.css` 里集中声明（示意）：

```css
@theme {
  --color-primary: oklch(0.55 0.20 265);
  --color-muted: oklch(0.97 0 0);
  --radius: 0.5rem;
  --text-sm: 0.875rem;
}
```

---

## 3. 数据展示格式（消灭时间/数字/状态各写各的）

### 3.1 唯一 formatter：`src/lib/format.ts`

```ts
// 全站唯一格式化入口。底层用 Intl，接收 locale。
export function formatDateTime(iso: string, locale = "en") {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}
export function formatCurrency(minorUnits: number, currency = "USD", locale = "en") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(minorUnits / 100);
}
export function formatNumber(n: number, locale = "en") {
  return new Intl.NumberFormat(locale).format(n);
}
export function formatRelativeTime(iso: string, locale = "en") { /* Intl.RelativeTimeFormat 封装 */ }
```

- **UTC 存储、按用户 locale/时区渲染**；日期用语义化 `<time dateTime={iso}>{formatDateTime(iso)}</time>`。
- **货币按最小单位整数存**（cents），展示层才除 100 格式化。
- **禁止**组件里出现 `new Date().toLocaleDateString()`、手拼 `` `${y}-${m}-${d}` ``、裸 `Intl.*`。

```tsx
// ❌ 各写各的
<span>{new Date(order.createdAt).toLocaleDateString()}</span>
<span>${(order.amount / 100).toFixed(2)}</span>

// ✅ 统一入口
<time dateTime={order.createdAt}>{formatDateTime(order.createdAt, locale)}</time>
<span>{formatCurrency(order.amount, "USD", locale)}</span>
```

### 3.2 枚举 → 标签/徽章：映射与渲染分离

```ts
// 映射：typed record，就近于 feature。改文案/颜色只改这里。
export const ORDER_STATUS: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
  pending:   { label: "待处理", variant: "secondary" },
  completed: { label: "已完成", variant: "success" },
  canceled:  { label: "已取消", variant: "muted" },
};
```

```tsx
// 渲染：全站唯一 <StatusBadge>，任何页面同一状态长相一致
<StatusBadge map={ORDER_STATUS} value={order.status} />
```

---

## 4. 组件化

- **页面文件（`page.tsx`）只做组合与路由级布局**，不塞状态、表格、表单、mock 数据、校验逻辑。
- 单文件过大（经验值 >约 200 行，或含多个独立区块）→ 拆成命名组件。
- **业务逻辑抽到 hook / 纯函数**，不写在 JSX 里；纯函数便于单测。
- 组件 props 显式声明类型；跨 client/server 边界只传可序列化值。

```tsx
// ❌ 一个 page.tsx 里塞了 fetch + 状态 + 表格 + 分页 + 弹窗……（略）

// ✅ page 只组合
export default async function OrdersPage() {
  const orders = await api.order.list();          // RSC 取数
  return (
    <>
      <PageHeader title="订单" />
      <OrderTable orders={orders} />               {/* 细节在子组件 */}
    </>
  );
}
```

---

## 5. 数据流与边界（React + tRPC）

- **默认 Server Component**；仅在需要 state/effect/事件回调/浏览器 API 时才 `"use client"`，并**尽量下推到叶子**。
- **取数**：RSC 走服务端 tRPC caller（`~/trpc/server`）；客户端交互走 tRPC hooks。**不混用**。
- **表单**：react-hook-form + `zodResolver(schema)`，`schema` 与 tRPC `.input()` 复用**同一个 Zod**。
- **写后失效**：mutation 成功后必须 `utils.<router>.<query>.invalidate()`；若影响 RSC，配合 `revalidatePath`。

```tsx
"use client";
const utils = api.useUtils();
const create = api.item.create.useMutation({
  onSuccess: () => { utils.item.list.invalidate(); toast.success("已创建"); },
  onError: (e) => toast.error(e.message),
});
```

---

## 6. 四态与反馈

- **四态纪律**：每个异步视图都要有 `loading`（复用共享骨架）/ `empty`（共享空状态）/ `error` / `success`，**不许只写 success**。
- 成功/失败反馈统一走 **sonner `toast`**；禁止 `alert()` 或每页自拼横幅。
- 破坏性操作统一走共享 `confirm-dialog`。
- 复杂交互（下拉/对话框/tooltip/tabs/popover）**一律用 shadcn 原语，禁手写**——顺带保证键盘/焦点/ARIA 一致。

---

## 7. 命名与无障碍基线

- **文件名 kebab-case**（`order-table.tsx`）；**组件导出 PascalCase**（`OrderTable`）。
- 路由段用路由组 `(group)`；私有组件放 `_components/`。
- 交互元素用语义标签（`<button>`/`<a>`）；表单控件必须有 `<label>` 关联；图标按钮加 `aria-label`；
- 键盘可达、焦点可见；颜色对比达 WCAG AA。shadcn 原语已内建大部分，**这也是禁止手写复杂交互的原因**。

---

## 8. 完成定义（提交前自查）

- [ ] 用到的模式都来自 §1 钦定位置，无重造/复制
- [ ] 无裸色值、无调色板阶、无裸字号、无任意值间距
- [ ] 时间/数字/货币全部走 `lib/format.ts`
- [ ] 状态徽章走唯一 `<StatusBadge>` + 集中映射
- [ ] 异步视图四态齐全（loading/empty/error/success）
- [ ] 反馈走 sonner；破坏性操作走共享确认框
- [ ] 页面文件只做“组合”，业务逻辑在 hook/纯函数
- [ ] `"use client"` 已下推到叶子；表单与 tRPC 复用同一 Zod
- [ ] 文件 kebab-case、导出 PascalCase；交互元素语义化且可键盘操作
- [ ] 新增的共享能力已放进钦定位置、可被全站复用
