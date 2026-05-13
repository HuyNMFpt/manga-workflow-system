import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { seriesService } from "@/services/seriesService"
import PageHeader from "@/components/shared/PageHeader"
import { Users, BarChart2, AlertTriangle, CheckCircle2, ChevronRight, TrendingDown } from "lucide-react"

export default function BoardDashboard() {
  const { data: rankData } = useQuery({
    queryKey: ["rankings"],
    queryFn: () => seriesService.getRankings(),
  })
  const { data: seriesData } = useQuery({
    queryKey: ["series", "board"],
    queryFn: () => seriesService.getAll(),
  })

  const rankings = rankData ?? []
  const atRisk = rankings.filter(r => r.isAtRisk)
  const pendingVote = (seriesData?.data ?? []).filter(s => s.status === "pending_review")

  return (
    <div>
      <PageHeader title="Editorial Board" description="Bình duyệt series và quản lý bảng xếp hạng" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Chờ bình duyệt", value: pendingVote.length, icon: Users, cls: pendingVote.length > 0 ? "bg-blue-50 text-blue-800" : "bg-secondary" },
          { label: "Tổng series active", value: rankings.length, icon: BarChart2, cls: "bg-secondary" },
          { label: "Series nguy hiểm", value: atRisk.length, icon: AlertTriangle, cls: atRisk.length > 0 ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800" },
          { label: "Quyết định tháng này", value: "—", icon: CheckCircle2, cls: "bg-secondary" },
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
            <h2 className="text-sm font-medium">Chờ bình duyệt</h2>
            <Link to="/board/voting" className="text-xs text-primary hover:underline flex items-center gap-0.5">Bỏ phiếu <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {pendingVote.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-25" />
              <p className="text-xs">Không có series nào chờ bình duyệt</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pendingVote.slice(0, 4).map(s => (
                <li key={s.id}>
                  <Link to="/board/voting" className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.genre}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">Chờ vote</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Series nguy hiểm</h2>
            <Link to="/board/decisions" className="text-xs text-primary hover:underline flex items-center gap-0.5">Quyết định <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {atRisk.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-25" />
              <p className="text-xs">Không có series nào trong vùng nguy hiểm</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {atRisk.slice(0, 4).map(r => (
                <li key={r.seriesId} className="flex items-center gap-3 px-4 py-3">
                  <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.seriesTitle}</p>
                    <p className="text-xs text-muted-foreground">Hạng #{r.rank} · {r.currentVotes.toLocaleString()} votes</p>
                  </div>
                  <span className="text-xs bg-red-100 text-red-700 border border-red-200 rounded-full px-2 py-0.5">Nguy hiểm</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
