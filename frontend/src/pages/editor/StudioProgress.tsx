import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, RefreshCw, Loader2, Send, X, CheckCircle2, BookOpen, Clock } from 'lucide-react';
import api from '@/lib/axios';

/* ── Real-time deadline countdown ───────────────────────────────
   Nhận deadlineDate (YYYY-MM-DD), cập nhật mỗi giây
   Trả về: { days, hours, minutes, seconds, isOverdue, label }
─────────────────────────────────────────────────────────────── */
const useDeadlineCountdown = (deadlineDate: string | null | undefined) => {
  const calc = () => {
    if (!deadlineDate) return null;
    // deadline là cuối ngày đó (23:59:59)
    const target = new Date(deadlineDate + 'T23:59:59');
    const diff   = target.getTime() - Date.now();
    const isOverdue = diff < 0;
    const abs    = Math.abs(diff);
    const days    = Math.floor(abs / 86400000);
    const hours   = Math.floor((abs % 86400000) / 3600000);
    const minutes = Math.floor((abs % 3600000) / 60000);
    const seconds = Math.floor((abs % 60000) / 1000);
    return { days, hours, minutes, seconds, isOverdue };
  };

  const [state, setState] = useState(calc);
  useEffect(() => {
    if (!deadlineDate) return;
    setState(calc());
    const t = setInterval(() => setState(calc()), 1000);
    return () => clearInterval(t);
  }, [deadlineDate]);
  return state;
};

/* ── DeadlineDisplay — hiển thị countdown cho 1 series ─────── */
const DeadlineDisplay = ({ deadlineDate, daysUntilDeadline }: { deadlineDate?: string; daysUntilDeadline?: number }) => {
  const cd = useDeadlineCountdown(deadlineDate);

  if (!cd) {
    // Không có deadline date → fallback về daysUntilDeadline tĩnh
    return daysUntilDeadline != null ? (
      <span className={daysUntilDeadline <= 2 ? 'text-red-400' : 'text-zinc-600'}>
        · {daysUntilDeadline} ngày còn lại
      </span>
    ) : null;
  }

  if (cd.isOverdue) {
    return (
      <span className="text-red-400 font-semibold">
        · Quá hạn {cd.days > 0 ? `${cd.days} ngày` : `${cd.hours}g ${cd.minutes}p`}
      </span>
    );
  }

  const isUrgent = cd.days < 1;      // dưới 24 giờ
  const isWarning = cd.days <= 2;     // dưới 3 ngày

  return (
    <span className={`font-mono tabular-nums ${isUrgent ? 'text-red-400 font-bold' : isWarning ? 'text-amber-400' : 'text-zinc-600'}`}>
      {cd.days > 0
        ? ` · còn ${cd.days} ngày ${cd.hours}g ${cd.minutes}p`
        : ` · còn ${cd.hours}:${String(cd.minutes).padStart(2,'0')}:${String(cd.seconds).padStart(2,'0')}`}
    </span>
  );
};

const StudioProgress = () => {
  const qc = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedSeries, setSelectedSeries] = useState<any>(null);
  const [publishTarget, setPublishTarget] = useState<any>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['editor','studio-progress'],
    queryFn: async () => { const r = await api.get('/editor/studio-progress'); return r.data.data; },
    refetchInterval: 60_000,
  });
  useEffect(() => { if (data) setLastUpdated(new Date()); }, [data]);

  // GET /chapters/series/{seriesId} — lấy chapter list khi chọn series
  const { data: chaptersData = [] } = useQuery({
    queryKey: ['chapters', selectedSeries?.seriesId],
    queryFn: async () => {
      const r = await api.get(`/chapters/series/${selectedSeries.seriesId}`);
      return r.data.data ?? [];
    },
    enabled: !!selectedSeries?.seriesId,
  });
  const chapters: any[] = Array.isArray(chaptersData) ? chaptersData : [];
  // Chapter có thể publish: status = approved (tất cả task done, Mangaka đã duyệt)
  const publishableChapters = chapters.filter((c: any) => c.status === 'approved');

  // PUT /chapters/{id}/status → published
  const publishMutation = useMutation({
    mutationFn: (chapterId: string) =>
      api.put(`/chapters/${chapterId}/status`, { status: 'published' }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapters', selectedSeries?.seriesId] });
      qc.invalidateQueries({ queryKey: ['editor', 'studio-progress'] });
      setPublishTarget(null);
    },
    onError: (e: any) => alert(e.response?.data?.message ?? 'Xuất bản thất bại'),
  });

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
                      <DeadlineDisplay deadlineDate={s.deadlineDate} daysUntilDeadline={s.daysUntilDeadline} />
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

                {/* Nút Xuất bản — chỉ Editor thấy */}
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-700">
                    {selectedSeries?.seriesId === s.seriesId
                      ? publishableChapters.length > 0
                        ? `${publishableChapters.length} chapter sẵn sàng xuất bản`
                        : 'Chưa có chapter nào sẵn sàng'
                      : ''}
                  </span>
                  <button
                    onClick={() => setSelectedSeries(selectedSeries?.seriesId === s.seriesId ? null : s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                      selectedSeries?.seriesId === s.seriesId
                        ? 'bg-teal-500/20 border border-teal-500/30 text-teal-300'
                        : 'bg-white/5 border border-white/8 text-zinc-400 hover:text-white hover:bg-white/8'
                    }`}>
                    <BookOpen className="w-3 h-3" />
                    {selectedSeries?.seriesId === s.seriesId ? 'Ẩn chapters' : 'Xem chapters'}
                  </button>
                </div>

                {/* Chapter list khi expand */}
                {selectedSeries?.seriesId === s.seriesId && (
                  <div className="mt-2 space-y-1.5">
                    {chapters.length === 0 ? (
                      <p className="text-[11px] text-zinc-700 text-center py-2">Chưa có chapter nào</p>
                    ) : chapters.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-white/3 border border-white/5 rounded-xl">
                        <div>
                          <span className="text-[12px] font-semibold text-white">
                            Chapter {c.chapterNumber}{c.title ? `: ${c.title}` : ''}
                          </span>
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                            c.status === 'published' ? 'bg-teal-500/15 text-teal-400' :
                            c.status === 'approved'  ? 'bg-emerald-500/15 text-emerald-400' :
                            'bg-zinc-500/15 text-zinc-500'
                          }`}>
                            {c.status === 'published' ? 'Đã xuất bản' :
                             c.status === 'approved'  ? 'Sẵn sàng' :
                             c.status === 'in_progress' ? 'Đang làm' : c.status}
                          </span>
                        </div>
                        {c.status === 'approved' && (
                          <button
                            onClick={() => setPublishTarget(c)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-500/15 border border-teal-500/25 text-teal-300 text-[11px] font-semibold hover:bg-teal-500/25 transition-all">
                            <Send className="w-3 h-3" />Xuất bản
                          </button>
                        )}
                        {c.status === 'published' && (
                          <CheckCircle2 className="w-4 h-4 text-teal-500/60" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ════ PUBLISH CONFIRM MODAL ════ */}
      {publishTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#0e0e1a] border border-teal-900/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-teal-400" />
                <h2 className="text-[13px] font-bold text-white">Xác nhận xuất bản</h2>
              </div>
              <button onClick={() => setPublishTarget(null)}
                className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">Chapter sắp xuất bản</p>
                <p className="text-sm font-semibold text-white">
                  Chapter {publishTarget.chapterNumber}{publishTarget.title ? `: ${publishTarget.title}` : ''}
                </p>
                {publishTarget.totalPages && (
                  <p className="text-[11px] text-zinc-500 mt-0.5">{publishTarget.totalPages} trang</p>
                )}
              </div>
              <div className="flex items-start gap-2.5 bg-amber-500/6 border border-amber-500/15 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-amber-300 mb-0.5">Không thể hoàn tác</p>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Sau khi xuất bản, chapter sẽ được phát hành. Đảm bảo đã kiểm tra lịch xuất bản và toàn bộ nội dung.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setPublishTarget(null)} disabled={publishMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors disabled:opacity-50">
                  Huỷ
                </button>
                <button onClick={() => publishMutation.mutate(publishTarget.id)}
                  disabled={publishMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {publishMutation.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang xuất bản...</>
                    : <><Send className="w-3.5 h-3.5" />Xác nhận xuất bản</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StudioProgress;
