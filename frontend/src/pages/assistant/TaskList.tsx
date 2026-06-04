import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ListTodo, CheckCircle2, AlertCircle, Clock, Upload, X, Loader2, FileImage } from 'lucide-react';
import api from '@/lib/axios';
import { taskService } from '@/services/taskService';

const FILTERS = [
  { id: 'all',               label: 'Tất cả'  },
  { id: 'pending',           label: 'Chờ làm' },
  { id: 'in_progress',       label: 'Đang làm'},
  { id: 'submitted',         label: 'Đã nộp'  },
  { id: 'revision_required', label: 'Cần sửa' },
  { id: 'approved',          label: 'Đã duyệt'},
];

const STATUS_MAP: Record<string, { label:string; pill:string }> = {
  pending:           { label:'Chờ làm', pill:'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'         },
  in_progress:       { label:'Đang làm',pill:'bg-blue-500/10 text-blue-300 border-blue-500/20'          },
  submitted:         { label:'Đã nộp',  pill:'bg-violet-500/10 text-violet-300 border-violet-500/20'    },
  revision_required: { label:'Cần sửa', pill:'bg-orange-500/10 text-orange-300 border-orange-500/20'    },
  approved:          { label:'Đã duyệt',pill:'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
};

const TaskList = () => {
  const qc = useQueryClient();
  const [activeFilter,    setActiveFilter]    = useState('all');
  const [showModal,       setShowModal]       = useState(false);
  const [selectedTask,    setSelectedTask]    = useState<any>(null);
  const [fileUrl,         setFileUrl]         = useState('');
  const [uploadFile,      setUploadFile]      = useState<File|null>(null);
  const [note,            setNote]            = useState('');
  const [submitError,     setSubmitError]     = useState('');

  // ✅ GET /api/tasks/my
  const { data: taskData, isLoading } = useQuery({
    queryKey: ['tasks', 'my', activeFilter],
    queryFn: async () => {
      const params: any = { page: 1, limit: 50 };
      if (activeFilter !== 'all') params.status = activeFilter;
      const res = await api.get('/tasks/my', { params });
      return res.data.data;
    },
  });

  const tasks = Array.isArray(taskData)
    ? taskData
    : (taskData?.content ?? taskData?.items ?? []);

  // ✅ POST /api/tasks/{id}/submit
  const submitMutation = useMutation({
    mutationFn: ({ taskId, url, n }: { taskId: string; url: string; n: string }) =>
      taskService.submit(taskId, url, n),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', 'my'] });
      closeModal();
    },
    onError: (e: any) => setSubmitError(e.response?.data?.message ?? 'Nộp thất bại'),
  });

  const closeModal = () => { setShowModal(false); setSelectedTask(null); setFileUrl(''); setUploadFile(null); setNote(''); setSubmitError(''); };

  const handleSubmit = () => {
    if (!fileUrl && !uploadFile) { setSubmitError('Vui lòng nhập URL hoặc chọn file'); return; }
    const url = uploadFile ? URL.createObjectURL(uploadFile) : fileUrl;
    submitMutation.mutate({ taskId: selectedTask.id, url, n: note });
  };

  const PRIORITY_MAP: Record<string, string> = {
    urgent: 'text-red-400 bg-red-500/10 border-red-500/20',
    high:   'text-orange-400 bg-orange-500/10 border-orange-500/20',
    normal: 'text-zinc-500 bg-zinc-500/8 border-zinc-500/15',
    low:    'text-zinc-600 bg-zinc-500/5 border-zinc-500/10',
  };

  return (
    <div className="min-h-full bg-[#080e1a] text-white">

      {/* Header */}
      <div className="relative border-b border-blue-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 left-0 w-64 h-64 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-blue-500 mb-2">Assistant · Tasks</p>
          <h1 className="text-2xl font-black font-['Syne']">Công việc của tôi</h1>
          <p className="text-sm text-zinc-600 mt-1">Xem task được giao và nộp kết quả</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* Filters */}
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                activeFilter === f.id
                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
              }`}>{f.label}</button>
          ))}
        </div>

        {/* Task list */}
        {isLoading ? (
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-white/4 last:border-0">
                <div className="flex-1 space-y-2"><div className="h-3 bg-white/5 rounded-full w-48 animate-pulse"/><div className="h-2 bg-white/5 rounded-full w-24 animate-pulse"/></div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <ListTodo className="w-10 h-10 opacity-20" />
            <p className="text-sm">Không có task nào</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            <div className="grid grid-cols-[1fr_7rem_6rem_7rem_5rem] gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-700">
              <span>Task</span><span className="text-center">Loại</span><span className="text-center">Ưu tiên</span><span className="text-center">Deadline</span><span className="text-center">Trạng thái</span>
            </div>
            {tasks.map((task: any) => {
              const st = STATUS_MAP[task.status] ?? STATUS_MAP.pending;
              return (
                <div key={task.id} className="grid grid-cols-[1fr_7rem_6rem_7rem_5rem] gap-4 px-6 py-4 items-center border-b border-white/4 last:border-0 hover:bg-white/[0.02] transition-colors group">
                  <div>
                    <p className="text-[13px] font-semibold text-white group-hover:text-blue-300 transition-colors">{task.title}</p>
                    {task.description && <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-1">{task.description}</p>}
                    {task.revisionNote && <p className="text-[11px] text-orange-400 mt-1 line-clamp-1">{task.revisionNote}</p>}
                  </div>
                  <div className="text-center">
                    <span className="text-[11px] text-zinc-500">{task.taskType}</span>
                  </div>
                  <div className="flex justify-center">
                    {task.priority && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_MAP[task.priority] ?? PRIORITY_MAP.normal}`}>
                        {task.priority === 'urgent' ? 'KHẨN' : task.priority === 'high' ? 'CAO' : task.priority === 'low' ? 'THẤP' : 'TB'}
                      </span>
                    )}
                  </div>
                  <div className="text-center text-[11px] text-zinc-600">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : '—'}
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${st.pill}`}>{st.label}</span>
                    {(task.status === 'pending' || task.status === 'in_progress' || task.status === 'revision_required') && (
                      <button onClick={() => { setSelectedTask(task); setShowModal(true); }}
                        className="text-[10px] text-blue-400 hover:text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-md hover:bg-blue-500/8 transition-colors">
                        Nộp
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit modal */}
      {showModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#0d1220] border border-blue-900/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedTask.title}</h3>
                <p className="text-[11px] text-zinc-600">{selectedTask.taskType}</p>
              </div>
              <button onClick={closeModal} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedTask.revisionNote && (
              <div className="p-3 bg-orange-500/8 border border-orange-500/15 rounded-xl">
                <p className="text-[11px] font-semibold text-orange-400 mb-0.5">Yêu cầu chỉnh sửa:</p>
                <p className="text-[11px] text-zinc-400">{selectedTask.revisionNote}</p>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">File kết quả *</label>
              <label className={`flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploadFile ? 'border-blue-500/40 bg-blue-500/5' : 'border-white/8 hover:border-blue-500/25'}`}>
                <input type="file" accept="image/*" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} className="hidden" />
                {uploadFile
                  ? <div className="text-center"><CheckCircle2 className="w-5 h-5 text-blue-400 mx-auto mb-1" /><p className="text-xs text-blue-300">{uploadFile.name}</p></div>
                  : <div className="text-center"><FileImage className="w-5 h-5 text-zinc-700 mx-auto mb-1" /><p className="text-xs text-zinc-600">Click để chọn</p></div>}
              </label>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-px bg-white/6" />
                <span className="text-[10px] text-zinc-700">hoặc</span>
                <div className="flex-1 h-px bg-white/6" />
              </div>
              <input type="text" value={fileUrl} onChange={e => { setFileUrl(e.target.value); setUploadFile(null); }}
                placeholder="URL file kết quả..."
                className="mt-2 w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/40 transition-all" />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">Ghi chú</label>
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                placeholder="Ghi chú cho Mangaka..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/40 resize-none transition-all" />
            </div>

            {submitError && <p className="text-xs text-red-400">{submitError}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={closeModal} disabled={submitMutation.isPending}
                className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 hover:text-white transition-colors">Huỷ</button>
              <button onClick={handleSubmit} disabled={submitMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-blue-600/25 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                {submitMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang nộp...</> : <><Upload className="w-3.5 h-3.5" />Nộp kết quả</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
