// 扫描成本页曾私有的格式化工具已上收到全站单一真相源 `@/lib/format`。
// 这里仅 re-export,保持成本页三个分区的既有 import 不变,同时消除双轨实现。
// 时间函数(fmtDateTime 等)现按北京时区 + 正确处理 scanner 无时区串,见 lib/format.ts。
export {
  fmtDate,
  fmtDateTime,
  fmtDuration,
  fmtNum,
  fmtRelative,
} from "@/lib/format"
