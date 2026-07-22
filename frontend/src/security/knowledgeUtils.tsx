// 知识摄取相关的共用小件:分类下拉选项 + fed_to_ai 徽章。
// 抽出供 Page / Detail / CreateDialog 复用(单一真相源)。
import type { Classification } from "./api"

// 分类枚举固定三值——ai_context 才真正喂给 AI,其余仅存档可见。
export const CLASSIFICATION_OPTIONS: {
  value: Classification
  label: string
}[] = [
  { value: "ai_context", label: "ai_context(喂给 AI)" },
  { value: "user_doc", label: "user_doc(用户文档)" },
  { value: "ops_doc", label: "ops_doc(运维文档)" },
]

// fed_to_ai 关键展示徽章:一眼看出这条知识 AI 到底用没用。
export function FedBadge({ fed }: { fed: boolean }) {
  return fed ? (
    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
      已喂给 AI
    </span>
  ) : (
    <span className="rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
      未喂给 AI
    </span>
  )
}
