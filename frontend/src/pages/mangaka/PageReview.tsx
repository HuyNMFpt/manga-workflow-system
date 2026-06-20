import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, Film,
  Eye, RotateCcw, X, Download, ExternalLink, ChevronDown,
  ZoomIn, ZoomOut, MessageSquare, Layers, BookOpen
} from 'lucide-react';
import { taskService } from '@/services/taskService';
import api from '@/lib/axios';

// ─── Constants ─────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; pill: string; dot: string }> = {
  pending:         { label:'Chờ làm',    dot:'bg-zinc-500',    pill:'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'         },
  in_progress:     { label:'Đang làm',   dot:'bg-blue-400',    pill:'bg-blue-500/10 text-blue-300 border-blue-500/20'         },
  submitted:       { label:'Cần duyệt',  dot:'bg-violet-400',  pill:'bg-violet-500/10 text-violet-300 border-violet-500/20'   },
  revision_needed: { label:'Cần sửa',    dot:'bg-amber-400',   pill:'bg-amber-500/10 text-amber-300 border-amber-500/20'      },
  approved:        { label:'Hoàn chỉnh', dot:'bg-emerald-400', pill:'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
};
const TYPE_LABEL: Record<string, string> = {
  background:'Vẽ nền', shading:'Tô bóng', effect:'Hiệu ứng',
  screentone:'Screentone', dialog:'Thoại', touch_up:'Chỉnh sửa', other:'Khác',
};
const parseRegion = (s?: string) => {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
};

// ─── ResultPreview ──────────────────────────────────────────────
const ResultPreview = ({ task, zoom, onZoomIn, onZoomOut }: any) => {
  const [view, setView] = useState<'result'|'original'|'compare'>('result');
  const region = parseRegion(task.panelRegion);
  const Overlay = () => region ? (
    <div className="absolute border-2 border-fuchsia-400 bg-fuchsia-400/10 pointer-events-none"
      style={{ left:`${region.x}%`, top:`${region.y}%`, width:`${region.width}%`, height:`${region.height}%` }}>
      <span className="absolute -top-5 left-0 bg-fuchsia-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
        {TYPE_LABEL[task.taskType] ?? task.taskType}
      </span>
    </div>
  ) : null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {(['result','original','compare'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              view===v ? 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25'
                       : 'text-zinc-600 hover:text-zinc-300 bg-white/3 border border-white/6'
            }`}>
            {v==='result'?'Kết quả':v==='original'?'Trang gốc':'So sánh'}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={onZoomOut} className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-zinc-400 hover:text-white"><ZoomOut className="w-3.5 h-3.5"/></button>
          <span className="text-[10px] text-zinc-600 w-9 text-center">{Math.round(zoom*100)}%</span>
          <button onClick={onZoomIn} className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-zinc-400 hover:text-white"><ZoomIn className="w-3.5 h-3.5"/></button>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden border border-white/8 bg-black/20"
        style={{ transform:`scale(${zoom})`, transformOrigin:'top left', transition:'transform 0.15s' }}>
        {view==='compare' ? (
          <div className="grid grid-cols-2 divide-x divide-white/8">
            <div className="relative">
              <p className="absolute top-2 left-2 z-10 bg-black/60 rounded px-1.5 py-0.5 text-[9px] text-zinc-300">Trang gốc</p>
              {task.pageImageUrl ? <img src={task.pageImageUrl} alt="Original" className="w-full object-contain max-h-80"/> : <div className="h-48 flex items-center justify-center"><Film className="w-8 h-8 text-zinc-700 opacity-30"/></div>}
              <Overlay/>
            </div>
            <div className="relative">
              <p className="absolute top-2 left-2 z-10 bg-black/60 rounded px-1.5 py-0.5 text-[9px] text-fuchsia-300">Kết quả</p>
              {task.fileUrl ? <img src={task.fileUrl} alt="Result" className="w-full object-contain max-h-80"/> : <div className="h-48 flex items-center justify-center"><Film className="w-8 h-8 text-zinc-700 opacity-30"/></div>}
            </div>
          </div>
        ) : (
          <div className="relative">
            {(view==='result' ? task.fileUrl : task.pageImageUrl)
              ? <img src={view==='result'?task.fileUrl:task.pageImageUrl} alt={view} className="w-full object-contain max-h-96" draggable={false}/>
              : <div className="h-48 flex flex-col items-center justify-center gap-2">
                  <Film className="w-8 h-8 text-zinc-700 opacity-20"/>
                  <p className="text-[11px] text-zinc-700">{view==='result'?'Assistant chưa nộp file':'Không có ảnh trang gốc'}</p>
                </div>}
            {view==='original' && <Overlay/>}
          </div>
        )}
      </div>
      {task.fileUrl && (
        <div className="flex items-center gap-2">
          <a href={task.fileUrl} download className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-zinc-400 text-[11px] hover:text-white transition-colors"><Download className="w-3 h-3"/>Tải file</a>
          <a href={task.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-zinc-400 text-[11px] hover:text-white transition-colors"><ExternalLink className="w-3 h-3"/>Mở tab mới</a>
        </div>
      )}
    </div>
  );
};

// ─── Main ───────────────────────────────────────────────────────
export default function PageReview() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'approve'|'revision'|null>(null);
  const [reviewNotes,  setReviewNotes]  = useState('');
  const [zoom,         setZoom]         = useState(1);
  const [expandedIds,  setExpandedIds]  = useState<Set<string>>(new Set());
  const [selectedSeries, setSelectedSeries] = useState('');

  const closeModal = () => { setSelectedTask(null); setReviewAction(null); setReviewNotes(''); setZoom(1); };
  const toggleChapter = (id: string) => setExpandedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  // ── Fetch series của Mangaka ────────────────────────────────
  const { data: seriesData = [] } = useQuery({
    queryKey: ['series','my'],
    queryFn: async () => { const r = await api.get('/series/my'); return r.data.data?.data ?? []; },
  });
  const seriesList = (seriesData as any[]).filter((s:any) => ['approved','publishing'].includes(s.status));

  // ── Fetch chapters của series đang chọn ─────────────────────
  const { data: chaptersData = [], isLoading } = useQuery({
    queryKey: ['chapters', selectedSeries],
    queryFn: async () => { const r = await api.get(`/chapters/series/${selectedSeries}`); return r.data.data ?? []; },
    enabled: !!selectedSeries,
  });
  const chapters: any[] = chaptersData as any[];

  // ── Fetch tasks của từng chapter (theo pageId) ───────────────
  // Dùng submitted tasks (cần duyệt) làm nền, backend cần thêm GET /tasks/assigned-by-me
  const { data: submittedTasks = [] } = useQuery({
    queryKey: ['tasks','pending-review'],
    queryFn: () => taskService.getPendingReview(),
  });
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks','assigned'],
    queryFn: async () => {
      try { const r = await api.get('/tasks/assigned-by-me'); return r.data.data ?? []; }
      catch { return submittedTasks; }
    },
  });
  const tasks: any[] = (allTasks as any[]).length > 0 ? allTasks as any[] : submittedTasks as any[];

  // ── Mutations ───────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: (id: string) => taskService.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['tasks'] }); closeModal(); },
  });
  const revisionMutation = useMutation({
    mutationFn: ({ taskId, note }: { taskId:string; note:string }) => taskService.requestRevision(taskId, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['tasks'] }); closeModal(); },
  });
  const isSubmitting = approveMutation.isPending || revisionMutation.isPending;
  const handleConfirm = () => {
    if (!selectedTask || !reviewAction) return;
    if (reviewAction==='approve') approveMutation.mutate(selectedTask.id);
    else if (reviewNotes.trim()) revisionMutation.mutate({ taskId:selectedTask.id, note:reviewNotes });
  };

  // ── Stats (từ toàn bộ tasks) ─────────────────────────────────
  const stats = [
    { label:'Chờ làm',    count:tasks.filter((t:any)=>t.status==='pending').length,         color:'text-zinc-400'     },
    { label:'Đang làm',   count:tasks.filter((t:any)=>t.status==='in_progress').length,     color:'text-blue-400'     },
    { label:'Cần duyệt',  count:tasks.filter((t:any)=>t.status==='submitted').length,       color:'text-violet-400'   },
    { label:'Cần sửa',    count:tasks.filter((t:any)=>t.status==='revision_needed').length, color:'text-amber-400'    },
    { label:'Hoàn chỉnh', count:tasks.filter((t:any)=>t.status==='approved').length,        color:'text-emerald-400'  },
  ];

  return (
    <div className="min-h-full bg-[#0a0a12] text-white">
      {/* Header */}
      <div className="relative border-b border-violet-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 left-0 w-64 h-64 rounded-full bg-fuchsia-600/8 blur-3xl"/>
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-fuchsia-500 mb-2">Mangaka · Duyệt trang</p>
          <h1 className="text-2xl font-black font-['Syne']">Theo dõi & Duyệt task</h1>
          <p className="text-sm text-zinc-600 mt-1">Tracking tiến độ Assistant theo từng chapter</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {stats.map((s,i) => (
            <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3">
              <div className={`text-2xl font-black font-['Syne'] ${s.color}`}>{s.count}</div>
              <div className="text-[11px] text-zinc-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Series selector */}
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-zinc-600"/>
          <div className="relative">
            <select value={selectedSeries} onChange={e => setSelectedSeries(e.target.value)}
              className="bg-white/5 border border-white/8 rounded-xl pl-4 pr-8 py-2 text-sm text-white appearance-none focus:outline-none focus:border-violet-500/40 transition-all">
              <option value="" className="bg-[#0a0a12]">-- Chọn series --</option>
              {seriesList.map((s:any) => (
                <option key={s.id} value={s.id} className="bg-[#0a0a12]">{s.title}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-zinc-600 pointer-events-none"/>
          </div>
        </div>

        {/* Chapter list */}
        {!selectedSeries ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <Layers className="w-10 h-10 opacity-20"/>
            <p className="text-sm">Chọn series để xem tiến độ task</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-violet-400 animate-spin"/></div>
        ) : chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <Film className="w-10 h-10 opacity-20"/>
            <p className="text-sm">Chưa có chapter nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chapters.map((chapter: any) => {
              const isExpanded = expandedIds.has(chapter.id);
              // Lấy tasks của chapter này (match qua pageId → pages của chapter)
              const chapterPageIds = new Set((chapter.pages ?? []).map((p:any) => p.id));
              const chapterTasks = tasks.filter((t:any) => chapterPageIds.has(t.pageId));
              const doneTasks = chapterTasks.filter((t:any) => t.status === 'approved').length;
              const totalTasks = chapterTasks.length;
              const pct = totalTasks > 0 ? Math.round((doneTasks/totalTasks)*100) : 0;

              return (
                <div key={chapter.id} className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
                  {/* Chapter header */}
                  <button onClick={() => toggleChapter(chapter.id)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${isExpanded?'':'rotate-[-90deg]'}`}/>
                      <div className="text-left">
                        <p className="text-[13px] font-bold text-white">
                          Chapter {chapter.chapterNumber}{chapter.title ? `: ${chapter.title}` : ''}
                        </p>
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          {totalTasks} task · {chapter.totalPages ?? 0} trang
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[11px] text-zinc-500">{doneTasks}/{totalTasks} hoàn chỉnh</p>
                        <div className="w-24 h-1.5 bg-white/8 rounded-full overflow-hidden mt-1">
                          <div className={`h-full rounded-full transition-all ${pct===100?'bg-emerald-400':'bg-violet-500'}`}
                            style={{ width:`${pct}%` }}/>
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold w-10 text-right ${pct===100?'text-emerald-400':'text-violet-400'}`}>{pct}%</span>
                    </div>
                  </button>

                  {/* Task rows */}
                  {isExpanded && (
                    <div>
                      {/* Table header */}
                      <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_5rem] gap-4 px-6 py-2 border-t border-white/5 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-700 bg-white/[0.01]">
                        <span>Công việc</span>
                        <span>Loại</span>
                        <span>Trợ lý</span>
                        <span>Trạng thái</span>
                        <span></span>
                      </div>

                      {chapterTasks.length === 0 ? (
                        <div className="px-6 py-5 text-center text-[12px] text-zinc-700">
                          Chưa có task nào được giao cho chapter này
                        </div>
                      ) : chapterTasks.map((task: any) => {
                        const st = STATUS_CFG[task.status] ?? STATUS_CFG.pending;
                        const canReview = task.status === 'submitted';
                        return (
                          <div key={task.id}
                            className="grid grid-cols-[2fr_1fr_1.5fr_1fr_5rem] gap-4 px-6 py-3 border-t border-white/4 items-center hover:bg-white/[0.02] transition-colors">
                            <p className="text-[12px] font-semibold text-white truncate">{task.title}</p>
                            <p className="text-[11px] text-zinc-500">{TYPE_LABEL[task.taskType] ?? task.taskType}</p>
                            <p className="text-[11px] text-zinc-500 truncate">{task.assignedTo}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit ${st.pill}`}>
                              {st.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {canReview ? (
                                <button
                                  onClick={() => { setSelectedTask(task); setReviewAction(null); setZoom(1); }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/12 border border-violet-500/20 text-violet-300 text-[11px] font-semibold hover:bg-violet-500/20 transition-all">
                                  <Eye className="w-3 h-3"/>Duyệt
                                </button>
                              ) : task.fileUrl || task.status !== 'pending' ? (
                                <button
                                  onClick={() => { setSelectedTask(task); setReviewAction(null); setZoom(1); }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8 text-zinc-400 text-[11px] hover:text-white transition-all">
                                  <Eye className="w-3 h-3"/>Xem
                                </button>
                              ) : (
                                <span className="text-[11px] text-zinc-700">—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════ REVIEW MODAL ════ */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#0e0e1a] border border-violet-900/30 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-white">{selectedTask.title}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${(STATUS_CFG[selectedTask.status]??STATUS_CFG.pending).pill}`}>
                    {(STATUS_CFG[selectedTask.status]??STATUS_CFG.pending).label}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  {TYPE_LABEL[selectedTask.taskType]??selectedTask.taskType}
                  {selectedTask.assignedTo && ` · ${selectedTask.assignedTo}`}
                </p>
              </div>
              <button onClick={closeModal} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <ResultPreview task={selectedTask} zoom={zoom}
                onZoomIn={() => setZoom(z=>Math.min(2,z+0.25))}
                onZoomOut={() => setZoom(z=>Math.max(0.5,z-0.25))}/>

              {selectedTask.revisionNotes && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-white/3 border border-white/6 rounded-xl">
                  <MessageSquare className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1">Ghi chú</p>
                    <p className="text-[12px] text-zinc-300 leading-relaxed">{selectedTask.revisionNotes}</p>
                  </div>
                </div>
              )}
              {selectedTask.status==='approved' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0"/>
                  <p className="text-[12px] text-emerald-300 font-semibold">Task đã hoàn chỉnh</p>
                </div>
              )}
              {selectedTask.status==='revision_needed' && (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-500/8 border border-amber-500/15 rounded-xl">
                  <RotateCcw className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">Đã yêu cầu chỉnh sửa</p>
                    {selectedTask.revisionNotes && <p className="text-[12px] text-zinc-300">{selectedTask.revisionNotes}</p>}
                  </div>
                </div>
              )}
              {selectedTask.status==='in_progress' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/8 border border-blue-500/15 rounded-xl">
                  <Loader2 className="w-4 h-4 text-blue-400 flex-shrink-0"/>
                  <p className="text-[12px] text-blue-300 font-semibold">Assistant đang thực hiện task này</p>
                </div>
              )}
              {selectedTask.status==='pending' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-white/3 border border-white/6 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-zinc-500 flex-shrink-0"/>
                  <p className="text-[12px] text-zinc-400 font-semibold">Task chưa được bắt đầu</p>
                </div>
              )}
              {selectedTask.status==='submitted' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setReviewAction('approve')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                        reviewAction==='approve'
                          ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border border-white/8 text-zinc-400 hover:bg-white/8'
                      }`}>
                      <CheckCircle2 className="w-4 h-4"/>Phê duyệt
                    </button>
                    <button onClick={() => setReviewAction('revision')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                        reviewAction==='revision'
                          ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                          : 'bg-white/5 border border-white/8 text-zinc-400 hover:bg-white/8'
                      }`}>
                      <RotateCcw className="w-4 h-4"/>Yêu cầu sửa
                    </button>
                  </div>
                  {reviewAction && (
                    <div className="space-y-2">
                      {reviewAction==='revision' && (
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                          Mô tả điểm cần sửa <span className="text-red-400">*</span>
                        </label>
                      )}
                      <textarea rows={reviewAction==='revision'?4:2}
                        value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)}
                        placeholder={reviewAction==='approve'?'Nhận xét (tùy chọn)...':'Mô tả cụ thể chỗ cần chỉnh sửa...'}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500/40 resize-none transition-all"/>
                    </div>
                  )}
                  {(approveMutation.isError||revisionMutation.isError) && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5"/>Có lỗi xảy ra. Vui lòng thử lại.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
              {selectedTask.status==='submitted' ? (
                <div className="flex gap-2">
                  <button onClick={closeModal} disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors disabled:opacity-50">Huỷ</button>
                  <button onClick={handleConfirm}
                    disabled={!reviewAction||(reviewAction==='revision'&&!reviewNotes.trim())||isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                    {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang xử lý</>
                      : reviewAction==='approve' ? <><CheckCircle2 className="w-3.5 h-3.5"/>Phê duyệt</>
                      : reviewAction==='revision' ? <><RotateCcw className="w-3.5 h-3.5"/>Gửi yêu cầu</>
                      : 'Xác nhận'}
                  </button>
                </div>
              ) : (
                <button onClick={closeModal} className="w-full py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">Đóng</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
