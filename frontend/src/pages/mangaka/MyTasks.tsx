import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList, Loader2, AlertCircle, RefreshCw, Search, Filter,
  Clock, User, CheckCircle2, XCircle, Pencil, Trash2, X, AlertTriangle,
  Send, Calendar,
} from 'lucide-react';
import api from '@/lib/axios';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { label: string; cls: string; dot: string }> = {
  pending:     { label: 'Chờ nhận',   cls: 'bg-zinc-500/12 text-zinc-300 border-zinc-500/25',      dot: 'bg-zinc-400'    },
  in_progress: { label: 'Đang làm',   cls: 'bg-blue-500/12 text-blue-300 border-blue-500/25',      dot: 'bg-blue-400'    },
  submitted:   { label: 'Đã nộp',     cls: 'bg-amber-500/12 text-amber-300 border-amber-500/25',   dot: 'bg-amber-400'   },
  approved:    { label: 'Duyệt xong', cls: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25', dot: 'bg-emerald-400' },
  revision:    { label: 'Cần sửa',    cls: 'bg-red-500/12 text-red-300 border-red-500/25',         dot: 'bg-red-400'     },
};

const PRIORITY_STYLE: Record<string, string> = {
  low:    'text-zinc-500',
  normal: 'text-blue-400',
  high:   'text-amber-400',
  urgent: 'text-red-400 font-bold',
};

const TASK_TYPE_LABEL: Record<string, string> = {
  drawing: 'Vẽ nền', toning: 'Tô bóng', effects: 'Hiệu ứng',
  screentone: 'Screentone', dialogue: 'Hộp thoại', correction: 'Chỉnh sửa', other: 'Khác',
};

const getDaysUntil = (dueDate?: string) => {
  if (!dueDate) return null;
  const target = new Date(dueDate).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (86400000));
};

// ────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────
export default function MyTasks() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editTask, setEditTask] = useState<any>(null);
  const [deleteTask, setDeleteTask] = useState<any>(null);

  // GET /api/tasks/assigned-by-me
  const { data: tasks = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['tasks', 'assigned-by-me'],
    queryFn: async () => {
      const r = await api.get('/tasks/assigned-by-me');
      return r.data.data ?? [];
    },
  });

  // Danh sách assistant (để dropdown khi đổi assignee)
  const { data: assistants = [] } = useQuery({
    queryKey: ['assistants'],
    queryFn: async () => (await api.get('/users/assistants')).data.data ?? [],
  });

  // Filter + search
  const filtered = useMemo(() => {
    const list = tasks as any[];
    return list.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!(t.title?.toLowerCase().includes(q) ||
              t.assignedToName?.toLowerCase().includes(q) ||
              t.description?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [tasks, filterStatus, search]);

  // Stats
  const stats = useMemo(() => {
    const list = tasks as any[];
    return {
      total:       list.length,
      pending:     list.filter(t => t.status === 'pending').length,
      inProgress:  list.filter(t => t.status === 'in_progress').length,
      submitted:   list.filter(t => t.status === 'submitted').length,
      approved:    list.filter(t => t.status === 'approved').length,
      overdue:     list.filter(t =>
        t.status !== 'approved' && t.dueDate &&
        new Date(t.dueDate).getTime() < Date.now()
      ).length,
    };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-[#0b0b0f]">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black font-['Syne'] text-white flex items-center gap-3">
              <ClipboardList className="w-6 h-6 text-orange-400" />Task đã giao
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Quản lý toàn bộ task đã giao cho trợ lý — sửa deadline, đổi người, hoặc huỷ
            </p>
          </div>
          <button onClick={() => refetch()}
            className="w-9 h-9 rounded-lg bg-white/5 border border-white/8 text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-6 gap-3 mt-5">
          {[
            { label: 'Tổng',        value: stats.total,      color: 'text-zinc-300' },
            { label: 'Chờ nhận',    value: stats.pending,    color: 'text-zinc-400' },
            { label: 'Đang làm',    value: stats.inProgress, color: 'text-blue-400' },
            { label: 'Đã nộp',      value: stats.submitted,  color: 'text-amber-400' },
            { label: 'Duyệt xong',  value: stats.approved,   color: 'text-emerald-400' },
            { label: 'Quá hạn',     value: stats.overdue,    color: stats.overdue > 0 ? 'text-red-400' : 'text-zinc-700' },
          ].map((s, i) => (
            <div key={i} className="bg-white/3 border border-white/6 rounded-xl px-4 py-3">
              <div className={`text-2xl font-black font-['Syne'] ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-5">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên task, trợ lý, mô tả..."
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/40" />
          </div>
          <div className="flex items-center gap-1.5 bg-white/3 border border-white/6 rounded-xl p-1">
            <Filter className="w-3.5 h-3.5 text-zinc-600 mx-2" />
            {[
              { v: 'all',         l: 'Tất cả'    },
              { v: 'pending',     l: 'Chờ nhận'  },
              { v: 'in_progress', l: 'Đang làm'  },
              { v: 'submitted',   l: 'Đã nộp'    },
              { v: 'approved',    l: 'Duyệt xong'},
              { v: 'revision',    l: 'Cần sửa'   },
            ].map(f => (
              <button key={f.v} onClick={() => setFilterStatus(f.v)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  filterStatus === f.v
                    ? 'bg-orange-500/20 border border-orange-500/30 text-orange-300'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}>{f.l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-8">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-orange-400 animate-spin" /></div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 gap-3 text-zinc-500">
            <AlertCircle className="w-10 h-10 text-red-400 opacity-40" />
            <p className="text-sm">Không tải được dữ liệu</p>
            <button onClick={() => refetch()} className="text-xs text-orange-400 border border-orange-500/25 px-3 py-1.5 rounded-lg">Thử lại</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-zinc-700">
            <ClipboardList className="w-10 h-10 opacity-20" />
            <p className="text-sm">
              {tasks.length === 0 ? 'Chưa giao task nào' : 'Không có task nào khớp bộ lọc'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t: any) => (
              <TaskRow key={t.id} task={t}
                onEdit={() => setEditTask(t)}
                onDelete={() => setDeleteTask(t)} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {editTask && (
        <EditTaskModal task={editTask} assistants={assistants as any[]}
          onClose={() => setEditTask(null)}
          onSuccess={() => { setEditTask(null); qc.invalidateQueries({ queryKey: ['tasks', 'assigned-by-me'] }); }} />
      )}
      {deleteTask && (
        <DeleteTaskModal task={deleteTask}
          onClose={() => setDeleteTask(null)}
          onSuccess={() => { setDeleteTask(null); qc.invalidateQueries({ queryKey: ['tasks', 'assigned-by-me'] }); }} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TaskRow
// ────────────────────────────────────────────────────────────
const TaskRow = ({ task, onEdit, onDelete }:
  { task: any; onEdit: () => void; onDelete: () => void }) => {
  const st = STATUS_STYLE[task.status] ?? { label: task.status, cls: 'bg-white/5 text-zinc-400 border-white/8', dot: 'bg-zinc-500' };
  const days = getDaysUntil(task.dueDate);
  const isOverdue = task.status !== 'approved' && days != null && days < 0;
  const isUrgent  = task.status !== 'approved' && days != null && days >= 0 && days <= 1;

  const canEdit   = task.status === 'pending';
  const canDelete = task.status !== 'approved';

  return (
    <div className={`rounded-xl border px-5 py-4 transition-all hover:bg-white/[0.02] ${
      isOverdue ? 'border-red-500/25 bg-red-500/3' : 'border-white/6 bg-white/[0.015]'
    }`}>
      <div className="flex items-start gap-4">
        {/* Left: Preview page thumbnail */}
        <div className="w-14 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/30 flex-shrink-0">
          {task.pageImageUrl
            ? <img src={task.pageImageUrl} alt="Page" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px]">—</div>}
        </div>

        {/* Middle: content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
            {task.taskType && (
              <span className="text-[10px] text-zinc-500 bg-white/4 border border-white/6 px-1.5 py-0.5 rounded">
                {TASK_TYPE_LABEL[task.taskType] ?? task.taskType}
              </span>
            )}
            {task.priority && task.priority !== 'normal' && (
              <span className={`text-[10px] uppercase tracking-wider ${PRIORITY_STYLE[task.priority] ?? 'text-zinc-500'}`}>
                {task.priority}
              </span>
            )}
          </div>
          <p className="text-[13px] font-bold text-white truncate">{task.title || 'Không có tiêu đề'}</p>
          {task.description && (
            <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">{task.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-600">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.assignedToName ?? 'Chưa gán'}
            </span>
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400 font-semibold' : isUrgent ? 'text-amber-400' : ''}`}>
                <Clock className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                {days != null && (
                  <span className="ml-1">
                    ({days < 0 ? `quá ${Math.abs(days)} ngày` : days === 0 ? 'hôm nay' : `còn ${days} ngày`})
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} disabled={!canEdit}
            title={canEdit ? 'Sửa task' : 'Chỉ sửa được khi task đang chờ nhận (pending)'}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center transition-all">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} disabled={!canDelete}
            title={canDelete ? 'Huỷ task' : 'Task đã duyệt — không huỷ được'}
            className="w-8 h-8 rounded-lg bg-red-500/8 border border-red-500/15 text-red-400 hover:bg-red-500/15 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// EditTaskModal
// ────────────────────────────────────────────────────────────
const EditTaskModal = ({ task, assistants, onClose, onSuccess }:
  { task: any; assistants: any[]; onClose: () => void; onSuccess: () => void }) => {
  const [form, setForm] = useState({
    assignedTo:  task.assignedTo ?? '',
    title:       task.title ?? '',
    description: task.description ?? '',
    priority:    task.priority ?? 'normal',
    dueDate:     task.dueDate ? task.dueDate.slice(0, 10) : '',
  });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => api.put(`/tasks/${task.id}`, data).then(r => r.data),
    onSuccess,
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Cập nhật thất bại'),
  });

  const submit = () => {
    setErr('');
    if (!form.title.trim()) { setErr('Vui lòng nhập tiêu đề'); return; }
    if (!form.dueDate)      { setErr('Vui lòng chọn deadline'); return; }
    mutation.mutate({
      assignedTo:  form.assignedTo,
      title:       form.title,
      description: form.description,
      priority:    form.priority,
      dueDate:     form.dueDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => !mutation.isPending && onClose()}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[#111118] border border-orange-900/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Pencil className="w-4 h-4 text-orange-400" />Sửa task
          </h3>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-3 flex-1 overflow-y-auto min-h-0">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">Tiêu đề *</label>
            <input value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/40" />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">Mô tả</label>
            <textarea rows={3} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/40 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />Deadline *
              </label>
              <input type="date" value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/40" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">Ưu tiên</label>
              <select value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/40">
                <option value="low" className="bg-[#111118]">Thấp</option>
                <option value="normal" className="bg-[#111118]">Bình thường</option>
                <option value="high" className="bg-[#111118]">Cao</option>
                <option value="urgent" className="bg-[#111118]">Khẩn cấp</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
              <User className="w-3 h-3 inline mr-1" />Trợ lý
            </label>
            <select value={form.assignedTo}
              onChange={e => setForm({ ...form, assignedTo: e.target.value })}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/40 disabled:opacity-50">
              {assistants.map((a: any) => (
                <option key={a.id} value={a.id} className="bg-[#111118]">{a.name ?? a.username}</option>
              ))}
            </select>
          </div>

          {err && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2">{err}</p>}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/5 flex-shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-white/8 text-zinc-400 hover:bg-white/5 hover:text-white">
            Huỷ
          </button>
          <button onClick={submit} disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold hover:shadow-lg hover:shadow-orange-600/25 disabled:opacity-60 transition-all">
            {mutation.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang lưu...</>
              : <><CheckCircle2 className="w-3.5 h-3.5" />Lưu thay đổi</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// DeleteTaskModal
// ────────────────────────────────────────────────────────────
const DeleteTaskModal = ({ task, onClose, onSuccess }:
  { task: any; onClose: () => void; onSuccess: () => void }) => {
  const mutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${task.id}`).then(r => r.data),
    onSuccess,
    onError: (e: any) => alert(e.response?.data?.message ?? 'Huỷ task thất bại'),
  });

  const dangerLevel = task.status === 'submitted' ? 'high' : 'normal';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => !mutation.isPending && onClose()}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[#111118] border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 space-y-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
            dangerLevel === 'high'
              ? 'bg-red-500/15 border-red-500/35'
              : 'bg-red-500/10 border-red-500/25'
          }`}>
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Huỷ task "{task.title || 'Không tiêu đề'}"?</h3>
          <p className="text-[12px] text-zinc-500 leading-relaxed">
            {dangerLevel === 'high'
              ? <>Trợ lý <span className="text-white font-semibold">{task.assignedToName}</span> đã nộp kết quả cho task này.
                  Huỷ sẽ <span className="text-red-400 font-semibold">mất toàn bộ kết quả đã nộp</span>. Không thể hoàn tác.</>
              : <>Task sẽ bị xoá vĩnh viễn. Trợ lý sẽ được thông báo nếu đang thực hiện.</>}
          </p>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/5">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-white/8 text-zinc-400 hover:bg-white/5 hover:text-white">
            Không huỷ
          </button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-red-600/20 border border-red-500/30 text-red-300 font-semibold hover:bg-red-600/30 disabled:opacity-60 transition-all">
            {mutation.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang huỷ...</>
              : <><Trash2 className="w-3.5 h-3.5" />Huỷ task</>}
          </button>
        </div>
      </div>
    </div>
  );
};
