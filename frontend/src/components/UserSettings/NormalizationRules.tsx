import { useState } from "react"
import { FiPlus, FiTrash2, FiEdit2, FiInfo, FiFilter } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Rule {
  id: string
  name: string
  pattern: string
  replacement: string
  isBuiltIn?: boolean
}

const initialRules: Rule[] = [
  { id: "1", name: "UUID 识别", pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", replacement: "{uuid}", isBuiltIn: true },
  { id: "2", name: "数字 ID 识别", pattern: "^[0-9]+$", replacement: "{id}", isBuiltIn: true },
  { id: "3", name: "MongoID 识别", pattern: "^[0-9a-f]{24}$", replacement: "{mongoid}", isBuiltIn: true },
]

export default function NormalizationRules() {
  // 初始化规则列表状态，包含默认的系统内置规则
  const [rules, setRules] = useState<Rule[]>(initialRules)
  // 控制“新增规则”输入框的显示状态
  const [isAdding, setIsAdding] = useState(false)
  // 存储新规则表单的状态数据
  const [newRule, setNewRule] = useState({ name: "", pattern: "", replacement: "" })

  // 处理新增规则的保存逻辑
  const handleAddRule = () => {
    // 只有在填入名称和正则模式时才允许保存
    if (newRule.name && newRule.pattern) {
      // 将新规则添加至现有列表，并生成临时 ID
      setRules([...rules, { ...newRule, id: Date.now().toString() }])
      // 重置表单并关闭新增状态
      setNewRule({ name: "", pattern: "", replacement: "" })
      setIsAdding(false)
    }
  }

  // 根据 ID 从规则列表中删除指定项
  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id))
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Introduction Card */}
      <Card className="bg-blue-50/50 border-blue-100 overflow-hidden relative shadow-sm">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <FiFilter className="text-8xl text-blue-600" />
        </div>
        <CardContent className="p-6 flex gap-4">
          <div className="mt-1">
            <FiInfo className="text-xl text-blue-600" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-black text-gray-900">关于归一化规则</h3>
            <p className="text-sm text-gray-500 leading-relaxed font-medium">
              路径归一化规则用于将动态 URL（如 `/api/users/123`）转换为统一格式（如 `/api/users/{"{id}"}`）。 
              这有助于系统准确聚合流量统计数据并识别重复的接口定义。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 tracking-tight">
            当前规则
            <Badge variant="outline" className="text-[10px] uppercase font-black border-gray-200 text-gray-400 tracking-widest">
              {rules.length} 条记录
            </Badge>
          </h3>
          <Button 
            onClick={() => setIsAdding(true)}
            size="sm" 
            className="rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/10 gap-2 font-bold px-5"
          >
            <FiPlus className="h-4 w-4" />
            新增规则
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {isAdding && (
            <Card className="border-2 border-blue-600/30 bg-white animate-in zoom-in-95 duration-200 shadow-xl shadow-blue-600/5">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">规则名称</label>
                    <Input 
                      placeholder="例如: 手机号掩码" 
                      value={newRule.name} 
                      onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                      className="bg-gray-50 border-transparent focus:border-blue-200 focus:bg-white rounded-xl h-11"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">正则模式 (RegEx)</label>
                    <Input 
                      placeholder="^1[3-9]\d{9}$" 
                      value={newRule.pattern} 
                      onChange={(e) => setNewRule({...newRule, pattern: e.target.value})}
                      className="bg-gray-50 border-transparent focus:border-blue-200 focus:bg-white font-mono text-sm rounded-xl h-11"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">替换为</label>
                    <Input 
                      placeholder="{phone}" 
                      value={newRule.replacement} 
                      onChange={(e) => setNewRule({...newRule, replacement: e.target.value})}
                      className="bg-gray-50 border-transparent focus:border-blue-200 focus:bg-white rounded-xl h-11"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-50">
                  <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="text-gray-500 font-bold hover:bg-gray-100 rounded-full px-5">
                    取消
                  </Button>
                  <Button size="sm" onClick={handleAddRule} className="bg-blue-600 text-white hover:bg-blue-700 rounded-full px-8 font-black shadow-lg shadow-blue-600/20">
                    保存规则
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {rules.map((rule) => (
            <Card 
              key={rule.id} 
              className={`
                group transition-all duration-300 border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-50
                ${rule.isBuiltIn ? "bg-gray-50/60" : "bg-white"}
              `}
            >
              <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-gray-900 truncate tracking-tight">{rule.name}</span>
                    {rule.isBuiltIn && (
                      <Badge className="bg-blue-50 text-blue-600 border-none text-[9px] font-black uppercase tracking-widest h-5 rounded-md px-2">系统内置</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono bg-gray-100/50 py-1.5 px-3 rounded-xl w-fit border border-gray-200/50">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">匹配模式:</span>
                    <span className="text-blue-600 font-bold truncate max-w-[200px] md:max-w-md">{rule.pattern}</span>
                  </div>
                </div>

                <div className="flex items-center gap-8 w-full md:w-auto">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest opacity-60">替换结果</span>
                    <Badge className="bg-green-50 text-green-600 border-none font-black px-3 py-1 rounded-lg">
                      {rule.replacement}
                    </Badge>
                  </div>

                  {!rule.isBuiltIn && (
                    <div className="flex items-center gap-2 shadow-sm rounded-full bg-gray-50/50 p-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                        <FiEdit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteRule(rule.id)}
                        className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
