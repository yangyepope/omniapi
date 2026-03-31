import { 
  Shield, 
  Globe, 
  Activity, 
  Zap, 
  ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';
import { StatCard } from './StatCard';
import { ProgressBar } from './ProgressBar';

/**
 * DashboardDesign (仪表盘主组件)
 * 
 * 作为系统的核心展示页面，统合渲染统计卡片群组、进度榜单、SVG环形状态图表以及告警事件列表。
 */
export const DashboardDesign = () => {
  return (
    // Why: 使用 space-y-8 可以让仪表盘里上、中、下三个重要大区块自动保持均匀且一致的间距，而不用到处写 mt-8 或 mb-8。
    <div className="space-y-8 pb-12">
      {/* ===== 顶部区块：核心数据统计卡片 (Stats) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="服务总数" value="12" unit="Services" icon={Shield} color="cyan" trend="+2" />
        <StatCard title="接口总数" value="156" unit="Endpoints" icon={Globe} color="purple" trend="+12" />
        <StatCard title="今日流量" value="12,345" unit="Packets" icon={Activity} color="blue" trend="-5%" />
        <StatCard 
          title="去重率" 
          value="68.5%" 
          unit="Dedupe Rate" 
          icon={Zap} 
          color="green" 
          trend="+2%" 
        />
      </div>

      {/* ===== 中部区块：各类服务分布和活动统计 ===== */}
      {/* Why: lg:grid-cols-3 的拆分布局，使得重点数据侧边栏能够分配到1/3宽度，大分布图分配到2/3宽度，保证了信息层级的主次划分。 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左侧大块：服务活跃度排行的列表视图 */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="lg:col-span-2 bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:border-blue-50 transition-all duration-300"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold flex items-center gap-3 text-gray-900">
              {/* 用于代替常规 Icon 的颜色小柱子，增强设计的专业感 */}
              <span className="w-1.5 h-6 bg-blue-600 rounded-full shrink-0" />
              活跃服务排行 TOP10
            </h2>
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">实时更新</span>
          </div>
          <div className="space-y-6">
            <ProgressBar label="order-service" percentage={92} />
            <ProgressBar label="user-service" percentage={85} />
            <ProgressBar label="auth-service" percentage={78} />
            <ProgressBar label="payment-service" percentage={65} />
            <ProgressBar label="inventory-service" percentage={42} />
          </div>
        </motion.div>

        {/* 右侧：整个接口生命周期的环形分布图 */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-50 transition-all duration-300"
        >
          <h2 className="absolute top-8 left-8 text-xl font-bold flex items-center gap-3 text-gray-900">
            <span className="w-1.5 h-6 bg-green-500 rounded-full shrink-0" />
            接口状态分布
          </h2>
          
          {/* Why: 手动绘制基于 SVG stroke-dasharray 的圆环，比引入庞大如 echarts 等图表库更加极致轻量、加载极快，有助于首屏性能优化。 */}
          <div className="relative w-48 h-48 mt-12">
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-2">
                <span className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-bold">Total</span>
                <span className="text-4xl font-black text-gray-900 tracking-widest">156</span>
             </div>
             <svg className="w-full h-full transform -rotate-90">
                {/* 底部的灰色总轨道 */}
                <circle cx="96" cy="96" r="80" fill="transparent" stroke="#f3f4f6" strokeWidth="16" />
                
                {/* 
                  环形图段落计算 (周长 C ≈ 502):
                  1. Green (Auto-Complete, 60%): length = 502 * 0.6 = 301.2
                  2. Blue (Documented, 25%): length = 502 * 0.25 = 125.5
                  3. Red (Deprecated, 15%): length = 502 * 0.15 = 75.3
                  
                  Why: 使用负的 strokeDashoffset 来按顺序排列段落，配合 strokeDasharray 准确控制每段长度。
                */}
                <circle cx="96" cy="96" r="80" fill="transparent" stroke="#10b981" strokeWidth="16" strokeDasharray="301 502" strokeDashoffset="0" strokeLinecap="round" />
                <circle cx="96" cy="96" r="80" fill="transparent" stroke="#3b82f6" strokeWidth="16" strokeDasharray="125 502" strokeDashoffset="-301" strokeLinecap="round" />
                <circle cx="96" cy="96" r="80" fill="transparent" stroke="#ef4444" strokeWidth="16" strokeDasharray="75 502" strokeDashoffset="-426" strokeLinecap="round" />
             </svg>
          </div>

          <div className="mt-8 space-y-3 w-full">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-gray-600">Auto-Complete</span>
              </div>
              <span className="text-xs font-bold text-gray-900">60%</span>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-gray-600">Documented</span>
              </div>
              <span className="text-xs font-bold text-gray-900">25%</span>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-gray-600">Deprecated</span>
              </div>
              <span className="text-xs font-bold text-gray-900">15%</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== 底部区块：重放任务与实时突发事件雷达 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 左侧：今日核心重放任务概况 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all duration-300"
        >
           <h2 className="text-xl font-bold flex items-center gap-3 mb-12 text-gray-900">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full shrink-0" />
            今日重放任务统计
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-12">
            
            {/* 同样手写轻量 SVG 圆环 */}
            <div className="relative w-40 h-40 shrink-0">
               <div className="absolute inset-0 flex flex-col items-center justify-center mb-1">
                  <span className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-bold">Task Count</span>
                  <span className="text-3xl font-black text-gray-900">286</span>
              </div>
              <svg className="w-full h-full transform -rotate-90">
                {/* 底部灰色展示轨道：提供进度条底座，视觉上作为 100% 的基准线 */}
                <circle cx="80" cy="80" r="72" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                
                {/* 
                  环形逻辑计算 (周长 C ≈ 452, 总数 286):
                  使用 strokeDasharray 配合 strokeDashoffset 实现段落衔接，保持视觉上的顺滑感。
                */}
                {/* 成功状态 (绿色, 215/286 ≈ 75%): length = 340。作为第一段，不设 offset 确保起始点在顶部正中。 */}
                <circle cx="80" cy="80" r="72" fill="transparent" stroke="#10b981" strokeWidth="12" strokeDasharray="340 452" strokeDashoffset="0" strokeLinecap="round" />
                
                {/* 失败状态 (红色, 28/286 ≈ 10%): length = 44。offset 设为前一段的长度负值 (-340) 以实现接力渲染。 */}
                <circle cx="80" cy="80" r="72" fill="transparent" stroke="#ef4444" strokeWidth="12" strokeDasharray="44 452" strokeDashoffset="-340" strokeLinecap="round" />
                
                {/* 进行中状态 (蓝色, 43/286 ≈ 15%): length = 68。offset 设为前两段之和的负值 (-384) 填补剩余数据空间。 */}
                <circle cx="80" cy="80" r="72" fill="transparent" stroke="#3b82f6" strokeWidth="12" strokeDasharray="68 452" strokeDashoffset="-384" strokeLinecap="round" />
              </svg>
            </div>

            <div className="flex-1 w-full space-y-4">
              {/* Why: 高度重合规律的进度汇总块，借助 Array.map 批量产出，降低视觉代码重复量 */}
              {[
                { label: '成功', value: 215, color: 'text-gray-900', bg: 'bg-gray-50', bar: 'bg-green-500' },
                { label: '失败', value: 28, color: 'text-gray-900', bg: 'bg-gray-50', bar: 'bg-red-500' },
                { label: '进行中', value: 43, color: 'text-gray-900', bg: 'bg-gray-50', bar: 'bg-blue-500' }
              ].map((item: any) => (
                <motion.div 
                  key={item.label} 
                  whileHover={{ x: 8, backgroundColor: 'rgba(255, 255, 255, 1)' }}
                  className={`${item.bg} rounded-2xl p-4 flex justify-between items-center border border-gray-100 h-16 group transition-all cursor-pointer hover:shadow-md`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1 h-8 rounded-full ${item.bar} group-hover:h-10 transition-all`} />
                    <span className="text-gray-600 font-medium text-sm">{item.label}</span>
                  </div>
                  <span className={`text-2xl font-black ${item.color}`}>{item.value}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 右侧：实时告警列表 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold flex items-center gap-3 text-gray-900">
              <span className="w-1.5 h-6 bg-red-500 rounded-full shrink-0" />
              实时告警事件
            </h2>
            <button className="text-blue-600 text-[12px] font-bold flex items-center hover:bg-blue-50 px-4 py-2 rounded-lg transition-all">
              查看全部
            </button>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[320px] pr-2 custom-scrollbar">
            {/* 高风险事件区：大量采用红色系营造强烈视觉警告 */}
            <motion.div 
              whileHover={{ x: 5, backgroundColor: 'rgba(254, 242, 242, 0.8)' }}
              className="bg-red-50 group border-l-4 border-l-red-500 p-4 rounded-r-xl rounded-l-md flex items-start gap-4 transition-all cursor-pointer"
            >
              <div className="p-2.5 bg-red-100 rounded-lg text-red-500 group-hover:scale-110 transition-transform">
                <ShieldAlert size={18} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-gray-900">ALM001 重放任务连续失败</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold border border-red-200">高风险</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">2分钟前</span>
                  </div>
                </div>
                <p className="text-[12px] text-gray-500 leading-relaxed mt-1">检测到重放任务连续 5 次执行异常，请立即检查环境状态。</p>
              </div>
            </motion.div>

            {/* 警告事件区 */}
            <motion.div 
              whileHover={{ x: 5, backgroundColor: 'rgba(254, 242, 242, 0.8)' }}
              className="bg-red-50 group border-l-4 border-l-red-500 p-4 rounded-r-xl rounded-l-md flex items-start gap-4 transition-all cursor-pointer"
            >
              <div className="p-2.5 bg-red-100 rounded-lg text-red-500 group-hover:scale-110 transition-transform">
                 <Zap size={18} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-gray-900">ALM002 去重队列堆积</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold border border-red-200">高风险</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">15分钟前</span>
                  </div>
                </div>
                <p className="text-[12px] text-gray-500 leading-relaxed mt-1">当前去重队列积压超过 10,000 条，处理性能下降。</p>
              </div>
            </motion.div>

            {/* 一般性事件区 */}
            <motion.div 
              whileHover={{ x: 5, backgroundColor: 'rgba(243, 244, 246, 0.8)' }}
              className="bg-gray-50 group border-l-4 border-l-gray-300 p-4 rounded-r-xl rounded-l-md flex items-start gap-4 transition-all cursor-pointer"
            >
              <div className="p-2.5 bg-gray-200 rounded-lg text-gray-500 group-hover:bg-gray-300 transition-colors">
                 <Shield size={18} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-gray-900">ALM005 接口自动标记废弃</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold border border-gray-300">中级</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">1小时前</span>
                  </div>
                </div>
                <p className="text-[12px] text-gray-500 leading-relaxed mt-1">系统根据流量分析自动将 3 个未活跃接口标记为“废弃”。</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
