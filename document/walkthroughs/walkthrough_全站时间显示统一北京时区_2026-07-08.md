# 全站时间显示统一为北京时区

> [2026-07-08 19:45:21] 纯前端改动(security-platform/frontend);未动任何后端。

## 背景 / 问题

系统里时间显示不对(扫描任务页如 `7/8/2026, 7:09:55 AM`),两层根因:
1. **scanner 后端**容器时区 UTC + naive `datetime.now()`,序列化出**不带时区标记**的 UTC 串
   (`2026-07-08T07:09:55.201104`,无 Z);scan-runs/扫描任务/findings 时间都走它。
2. **前端**无统一 formatter,各处 `new Date("...无Z...")` 被当浏览器本地解析 → 少 8 小时;
   格式还乱(美式、手拼 `${y}-${m}-${d}`、粒度不一、`formatDt` 各写一份)。
   platform 后端已 aware(`+00:00`)本就正确,故 formatter 必须同时正确处理带/不带时区两类串。

用户定:**固定北京时间 + 前端统一修**(不动后端、无迁移、无重建)。

## 操作 / 改动

- [x] **新建全站唯一 formatter** `frontend/src/lib/format.ts`(规则 05 §5.1 钦定):
  `fmtDateTime`(2026-07-08 15:09:55)/`fmtDate`/`fmtTime`/`fmtRelative`/`fmtDuration`/`fmtNum`。
  核心:`/[Zz]$|[+-]\d{2}:?\d{2}$/` 判是否带时区,没带补 `Z` 按 UTC 解析;渲染用 `Intl`(sv-SE
  locale 得 ISO 风格)+ `timeZone:"Asia/Shanghai"`;空值/非法返回 `—`。
- [x] **`security/cost/format.ts`** 改为从 `@/lib/format` re-export,消除双轨。
- [x] **全站约 16 处解析后端时间戳的渲染点**收编到 lib:
  - security 区:`ScanRunDetailPanel`(删本地 fmtClock→fmtTime、started/triggered→fmtDateTime)、
    `SecurityDashboard`(删本地 formatRel→fmtRelative)、`services/$name.tsx`、
    `findings/$id.tsx` & `interfaces/$id.tsx`(删各自重复 formatDt)、`tasks.tsx`(修美式)。
  - components:`ServiceCard`(保留"从无流量记录"空文案,有值走 fmtRelative;deprecated_at→fmtDate)、
    `ApiKeys`(fmtDate)。
  - services 区:`$serviceId/index.tsx`(删 `.replace(/\//g,"-")` hack)、
    `$endpointId/index.tsx`(删手拼 formatAbsoluteTime)、`VariantCard`、`TrafficMetaPanel`(删手拼)、
    `HistoryTimeline`(删手拼 + 表头 `执行时间 (UTC)`→`执行时间`)。
  - 豁免不收编:`new Date()` 取当前时间(SecurityDashboard 时钟、VariantEditor 默认名)、
    纯差值时长(finished−started 同源相减,与时区无关)。
- [x] **文档**:前端踩坑档案加 F-007;05 规则存量缺口表 `lib/format.ts` 标记已落地。

## 验证

- [x] biome:`lib/format.ts`、`cost/format.ts` 零错;15 个改动文件格式已 `--write`;残留 30 个均为
  **既有 a11y 债**(button type / div onClick,在未触碰的行),非本次引入。
- [x] tripwire:`grep new Date(...).toLocale*`(排除 lib)对解析后端时间的点**零命中**,只剩豁免的当前时间。
- [x] node 验证 format 核心逻辑:
  - scanner 无时区串 `07:09:55.201104` → `2026-07-08 15:09:55`(正确 +8)
  - platform `+00:00` 串 → `2026-07-08 15:09:55`(**不被二次 +8**)
  - 跨天 UTC 20:00 → 北京 `2026-07-09`
- [x] 前端 Vite dev 热重载,刷新即见:扫描任务 #41 从错误的 `7:09 AM` → `2026-07-08 15:09:55`。

## 备注

- 后端"无 Z"契约欠债作为已知项:platform 已 aware+timestamptz、scanner 仍 naive UTC 无 Z;
  前端 formatter 已兼容两者。若日后要治本让 scanner 对齐 platform(序列化带 Z / 迁移 timestamptz),
  再单独立项,本次范围只在前端。
- 核心其实只是一个 `lib/format.ts`;改动文件多,是因为项目此前时间格式化散落 20+ 处、各写各的,顺手全统一。
