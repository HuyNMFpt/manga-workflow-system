import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { seriesService } from "@/services/seriesService"
import StatusBadge from "@/components/shared/StatusBadge"
import { Series, SeriesStatus } from "@/types"
import { GENRE_OPTIONS } from "@/lib/constants"
import { Plus, BookOpen, ChevronRight, X, Feather, Search } from "lucide-react"

const STATUS_FILTERS: { label: string; value: SeriesStatus | "all" }[] = [
  { label: "Tất cả",    value: "all"           },
  { label: "Nháp",      value: "draft"         },
  { label: "Chờ duyệt", value: "pending_review"},
  { label: "Đang đăng", value: "serializing"   },
  { label: "Đã huỷ",    value: "cancelled"     },
]

const STATUS_STYLE: Record<string, { dot: string; label: string; pill: string }> = {
  serializing:    { dot: 'bg-violet-400', label: 'Đang đăng', pill: 'bg-violet-500/10 text-violet-300 border-violet-500/20'  },
  draft:          { dot: 'bg-zinc-500',   label: 'Nháp',       pill: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'        },
  pending_review: { dot: 'bg-amber-400',  label: 'Chờ duyệt',  pill: 'bg-amber-500/10 text-amber-300 border-amber-500/20'    },
  approved:       { dot: 'bg-emerald-400',label: 'Được duyệt', pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'},
  cancelled:      { dot: 'bg-red-500',    label: 'Đã huỷ',     pill: 'bg-red-500/10 text-red-300 border-red-500/20'           },
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#111118] border border-violet-900/30 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Feather className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-bold text-white">Tạo series mới</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Tên series *</label>
            <input required placeholder="VD: Blade of the Fallen"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Thể loại *</label>
            <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all">
              {GENRE_OPTIONS.map(g => <option key={g} className="bg-[#111118]">{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Tóm tắt * <span className="text-zinc-700 normal-case tracking-normal">({form.synopsis.length}/100 ký tự tối thiểu)</span>
            </label>
            <textarea required rows={4} placeholder="Mô tả nội dung, bối cảnh và nhân vật chính..."
              value={form.synopsis} onChange={e => setForm(f => ({ ...f, synopsis: e.target.value }))}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none transition-all" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Ảnh bìa</label>
            <input type="file" accept="image/png,image/jpeg"
              onChange={e => setCover(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-violet-600/20 file:text-violet-300 file:text-xs file:font-medium hover:file:bg-violet-600/30 transition-all cursor-pointer" />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-white/8 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
              Huỷ
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-5 py-2 text-sm rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-600/30 disabled:opacity-50 transition-all">
              {mutation.isPending ? "Đang tạo..." : "Tạo series"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SeriesCard({ series }: { series: Series }) {
  const st = STATUS_STYLE[series.status] ?? { dot: 'bg-zinc-500', label: series.status, pill: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' }
  return (
    <Link to={`/mangaka/chapters?seriesId=${series.id}`}
      className="group flex items-center gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors border-b border-white/4 last:border-0">
      {/* Cover */}
      <div className="w-9 h-12 rounded-lg bg-gradient-to-br from-violet-900/50 to-fuchsia-900/20 border border-violet-500/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {series.coverUrl
          ? <img src={series.coverUrl} alt={series.title} className="w-full h-full object-cover" />
          : <Feather className="w-3.5 h-3.5 text-violet-400/40" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white group-hover:text-violet-300 truncate transition-colors">{series.title}</p>
        <p className="text-[11px] text-zinc-600 mt-0.5">{series.genre}</p>
        {series.synopsis && (
          <p className="text-[11px] text-zinc-700 mt-1 line-clamp-1">{series.synopsis}</p>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.pill}`}>
          {st.label}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-violet-400 transition-colors" />
      </div>
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
    <div className="min-h-full bg-[#0a0a12] text-white">

      {/* Page header */}
      <div className="relative border-b border-violet-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-72 h-72 rounded-full bg-violet-600/8 blur-3xl" />
        <div className="relative px-8 pt-8 pb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-violet-500 mb-2">Mangaka · Series</p>
            <h1 className="text-2xl font-black font-['Syne']">Series của tôi</h1>
            <p className="text-sm text-zinc-600 mt-1">Quản lý toàn bộ series đang sáng tác</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 hover:scale-[1.02] transition-all">
            <Plus className="w-4 h-4" />Tạo series mới
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-8 pt-5 pb-0 flex items-center gap-1">
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              statusFilter === f.value
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-8 py-6">
        {isLoading ? (
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-white/4 last:border-0">
                <div className="w-9 h-12 rounded-lg bg-white/5 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded-full w-40 animate-pulse" />
                  <div className="h-2 bg-white/5 rounded-full w-24 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : series.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-zinc-700">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/8 border border-violet-500/10 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-violet-500/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-500">Chưa có series nào</p>
              <p className="text-xs text-zinc-700 mt-1">Bấm "Tạo series mới" để bắt đầu hành trình</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            {series.map(s => <SeriesCard key={s.id} series={s} />)}
          </div>
        )}
      </div>

      {showCreate && <CreateSeriesModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
