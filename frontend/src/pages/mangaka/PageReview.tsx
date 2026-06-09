import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, Film,
  Eye, RotateCcw, X, Download, ExternalLink, Layers,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, MessageSquare
} from 'lucide-react';
import { taskService } from '@/services/taskService';

// ─── Types ─────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; pill: string; dot: string }> = {
  submitted:       { label:'Cần duyệt', dot:'bg-violet-400', pill:'bg-violet-500/10 text-violet-300 border-violet-500/20'   },
  approved:        { label:'Đã duyệt',  dot:'bg-emerald-400',pill:'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  revision_needed: { label:'Cần sửa',   dot:'bg-amber-400',  pill:'bg-amber-500/10 text-amber-300 border-amber-500/20'       },
  in_progress:     { label:'Đang làm',  dot:'bg-blue-400',   pill:'bg-blue-500/10 text-blue-300 border-blue-500/20'          },
  pending:         { label:'Chờ làm',   dot:'bg-zinc-500',   pill:'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'          },
};

const TASK_TYPE_LABEL: Record<string, string> = {
  background:'Vẽ nền', shading:'Tô bóng', effect:'Hiệu ứng',
  screentone:'Screentone', text_bubble:'Bong bóng thoại',
  cleanup:'Làm sạch', color:'Tô màu',
};

const parseRegion = (s?: string) => {
  if (!s) return null;
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
};

// ─── ResultPreview: ảnh gốc + ảnh kết quả + overlay region ────
const ResultPreview = ({ task, zoom, onZoomIn, onZoomOut }: {
  task: any; zoom: number; onZoomIn: () => void; onZoomOut: () => void;
}) => {
  const [view, setView] = useState<'result' | 'original' | 'compare'>('result');
  const region = parseRegion(task.panelRegion);

  const OverlayRegion = () => region ? (
    <div
      className="absolute border-2 border-fuchsia-400 bg-fuchsia-400/10 pointer-events-none"
      style={{ left:`${region.x}%`, top:`${region.y}%`, width:`${region.width}%`, height:`${region.height}%` }}>
      <span className="absolute -top-5 left-0 bg-fuchsia-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
        {TASK_TYPE_LABEL[task.taskType] ?? task.taskType}
      </span>
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex items-center gap-1">
        {[
          { id:'result',   label:'Kết quả'  },
          { id:'original', label:'Trang gốc' },
          { id:'compare',  label:'So sánh'  },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id as any)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              view === v.id
                ? 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25'
                : 'text-zinc-600 hover:text-zinc-300 bg-white/3 border border-white/6'
            }`}>{v.label}</button>
        ))}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={onZoomOut}
            className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-zinc-400 hover:text-white">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-zinc-600 w-9 text-center">{Math.round(zoom*100)}%</span>
          <button onClick={onZoomIn}
            className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-zinc-400 hover:text-white">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="rounded-xl overflow-hidden border border-white/8 bg-black/20"
        style={{ transform:`scale(${zoom})`, transformOrigin:'top left', transition:'transform 0.15s' }}>

        {view === 'compare' ? (
          // Side-by-side
          <div className="grid grid-cols-2 divide-x divide-white/8">
            <div className="relative">
              <p className="absolute top-2 left-2 z-10 bg-black/60 rounded px-1.5 py-0.5 text-[9px] text-zinc-300">Trang gốc</p>
              {task.pageImageUrl
                ? <img src={task.pageImageUrl} alt="Original" className="w-full object-contain max-h-80" />
                : <div className="h-48 flex items-center justify-center"><Film className="w-8 h-8 text-zinc-700 opacity-30" /></div>}
              <OverlayRegion />
            </div>
            <div className="relative">
              <p className="absolute top-2 left-2 z-10 bg-black/60 rounded px-1.5 py-0.5 text-[9px] text-fuchsia-300">Kết quả</p>
              {task.fileUrl
                ? <img src={task.fileUrl} alt="Result" className="w-full object-contain max-h-80" />
                : <div className="h-48 flex items-center justify-center"><Film className="w-8 h-8 text-zinc-700 opacity-30" /></div>}
            </div>
          </div>
        ) : (
          <div className="relative">
            {(view === 'result' ? task.fileUrl : task.pageImageUrl)
              ? <img
                  src={view === 'result' ? task.fileUrl : task.pageImageUrl}
                  alt={view}
                  className="w-full object-contain max-h-96"
                  draggable={false}
                />
              : <div className="h-48 flex flex-col items-center justify-center gap-2">
                  <Film className="w-8 h-8 text-zinc-700 opacity-20" />
                  <p className="text-[11px] text-zinc-700">
                    {view === 'result' ? 'Assistant chưa nộp file' : 'Không có ảnh trang gốc'}
                  </p>
                </div>
            }
            {/* Overlay region chỉ khi xem trang gốc */}
            {view === 'original' && <OverlayRegion />}
          </div>
        )}
      </div>

      {/* File actions */}
      {task.fileUrl && (
        <div className="flex items-center gap-2">
          <a href={task.fileUrl} download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-zinc-400 text-[11px] hover:text-white transition-colors">
            <Download className="w-3 h-3" />Tải file kết quả
          </a>
          <a href={task.fileUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-zinc-400 text-[11px] hover:text-white transition-colors">
            <ExternalLink className="w-3 h-3" />Mở tab mới
          </a>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────
const PageReview = () => {
  const qc = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'revision' | null>(null);
  const [reviewNotes,  setReviewNotes]  = useState('');
  const [filterStatus, setFilterStatus] = useState('submitted');
  const [zoom,         setZoom]         = useState(1);

  const { data: tasks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks', 'pending-review'],
    queryFn: () => taskService.getPendingReview(),
  });

  const closeModal = () => {
    setSelectedTask(null);
    setReviewAction(null);
    setReviewNotes('');
    setZoom(1);
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => taskService.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', 'pending-review'] }); closeModal(); },
  });

  const revisionMutation = useMutation({
    mutationFn: ({ taskId, note }: { taskId: string; note: string }) =>
      taskService.requestRevision(taskId, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', 'pending-review'] }); closeModal(); },
  });

  const handleConfirm = () => {
    if (!selectedTask || !reviewAction) return;
    if (reviewAction === 'approve') {
      approveMutation.mutate(selectedTask.id);
    } else {
      if (!reviewNotes.trim()) return;
      revisionMutation.mutate({ taskId: selectedTask.id, note: reviewNotes });
    }
  };
  const isSubmitting = approveMutation.isPending || revisionMutation.isPending;

  const filtered = filterStatus === 'all'
    ? (tasks as any[])
    : (tasks as any[]).filter((t: any) => t.status === filterStatus);

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
    </div>
  );
  if (isError) return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <button onClick={() => refetch()}
        className="px-4 py-2 rounded-xl bg-violet-600/20 text-violet-300 text-sm border border-violet-500/20">
        Thử lại
      </button>
    </div>
  );

  return (
    <div className="min-h-full bg-[#0a0a12] text-white">

      {/* Header */}
      <div className="relative border-b border-violet-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 left-0 w-64 h-64 rounded-full bg-fuchsia-600/8 blur-3xl" />
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-fuchsia-500 mb-2">Mangaka · Duyệt trang</p>
          <h1 className="text-2xl font-black font-['Syne']">Duyệt trang hoàn thiện</h1>
          <p className="text-sm text-zinc-600 mt-1">Xem và phê duyệt công việc từ trợ lý</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label:'Cần duyệt', count:(tasks as any[]).filter((t:any) => t.status==='submitted').length,        color:'text-violet-400',  ring:'ring-violet-500/20',  bg:'bg-violet-500/8'  },
            { label:'Đã duyệt',  count:(tasks as any[]).filter((t:any) => t.status==='approved').length,         color:'text-emerald-400', ring:'ring-emerald-500/20', bg:'bg-emerald-500/8' },
            { label:'Cần sửa',   count:(tasks as any[]).filter((t:any) => t.status==='revision_needed').length,  color:'text-amber-400',   ring:'ring-amber-500/20',   bg:'bg-amber-500/8'   },
            { label:'Tổng',      count:(tasks as any[]).length,                                                   color:'text-zinc-300',    ring:'ring-zinc-700/20',    bg:'bg-zinc-500/5'    },
          ].map((s, i) => (
            <div key={i} className={`rounded-2xl ring-1 ${s.ring} ${s.bg} px-5 py-4`}>
              <div className={`text-3xl font-black font-['Syne'] ${s.color}`}>{s.count}</div>
              <div className="text-[11px] text-zinc-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1">
          {[
            { v:'all',             l:'Tất cả'  },
            { v:'submitted',       l:'Cần duyệt' },
            { v:'approved',        l:'Đã duyệt'  },
            { v:'revision_needed', l:'Cần sửa'   },
          ].map(f => (
            <button key={f.v} onClick={() => setFilterStatus(f.v)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                filterStatus === f.v
                  ? 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25'
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
              }`}>
              {f.l}
              {f.v !== 'all' && (
                <span className={`text-[10px] px-1.5 rounded-full ${
                  filterStatus === f.v ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-white/8 text-zinc-500'
                }`}>
                  {(tasks as any[]).filter((t:any) => t.status === f.v).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <Film className="w-10 h-10 opacity-20" />
            <p className="text-sm">
              {filterStatus === 'submitted' ? 'Không có trang nào cần duyệt' : 'Không có trang nào'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((task: any) => {
              const st = STATUS_MAP[task.status] ?? STATUS_MAP.pending;
              return (
                <div key={task.id}
                  onClick={() => { setSelectedTask(task); setReviewAction(null); setZoom(1); }}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-fuchsia-500/30 cursor-pointer transition-all hover:scale-[1.02]">

                  {/* Thumbnail */}
                  <div className="aspect-[3/4] bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 relative flex items-center justify-center overflow-hidden">
                    {task.fileUrl
                      ? <img src={task.fileUrl} alt="Result" className="w-full h-full object-cover" />
                      : <Film className="w-8 h-8 text-violet-500/20" />
                    }
                    <div className="absolute top-2 right-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${st.pill}`}>
                        {st.label}
                      </span>
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="text-[12px] font-semibold text-white truncate">{task.title}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {TASK_TYPE_LABEL[task.taskType] ?? task.taskType}
                    </p>
                    {task.revisionNotes && task.status === 'revision_needed' && (
                      <p className="text-[10px] text-amber-400 mt-1.5 line-clamp-2">{task.revisionNotes}</p>
                    )}
                  </div>
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

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold text-white">{selectedTask.title}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${(STATUS_MAP[selectedTask.status] ?? STATUS_MAP.pending).pill}`}>
                    {(STATUS_MAP[selectedTask.status] ?? STATUS_MAP.pending).label}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  {TASK_TYPE_LABEL[selectedTask.taskType] ?? selectedTask.taskType}
                  {selectedTask.assignedTo && ` · ${selectedTask.assignedTo}`}
                </p>
              </div>
              <button onClick={closeModal}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* Image preview */}
              <ResultPreview
                task={selectedTask}
                zoom={zoom}
                onZoomIn={() => setZoom(z => Math.min(2, z + 0.25))}
                onZoomOut={() => setZoom(z => Math.max(0.5, z - 0.25))}
              />

              {/* Assistant note */}
              {selectedTask.notes && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-white/3 border border-white/6 rounded-xl">
                  <MessageSquare className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1">Ghi chú từ Assistant</p>
                    <p className="text-[12px] text-zinc-300 leading-relaxed">{selectedTask.notes}</p>
                  </div>
                </div>
              )}

              {/* Already approved */}
              {selectedTask.status === 'approved' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-[12px] text-emerald-300 font-semibold">Trang này đã được phê duyệt</p>
                </div>
              )}

              {/* Already revision */}
              {selectedTask.status === 'revision_needed' && (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-500/8 border border-amber-500/15 rounded-xl">
                  <RotateCcw className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">Đã yêu cầu chỉnh sửa</p>
                    {selectedTask.revisionNotes && (
                      <p className="text-[12px] text-zinc-300">{selectedTask.revisionNotes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Decision — only for submitted */}
              {selectedTask.status === 'submitted' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setReviewAction('approve')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                        reviewAction === 'approve'
                          ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border border-white/8 text-zinc-400 hover:bg-white/8'
                      }`}>
                      <CheckCircle2 className="w-4 h-4" />Phê duyệt
                    </button>
                    <button onClick={() => setReviewAction('revision')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                        reviewAction === 'revision'
                          ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                          : 'bg-white/5 border border-white/8 text-zinc-400 hover:bg-white/8'
                      }`}>
                      <RotateCcw className="w-4 h-4" />Yêu cầu sửa
                    </button>
                  </div>

                  {reviewAction && (
                    <div className="space-y-2">
                      {reviewAction === 'revision' && (
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                          Mô tả điểm cần sửa <span className="text-red-400">*</span>
                        </label>
                      )}
                      <textarea rows={reviewAction === 'revision' ? 4 : 2}
                        value={reviewNotes}
                        onChange={e => setReviewNotes(e.target.value)}
                        placeholder={reviewAction === 'approve'
                          ? 'Nhận xét (tùy chọn)...'
                          : 'Mô tả cụ thể chỗ cần chỉnh sửa...'}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500/40 resize-none transition-all" />
                    </div>
                  )}

                  {(approveMutation.isError || revisionMutation.isError) && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />Có lỗi xảy ra. Vui lòng thử lại.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
              {selectedTask.status === 'submitted' ? (
                <div className="flex gap-2">
                  <button onClick={closeModal} disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50">
                    Huỷ
                  </button>
                  <button onClick={handleConfirm}
                    disabled={!reviewAction || (reviewAction === 'revision' && !reviewNotes.trim()) || isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-600/30 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                    {isSubmitting
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang xử lý</>
                      : reviewAction === 'approve' ? <><CheckCircle2 className="w-3.5 h-3.5" />Phê duyệt</>
                      : reviewAction === 'revision' ? <><RotateCcw className="w-3.5 h-3.5" />Gửi yêu cầu</>
                      : 'Xác nhận'}
                  </button>
                </div>
              ) : (
                <button onClick={closeModal}
                  className="w-full py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 hover:text-white transition-colors">
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageReview;
