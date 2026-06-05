import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, MessageSquare, Eye, AlertCircle, Loader2, Film } from 'lucide-react';
import { taskService } from '@/services/taskService';

const PageReview = () => {
  const qc = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve'|'revision'|null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('submitted');

  const { data: tasks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks', 'pending-review'],
    queryFn: () => taskService.getPendingReview(),
  });

  const approveMutation  = useMutation({ mutationFn: (id:string)=>taskService.approve(id), onSuccess: ()=>{ qc.invalidateQueries({queryKey:['tasks','pending-review']}); closeModal(); } });
  const revisionMutation = useMutation({ mutationFn: ({taskId,note}:{taskId:string;note:string})=>taskService.requestRevision(taskId,note), onSuccess: ()=>{ qc.invalidateQueries({queryKey:['tasks','pending-review']}); closeModal(); } });

  const closeModal = () => { setShowModal(false); setSelectedTask(null); setReviewAction(null); setReviewNotes(''); };
  const handleConfirm = () => {
    if (!selectedTask || !reviewAction) return;
    if (reviewAction === 'approve') approveMutation.mutate(selectedTask.id);
    else { if (!reviewNotes.trim()) return; revisionMutation.mutate({taskId:selectedTask.id,note:reviewNotes}); }
  };
  const isSubmitting = approveMutation.isPending || revisionMutation.isPending;

  const STATUS_MAP: Record<string,(any)> = {
    submitted:         { label:'Cần duyệt', pill:'bg-violet-500/10 text-violet-300 border-violet-500/20' },
    approved:          { label:'Đã duyệt',  pill:'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'},
    revision_needed:   { label:'Cần sửa',   pill:'bg-amber-500/10 text-amber-300 border-amber-500/20'    },
    in_progress:       { label:'Đang làm',  pill:'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'       },
  };

  const filtered = filterStatus === 'all' ? (tasks as any[]) : (tasks as any[]).filter((t:any)=>t.status===filterStatus);

  if (isLoading) return <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center"><Loader2 className="w-7 h-7 text-violet-400 animate-spin" /></div>;
  if (isError)   return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <button onClick={()=>refetch()} className="px-4 py-2 rounded-xl bg-violet-600/20 text-violet-300 text-sm border border-violet-500/20 hover:bg-violet-600/30 transition-colors">Thử lại</button>
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
            { label:'Cần duyệt', count:(tasks as any[]).filter((t:any)=>t.status==='submitted').length,         color:'text-violet-400', ring:'ring-violet-500/20', bg:'bg-violet-500/8' },
            { label:'Đã duyệt',  count:(tasks as any[]).filter((t:any)=>t.status==='approved').length,          color:'text-emerald-400',ring:'ring-emerald-500/20',bg:'bg-emerald-500/8'},
            { label:'Cần sửa',   count:(tasks as any[]).filter((t:any)=>t.status==='revision_needed').length,  color:'text-amber-400', ring:'ring-amber-500/20',  bg:'bg-amber-500/8'  },
            { label:'Tổng',      count:(tasks as any[]).length,                                                  color:'text-zinc-300',  ring:'ring-zinc-700/20',   bg:'bg-zinc-500/5'   },
          ].map((s,i)=>(
            <div key={i} className={`rounded-2xl ring-1 ${s.ring} ${s.bg} px-5 py-4 flex items-end justify-between`}>
              <div>
                <div className={`text-3xl font-black font-['Syne'] ${s.color}`}>{s.count}</div>
                <div className="text-[11px] text-zinc-600 mt-1">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1">
          {[{v:'all',l:'Tất cả'},{v:'submitted',l:'Cần duyệt'},{v:'approved',l:'Đã duyệt'},{v:'revision_needed',l:'Cần sửa'}].map(f=>(
            <button key={f.v} onClick={()=>setFilterStatus(f.v)}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                filterStatus===f.v ? 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
              }`}>{f.l}</button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <Film className="w-10 h-10 opacity-20" />
            <p className="text-sm">Không có trang nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((task:any) => {
              const st = STATUS_MAP[task.status] ?? STATUS_MAP.in_progress;
              return (
                <div key={task.id}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-violet-500/30 transition-all">
                  {/* Preview */}
                  <div className="aspect-[3/4] bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 relative flex items-center justify-center">
                    {task.fileUrl
                      ? <img src={task.fileUrl} alt="Result" className="w-full h-full object-cover" />
                      : <Film className="w-8 h-8 text-violet-500/20" />}
                    <div className="absolute top-2 right-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${st.pill}`}>{st.label}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-[12px] font-semibold text-white truncate">{task.title}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{task.taskType}</p>
                    {task.revisionNote && (
                      <p className="text-[10px] text-amber-400 mt-1.5 line-clamp-2">{task.revisionNote}</p>
                    )}
                    {task.status === 'submitted' && (
                      <button onClick={()=>{setSelectedTask(task);setShowModal(true);}}
                        className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-violet-600/15 border border-violet-500/20 text-violet-300 text-[11px] font-semibold hover:bg-violet-600/25 transition-colors">
                        <Eye className="w-3 h-3" />Duyệt
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#111118] border border-violet-900/30 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <p className="text-sm font-bold text-white">{selectedTask.title}</p>
                <p className="text-[11px] text-zinc-500">{selectedTask.taskType}</p>
              </div>
              <button onClick={closeModal} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {selectedTask.fileUrl && (
                <div className="aspect-[3/4] rounded-xl overflow-hidden max-h-48 object-contain bg-black/30">
                  <img src={selectedTask.fileUrl} alt="Result" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="bg-violet-500/8 border border-violet-500/15 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <MessageSquare className="w-3 h-3 text-violet-400" />
                  <span className="text-[11px] font-semibold text-violet-300">Annotation tool</span>
                </div>
                <p className="text-[10px] text-zinc-600">Công cụ vẽ ghi chú sẽ có trong Sprint 2</p>
              </div>

              {/* Decision */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={()=>setReviewAction('approve')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    reviewAction==='approve' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-white/5 border border-white/8 text-zinc-400 hover:bg-white/8'
                  }`}><CheckCircle2 className="w-4 h-4" />Phê duyệt</button>
                <button onClick={()=>setReviewAction('revision')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    reviewAction==='revision' ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300' : 'bg-white/5 border border-white/8 text-zinc-400 hover:bg-white/8'
                  }`}><XCircle className="w-4 h-4" />Yêu cầu sửa</button>
              </div>

              {reviewAction && (
                <textarea rows={3} value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)}
                  placeholder={reviewAction==='approve' ? 'Nhận xét (tùy chọn)...' : 'Mô tả điểm cần sửa... *'}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 resize-none transition-all" />
              )}

              {(approveMutation.isError || revisionMutation.isError) && (
                <p className="text-xs text-red-400">Có lỗi xảy ra. Vui lòng thử lại.</p>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={closeModal} disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50">Huỷ</button>
                <button onClick={handleConfirm}
                  disabled={!reviewAction||(reviewAction==='revision'&&!reviewNotes.trim())||isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-600/30 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang xử lý</> : 'Xác nhận'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageReview;
