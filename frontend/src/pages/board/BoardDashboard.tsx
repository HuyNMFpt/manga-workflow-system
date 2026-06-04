import { Users, BarChart2, AlertTriangle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';

const BoardDashboard = () => {
  const { user } = useAuthStore();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['board','stats'],
    queryFn: async () => { const r = await api.get('/board/stats'); return r.data.data; },
  });

  // ✅ Đúng field names từ BoardStatsDTO
  const STAT_CARDS = [
    { label:'Chờ vote',          key:'pendingVotes',       icon:Users,         color:'text-blue-400',    ring:'ring-blue-500/20',    bg:'bg-blue-500/8'    },
    { label:'Series active',     key:'totalActiveSeries',  icon:BarChart2,     color:'text-emerald-400', ring:'ring-emerald-500/20', bg:'bg-emerald-500/8' },
    { label:'Series nguy hiểm',  key:'seriesAtRisk',       icon:AlertTriangle, color:'text-red-400',     ring:'ring-red-500/20',     bg:'bg-red-500/8'     },
    { label:'Quyết định tháng',  key:'decisionsThisMonth', icon:CheckCircle2,  color:'text-teal-400',    ring:'ring-teal-500/20',    bg:'bg-teal-500/8'    },
  ];

  return (
    <div className="min-h-full bg-[#03100d] text-white">
      <div className="relative border-b border-teal-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-72 h-72 rounded-full bg-teal-600/8 blur-3xl"/>
        <div className="relative px-8 pt-10 pb-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-teal-500 mb-3">Board Room</p>
            <h1 className="text-[2rem] font-black leading-none tracking-tight font-['Syne'] mb-1">{user?.name ?? 'Board'}</h1>
            <p className="text-sm text-zinc-600">Quản lý xuất bản và ra quyết định chiến lược</p>
          </div>
          <Link to="/board/voting"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-teal-600/25 hover:shadow-teal-600/40 hover:scale-[1.02] transition-all">
            <Users className="w-4 h-4"/>Bỏ phiếu
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to:'/board/voting',    label:'Bỏ phiếu',      sub:'Series mới',     color:'from-teal-600/20 to-emerald-600/20',  border:'border-teal-500/20',   text:'text-teal-300'   },
            { to:'/board/rankings',  label:'Xếp hạng',      sub:'Nhập dữ liệu',   color:'from-blue-600/20 to-cyan-600/20',     border:'border-blue-500/20',   text:'text-blue-300'   },
            { to:'/board/decisions', label:'Quyết định',    sub:'Series at-risk', color:'from-red-600/20 to-orange-600/20',    border:'border-red-500/20',    text:'text-red-300'    },
            { to:'/board/rankings',  label:'Nhập poll',     sub:'Cập nhật votes', color:'from-violet-600/20 to-purple-600/20', border:'border-violet-500/20', text:'text-violet-300' },
          ].map((a,i)=>(
            <Link key={i} to={a.to}
              className={`group bg-gradient-to-br ${a.color} border ${a.border} rounded-2xl p-5 flex flex-col gap-2 hover:scale-[1.02] transition-all`}>
              <div className={`text-sm font-bold ${a.text}`}>{a.label}</div>
              <div className="text-[11px] text-zinc-600">{a.sub}</div>
              <ChevronRight className={`w-3.5 h-3.5 ${a.text} opacity-0 group-hover:opacity-100 self-end transition-opacity`}/>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
export default BoardDashboard;
