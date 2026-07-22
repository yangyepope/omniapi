---
paths:
  - "frontend/**"
---

# 前端踩坑清单(防复发)

> **这是一份"只增不删"的踩坑档案**:每修一个前端 bug,就把根因和防线追加到下表,
> 让 AI 编码时不再犯同样的错。`install.sh` 只在本文件不存在时播种一次,**之后由本项目自行追加,
> `--force` 也不会覆盖**(避免冲掉你积累的记录)。
>
> **写一条新坑的格式**:现象一句话 → 根因(问"为什么会发生") → 铁律(以后怎么避免,给 ❌/✅
> 或具体做法) → tripwire(可跑的检测命令 / grep 断言,可选但强烈建议)。
> 详细沉淀规则见 `common/01-协作准则-karpathy.md` 的「Bug 修复后必须沉淀」。

---

## 索引(最新在上)

| # | 现象 | 一句话铁律 |
|---|---|---|
| F-007 | 时间全站少 8 小时 / 美式格式 / 手拼格式不一 | 时间一律走 `lib/format.ts`;无时区串按 UTC 解析,固定 Asia/Shanghai 渲染 |
| F-006 | "返回大屏"从任意入口下钻都甩到大屏,不回上一步 | 多入口详情页的"返回"走 `useCanGoBack()`+`history.back()`,禁 `<Link>` 写死目标 |
| F-005 | 大屏「开放问题」恒为 0(有 CRITICAL 却说 0 开放) | 禁手写后端响应类型;`?? 默认值` 只兜"值",不兜"字段不存在" |
| F-004 | 新页面卡片全变深色 | 全站强制亮色靠字面调色板;禁用会随 `.dark` 翻转的语义 token / shadcn Card·Badge |
| F-003 | VITE 变量缺失拼出 `/undefined/api/...` 404 | 环境变量赋给运行时配置必须显式兜底 |
| F-001 | 提交后列表不刷新 | mutation 成功必须 `invalidateQueries` |
| F-002 | useEffect 手动 fetch 竞态/重复请求 | 取数一律走 TanStack Query,禁 useEffect fetch |

---

## F-001 · 增删改成功后列表/详情不刷新

- **现象**:表单提交成功、后端已写库,但界面列表还是旧数据,要手动刷新页面才更新。
- **根因**:mutation 成功后没让相关 query 失效,TanStack Query 仍返回缓存。
- **铁律**:
  ```tsx
  const qc = useQueryClient()
  useMutation({ mutationFn: create, onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["services"] })   // ✅ 必须失效相关查询
    toast.success("已创建")                             // ✅ 反馈走 sonner
  }})
  ```
- 关联:`前端一致性规范.md` §数据流。

## F-002 · useEffect 里手动 fetch,导致竞态 / 重复请求 / 内存泄漏

- **现象**:切页/改参数时旧请求结果覆盖新结果,或同一数据请求多次,或卸载后 setState 报警告。
- **根因**:用 `useEffect + fetch + useState` 手搓异步,没处理竞态、取消、缓存、去重。
- **铁律**:服务端状态一律 `useQuery`/`useMutation`,不在 `useEffect` 里手动 fetch;
  分页/搜索/筛选参数进路由 search params,由 query key 驱动重取。
- **tripwire**:
  ```bash
  grep -rnE "useEffect\(" frontend/src -A5 | grep -E "fetch\(|axios|\.then\(" \
    && echo "⚠ 疑似 useEffect 手动取数,核对是否该用 TanStack Query" || echo "✅ 未发现"
  ```
- 关联:`前端一致性规范.md` §数据流。

---

<!-- 新坑从这里往下追加,并在上面「索引」补一行 -->

## F-003 · VITE 环境变量缺失,拼出 `/undefined/api/...` 全线 404

- **现象**:登录/请求全部 404,DevTools 显示请求 URL 含字面量 `undefined`(如 `http://host:5173/undefined/api/v1/login/access-token`)。
- **根因**:`import.meta.env.VITE_*` 未注入时为 `undefined`,直接赋给 `OpenAPI.BASE` 等运行时配置后被拼成字符串;项目契约"留空 = 相对路径走代理"只写在 compose 注释里,多处读取点兜底不一致(双轨)。
- **铁律**:环境变量赋给运行时配置(API 基地址/WS 地址/上报端点)必须在赋值处显式兜底,表达"缺失时的语义":
  ```ts
  OpenAPI.BASE = import.meta.env.VITE_API_URL        // ❌ 缺失时变 "/undefined/..."
  OpenAPI.BASE = import.meta.env.VITE_API_URL || ""  // ✅ 留空走相对路径,由代理转发
  ```
  新增 `VITE_*` 变量时,`src/vite-env.d.ts` 声明、读取处兜底、`compose.yml` 构建参数三处同步。
- **tripwire**:
  ```bash
  grep -rn 'import\.meta\.env\.VITE_API_URL' frontend/src --include='*.ts' --include='*.tsx' \
    | grep -v '||' && echo "⚠ 存在无兜底的 VITE_API_URL 引用" || echo "✅ 通过"
  ```
- 关联:[BUG-001](../../document/bugs/BUG-001-环境变量注入前端配置缺兜底.md)、[FIX-011](../../document/changelog/FIX-011-前端API基地址undefined导致登录404.md)。

---

## F-004 · 新页面卡片全变深色(语义 token 随 .dark 翻转)

- **现象**:新写的页面用 shadcn 语义 token(`bg-card`/`bg-muted`/`text-foreground`)或 shadcn `Card`/`Badge`/`Button`,渲染出来卡片是**深色**,和白色侧边栏、服务管理页割裂。
- **根因**:`main.tsx` 里 `ThemeProvider defaultTheme="dark"`,`<html>` 常带 `.dark` 类,于是 `--card`/`--muted`/`--foreground`/`--primary` 全解析成**深色**值。而全站(ServiceCard、服务页、侧边栏等 17 个文件)从不依赖主题翻转——一律用**字面亮色调色板**(`bg-white`/`border-gray-100`/`text-gray-900`/`text-blue-600`)强制亮色。混用语义 token 的新页面就成了"深色孤岛"。
- **铁律**:与全站视觉一致 = 用**字面亮色类**,不用会随 `.dark` 翻转的语义 token:
  - ❌ `bg-card` / `bg-muted` / `text-foreground` / `text-muted-foreground` / `bg-primary` / 裸 `border`(= `--border` 深灰)
  - ✅ `bg-white` / `bg-gray-50` / `text-gray-900` / `text-gray-500` / `bg-blue-600` / `border-gray-100`
  - ❌ 直接用 shadcn `Card`/`Badge`(其内部就是 `bg-card`/`bg-primary`)→ ✅ 用字面白卡片 div、字面 chip、或安全区 `components/security/{ui,badges}` 套件
- **tripwire**:
  ```bash
  grep -rnE "(bg-card|bg-muted|text-foreground|text-muted-foreground|bg-primary\b)" \
    frontend/src/security frontend/src/routes/_layout/security frontend/src/components/security \
    && echo "⚠ 安全区出现随 .dark 翻转的语义 token,核对是否该用字面亮色类" || echo "✅ 通过"
  ```
- 关联:安全区套件 `frontend/src/components/security/{theme.ts,badges.tsx,ui.tsx}`;walkthrough `document/walkthroughs/walkthrough_AI安全亮色主题重做_2026-07-06.md`。

---

## F-005 · 手写响应类型对后端契约撒谎,`?? 默认值` 静默吞掉缺失字段

- **现象**:安全大屏「开放问题」KPI 恒显示 `0`,同屏却有 93 个 CRITICAL、11 个覆盖服务——有开放的严重问题却说 0 开放。
- **根因**:`frontend/src/security/api.ts` **手写** `Stats` 响应类型(违反 03/05 契约优先铁律,应来自 hey-api 生成的 `src/client/`),手写时凭想象加了 scanner `/stats` 根本不返回的 `open_findings` 字段;平台后端又以 `dict[str, Any]` 无 schema 透传,TS 编译期查不出;运行期 `stats.data?.open_findings ?? 0` 把"字段不存在"当成"值是 0",恒显示 0。真实开放数在 `by_status.open`(线上 1013)。
- **铁律**:
  - ❌ 手写后端返回结构的 `type/interface`(尤其给它加"我以为后端会返回"的字段)
  - ✅ 响应类型一律来自 `src/client/`(hey-api 生成);确需手写(如透传 `dict[str, Any]` 的端点)时,字段名必须逐一对照后端真实响应,不凭想象
  - ✅ `x ?? 默认值` 只用来兜"值可能缺失",**不能**用来兜"字段名可能写错/不存在";读关键 KPI 前先确认该键真的在响应里(对应根 CLAUDE.md「引用字段前先确认它存在」)
- **tripwire**:
  ```bash
  grep -rnE "stats(\.data)?\??\.\bopen_findings\b" \
    frontend/src/security frontend/src/routes/_layout/security \
    && echo "❌ 又在从 Stats 读不存在的 open_findings(应读 by_status.open)" || echo "✅ 通过"
  ```
- 关联:[BUG-002](../../document/bugs/BUG-002-前端手写响应类型与scanner契约漂移.md)、[FIX-012](../../document/changelog/FIX-012-安全大屏开放问题恒为0.md);`03-前端架构铁律.md` §四、`05-前端一致性规范.md` §一。

---

## F-006 · "返回/上一步"按钮硬编码目标,从任意入口下钻都甩到同一页

- **现象**:finding 详情、服务详情左上角"返回大屏",无论你是从 findings 列表、服务详情还是大屏下钻进来的,点它都跳到安全大屏,而不是回到进入本页的上一步。
- **根因**:返回按钮用 `<Link to="/security-dashboard">` 把目标 route **写死**。这类多入口详情页的"返回"语义是"回到进入本页的那一步"——运行期由导航历史决定的动态目标;用静态链接固化,等于假设所有人都从同一个地方来,对其余入口全错。
- **铁律**:带"返回/上一步"语义的入口走**历史驱动**,不写死目标:
  ```tsx
  const router = useRouter()
  const canGoBack = useCanGoBack()                       // ✅ 判断有无历史
  const goBack = () =>
    canGoBack
      ? router.history.back()                            // ✅ 有历史:回上一步
      : router.navigate({ to: "/security-dashboard" })   // ✅ 无历史(直开 URL)才兜底
  // ❌ <Link to="/security-dashboard">返回大屏</Link>   // 写死目标,忽略入口
  ```
  真正想固定去某处(如"回到列表首页")的入口不叫"返回",文案与语义要一致,不要用"返回"文案却做定向跳转。
- **tripwire**:
  ```bash
  grep -rnE '<Link[^>]*>' frontend/src/routes/_layout/security frontend/src/components/security \
    -A2 | grep -E '返回|上一步|后退' \
    && echo "❌ 发现写死目标的返回链接,应走 router.history.back()" || echo "✅ 通过"
  ```
- 关联:[BUG-003](../../document/bugs/BUG-003-返回按钮硬编码目标不走历史.md)、[FIX-013](../../document/changelog/FIX-013-返回按钮硬编码跳大屏.md);`05-前端一致性规范.md` §六。

---

## F-007 · 时间全站少 8 小时 / 格式不一(无统一 formatter)

- **现象**:扫描任务/历史等页时间比真实北京时间**少 8 小时**(如 `7:09 AM` 实为 `15:09`),且格式混乱——有的美式 `7/8/2026, 7:09:55 AM`、有的手拼 `${y}-${m}-${d}`、粒度到日/到分/到秒各不同。
- **根因**:两层。① scanner 后端容器时区 UTC + naive `datetime.now()`,序列化出**不带时区标记**的 UTC 串(`2026-07-08T07:09:55.201104`,无 Z);② 前端无统一 formatter,各处 `new Date("...无Z...")` 被 JS 当**浏览器本地**解析 → 少 8 小时;格式各写各的(手拼、漏传 locale)。platform 后端已 aware(`+00:00`)反而正确,所以 formatter 必须**同时正确处理带/不带时区两类串**。
- **铁律**:时间/日期渲染一律走全站唯一 `src/lib/format.ts`(规则 05 §5.1 钦定),禁在组件里 `new Date().toLocaleString()`、禁手拼 `${y}-${m}-${d}`:
  ```ts
  // ✅ 统一入口:无时区串按 UTC 解析(补 Z),固定 Asia/Shanghai 渲染
  import { fmtDateTime, fmtDate, fmtTime, fmtRelative } from "@/lib/format"
  fmtDateTime(run.started_at)   // 2026-07-08 15:09:55
  // ❌ new Date(iso).toLocaleString()            // 美式 + 无时区处理,少 8h
  // ❌ `${d.getFullYear()}-${d.getMonth()+1}...` // 手拼,取本地值又少 8h
  ```
  `lib/format.ts` 内部:`/[Zz]$|[+-]\d{2}:?\d{2}$/` 判是否带时区,没带补 `Z` 当 UTC;渲染用 `Intl`(sv-SE locale 得 ISO 风格)+ `timeZone:"Asia/Shanghai"`。取"当前时间"(时钟/默认名)不受影响可不收编;纯差值时长(finished−started 同源相减)与时区无关也可不收编。
- **tripwire**:
  ```bash
  grep -rnE "new Date\([^)]+\)\.(toLocaleString|toLocaleDateString|toLocaleTimeString)" \
    frontend/src --include=*.tsx | grep -v "lib/format.ts" \
    && echo "❌ 存在绕过 lib/format.ts 的时间渲染(会少 8h/格式不一)" || echo "✅ 通过"
  ```
- 关联:`document/walkthroughs/walkthrough_全站时间显示统一北京时区_2026-07-08.md`;`05-前端一致性规范.md` §5.1(存量缺口:`lib/format.ts` 已落地)。根因后端侧:scanner naive UTC 无 Z(platform 已 aware,scanner 未对齐,属已知欠债)。
