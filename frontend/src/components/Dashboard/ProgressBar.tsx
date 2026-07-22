import { motion } from "motion/react"

interface ProgressBarProps {
  label: string
  percentage: number
}

/**
 * ProgressBar: 服务进度条组件
 *
 * 展示某个服务或项目的活跃程度，内置基于 motion 的增长加载动画。
 */
export const ProgressBar = ({ label, percentage }: ProgressBarProps) => (
  // Why: last:mb-0 确保当组件作为列表最后一个渲染时，不会出现突兀的、冗余的底部边距（margin bottom），保持排版紧凑干净。
  <div className="mb-4 last:mb-0">
    <div className="flex justify-between text-xs mb-2">
      <span className="text-gray-600 font-medium tracking-tight">{label}</span>
      <span className="text-blue-600 font-bold tracking-tighter">
        {percentage}% 活跃
      </span>
    </div>

    {/* 此处是外部边框/背景轨道（轻灰色底槽） */}
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      {/* 
        内部的颜色长条使用 framer-motion 实现展开动画效果。
        Why: 静态的进度条缺乏动感。添加 { ease: "easeOut" } 旨在模拟自然的物理惯性增长而不是生硬的线性突变。
      */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full bg-blue-600"
      />
    </div>
  </div>
)
