import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { seriesService } from "@/services/seriesService"
import PageHeader from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import { FileText, Activity, AlertTriangle, CheckCircle2, ChevronRight, Clock } from "lucide-react"

export default function EditorDashboard() {
  const { user } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối"

  const { data: seriesData } = useQuery({
    queryKey: ["series", "editor"],
    queryFn: () => seriesService.getAll(),
  })

  const allSeries = seriesData?.data ?? []
  const inReview = allSeries.filter(s => s.status === "in_review")
  const serializing = allSeries.filter(s => s.status === "serializing")
  const atRisk = allSeries.filter(s => s.status === "on_hold")

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user?.name?.split(" ").at(-1) ?? "bạn"} 👋`}
        description="Tổng quan bản thảo và tiến độ studio"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Đang xét duyệt", value: inReview.length, icon: FileText, cls: "bg-blue-50 text-blue-800" },
          { label: "Đang serializing", value: serializing.length, icon: CheckCircle2, cls: "bg-green-50 text-green-800" },
          { label: "Series nguy hiểm", value: atRisk.length, icon: AlertTriangle, cls: atRisk.length > 0 ? "bg-red-50 text-red-800" : "bg-secondary" },
          { label: "Deadline tuần này", value: "—", icon: Clock, cls: "bg-secondary" },
        ].map(s => (
          <div key={s.label} className={`rounded-lg p-4 ${s.cls}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium opacity-80">{s.label}</p>
              <s.icon className="w-4 h-4 opacity-60" />
            </div>
            <p className="text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Bản thảo cần xét duyệt</h2>
            <Link to="/editor/manuscripts" className="text-xs text-primary hover:underline flex items-center gap-0.5">Xem tất cả <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {inReview.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-25" />
              <p className="text-xs">Không có bản thảo nào chờ duyệt</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {inReview.slice(0, 4).map(s => (
                <li key={s.id}>
                  <Link to="/editor/manuscripts" className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.genre}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Tiến độ studio (real-time)</h2>
            <Link to="/editor/progress" className="text-xs text-primary hover:underline flex items-center gap-0.5">Xem chi tiết <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="p-8 text-center text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-25" />
            <p className="text-xs">Kết nối WebSocket ở Sprint 3</p>
          </div>
        </div>
      </div>
    </div>
  )
}
