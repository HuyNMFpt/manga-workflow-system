import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { seriesService } from "@/services/seriesService"
import { taskService } from "@/services/taskService"
import PageHeader from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import { BookOpen, Layers, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus, ChevronRight, Clock } from "lucide-react"

function StatCard({ label, value, sub, icon: Icon, color = "default" }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color?: "default"|"warning"|"success"|"danger"
}) {
  const bg = { default:"bg-secondary", warning:"bg-yellow-50", success:"bg-green-50", danger:"bg-red-50" }[color]
  const ic = { default:"text-muted-foreground", warning:"text-yellow-600", success:"text-green-600", danger:"text-red-600" }[color]
  return (
    <div className={`rounded-lg p-4 ${bg}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-foreground/80">{label}</p>
        <Icon className={`w-4 h-4 ${ic}`} />
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function RankTrend({ trend }: { trend: "up"|"down"|"stable" }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-600" />
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />
}

export default function MangakaDashboard() {
  const { user } = useAuthStore()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối"

  const { data: seriesData } = useQuery({
    queryKey: ["series", "all"],
    queryFn: () => seriesService.getAll(),
  })
  const { data: taskData } = useQuery({
    queryKey: ["tasks", "my", "submitted"],
    queryFn: () => taskService.getMyTasks({ status: "submitted" }),
  })
  const { data: rankingData } = useQuery({
    queryKey: ["rankings"],
    queryFn: () => seriesService.getRankings(),
  })

  const allSeries = seriesData?.data ?? []
  const activeSeries = allSeries.filter(s => s.status === "serializing")
  const pendingReviews = taskData?.data ?? []
  const atRiskSeries = (rankingData ?? []).filter(r => r.isAtRisk)

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user?.name?.split(" ").at(-1) ?? "bạn"} 👋`}
        description="Đây là tổng quan hôm nay của bạn"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Series đang đăng" value={activeSeries.length} sub={`/ ${allSeries.length} tổng`} icon={BookOpen} />
        <StatCard label="Chờ duyệt trang" value={pendingReviews.length} sub="từ trợ lý" icon={Layers} color={pendingReviews.length > 0 ? "warning" : "default"} />
        <StatCard label="Series nguy hiểm" value={atRiskSeries.length} sub="có nguy cơ bị huỷ" icon={AlertTriangle} color={atRiskSeries.length > 0 ? "danger" : "success"} />
        <StatCard label="Trang đã duyệt" value="—" sub="tháng này" icon={CheckCircle2} color="success" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Series đang hoạt động</h2>
            <Link to="/mangaka/series" className="text-xs text-primary hover:underline flex items-center gap-0.5">Xem tất cả <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {activeSeries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-25" />
              <p className="text-xs">Chưa có series đang đăng</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {activeSeries.slice(0, 4).map(s => (
                <li key={s.id}>
                  <Link to={`/mangaka/chapters?seriesId=${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors">
                    <div className="w-8 h-10 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
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
            <h2 className="text-sm font-medium">Trang chờ duyệt</h2>
            <Link to="/mangaka/chapters" className="text-xs text-primary hover:underline flex items-center gap-0.5">Xem tất cả <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {pendingReviews.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-25" />
              <p className="text-xs">Không có trang nào chờ duyệt</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pendingReviews.slice(0, 4).map(task => (
                <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-10 rounded bg-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Chapter {task.chapterId} · Trang {task.pageId}</p>
                    <p className="text-xs text-muted-foreground capitalize">{task.taskType}</p>
                  </div>
                  <StatusBadge status={task.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden md:col-span-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium">Bảng xếp hạng — kỳ gần nhất</h2>
            <Link to="/mangaka/ranking" className="text-xs text-primary hover:underline flex items-center gap-0.5">Xem chi tiết <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {!rankingData || rankingData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-25" />
              <p className="text-xs">Chưa có dữ liệu xếp hạng</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground w-12">Hạng</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Series</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Votes</th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground w-16">Xu hướng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rankingData.slice(0, 5).map(r => (
                  <tr key={r.seriesId} className={r.isAtRisk ? "bg-red-50/60" : ""}>
                    <td className="px-4 py-2.5 text-sm font-semibold text-muted-foreground">#{r.rank}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.seriesTitle}</span>
                        {r.isAtRisk && <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 rounded-full px-1.5 py-0.5">Nguy hiểm</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">{r.currentVotes.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <RankTrend trend={r.trend} />
                        {r.previousRank && <span className="text-xs text-muted-foreground">#{r.previousRank}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
