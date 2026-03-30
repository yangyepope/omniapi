import { FiAlertTriangle } from "react-icons/fi"
import DeleteConfirmation from "./DeleteConfirmation"

const DeleteAccount = () => {
  return (
    <div className="max-w-2xl rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex flex-col gap-2 mb-6">
        <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
          <FiAlertTriangle />
          危险区域：注销账户
        </h3>
        <p className="text-sm text-on-surface-variant">
          一旦注销，您的所有数据（API 密钥、个人配置等）将被永久删除且不可恢复。
        </p>
      </div>
      <DeleteConfirmation />
    </div>
  )
}

export default DeleteAccount
