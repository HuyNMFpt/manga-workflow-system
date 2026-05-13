import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { seriesService } from "@/services/seriesService"
import PageHeader from "@/components/shared/PageHeader"
import { TrendingUp, TrendingDown, Minus, Upload, AlertTriangle, BarChart2 } from "lucide-react"
import { cn } from "@/lib/utils"

function TrendIcon({ trend }: { trend: "up"|"down"|"stable" }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-600" />
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />
}

export default function RankingBoard() {
  const [showInput, setShowInput] = useState(false)
  const [csvText, setCsvText] = useState("")
  const [inputMode, setInputMode] = useState<"csv" | "manual">("csv")

  const { data, isLoading } = useQuery({
    queryKey: ["rankings"],
    queryFn: () => seriesService.getRankings(),
  })

  const rankings = data ?? []
  const atRisk = rankings.filter(r => r.isAtRisk)

  const handleCSVParse = () => {
    const lines = csvText.trim().split("\n")
    let count = 0
    for (const line of lines) {
      const [id, votes] = line.split(",").map(s => s.trim())
      if (id && votes && !isNaN(parseInt(votes))) count++
    }
    alert(`Đã parse ${count} dòng hợp lệ. Xác nhận để cập nhật.`)
  }

  return (
    <div>
      <PageHeader
        title="Bảng xếp hạng"
        description="Xếp hạng tổng hợp sau mỗi kỳ phát hành"
        action={
          <button onClick={() => setShowInput(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
            <Upload className="w-3.5 h-3.5" />Nhập dữ liệu vote
          </button>
        }
      />

      {/* At risk alert */}
      {atRisk.length > 0 && (
        <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{atRisk.length} series trong vùng nguy hiểm</p>
            <p className="text-xs text-red-700 mt-0.5">
              {atRisk.map(r => r.seriesTitle).join(", ")} — Xếp hạng thấp liên tiếp 3 kỳ
            </p>
          </div>
        </div>
      )}

      {/* Input panel */}
      {showInput && (
        <div className="mb-5 rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex gap-2 border-b border-border pb-3">
            {(["csv","manual"] as const).map(m => (
              <button key={m} onClick={() => setInputMode(m)}
                className={cn("text-sm px-3 py-1.5 rounded-md transition-colors",
                  inputMode === m ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent")}>
                {m === "csv" ? "Upload CSV" : "Nhập thủ công"}
              </button>
            ))}
          </div>
          {inputMode === "csv" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Format: <code className="bg-muted px-1 rounded">seriesId,votes</code> mỗi dòng</p>
              <textarea rows={5} value={csvText} onChange={e => setCsvText(e.target.value)}
                placeholder={"series-001,1420\nseries-002,987\nseries-003,654"}
                className="w-full font-mono text-sm resize-none" />
              <div className="flex gap-2">
                <button onClick={handleCSVParse} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Parse & Preview</button>
                <button onClick={() => setShowInput(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-accent">Huỷ</button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">Nhập thủ công — Sprint 3</div>
          )}
        </div>
      )}

      {/* Rankings table */}
      {isLoading ? (
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
      ) : rankings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium">Chưa có dữ liệu xếp hạng</p>
          <p className="text-xs mt-1">Nhập dữ liệu vote từ độc giả để bắt đầu</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-14">Hạng</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Series</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Votes</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground w-20">Xu hướng</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground w-24">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rankings.map((r, i) => (
                <tr key={r.seriesId} className={cn(r.isAtRisk && "bg-red-50/50")}>
                  <td className="px-4 py-3">
                    <span className={cn("text-sm font-bold",
                      i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-muted-foreground")}>
                      #{r.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.seriesTitle}</span>
                      {r.isAtRisk && (
                        <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />Nguy hiểm
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{r.currentVotes.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <TrendIcon trend={r.trend} />
                      {r.previousRank && <span className="text-xs text-muted-foreground">#{r.previousRank}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.isAtRisk
                      ? <span className="text-xs text-red-700 font-medium">Cảnh báo</span>
                      : <span className="text-xs text-green-700">Bình thường</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
