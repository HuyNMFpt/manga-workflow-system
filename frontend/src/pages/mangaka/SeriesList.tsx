import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { seriesService } from "@/services/seriesService"
import PageHeader from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import { Series, SeriesStatus } from "@/types"
import { GENRE_OPTIONS } from "@/lib/constants"
import { Plus, BookOpen, ChevronRight, X } from "lucide-react"

const STATUS_FILTERS: { label: string; value: SeriesStatus | "all" }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Nháp", value: "draft" },
  { label: "Chờ duyệt", value: "pending_review" },
  { label: "Đang đăng", value: "serializing" },
  { label: "Đã huỷ", value: "cancelled" },
]

function CreateSeriesModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: "", genre: "Action", synopsis: "" })
  const [cover, setCover] = useState<File | null>(null)
  const [error, setError] = useState("")

  const mutation = useMutation({
    mutationFn: (data: FormData) => seriesService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["series"] }); onClose() },
    onError: () => setError("Tạo series thất bại. Vui lòng thử lại."),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.synopsis.length < 100) { setError("Tóm tắt cần ít nhất 100 ký tự."); return }
    const fd = new FormData()
    fd.append("title", form.title)
    fd.append("genre", form.genre)
    fd.append("synopsis", form.synopsis)
    if (cover) fd.append("cover", cover)
    mutation.mutate(fd)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-card rounded-xl border border-border shadow-lg">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-base">Tạo series mới</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tên series *</label>
            <input required placeholder="Ví dụ: Blade of the Fallen"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Thể loại *</label>
            <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} className="w-full">
              {GENRE_OPTIONS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Tóm tắt * <span className="text-muted-foreground font-normal">({form.synopsis.length}/100 ký tự tối thiểu)</span>
            </label>
            <textarea required rows={4} placeholder="Mô tả nội dung, bối cảnh và nhân vật chính..."
              value={form.synopsis} onChange={e => setForm(f => ({ ...f, synopsis: e.target.value }))} className="w-full resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Ảnh bìa</label>
            <input type="file" accept="image/png,image/jpeg" onChange={e => setCover(e.target.files?.[0] ?? null)} className="w-full text-sm" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-accent">Huỷ</button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {mutation.isPending ? "Đang tạo..." : "Tạo series"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SeriesCard({ series }: { series: Series }) {
  return (
    <Link to={`/mangaka/chapters?seriesId=${series.id}`}
      className="group flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all">
      <div className="w-12 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
        {series.coverUrl
          ? <img src={series.coverUrl} alt={series.title} className="w-full h-full object-cover" />
          : <BookOpen className="w-5 h-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm truncate">{series.title}</h3>
          <StatusBadge status={series.status} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{series.genre}</p>
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{series.synopsis}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5" />
    </Link>
  )
}

export default function SeriesList() {
  const [statusFilter, setStatusFilter] = useState<SeriesStatus | "all">("all")
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["series", statusFilter],
    queryFn: () => seriesService.getAll({ status: statusFilter === "all" ? undefined : statusFilter }),
  })

  const series = data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Series của tôi"
        description="Quản lý toàn bộ series đang sáng tác"
        action={
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="w-3.5 h-3.5" />Tạo series mới
          </button>
        }
      />

      <div className="flex gap-1 mb-5 border-b border-border">
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              statusFilter === f.value ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : series.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Chưa có series nào</p>
          <p className="text-xs mt-1">Bấm "Tạo series mới" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {series.map(s => <SeriesCard key={s.id} series={s} />)}
        </div>
      )}

      {showCreate && <CreateSeriesModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
