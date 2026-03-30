import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  color: 'cyan' | 'purple' | 'blue' | 'green';
  trend?: string;
}

/**
 * StatCard: 数据统计卡片组件
 * 
 * 用于展示具有关键数字指标的卡片，包含图标、数据、单位和可选的趋势标签。
 * 支持根据颜色主题进行特定的亮色（Light Mode）渲染。
 */
export const StatCard = ({ title, value, unit, icon: Icon, color, trend }: StatCardProps) => {
  // 根据传入的 color 字段映射对应的 Tailwind CSS 类名
  // Why: 集中配置颜色方案可以避免在渲染时书写冗长的三元表达式，确保统一的设计系统输出。
  const colorMap: Record<string, string> = {
    cyan: 'text-blue-500 bg-blue-50',
    purple: 'text-blue-500 bg-blue-50',
    blue: 'text-blue-500 bg-blue-50',
    green: 'text-green-600 bg-green-100',
  };

  // Why: 去重率等特定卡片需要独特的独立风格（例如浅绿色的主题背景），在此用常量提取逻辑，以提高JSX代码可读性。
  const isGreenCard = color === 'green';

  return (
    // Why: 使用 motion.div 代替普通 div, 以实现组件首次挂载时的“渐显+上浮”顺滑进场动画效果。
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 17 
      }}
      className={`relative overflow-hidden border rounded-2xl p-6 transition-all duration-300 group cursor-pointer ${
        isGreenCard ? 'bg-[#f0fdf4] border-green-200 shadow-sm hover:shadow-lg hover:shadow-green-100' : 'bg-white border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-50 hover:border-blue-200'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        {/* 卡片左上方的圆角小图标块 */}
        <div className={`p-3 rounded-xl ${colorMap[color] || colorMap.blue}`}>
          <Icon size={24} className="transition-all" />
        </div>
        
        {/* Why: 只有当父组件传入并定义了 trend 趋势值时，才展示增长/下降提示标签。 */}
        {trend && (
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md ${
            trend.startsWith('+') 
              ? isGreenCard ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {trend} 较昨日
          </span>
        )}
      </div>
      <div>
        {/* 卡片标题描述区 */}
        <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">{title}</h3>
        
        {/* 核心数值与单位展示区 */}
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-black tracking-tight ${isGreenCard ? 'text-green-900' : 'text-gray-900'}`}>{value}</span>
          <span className={`text-[10px] uppercase tracking-[0.1em] font-bold ${isGreenCard ? 'text-green-700' : 'text-gray-400'}`}>{unit}</span>
        </div>
      </div>
    </motion.div>
  );
};
