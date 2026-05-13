import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { seriesService } from "@/services/seriesService"
import PageHeader from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import { Series } from "@/types"
import { FileText, BookOpen, ChevronRight, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

const TAG_COLORS: Record<string, string> = {
  story:    "bg-purple-50 text-purple-700 border-purple-200",
  dialogue: "bg-blue-50 text-blue-700 border-blue-200",
  art:      "bg-orange-50 text-orange-700 border-orange-200",
  pacing:   "bg-green-50 text-green-700 border-green-200",
}
const TAG_LABELS: Record<string, string> = {
  story: "Kịch bản", dialogue: "Thoại", art: "Nghệ thuật", pacing: "Nhịp độ"
}

function ManuscriptCard({ series }: { series: Series }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left"
      >
        <div className="w-10 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{series.title}</p>
            <StatusBadge status={series.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{series.genre}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{series.synopsis}</p>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform", expanded && "rotate-90")} />
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Page list placeholder */}
          <div className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">TRANG BẢN THẢO</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="aspect-[3/4] rounded-md bg-muted flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                  <span className="text-xs text-muted-foreground font-medium">{i}</span>
                </div>
              ))}
            </div>

            {/* Annotation tools placeholder */}
            <div className="rounded-md bg-muted/60 border border-dashed border-border p-4 text-center mb-4">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-xs text-muted-foreground">Canvas annotation (Fabric.js) — Sprint 2</p>
              <p className="text-xs text-muted-foreground mt-0.5">Circle · Arrow · Text · Highlight</p>
            </div>

            {/* Tag examples */}
            <p className="text-xs font-medium text-muted-foreground mb-2">LOẠI GHI CHÚ</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {Object.entries(TAG_LABELS).map(([k, v]) => (
                <span key={k} className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", TAG_COLORS[k])}>{v}</span>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button className="flex-1 py-2 text-sm rounded-md border border-border hover:bg-accent">Lưu nháp</button>
              <button className="flex-1 py-2 text-sm rounded-md bg-orange-500 text-white hover:bg-orange-600">Cần chỉnh sửa</button>
              <button className="flex-1 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Duyệt lên HĐ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ManuscriptReview() {
  const [statusFilter, setStatusFilter] = useState<string>("in_review")

  const { data, isLoading } = useQuery({
    queryKey: ["series", "editor", statusFilter],
    queryFn: () => seriesService.getAll({ status: statusFilter }),
  })

  const series = data?.data ?? []

  return (
    <div>
      <PageHeader title="Xét duyệt bản thảo" description="Đọc và ghi chú trực tiếp lên từng trang bản thảo" />

      <div className="flex gap-1 mb-5 border-b border-border">
        {[
          { label: "Đang xét", value: "in_review" },
          { label: "Chờ xét", value: "pending_review" },
          { label: "Đã duyệt", value: "approved_for_board" },
        ].map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className={cn("px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
              statusFilter === f.value ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : series.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium">Không có bản thảo nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {series.map(s => <ManuscriptCard key={s.id} series={s} />)}
        </div>
      )}
    </div>
  )
}
