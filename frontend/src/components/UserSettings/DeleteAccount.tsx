import { FiAlertTriangle } from "react-icons/fi"
import DeleteConfirmation from "./DeleteConfirmation"

const DeleteAccount = () => {
  return (
    <div className="max-w-2xl rounded-[2.5rem] border border-red-100 bg-red-50/30 p-10 shadow-sm transition-all hover:bg-red-50/50 hover:shadow-xl hover:border-red-200 duration-500 group animate-in fade-in slide-in-from-right-4">
      <div className="flex flex-col gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-[1.5rem] bg-red-100 text-red-600 shadow-md transition-transform group-hover:scale-110">
            <FiAlertTriangle className="text-3xl" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-red-600 tracking-tight">危险区域：注销账户</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 opacity-60">账户注销与数据清理</p>
          </div>
        </div>
        <p className="text-sm text-red-700/60 font-bold leading-relaxed max-w-lg">
          一旦执行，您的所有业务数据（包含 API 密钥、个人配置、归一化规则等）将被**永久性清除**且不可恢复。请务必确认您已备份所有必要数据。
        </p>
      </div>
      <div className="flex">
        <DeleteConfirmation />
      </div>
    </div>
  )
}

export default DeleteAccount
