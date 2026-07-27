import { FileText, CheckCircle2, AlertTriangle, Clock, ChevronRight, Loader2, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';

const EditorDashboard = () => {
  const { user } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['editor','stats'],
    queryFn: async () => { const r = await api.get('/editor/stats'); return r.data.data; },
  });
  const { data: msData } = useQuery({
    queryKey: ['editor','manuscripts','recent'],
    queryFn: async () => { const r = await api.get('/editor/manuscripts', { params:{ limit:4 } }); return r.data.data; },
  });
  const manuscripts = Array.isArray(msData) ? msData : (msData?.content ?? msData?.items ?? []);

  // GET /editor/publish-stats — đúng hạn / trễ hạn
  const { data: publishStats, isLoading: loadingPublishStats } = useQuery({
    queryKey: ['editor', 'publish-stats'],
    queryFn: async () => (await api.get('/editor/publish-stats')).data.data,
  });

  // ✅ Đúng field names từ EditorStatsDTO
  const STAT_CARDS = [
    { label:'Đang xét duyệt',  key:'manuscriptsInReview', icon:FileText,     color:'text-amber-400',   ring:'ring-amber-500/20',   bg:'bg-amber-500/8'   },
    { label:'Đang serializing', key:'seriesSerializing',   icon:CheckCircle2, color:'text-emerald-400', ring:'ring-emerald-500/20', bg:'bg-emerald-500/8' },
    { label:'Series nguy hiểm', key:'seriesAtRisk',        icon:AlertTriangle,color:'text-red-400',     ring:'ring-red-500/20',     bg:'bg-red-500/8'     },
    { label:'Deadline tuần này',key:'deadlinesThisWeek',   icon:Clock,        color:'text-orange-400',  ring:'ring-orange-500/20',  bg:'bg-orange-500/8'  },
  ];

  const STATUS_MAP: Record<string,{label:string;dot:string}> = {
    pending_review:       { label:'Chờ xét',   dot:'bg-amber-400'   },
    in_review:            { label:'Đang xét',  dot:'bg-blue-400'    },
    needs_minor_revision: { label:'Sửa nhỏ',   dot:'bg-orange-400'  },
    needs_major_revision: { label:'Sửa lớn',   dot:'bg-red-400'     },
    approved_for_board:   { label:'Đã duyệt',  dot:'bg-emerald-400' },
  };

  return (
    <div className="min-h-full bg-[#110c05] text-white">
      <div className="relative border-b border-amber-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-72 h-72 rounded-full bg-amber-600/8 blur-3xl"/>
        <div className="relative px-8 pt-10 pb-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-amber-500 mb-3">Editorial Desk</p>
            <h1 className="text-[2rem] font-black leading-none tracking-tight font-['Syne'] mb-1">{user?.name ?? 'Editor'}</h1>
            <p className="text-sm text-zinc-600">Quản lý bản thảo và theo dõi tiến độ studio</p>
          </div>
          <Link to="/editor/manuscripts"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold shadow-lg shadow-amber-600/25 hover:shadow-amber-600/40 hover:scale-[1.02] transition-all">
            <FileText className="w-4 h-4"/>Xem bản thảo
          </Link>
        </div>
      </div>

      <div className="px-8 py-8 space-y-8">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="rounded-2xl ring-1 ring-white/5 bg-white/[0.02] p-5 h-28 animate-pulse"/>)}</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STAT_CARDS.map((s,i)=>(
              <div key={i} className={`rounded-2xl ring-1 ${s.ring} ${s.bg} p-5`}>
                <s.icon className={`w-5 h-5 ${s.color} mb-3`} strokeWidth={1.8}/>
                <div className={`text-3xl font-black font-['Syne'] ${s.color}`}>{stats?.[s.key] ?? 0}</div>
                <div className="text-[11px] text-zinc-600 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-sm font-bold text-white">Bản thảo gần đây</span>
            <Link to="/editor/manuscripts" className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
              Xem tất cả <ChevronRight className="w-3 h-3"/>
            </Link>
          </div>
          {manuscripts.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-zinc-700"><p className="text-sm">Chưa có bản thảo nào</p></div>
          ) : (
            <ul className="divide-y divide-white/4">
              {manuscripts.map((m:any)=>{
                const st = STATUS_MAP[m.status] ?? { label:m.status, dot:'bg-zinc-500' };
                return (
                  <li key={m.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{m.seriesTitle ?? m.title}</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5">{m.mangakaName} · {m.totalPages ?? '?'} trang</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>
                      <span className="text-[11px] text-zinc-500">{st.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ═══ THỐNG KÊ ĐÚNG HẠN / TRỄ HẠN ═══ */}
        {!loadingPublishStats && publishStats && publishStats.overall.totalPublished > 0 && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />Hiệu suất phát hành
              </span>
            </div>

            {/* Overall summary */}
            <div className="grid grid-cols-4 gap-px bg-white/4">
              {[
                { label: 'Đã xuất bản', value: publishStats.overall.totalPublished, color: 'text-zinc-300' },
                { label: 'Đúng hạn', value: publishStats.overall.onTimeCount, color: 'text-emerald-400' },
                { label: 'Trễ hạn', value: publishStats.overall.lateCount, color: publishStats.overall.lateCount > 0 ? 'text-red-400' : 'text-zinc-600' },
                { label: 'Tỷ lệ đúng hạn', value: `${publishStats.overall.onTimeRate}%`, color: publishStats.overall.onTimeRate >= 80 ? 'text-emerald-400' : publishStats.overall.onTimeRate >= 50 ? 'text-amber-400' : 'text-red-400' },
              ].map((s, i) => (
                <div key={i} className="bg-[#110c05] px-5 py-4">
                  <div className={`text-2xl font-black font-['Syne'] ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {publishStats.overall.lateCount > 0 && (
              <div className="px-6 py-2.5 bg-red-500/4 border-b border-white/5">
                <p className="text-[11px] text-red-400">
                  Trung bình trễ <span className="font-bold">{publishStats.overall.avgDaysLate} ngày</span> (tính trên các chapter trễ hạn)
                </p>
              </div>
            )}

            {/* Bảng theo series — series tệ nhất lên đầu */}
            {publishStats.bySeries.length > 0 && (
              <div className="divide-y divide-white/4">
                {publishStats.bySeries.map((s: any) => (
                  <div key={s.seriesId} className="px-6 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white truncate">{s.seriesTitle}</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5">
                        {s.totalPublished} chapter đã ra
                        {s.worstChapterInfo && <span className="text-red-400 ml-1.5">· {s.worstChapterInfo}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 h-1.5 bg-white/6 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          s.onTimeRate >= 80 ? 'bg-emerald-500' : s.onTimeRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`} style={{ width: `${s.onTimeRate}%` }} />
                      </div>
                      <span className={`text-[12px] font-bold w-11 text-right ${
                        s.onTimeRate >= 80 ? 'text-emerald-400' : s.onTimeRate >= 50 ? 'text-amber-400' : 'text-red-400'
                      }`}>{s.onTimeRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Link to="/editor/manuscripts" className="group rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5 flex items-center justify-between hover:bg-amber-500/10 transition-all">
            <div><div className="text-sm font-bold text-amber-300">Bản thảo</div><div className="text-[11px] text-zinc-600 mt-0.5">Review + annotate</div></div>
            <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform"/>
          </Link>
          <Link to="/editor/progress" className="group rounded-2xl border border-orange-500/15 bg-orange-500/5 p-5 flex items-center justify-between hover:bg-orange-500/10 transition-all">
            <div><div className="text-sm font-bold text-orange-300">Tiến độ Studio</div><div className="text-[11px] text-zinc-600 mt-0.5">Theo dõi real-time</div></div>
            <ChevronRight className="w-4 h-4 text-orange-400 group-hover:translate-x-0.5 transition-transform"/>
          </Link>
        </div>
      </div>
    </div>
  );
};
export default EditorDashboard;
