import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { seriesService } from "@/services/seriesService"
import PageHeader from "@/components/shared/PageHeader"
import { AlertTriangle, XCircle, RotateCcw, Calendar, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Decision = "cancel" | "monthly" | "digital" | "probation"

const DECISION_OPTIONS: { value: Decision; label: string; desc: string; cls: string }[] = [
  { value: "cancel",    label: "Huỷ series",            desc: "Chấm dứt xuất bản hoàn toàn", cls: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100" },
  { value: "monthly",   label: "Đổi sang hàng tháng",  desc: "Giảm tần suất để cải thiện", cls: "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100" },
  { value: "digital",   label: "Chỉ đăng online",       desc: "Rút khỏi bản in, giữ digital", cls: "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100" },
  { value: "probation", label: "Thử thách 3 tháng",     desc: "Cho cơ hội cải thiện xếp hạng", cls: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100" },
]

export default function DecisionPanel() {
  const [selected, setSelected] = useState<string | null>(null)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [justification, setJustification] = useState("")
  const [submitted, setSubmitted] = useState<string[]>([])

  const { data } = useQuery({
    queryKey: ["rankings"],
    queryFn: () => seriesService.getRankings(),
  })

  const atRisk = (data ?? []).filter(r => r.isAtRisk)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !decision) return
    // TODO: POST to API
    setSubmitted(prev => [...prev, selected])
    setSelected(null)
    setDecision(null)
    setJustification("")
  }

  return (
    <div>
      <PageHeader title="Quyết định xuất bản" description="Xử lý series xếp hạng thấp liên tiếp (cần 60% đa số)" />

      {atRisk.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <XCircle className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium">Không có series nào cần xử lý</p>
          <p className="text-xs mt-1">Series sẽ xuất hiện ở đây khi xếp hạng thấp 3 kỳ liên tiếp</p>
        </div>
      ) : (
        <div className="space-y-4">
          {atRisk.map(r => {
            const isDone = submitted.includes(r.seriesId)
            const isActive = selected === r.seriesId

            if (isDone) {
              return (
                <div key={r.seriesId} className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
                  <RotateCcw className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{r.seriesTitle}</p>
                    <p className="text-xs text-green-700">Quyết định đã được ghi nhận — đang chờ đủ phiếu</p>
                  </div>
                </div>
              )
            }

            return (
              <div key={r.seriesId} className={cn("rounded-lg border bg-card overflow-hidden", isActive ? "border-primary/40" : "border-border")}>
                <div className="flex items-center gap-3 p-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.seriesTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Hạng #{r.rank} · {r.currentVotes.toLocaleString()} votes · Xếp hạng thấp liên tiếp 3 kỳ
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(isActive ? null : r.seriesId)}
                    className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all",
                      isActive ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent")}>
                    {isActive ? "Đóng" : "Xử lý"}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {isActive && (
                  <form onSubmit={handleSubmit} className="border-t border-border p-4 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">CHỌN QUYẾT ĐỊNH</p>
                      <div className="grid grid-cols-2 gap-2">
                        {DECISION_OPTIONS.map(opt => (
                          <button key={opt.value} type="button" onClick={() => setDecision(opt.value)}
                            className={cn("p-3 rounded-md border text-left transition-all",
                              decision === opt.value ? opt.cls + " ring-2 ring-offset-1 ring-current/30" : opt.cls)}>
                            <p className="text-sm font-medium">{opt.label}</p>
                            <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        LÝ DO * ({justification.length}/100)
                      </label>
                      <textarea rows={3} required value={justification} onChange={e => setJustification(e.target.value)}
                        placeholder="Lý do quyết định..." className="w-full resize-none text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Cần 60% thành viên hội đồng đồng ý để quyết định có hiệu lực</p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setSelected(null)} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent">Huỷ</button>
                      <button type="submit" disabled={!decision || justification.length < 100}
                        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-40">
                        Gửi phiếu quyết định
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
