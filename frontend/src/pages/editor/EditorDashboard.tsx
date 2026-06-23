import { FileText, CheckCircle2, AlertTriangle, Clock, ChevronRight, Loader2 } from 'lucide-react';
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
