import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Series, SeriesStatus } from "@/types"
import { Plus, BookOpen, ChevronRight, Feather } from "lucide-react"
import CreateSeriesModal from "@/components/shared/CreateSeriesModal"
import SeriesDetailModal from "@/components/shared/SeriesDetailModal"
import api from "@/lib/axios"

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "Tất cả",    value: "all"        },
  { label: "Nháp",      value: "draft"      },
  { label: "Chờ duyệt", value: "submitted"  },  // ✅ Backend: submitted
  { label: "Đang đăng", value: "publishing" },  // ✅ Backend: publishing
  { label: "Tạm ngưng", value: "on_hiatus"  },  // ✅ Backend: on_hiatus
  { label: "Đã huỷ",    value: "cancelled"  },
]

const STATUS_STYLE: Record<string, { dot: string; label: string; pill: string }> = {
  draft:       { dot: 'bg-zinc-500',    label: 'Nháp',        pill: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'           },
  submitted:   { dot: 'bg-amber-400',   label: 'Chờ duyệt',   pill: 'bg-amber-500/10 text-amber-300 border-amber-500/20'        },
  approved:    { dot: 'bg-emerald-400', label: 'Được duyệt',  pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'  },
  publishing:  { dot: 'bg-violet-400',  label: 'Đang đăng',   pill: 'bg-violet-500/10 text-violet-300 border-violet-500/20'     },
  on_hiatus:   { dot: 'bg-orange-400',  label: 'Tạm ngưng',   pill: 'bg-orange-500/10 text-orange-300 border-orange-500/20'     },
  cancelled:   { dot: 'bg-red-500',     label: 'Đã huỷ',      pill: 'bg-red-500/10 text-red-300 border-red-500/20'              },
}


function SeriesCard({ series, onClick }: { series: Series; onClick: () => void }) {
  const st = STATUS_STYLE[series.status] ?? { dot: 'bg-zinc-500', label: series.status, pill: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' }
  return (
    <div onClick={onClick}
      className="group flex items-center gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors border-b border-white/4 last:border-0 cursor-pointer">
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
    </div>
  )
}

export default function SeriesList() {
  const [statusFilter,   setStatusFilter]   = useState("all")
  const [showCreate,     setShowCreate]     = useState(false)
  const [selectedSeries, setSelectedSeries] = useState<any | null>(null)

  // ✅ PAGINATED: /series/my — chỉ series của mangaka đang login
  const { data: allSeriesRaw = [], isLoading } = useQuery({
    queryKey: ["series", "my"],
    queryFn: async () => {
      const r = await api.get('/series/my')
      return r.data.data?.data ?? []
    },
  })

  // Filter client-side
  const series: any[] = statusFilter === "all"
    ? allSeriesRaw
    : allSeriesRaw.filter((s: any) => s.status === statusFilter)

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
        {STATUS_FILTERS.map(f => {
          const count = f.value === "all"
            ? allSeriesRaw.length
            : allSeriesRaw.filter((s: any) => s.status === f.value).length
          return (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                statusFilter === f.value
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
              }`}>
              {f.label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full ${
                  statusFilter === f.value ? 'bg-violet-500/30 text-violet-300' : 'bg-white/8 text-zinc-600'
                }`}>{count}</span>
              )}
            </button>
          )
        })}
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
            {series.map(s => <SeriesCard key={s.id} series={s} onClick={() => setSelectedSeries(s)} />)}
          </div>
        )}
      </div>

      {showCreate && <CreateSeriesModal onClose={() => setShowCreate(false)} />}
      {selectedSeries && (
        <SeriesDetailModal series={selectedSeries} onClose={() => setSelectedSeries(null)} />
      )}
      {selectedSeries && (
        <SeriesDetailModal
          series={selectedSeries}
          onClose={() => setSelectedSeries(null)}
        />
      )}
    </div>
  )
}
