// source: https://usehooks-ts.com/react-hook/use-copy-to-clipboard
// 已扩展：当 navigator.clipboard 不可用时（HTTP 内网环境）自动降级到 execCommand
import { useCallback, useState } from "react"

type CopiedValue = string | null
type CopyFn = (text: string) => Promise<boolean>

/**
 * execCommand 降级方案：
 * 在 HTTP 内网环境下 navigator.clipboard 会因 insecure context 被拒绝，
 * 此时通过创建隐藏 textarea + execCommand('copy') 实现兼容复制。
 */
function copyViaExecCommand(text: string): boolean {
  const textarea = document.createElement("textarea")
  textarea.value = text
  // 防止元素影响页面布局和滚动位置
  textarea.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;"
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  try {
    return (document as unknown as { execCommand: (cmd: string) => boolean }).execCommand("copy")
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}

export function useCopyToClipboard(): [CopiedValue, CopyFn] {
  const [copiedText, setCopiedText] = useState<CopiedValue>(null)

  const copy: CopyFn = useCallback(async (text) => {
    let success = false

    // 优先使用现代 Clipboard API（HTTPS / localhost）
    if (navigator?.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
        success = true
      } catch {
        // 安全上下文不足（HTTP 内网），降级到 execCommand
        success = copyViaExecCommand(text)
      }
    } else {
      // 浏览器不支持 Clipboard API，直接降级
      success = copyViaExecCommand(text)
    }

    if (success) {
      setCopiedText(text)
      setTimeout(() => setCopiedText(null), 2000)
    }
    return success
  }, [])

  return [copiedText, copy]
}
