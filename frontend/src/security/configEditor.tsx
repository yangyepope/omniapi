// 运行时配置项的编辑控件 + 值编解码——ConfigPage 与 EnginesPage 共用。
// 抽提自 ConfigPage(避免两页各拷一份 parse/display/控件逻辑,单一真相源)。
// 控件类型由 Settings 字段注解字符串(ConfigItem.type)推断。

// 从 Settings 字段注解字符串推断编辑控件类型
export type EditorKind = "bool" | "number" | "list" | "text"

export function editorKind(t: string): EditorKind {
  if (t.includes("bool")) return "bool"
  if (t.includes("list")) return "list"
  if (t.includes("int") || t.includes("float")) return "number"
  return "text"
}

// 把编辑器里的字符串还原成 PUT 需要的 JSON 值
export function parseValue(kind: EditorKind, raw: unknown): unknown {
  if (kind === "bool") return raw
  if (kind === "number") {
    const n = Number(raw)
    return Number.isFinite(n) ? n : raw
  }
  if (kind === "list")
    return String(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  return raw === "" ? null : raw
}

// 当前值 → 编辑器显示字符串
export function displayValue(kind: EditorKind, v: unknown): string {
  if (v === null || v === undefined) return ""
  if (kind === "list" && Array.isArray(v)) return v.join(", ")
  return String(v)
}

const inputCls =
  "w-full bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-sm text-gray-900 " +
  "font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-300"

// ── 单值编辑器(bool 胶囊 / number·text·list 输入框)────────────────
export function ValueEditor({
  kind,
  value,
  dirty,
  onChange,
}: {
  kind: EditorKind
  value: unknown
  dirty: boolean
  onChange: (v: unknown) => void
}) {
  if (kind === "bool") {
    const on = Boolean(value)
    return (
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={`px-3 py-1 rounded-full text-xs font-semibold border border-gray-200 transition-colors ${
          on
            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
            : "bg-gray-100 text-gray-500 border border-gray-200"
        } ${dirty ? "ring-1 ring-blue-400" : ""}`}
      >
        {on ? "开启" : "关闭"}
      </button>
    )
  }
  return (
    <input
      type={kind === "number" ? "number" : "text"}
      className={`${inputCls} ${dirty ? "border-blue-300 ring-1 ring-blue-200" : ""}`}
      value={displayValue(kind, value)}
      onChange={(e) => onChange(e.target.value)}
      placeholder={kind === "list" ? "逗号分隔,如 p/default, p/java" : ""}
    />
  )
}
