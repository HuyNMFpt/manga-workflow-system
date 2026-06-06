import { useState } from 'react';
import { BookOpen, CheckSquare, TrendingUp, AlertTriangle, Plus, Upload, Layers, Trophy, ArrowUpRight, Feather, Sparkles } from 'lucide-react';
import CreateSeriesModal from '@/components/shared/CreateSeriesModal';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';

const MangakaDashboard = () => {
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);

  const { data: seriesData } = useQuery({
    queryKey: ['series', 'my'],
    // ✅ /series/my → PaginatedResponse { data: [...], total, page... }
    queryFn: async () => {
      const r = await api.get('/series/my');
      // Backend mới: ApiResponse<PaginatedResponse<SeriesDTO>>
      // r.data = { data: { data: [...], total, page }, success: true }
      const d = r.data;
      if (Array.isArray(d)) return d;
      if (d?.data && Array.isArray(d.data)) return d.data;         // ApiResponse trả array thẳng
      if (d?.data?.data && Array.isArray(d.data.data)) return d.data.data; // ApiResponse<PaginatedResponse>
      return [];
    },
  });
  const { data: pendingTasks = [] } = useQuery({
    queryKey: ['tasks', 'pending-review'],
    queryFn: async () => { const r = await api.get('/tasks/pending-review'); return r.data.data ?? []; },
  });
  const { data: rankings = [] } = useQuery({
    queryKey: ['rankings', 'my'],
    queryFn: async () => { const r = await api.get('/rankings/my'); return r.data.data ?? []; },
  });

  const series: any[] = Array.isArray(seriesData) ? seriesData : [];
  const atRiskCount = (rankings as any[]).filter((r: any) => r.isAtRisk).length;
  const bestRank    = (rankings as any[]).length ? Math.min(...(rankings as any[]).map((r: any) => r.currentRank)) : null;

  const STATUS_MAP: Record<string, { label: string; dot: string }> = {
    serializing:     { label: 'Đang đăng',  dot: 'bg-violet-400' },
    draft:           { label: 'Nháp',        dot: 'bg-zinc-500'   },
    pending_review:  { label: 'Chờ duyệt',   dot: 'bg-amber-400'  },
    approved:        { label: 'Được duyệt',  dot: 'bg-emerald-400'},
    cancelled:       { label: 'Đã huỷ',      dot: 'bg-red-500'    },
  };

  const PRIORITY_MAP: Record<string, string> = {
    urgent: 'text-red-400 bg-red-500/10 border-red-500/20',
    high:   'text-orange-400 bg-orange-500/10 border-orange-500/20',
    normal: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
    low:    'text-zinc-500 bg-zinc-500/8 border-zinc-500/15',
  };

  return (
    <div className="min-h-full bg-[#0a0a12] text-white">

      {/* ── Hero header ─────────────────────────────────────── */}
      <div className="relative border-b border-violet-900/30 overflow-hidden">
        {/* bg glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-16 left-1/2 w-64 h-64 rounded-full bg-fuchsia-600/8 blur-3xl" />

        <div className="relative px-8 pt-10 pb-8 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Feather className="w-4 h-4 text-violet-400" />
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-violet-400">Creator Studio</span>
            </div>
            <h1 className="text-[2rem] font-black leading-none tracking-tight font-['Syne'] mb-1">
              {user?.name ?? 'Mangaka'}
            </h1>
            <p className="text-sm text-zinc-500">Chào mừng trở lại — hôm nay là ngày tốt để sáng tác</p>
          </div>

          {/* CTA */}
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:scale-[1.02] transition-all">
            <Plus className="w-4 h-4" />Tạo Series mới
          </button>
        </div>
      </div>

      <div className="px-8 py-8 space-y-10">

        {/* ── Stats row ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Series',
              value: series.length,
              sub: `${series.filter((s:any)=>s.status==='serializing').length} đang đăng`,
              icon: BookOpen,
              color: 'text-violet-400',
              ring: 'ring-violet-500/20',
              bg: 'bg-violet-500/8',
            },
            {
              label: 'Chờ duyệt',
              value: (pendingTasks as any[]).length,
              sub: (pendingTasks as any[]).length > 0 ? 'Cần xem xét' : 'Tất cả ổn',
              icon: CheckSquare,
              color: 'text-amber-400',
              ring: 'ring-amber-500/20',
              bg: 'bg-amber-500/8',
            },
            {
              label: 'Hạng tốt nhất',
              value: bestRank ? `#${bestRank}` : '—',
              sub: bestRank && bestRank <= 10 ? 'Top 10 🔥' : 'Tiếp tục cố gắng',
              icon: Trophy,
              color: 'text-yellow-400',
              ring: 'ring-yellow-500/20',
              bg: 'bg-yellow-500/8',
            },
            {
              label: 'Nguy hiểm',
              value: atRiskCount,
              sub: atRiskCount > 0 ? 'Cần cải thiện gấp' : 'An toàn',
              icon: AlertTriangle,
              color: atRiskCount > 0 ? 'text-red-400' : 'text-emerald-400',
              ring: atRiskCount > 0 ? 'ring-red-500/20' : 'ring-emerald-500/20',
              bg: atRiskCount > 0 ? 'bg-red-500/8' : 'bg-emerald-500/8',
            },
          ].map((s, i) => (
            <div key={i} className={`rounded-2xl ring-1 ${s.ring} ${s.bg} p-5 flex flex-col gap-3`}>
              <div className={`w-9 h-9 rounded-xl bg-black/30 flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4.5 h-4.5" strokeWidth={1.8} />
              </div>
              <div>
                <div className={`text-3xl font-black tracking-tight font-['Syne'] ${s.color}`}>{s.value}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{s.label}</div>
              </div>
              <div className="text-[11px] text-zinc-600 mt-auto">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Quick actions ────────────────────────────────────── */}
        <div>
          <h2 className="text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-4">Thao tác nhanh</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Plus,    label: 'Tạo Series',    sub: 'Nộp lên hội đồng',   to: null, onClick: () => setShowCreate(true), color: 'from-violet-600/20 to-fuchsia-600/20', border: 'border-violet-500/20', text: 'text-violet-300' },
              { icon: Upload,  label: 'Upload Chapter', sub: 'Thêm trang mới',      to: '/mangaka/chapters',      color: 'from-blue-600/20 to-cyan-600/20',     border: 'border-blue-500/20',   text: 'text-blue-300'   },
              { icon: Layers,  label: 'Giao việc',     sub: 'Phân công trợ lý',    to: '/mangaka/assign-tasks',  color: 'from-emerald-600/20 to-teal-600/20',  border: 'border-emerald-500/20',text: 'text-emerald-300'},
              { icon: Trophy,  label: 'Xếp hạng',      sub: 'Theo dõi thứ hạng',   to: '/mangaka/rankings',      color: 'from-amber-600/20 to-yellow-600/20',  border: 'border-amber-500/20',  text: 'text-amber-300'  },
            ].map((a, i) => (
              <Link key={i} to={a.to}
                className={`group bg-gradient-to-br ${a.color} border ${a.border} rounded-2xl p-5 flex flex-col gap-3 hover:scale-[1.02] transition-all`}>
                <div className={`w-9 h-9 rounded-xl bg-black/30 flex items-center justify-center ${a.text}`}>
                  <a.icon className="w-4.5 h-4.5" strokeWidth={1.8} />
                </div>
                <div>
                  <div className={`text-sm font-bold ${a.text}`}>{a.label}</div>
                  <div className="text-[11px] text-zinc-600 mt-0.5">{a.sub}</div>
                </div>
                <ArrowUpRight className={`w-3.5 h-3.5 ${a.text} opacity-0 group-hover:opacity-100 self-end transition-opacity`} />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Bottom two-col ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Series list */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Series của tôi</span>
              <Link to="/mangaka/series" className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                Xem tất cả <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {series.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-zinc-600">
                <BookOpen className="w-8 h-8 opacity-30" />
                <p className="text-sm">Chưa có series nào</p>
                <button onClick={() => setShowCreate(true)}
                  className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 px-3 py-1.5 rounded-lg transition-colors">
                  + Bắt đầu ngay
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-white/4">
                {series.slice(0,4).map((s:any) => {
                  const st = STATUS_MAP[s.status] ?? { label: s.status, dot: 'bg-zinc-500' };
                  return (
                    <li key={s.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.03] transition-colors group">
                      {/* mini cover */}
                      <div className="w-8 h-11 rounded-md bg-gradient-to-br from-violet-900/50 to-fuchsia-900/30 border border-violet-500/10 flex items-center justify-center flex-shrink-0">
                        {s.coverUrl
                          ? <img src={s.coverUrl} className="w-full h-full object-cover rounded-md" />
                          : <Feather className="w-3 h-3 text-violet-400/50" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white truncate group-hover:text-violet-300 transition-colors">{s.title}</p>
                        <p className="text-[11px] text-zinc-600">{s.genre}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        <span className="text-[11px] text-zinc-500">{st.label}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Pending tasks */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Chờ duyệt từ trợ lý</span>
              <Link to="/mangaka/review-pages" className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                Xem tất cả <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {(pendingTasks as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2 text-zinc-600">
                <Sparkles className="w-8 h-8 opacity-30" />
                <p className="text-sm">Không có task nào chờ duyệt</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/4">
                {(pendingTasks as any[]).slice(0,4).map((t:any) => (
                  <li key={t.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.03] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{t.title}</p>
                      <p className="text-[11px] text-zinc-600">{t.taskType}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_MAP[t.priority] ?? PRIORITY_MAP.normal}`}>
                      {t.priority === 'urgent' ? 'KHẨN' : t.priority === 'high' ? 'CAO' : 'TB'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Create Series Modal */}
      {showCreate && <CreateSeriesModal onClose={() => setShowCreate(false)} />}
    </div>
  );
};

export default MangakaDashboard;
