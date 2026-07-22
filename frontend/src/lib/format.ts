// 全站唯一时间 / 数字格式化工具(规则 05 §5.1 / 08 钦定路径 src/lib/format.ts)。
//
// 时区口径:固定北京(Asia/Shanghai)——内部平台、运维在国内,不随浏览器机器时区漂移。
//
// 关键:后端有两类时间字符串,都要正确处理(否则国内会少算 8 小时):
//   - platform 后端:aware UTC,序列化带 `+00:00` / `Z`
//   - scanner 后端:naive UTC(容器 UTC + datetime.now()),序列化**不带**时区标记
// 不带标记的串若直接 `new Date()` 会被当浏览器本地时间 → 补 "Z" 按 UTC 解析。

const TZ = "Asia/Shanghai"

// 后端时间串 → Date。无时区标记(scanner 裸 UTC)时补 "Z" 当 UTC 解析,
// 已带标记(platform +00:00 / Z)的照常,避免二次偏移。
function toDate(iso: string): Date {
  const hasTz = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso)
  return new Date(hasTz ? iso : `${iso}Z`)
}

// ISO → 北京绝对时间 "2026-07-08 15:09:55"。空值 / 非法返回占位符。
// sv-SE locale 天然输出 ISO 风格(连字符 + 24 小时制),配 timeZone 固定北京;
// 避免手拼 `${y}-${m}-${d}`(规则 05 §5.1 禁止)。
export function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—"
  const d = toDate(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("sv-SE", { timeZone: TZ })
}

// ISO → 北京日期 "2026-07-08"
export function fmtDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = toDate(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("sv-SE", { timeZone: TZ })
}

// ISO → 北京时间的时:分:秒 "15:09:55"(用于空间紧凑处,如阶段进度时间戳)。
export function fmtTime(iso?: string | null): string {
  if (!iso) return "—"
  const d = toDate(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleTimeString("sv-SE", { timeZone: TZ })
}

// ISO → 相对时间(刚刚 / N 分钟前 / N 小时前 / N 天前),超 30 天回退绝对日期。
export function fmtRelative(iso?: string | null): string {
  if (!iso) return "—"
  const d = toDate(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 0) return fmtDateTime(iso) // 未来时间直接给绝对值
  if (sec < 60) return "刚刚"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return fmtDate(iso)
}

// 秒 → 人类可读时长(与时区无关,通用)。
export function fmtDuration(s: number): string {
  if (s >= 3600) return `${(s / 3600).toFixed(1)} 小时`
  if (s >= 60) return `${(s / 60).toFixed(1)} 分钟`
  return `${s.toFixed(1)} 秒`
}

// 大数字缩写:1234567 → 1.23M(token 数很大,轴 / 卡片都需要)。
export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
