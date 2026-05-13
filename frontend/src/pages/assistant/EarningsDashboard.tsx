import { useQuery } from "@tanstack/react-query"
import { taskService } from "@/services/taskService"
import PageHeader from "@/components/shared/PageHeader"
import { TASK_TYPE_LABELS } from "@/lib/constants"
import { TrendingUp, DollarSign, FileCheck, Clock } from "lucide-react"

const RATE_PER_TYPE: Record<string, number> = {
  background: 150_000,
  inking: 100_000,
  toning: 80_000,
  effects: 120_000,
  text_cleanup: 60_000,
}

export default function EarningsDashboard() {
  const { data } = useQuery({
    queryKey: ["tasks", "my", "approved"],
    queryFn: () => taskService.getMyTasks({ status: "approved" }),
  })

  const approved = data?.data ?? []

  // Group by task type
  const byType = approved.reduce((acc, t) => {
    acc[t.taskType] = (acc[t.taskType] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalEarnings = Object.entries(byType).reduce((sum, [type, count]) => {
    return sum + (RATE_PER_TYPE[type] ?? 0) * count
  }, 0)

  const formatVND = (n: number) => n.toLocaleString("vi-VN") + " đ"

  return (
    <div>
      <PageHeader title="Thu nhập" description="Thống kê số trang đã duyệt và thu nhập theo tháng" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Tổng thu nhập tháng này", value: formatVND(totalEarnings), icon: DollarSign, color: "bg-green-50 text-green-800" },
          { label: "Trang đã duyệt", value: `${approved.length} trang`, icon: FileCheck, color: "bg-blue-50 text-blue-800" },
          { label: "Trạng thái thanh toán", value: "Chờ xử lý", icon: Clock, color: "bg-yellow-50 text-yellow-800" },
        ].map(card => (
          <div key={card.label} className={`rounded-lg p-4 ${card.color}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium opacity-80">{card.label}</p>
              <card.icon className="w-4 h-4 opacity-60" />
            </div>
            <p className="text-xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Breakdown by type */}
      <div className="rounded-lg border border-border bg-card overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium">Chi tiết theo loại việc</h2>
        </div>
        {Object.keys(byType).length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-25" />
            <p className="text-xs">Chưa có trang nào được duyệt tháng này</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Loại việc</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Số trang</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Đơn giá</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(byType).map(([type, count]) => (
                <tr key={type}>
                  <td className="px-4 py-3 font-medium">{TASK_TYPE_LABELS[type as keyof typeof TASK_TYPE_LABELS] ?? type}</td>
                  <td className="px-4 py-3 text-right">{count}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatVND(RATE_PER_TYPE[type] ?? 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatVND((RATE_PER_TYPE[type] ?? 0) * count)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/40">
                <td colSpan={3} className="px-4 py-3 font-semibold text-sm">Tổng cộng</td>
                <td className="px-4 py-3 text-right font-bold text-green-700">{formatVND(totalEarnings)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Rate table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium">Bảng đơn giá hiện tại</h2>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {Object.entries(RATE_PER_TYPE).map(([type, rate]) => (
              <tr key={type} className="hover:bg-muted/30">
                <td className="px-4 py-2.5">{TASK_TYPE_LABELS[type as keyof typeof TASK_TYPE_LABELS] ?? type}</td>
                <td className="px-4 py-2.5 text-right font-medium text-muted-foreground">{formatVND(rate)} / trang</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
