import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

const StudioProgress = () => {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['editor','studio-progress'],
    queryFn: async () => { const r = await api.get('/editor/studio-progress'); return r.data.data; },
    refetchInterval: 60_000,
  });
  useEffect(() => { if (data) setLastUpdated(new Date()); }, [data]);

  const series = Array.isArray(data) ? data : (data?.studios ?? data?.series ?? []);

  return (
    <div className="min-h-full bg-[#110c05] text-white">
      <div className="relative border-b border-amber-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 left-0 w-64 h-64 rounded-full bg-orange-600/6 blur-3xl"/>
        <div className="relative px-8 pt-8 pb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-orange-500 mb-2">Editor · Tiến độ</p>
            <h1 className="text-2xl font-black font-['Syne']">Tiến độ Studio</h1>
            <p className="text-sm text-zinc-600 mt-1">Real-time · tự cập nhật mỗi 60 giây</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
              <div className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-amber-400 animate-pulse':'bg-emerald-400'}`}/>
              {lastUpdated.toLocaleTimeString('vi-VN')}
            </div>
            <button onClick={()=>refetch()} disabled={isFetching}
              className="p-2 rounded-xl border border-white/8 text-zinc-500 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin':''}`}/>
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-amber-400 animate-spin"/></div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <AlertTriangle className="w-10 h-10 opacity-30"/>
            <button onClick={()=>refetch()} className="text-xs text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg">Thử lại</button>
          </div>
        ) : series.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <Activity className="w-10 h-10 opacity-20"/>
            <p className="text-sm">Chưa có dữ liệu tiến độ</p>
          </div>
        ) : series.map((s:any, i:number) => {
          // ✅ Đúng field names từ StudioProgressDTO
          const pct       = s.completionPercent ?? (s.totalPages > 0 ? Math.round((s.completedPages/s.totalPages)*100) : 0);
          const isUrgent  = s.isUrgent || s.overdueTasks > 0 || s.daysUntilDeadline <= 2;
          // ✅ assistantNames (không phải assistants)
          const assistants = s.assistantNames ?? s.assistants ?? [];

          return (
            <div key={s.seriesId ?? i}
              className={`rounded-2xl border bg-white/[0.015] overflow-hidden ${isUrgent ? 'border-red-500/20':'border-white/5'}`}>
              <div className="px-6 py-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-[13px] font-bold text-white">{s.seriesTitle ?? s.title}</h3>
                      {isUrgent && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 tracking-wider">URGENT</span>}
                    </div>
                    <p className="text-[11px] text-zinc-600">
                      Chapter {s.currentChapter} · {s.mangakaName}
                      {/* ✅ daysUntilDeadline (không phải daysLeft) */}
                      {s.daysUntilDeadline != null && (
                        <span className={s.daysUntilDeadline <= 2 ? ' text-red-400':' text-zinc-600'}> · {s.daysUntilDeadline} ngày còn lại</span>
                      )}
                    </p>
                  </div>
                  <span className={`text-2xl font-black font-['Syne'] ${pct>=80?'text-emerald-400':pct>=50?'text-amber-400':'text-red-400'}`}>{Math.round(pct)}%</span>
                </div>

                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                  <div className={`h-full rounded-full transition-all ${pct>=80?'bg-emerald-500':pct>=50?'bg-amber-500':'bg-red-500'}`} style={{width:`${Math.min(pct,100)}%`}}/>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { label:'Tổng',      value:s.totalPages,      color:'text-zinc-400'    },
                    { label:'Hoàn thành',value:s.completedPages,  color:'text-emerald-400' },
                    { label:'Đang làm',  value:s.inProgressPages, color:'text-blue-400'    },
                    { label:'Quá hạn',   value:s.overdueTasks,    color:s.overdueTasks>0?'text-red-400':'text-zinc-700' },
                  ].map((x,j)=>(
                    <div key={j} className="bg-white/3 rounded-xl py-2.5">
                      <div className={`text-lg font-black font-['Syne'] ${x.color}`}>{x.value ?? 0}</div>
                      <div className="text-[10px] text-zinc-700 mt-0.5">{x.label}</div>
                    </div>
                  ))}
                </div>

                {assistants.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-white/5">
                    <span className="text-[10px] text-zinc-700 mr-1">Trợ lý:</span>
                    {assistants.map((a:string,j:number)=>(
                      <span key={j} className="text-[11px] text-zinc-500 bg-white/4 border border-white/6 px-2 py-0.5 rounded-md">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default StudioProgress;
