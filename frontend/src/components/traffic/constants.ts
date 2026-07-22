/**
 * traffic 领域共享常量
 *
 * [Why]：METHOD_STYLES 在 new-variant.tsx 和 index.tsx 中各维护了一份完全相同的副本，
 * 提取到此处后只有一个数据源，修改颜色方案时不会遗漏任何一处。
 */

/** HTTP Method 徽章颜色映射（Tailwind CSS 类名） */
export const METHOD_STYLES: Record<string, string> = {
  GET: "bg-blue-50 text-blue-600 border-blue-200",
  POST: "bg-red-50 text-red-500 border-red-200",
  PUT: "bg-green-50 text-green-600 border-green-200",
  DELETE: "bg-orange-50 text-orange-600 border-orange-200",
  PATCH: "bg-purple-50 text-purple-600 border-purple-200",
}
