import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { seriesService } from "@/services/seriesService"
import PageHeader from "@/components/shared/PageHeader"
import { Series } from "@/types"
import { BookOpen, ChevronRight, Check, RefreshCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { PUBLICATION_SCHEDULE_LABELS } from "@/lib/constants"

type VoteChoice = "approve" | "reject" | "needs_revision"

function VoteCard({ series }: { series: Series }) {
  const [expanded, setExpanded] = useState(false)
  const [vote, setVote] = useState<VoteChoice | null>(null)
  const [schedule, setSchedule] = useState("weekly")
  const [justification, setJustification] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleVote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vote) return
    // TODO: gọi API khi backend sẵn sàng
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">{series.title}</p>
          <p className="text-xs text-green-700">
            Đã bỏ phiếu: {vote === "approve" ? "Duyệt" : vote === "reject" ? "Từ chối" : "Cần sửa"} — Đang chờ các thành viên khác
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left">
        <div className="w-10 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{series.title}</p>
          <p className="text-xs text-muted-foreground">{series.genre}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{series.synopsis}</p>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform", expanded && "rotate-90")} />
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">TÓM TẮT NỘI DUNG</p>
            <p className="text-sm text-muted-foreground">{series.synopsis}</p>
          </div>

          {/* Sample pages placeholder */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">TRANG MẪU</p>
            <div className="grid grid-cols-4 gap-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="aspect-[3/4] rounded bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">{i}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleVote} className="space-y-4 border-t border-border pt-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">QUYẾT ĐỊNH</p>
              <div className="flex gap-2">
                {([
                  { v: "approve" as VoteChoice, label: "Duyệt", cls: "border-green-300 bg-green-50 text-green-700 hover:bg-green-100", sel: "border-green-500 bg-green-100 ring-2 ring-green-200" },
                  { v: "needs_revision" as VoteChoice, label: "Cần sửa", cls: "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100", sel: "border-orange-500 bg-orange-100 ring-2 ring-orange-200" },
                  { v: "reject" as VoteChoice, label: "Từ chối", cls: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100", sel: "border-red-500 bg-red-100 ring-2 ring-red-200" },
                ]).map(opt => (
                  <button key={opt.v} type="button" onClick={() => setVote(opt.v)}
                    className={cn("flex-1 py-2 text-sm font-medium rounded-md border transition-all", vote === opt.v ? opt.sel : opt.cls)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {vote === "approve" && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">HÌNH THỨC XUẤT BẢN</p>
                <select value={schedule} onChange={e => setSchedule(e.target.value)} className="w-full text-sm">
                  {Object.entries(PUBLICATION_SCHEDULE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                LÝ DO * <span className="font-normal">(tối thiểu 100 ký tự — {justification.length}/100)</span>
              </label>
              <textarea rows={3} required value={justification} onChange={e => setJustification(e.target.value)}
                placeholder="Nhận xét và lý do quyết định của bạn..."
                className="w-full resize-none text-sm" />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setExpanded(false)} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent">Đóng</button>
              <button type="submit" disabled={!vote || justification.length < 100}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-40">
                Gửi phiếu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default function VotingQueue() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["series", "voting"],
    queryFn: () => seriesService.getAll({ status: "pending_review" }),
  })
  const series = data?.data ?? []

  return (
    <div>
      <PageHeader title="Hàng chờ bình duyệt" description="Bỏ phiếu thông qua series mới và xác định lịch xuất bản"
        action={
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs border border-border rounded-md px-3 py-1.5 hover:bg-accent text-muted-foreground">
            <RefreshCcw className="w-3 h-3" />Cập nhật
          </button>
        }
      />
      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : series.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Check className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium">Không có series nào chờ bình duyệt</p>
        </div>
      ) : (
        <div className="space-y-3">
          {series.map(s => <VoteCard key={s.id} series={s} />)}
        </div>
      )}
    </div>
  )
}
