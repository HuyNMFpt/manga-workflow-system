import { ListTodo, CheckCircle2, AlertCircle, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';

const AssistantDashboard = () => {
  const { user } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['assistant', 'stats'],
    queryFn: async () => { const r = await api.get('/assistant/stats'); // PAGINATED: items in .data.data
      return r.data.data?.data ?? r.data.data ?? []; },
  });
  const { data: taskData } = useQuery({
    queryKey: ['tasks', 'my', 'recent'],
    queryFn: async () => { const r = await api.get('/tasks/my', { params: { limit: 5 } }); // PAGINATED: items in .data.data
      return r.data.data?.data ?? r.data.data ?? []; },
  });
  const tasks = Array.isArray(taskData) ? taskData : (taskData?.content ?? taskData?.items ?? []);

  // ✅ Đúng field names từ AssistantStatsDTO
  const STAT_CARDS = [
    { label:'Chờ làm',   key:'totalPending',        icon:ListTodo,    color:'text-blue-400',    ring:'ring-blue-500/20',    bg:'bg-blue-500/8'    },
    { label:'Cần sửa',   key:'totalRevisionNeeded', icon:AlertCircle, color:'text-orange-400',  ring:'ring-orange-500/20',  bg:'bg-orange-500/8'  },
    { label:'Quá hạn',   key:'totalOverdue',        icon:Clock,       color:'text-red-400',     ring:'ring-red-500/20',     bg:'bg-red-500/8'     },
    { label:'Đã duyệt',  key:'totalApproved',       icon:CheckCircle2,color:'text-emerald-400', ring:'ring-emerald-500/20', bg:'bg-emerald-500/8' },
  ];

  const STATUS_MAP: Record<string,{label:string;pill:string}> = {
    pending:           { label:'Chờ làm', pill:'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'          },
    in_progress:       { label:'Đang làm',pill:'bg-blue-500/10 text-blue-300 border-blue-500/20'           },
    submitted:         { label:'Đã nộp',  pill:'bg-violet-500/10 text-violet-300 border-violet-500/20'     },
    revision_needed:   { label:'Cần sửa', pill:'bg-orange-500/10 text-orange-300 border-orange-500/20'     },
    approved:          { label:'Đã duyệt',pill:'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'  },
  };

  return (
    <div className="min-h-full bg-[#080e1a] text-white">
      <div className="relative border-b border-blue-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-72 h-72 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="relative px-8 pt-10 pb-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-blue-400 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Assistant Workshop
            </p>
            <h1 className="text-[2rem] font-black leading-none tracking-tight font-['Syne'] mb-1">{user?.name ?? 'Assistant'}</h1>
            <p className="text-sm text-zinc-600">Xem công việc được giao và theo dõi tiến độ</p>
          </div>
          <Link to="/assistant/tasks"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02] transition-all">
            <ListTodo className="w-4 h-4" />Xem công việc
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
            <span className="text-sm font-bold text-white">Task gần đây</span>
            <Link to="/assistant/tasks" className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
              Xem tất cả <ChevronRight className="w-3 h-3"/>
            </Link>
          </div>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-zinc-700"><CheckCircle2 className="w-6 h-6 opacity-20 mr-2"/><p className="text-sm">Không có task nào</p></div>
          ) : (
            <ul className="divide-y divide-white/4">
              {tasks.slice(0,5).map((t:any)=>{
                const st = STATUS_MAP[t.status] ?? STATUS_MAP.pending;
                return (
                  <li key={t.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{t.title}</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5">{t.taskType}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.pill}`}>{st.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link to="/assistant/tasks" className="group rounded-2xl border border-blue-500/15 bg-blue-500/5 p-5 flex items-center justify-between hover:bg-blue-500/10 transition-all">
            <div><div className="text-sm font-bold text-blue-300">Danh sách task</div><div className="text-[11px] text-zinc-600 mt-0.5">Xem và nộp kết quả</div></div>
            <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform"/>
          </Link>
          <Link to="/assistant/earnings" className="group rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5 flex items-center justify-between hover:bg-emerald-500/10 transition-all">
            <div><div className="text-sm font-bold text-emerald-300">Thu nhập</div><div className="text-[11px] text-zinc-600 mt-0.5">Xem số trang đã duyệt</div></div>
            <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform"/>
          </Link>
        </div>
      </div>
    </div>
  );
};
export default AssistantDashboard;
