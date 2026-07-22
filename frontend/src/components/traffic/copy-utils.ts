/**
 * 剪贴板复制工具函数
 *
 * [Why]：navigator.clipboard API 要求 HTTPS 或 localhost，在 HTTP 内网环境下会静默失败。
 * 通过 execCommand('copy') 降级兼容，保证在任意环境下复制功能均可用。
 * 此逻辑在 new-variant.tsx 和 index.tsx 中各有一份完全相同的副本，
 * 统一提取到此处后消除重复，两个页面共享同一实现。
 */

/**
 * execCommand 降级复制（兼容 HTTP 内网环境）
 * [Why]：通过创建隐藏 textarea 并执行 document.execCommand('copy') 实现复制，
 * 作为 Clipboard API 不可用时的兜底方案
 */
export function copyViaExecCommand(text: string): void {
  // 创建屏幕外的 textarea，避免页面滚动或布局抖动
  const el = document.createElement("textarea")
  el.value = text
  el.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;"
  document.body.appendChild(el)
  el.focus()
  el.select()
  try {
    // execCommand 在现代浏览器中已废弃，但在 HTTP 环境下仍是唯一可用的同步复制方案
    ;(
      document as unknown as { execCommand: (cmd: string) => boolean }
    ).execCommand("copy")
  } finally {
    // 无论成功与否，必须清理 DOM
    document.body.removeChild(el)
  }
}

/**
 * 统一复制入口：优先使用 Clipboard API，失败时降级到 execCommand
 * @param text     要复制的文本内容
 * @param onSuccess 复制成功后的回调（用于触发 UI 状态变更，如"已复制"提示）
 */
export function copyText(text: string, onSuccess: () => void): void {
  if (navigator?.clipboard) {
    // 优先路径：Clipboard API（需要 HTTPS 或 localhost）
    navigator.clipboard
      .writeText(text)
      .then(onSuccess)
      .catch(() => {
        // 降级路径：execCommand（HTTP 内网兼容）
        copyViaExecCommand(text)
        onSuccess()
      })
  } else {
    // clipboard 不存在时直接走降级路径
    copyViaExecCommand(text)
    onSuccess()
  }
}
