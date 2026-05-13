import { useQuery } from "@tanstack/react-query"
import { seriesService } from "@/services/seriesService"
import PageHeader from "@/components/shared/PageHeader"
import { Activity, Clock, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

function ProgressBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  )
}

export default function StudioProgress() {
  const { data, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["series", "progress"],
    queryFn: () => seriesService.getAll({ status: "serializing" }),
    refetchInterval: 60_000,
  })

  const series = data?.data ?? []
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("vi-VN") : "—"

  return (
    <div>
      <PageHeader
        title="Tiến độ Studio"
        description="Theo dõi real-time tiến độ hoàn thiện của từng series"
        action={
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-3 py-1.5 hover:bg-accent disabled:opacity-50">
            <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
            Cập nhật
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-5 text-xs text-muted-foreground">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Cập nhật tự động mỗi 60 giây · Lần cuối: {lastUpdated}
      </div>

      {series.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium">Không có series nào đang sản xuất</p>
        </div>
      ) : (
        <div className="space-y-4">
          {series.map(s => {
            // Mock progress data — sẽ đến từ API thật
            const totalPages = 20
            const done = 14
            const inProgress = 4
            const overdue = 1
            const daysLeft = 5
            const isLate = daysLeft <= 2

            return (
              <div key={s.id} className={cn("rounded-lg border bg-card overflow-hidden", isLate && "border-orange-200")}>
                <div className={cn("px-4 py-3 border-b flex items-center justify-between", isLate ? "bg-orange-50 border-orange-200" : "bg-muted/30 border-border")}>
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.genre}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {isLate
                      ? <><AlertTriangle className="w-3.5 h-3.5 text-orange-600" /><span className="text-orange-700 font-medium">Sắp deadline</span></>
                      : <><Clock className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">{daysLeft} ngày</span></>
                    }
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Tổng tiến độ</span>
                      <span className="text-xs font-medium">{done}/{totalPages} trang</span>
                    </div>
                    <ProgressBar value={done} max={totalPages} color={done/totalPages >= 0.8 ? "bg-green-500" : "bg-primary"} />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Đã hoàn thành", value: done, icon: CheckCircle2, color: "text-green-600" },
                      { label: "Đang làm", value: inProgress, icon: Activity, color: "text-blue-600" },
                      { label: "Quá hạn", value: overdue, icon: AlertTriangle, color: overdue > 0 ? "text-red-600" : "text-muted-foreground" },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-md bg-muted/50 p-3 text-center">
                        <stat.icon className={cn("w-4 h-4 mx-auto mb-1", stat.color)} />
                        <p className="text-base font-semibold">{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {overdue > 0 && (
                    <button className="w-full text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-md py-2 hover:bg-orange-100 transition-colors">
                      Gửi nhắc nhở cho {overdue} task quá hạn
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
