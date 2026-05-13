import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { taskService } from "@/services/taskService"
import PageHeader from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import { TASK_TYPE_LABELS, TASK_TYPE_COLORS } from "@/lib/constants"
import { ListTodo, CheckCircle2, AlertCircle, Clock, ChevronRight, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export default function AssistantDashboard() {
  const { user } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối"

  const { data: allTasksData } = useQuery({
    queryKey: ["tasks", "my", "all"],
    queryFn: () => taskService.getMyTasks(),
    refetchInterval: 30_000,
  })

  const allTasks = allTasksData?.data ?? []
  const pending = allTasks.filter(t => ["assigned","in_progress"].includes(t.status))
  const needRevision = allTasks.filter(t => t.status === "revision_required")
  const approved = allTasks.filter(t => t.status === "approved")
  const overdue = allTasks.filter(t => new Date(t.deadline) < new Date() && t.status !== "approved")

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user?.name?.split(" ").at(-1) ?? "bạn"} 👋`}
        description="Đây là tổng quan công việc hôm nay"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Đang chờ làm", value: pending.length, icon: ListTodo, color: "bg-blue-50", ic: "text-blue-600" },
          { label: "Cần sửa lại", value: needRevision.length, icon: AlertCircle, color: needRevision.length > 0 ? "bg-orange-50" : "bg-secondary", ic: needRevision.length > 0 ? "text-orange-600" : "text-muted-foreground" },
          { label: "Quá hạn", value: overdue.length, icon: Clock, color: overdue.length > 0 ? "bg-red-50" : "bg-secondary", ic: overdue.length > 0 ? "text-red-600" : "text-muted-foreground" },
          { label: "Đã duyệt", value: approved.length, icon: CheckCircle2, color: "bg-green-50", ic: "text-green-600" },
        ].map(s => (
          <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium text-foreground/80">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.ic}`} />
            </div>
            <p className="text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Urgent tasks */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Việc cần làm ngay</h2>
            <Link to="/assistant/tasks" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Tất cả <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {[...needRevision, ...overdue, ...pending].length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-25" />
              <p className="text-xs">Không có việc urgent!</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {[...needRevision, ...pending].slice(0, 5).map(task => (
                <li key={task.id}>
                  <Link to="/assistant/tasks" className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", TASK_TYPE_COLORS[task.taskType])}>
                          {TASK_TYPE_LABELS[task.taskType]}
                        </span>
                        <StatusBadge status={task.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Trang {task.pageId}</p>
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86_400_000)} ngày
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Monthly earnings summary */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Thu nhập tháng này</h2>
            <Link to="/assistant/earnings" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Chi tiết <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4 space-y-4">
            <div className="rounded-lg bg-green-50 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-green-800 font-medium">Tổng thu nhập</p>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-semibold text-green-900">—</p>
              <p className="text-xs text-green-700 mt-0.5">Chờ backend kết nối</p>
            </div>
            <div className="space-y-2">
              {[
                { label: "Trang đã duyệt", value: approved.length, unit: "trang" },
                { label: "Đang chờ thanh toán", value: "—", unit: "" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium">{r.value} {r.unit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
