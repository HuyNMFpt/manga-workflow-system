import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ListTodo, CheckCircle2, AlertCircle, Clock, Upload, X, Loader2,
  FileImage, Download, Play, ChevronRight, Eye, RotateCcw,
  FileText, Layers, AlertTriangle
} from 'lucide-react';

// Màu pin theo task type — đồng bộ với TaskAssignment
const PIN_COLORS: Record<string, string> = {
  background: '#60a5fa',
  shading:    '#a78bfa',
  effect:     '#fb923c',
  screentone: '#34d399',
  dialog:     '#facc15',
  touch_up:   '#f472b6',
  other:      '#71717a',
};
import api from '@/lib/axios';
import { taskService } from '@/services/taskService';

// ─── Constants ────────────────────────────────────────────────────
const FILTERS = [
  { id: 'all',             label: 'Tất cả'  },
  { id: 'pending',         label: 'Chờ làm' },
  { id: 'in_progress',     label: 'Đang làm'},
  { id: 'submitted',       label: 'Đã nộp'  },
  { id: 'revision_needed', label: 'Cần sửa' },
  { id: 'approved',        label: 'Đã duyệt'},
];

const STATUS_MAP: Record<string, { label: string; pill: string; dot: string }> = {
  pending:         { label:'Chờ làm',  pill:'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',         dot:'bg-zinc-500'     },
  in_progress:     { label:'Đang làm', pill:'bg-blue-500/10 text-blue-300 border-blue-500/20',          dot:'bg-blue-400'     },
  submitted:       { label:'Đã nộp',   pill:'bg-violet-500/10 text-violet-300 border-violet-500/20',    dot:'bg-violet-400'   },
  revision_needed: { label:'Cần sửa',  pill:'bg-orange-500/10 text-orange-300 border-orange-500/20',    dot:'bg-orange-400'   },
  approved:        { label:'Đã duyệt', pill:'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', dot:'bg-emerald-400'  },
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'KHẨN', high: 'CAO', normal: 'TB', low: 'THẤP',
};
const PRIORITY_PILL: Record<string, string> = {
  urgent: 'text-red-400 bg-red-500/10 border-red-500/20',
  high:   'text-orange-400 bg-orange-500/10 border-orange-500/20',
  normal: 'text-zinc-500 bg-zinc-500/8 border-zinc-500/15',
  low:    'text-zinc-600 bg-zinc-500/5 border-zinc-500/10',
};

const TASK_TYPE_LABEL: Record<string, string> = {
  background:  'Vẽ nền',
  shading:     'Tô bóng',
  effect:      'Hiệu ứng',
  screentone:  'Screentone',
  dialog:      'Hộp thoại',
  touch_up:    'Chỉnh sửa',
  other:       'Khác',
  text_bubble: 'Bong bóng thoại',
  cleanup:     'Làm sạch',
  color:       'Tô màu',
};

// ─── Helpers ──────────────────────────────────────────────────────
const parseRegion = (s?: string) => {
  if (!s) return null;
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
};

// ─── PanelPin: hiện pin + tooltip rõ ràng cho Assistant ───────────
const PanelPin = ({ imageUrl, region, taskType, label, sublabel, index = 0 }: {
  imageUrl?: string; region: any; taskType?: string; label?: string; sublabel?: string; index?: number;
}) => {
  const color = PIN_COLORS[taskType ?? 'other'] ?? '#71717a';
  const isPinStyle = region && (region.width === 0 || region.height === 0);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgRect, setImgRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const calcRect = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const container = img.parentElement!;
    const cw = container.clientWidth, ch = container.clientHeight;
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const rw = img.naturalWidth * scale, rh = img.naturalHeight * scale;
    setImgRect({ left: (cw - rw) / 2, top: (ch - rh) / 2, width: rw, height: rh });
  };
  const pinLeft = imgRect ? imgRect.left + (region?.x / 100) * imgRect.width - 14 : undefined;
  const pinTop  = imgRect ? imgRect.top  + (region?.y / 100) * imgRect.height - 36 : undefined;
  const onRight = region?.x > 55;
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl border border-white/8 bg-black/30">
      {imageUrl
        ? <img ref={imgRef} src={imageUrl} alt="Trang truyện"
            className="absolute inset-0 w-full h-full object-contain" draggable={false} onLoad={calcRect}/>
        : <div className="absolute inset-0 flex items-center justify-center"><Layers className="w-8 h-8 text-zinc-700 opacity-30"/></div>}

      {region && isPinStyle && (
        <div className="absolute" style={
          pinLeft !== undefined
            ? { left: pinLeft, top: pinTop, zIndex: 20 }
            : { left:`calc(${region.x}% - 14px)`, top:`calc(${region.y}% - 36px)`, zIndex: 20 }
        }
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}>
          {/* Pin — chỉ hiện số, hover mới hiện tooltip */}
          <svg width="28" height="36" viewBox="0 0 28 36" className="drop-shadow-lg cursor-pointer">
            <circle cx="14" cy="14" r="13" fill={color} stroke="white" strokeWidth="2.5"/>
            <path d="M14 27 L14 36" stroke={color} strokeWidth="3" strokeLinecap="round"/>
            <text x="14" y="19" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{index+1}</text>
          </svg>
          {/* Tooltip — chỉ hiện khi hover */}
          {hovered && (label || sublabel) && (
            <div className="absolute top-0 pointer-events-none z-30"
              style={onRight
                ? { right: '100%', marginRight: 6, minWidth: 150, maxWidth: 220 }
                : { left: '100%',  marginLeft:  6, minWidth: 150, maxWidth: 220 }}>
              <div className="rounded-xl px-3 py-2.5 shadow-2xl"
                style={{ background: '#0e0e1aee', border: `1px solid ${color}50` }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }}/>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                    {TASK_TYPE_LABEL[taskType ?? ''] ?? taskType}
                  </span>
                </div>
                {label && <p className="text-[12px] font-semibold text-white leading-snug mb-1">{label}</p>}
                {sublabel && <p className="text-[11px] text-zinc-400 leading-relaxed">{sublabel}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {region && !isPinStyle && (
        <div className="absolute border-2 bg-blue-400/10 pointer-events-none"
          style={imgRect ? {
            left: imgRect.left + (region.x / 100) * imgRect.width,
            top:  imgRect.top  + (region.y / 100) * imgRect.height,
            width:  (region.width / 100) * imgRect.width,
            height: (region.height / 100) * imgRect.height,
            borderColor: color,
          } : { left:`${region.x}%`, top:`${region.y}%`, width:`${region.width}%`, height:`${region.height}%`, borderColor: color }}>
          {label && <span className="absolute -top-5 left-0 text-[10px] text-white px-1.5 py-0.5 rounded font-bold whitespace-nowrap" style={{ background: color }}>{label}</span>}
        </div>
      )}
    </div>
  );
};

// ─── RevisionPin: pin cần sửa từ Mangaka ─────────────────────────
const RevisionPin = ({ imageUrl, region, taskType }: { imageUrl?: string; region: any; taskType?: string }) => {
  const color = '#fb923c';
  const isPinStyle = region && (region.width === 0 || region.height === 0);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgRect, setImgRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const calcRect = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const container = img.parentElement!;
    const cw = container.clientWidth, ch = container.clientHeight;
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const rw = img.naturalWidth * scale, rh = img.naturalHeight * scale;
    setImgRect({ left: (cw - rw) / 2, top: (ch - rh) / 2, width: rw, height: rh });
  };
  return (
    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl border border-orange-500/20 bg-black/30">
      {imageUrl
        ? <img ref={imgRef} src={imageUrl} alt="Trang truyện"
            className="absolute inset-0 w-full h-full object-contain" draggable={false}
            onLoad={calcRect}/>
        : <div className="absolute inset-0 flex items-center justify-center"><Layers className="w-7 h-7 text-zinc-700 opacity-30"/></div>}
      {region && isPinStyle && (
        <div className="absolute pointer-events-none" style={imgRect ? {
          left: imgRect.left + (region.x / 100) * imgRect.width - 14,
          top:  imgRect.top  + (region.y / 100) * imgRect.height - 36,
          zIndex: 10
        } : { left:`calc(${region.x}% - 14px)`, top:`calc(${region.y}% - 36px)`, zIndex:10 }}>
          <svg width="28" height="36" viewBox="0 0 28 36" className="drop-shadow-lg animate-bounce">
            <circle cx="14" cy="14" r="13" fill={color} stroke="white" strokeWidth="2"/>
            <path d="M14 27 L14 36" stroke={color} strokeWidth="3" strokeLinecap="round"/>
            <text x="14" y="19" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text>
          </svg>
        </div>
      )}
      {region && !isPinStyle && (
        <div className="absolute border-2 border-orange-400 bg-orange-400/12 pointer-events-none animate-pulse"
          style={imgRect ? {
            left:   imgRect.left + (region.x / 100) * imgRect.width,
            top:    imgRect.top  + (region.y / 100) * imgRect.height,
            width:  (region.width / 100) * imgRect.width,
            height: (region.height / 100) * imgRect.height,
          } : { left:`${region.x}%`, top:`${region.y}%`, width:`${region.width}%`, height:`${region.height}%` }}>
          <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-orange-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-2 h-2 text-white"/>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Helper: download cross-origin file ──────────────────────────
const downloadFile = async (url: string, filename?: string) => {
  try {
    // Thử fetch với credentials để có CORS
    const res = await fetch(url, { mode: 'cors', credentials: 'include' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename ?? url.split('/').pop() ?? 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Fallback: mở tab mới (backend cần thêm CORS cho /uploads/**)
    window.open(url, '_blank');
  }
};
const usePageImage = (pageId?: string, pageImageUrl?: string) =>
  useQuery({
    queryKey: ['page', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      // Nếu backend đã trả pageImageUrl trong TaskDTO → dùng luôn, không fetch thêm
      if (pageImageUrl) return { imageUrl: pageImageUrl };
      // Fallback: GET /api/pages/{id}
      const r = await api.get(`/pages/${pageId}`);
      return r.data.data ?? null;
    },
    enabled: !!pageId,
    staleTime: 5 * 60 * 1000,
  });

// ─── Start task mutation ──────────────────────────────────────────
// Không có endpoint riêng cho "bắt đầu" — dùng submit với status trick
// hoặc nếu backend có PUT /tasks/{id}/start thì dùng đó
// Hiện tại: optimistic update local + nếu backend có PUT /tasks/{id}/start → gọi đó
// Nếu không → chỉ update local state, backend tự chuyển khi assistant submit lần đầu
const useStartTask = () => {
  return useMutation({
    mutationFn: async (taskId: string) => {
      // Thử gọi PUT /tasks/{taskId}/start nếu backend có
      try {
        const r = await api.put(`/tasks/${taskId}/start`);
        return r.data.data;
      } catch {
        // Backend chưa có endpoint này → return null, frontend tự update optimistic
        return null;
      }
    },
  });
};

// ─── Main Component ───────────────────────────────────────────────
const TaskList = () => {
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Submit form state
  const [uploadFile,  setUploadFile]  = useState<File | null>(null);
  const [note,        setNote]        = useState('');
  const [submitError, setSubmitError] = useState('');

  // ── Fetch tasks ────────────────────────────────────────────────
  // GET /api/tasks/my → PAGINATED: res.data.data = { data:[...], ... }
  const { data: taskData, isLoading } = useQuery({
    queryKey: ['tasks', 'my', activeFilter],
    queryFn: async () => {
      const params: any = { page: 1, limit: 50 };
      if (activeFilter !== 'all') params.status = activeFilter;
      const res = await api.get('/tasks/my', { params });
      return res.data.data?.data ?? res.data.data ?? [];
    },
  });
  const tasks: any[] = Array.isArray(taskData)
    ? taskData
    : (taskData?.content ?? taskData?.items ?? []);

  // ── Page image for selected task ───────────────────────────────
  const { data: pageData } = usePageImage(selectedTask?.pageId, selectedTask?.pageImageUrl);

  // ── Mutations ──────────────────────────────────────────────────
  const startMutation = useStartTask();

  const submitMutation = useMutation({
    // POST /api/tasks/{taskId}/submit?fileUrl=...&note=...
    mutationFn: ({ taskId, url, n }: { taskId: string; url: string; n: string }) =>
      taskService.submit(taskId, url, n),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', 'my'] });
      closeModal();
    },
    onError: (e: any) => setSubmitError(e.response?.data?.message ?? 'Nộp thất bại'),
  });

  // ── Handlers ──────────────────────────────────────────────────
  const closeModal = () => {
    setSelectedTask(null);
    setUploadFile(null);
    setNote('');
    setSubmitError('');
  };

  const handleStart = async (task: any) => {
    // Optimistic update trước — cập nhật local cache ngay lập tức
    const updatedTask = { ...task, status: 'in_progress' };

    qc.setQueryData(['tasks', 'my', activeFilter], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((t: any) => t.id === task.id ? updatedTask : t);
    });
    // Update tất cả cache keys liên quan (filter khác)
    qc.setQueriesData({ queryKey: ['tasks', 'my'] }, (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((t: any) => t.id === task.id ? updatedTask : t);
    });
    setSelectedTask(updatedTask);

    // Gọi backend — nếu 500 (chưa có endpoint) thì giữ optimistic, không refetch
    try {
      await api.put(`/tasks/${task.id}/start`);
      // Backend thành công → sync lại
      qc.invalidateQueries({ queryKey: ['tasks', 'my'] });
    } catch {
      // Backend chưa có PUT /tasks/{id}/start → giữ nguyên optimistic
      // Task sẽ hiển thị "Đang làm" cho đến khi reload trang
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');
    if (!uploadFile) { setSubmitError('Vui lòng chọn file kết quả'); return; }
    try {
      // Nếu task vẫn còn revision_needed → gọi startTask trước (→ in_progress)
      // Backend chỉ cho submit từ in_progress
      if (selectedTask.status === 'revision_needed') {
        await api.put(`/tasks/${selectedTask.id}/start`);
      }

      // Upload file lên server → lấy URL thật
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('folder', 'task-results');
      const res = await api.post('/files/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const fileUrl = res.data.data?.url ?? res.data.data?.fileUrl ?? '';
      if (!fileUrl) throw new Error('Upload thất bại — không nhận được URL');
      submitMutation.mutate({ taskId: selectedTask.id, url: fileUrl, n: note });
    } catch (e: any) {
      setSubmitError(e.response?.data?.message ?? e.message ?? 'Có lỗi khi upload file');
    }
  };

  // ── Derived: cùng series/page → nhóm task (để check resource sharing) ─
  // Task có cùng pageId → dùng chung tài nguyên (ảnh trang)
  const samePageTasks = selectedTask
    ? tasks.filter(t => t.pageId === selectedTask.pageId && t.id !== selectedTask.id)
    : [];
  const hasPrevApproved = samePageTasks.some(t => t.status === 'approved');

  const region   = parseRegion(selectedTask?.panelRegion);
  const imageUrl = pageData?.imageUrl ?? pageData?.thumbnailUrl;

  // ── Modal view mode ────────────────────────────────────────────
  const modalMode: 'brief' | 'submit' | 'revision' | 'done' =
    !selectedTask ? 'brief' :
    selectedTask.status === 'pending'         ? 'brief' :
    selectedTask.status === 'in_progress'     ? 'submit' :
    selectedTask.status === 'revision_needed' ? 'revision' :
    'done';

  return (
    <div className="min-h-full bg-[#080e1a] text-white">

      {/* ── Header ── */}
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
          {FILTERS.map(f => {
            const count = f.id === 'all' ? tasks.length : tasks.filter(t => t.status === f.id).length;
            return (
              <button key={f.id} onClick={() => setActiveFilter(f.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  activeFilter === f.id
                    ? 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
                    : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
                }`}>
                {f.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 rounded-full ${
                    activeFilter === f.id ? 'bg-blue-500/20 text-blue-300' : 'bg-white/8 text-zinc-500'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Task list */}
        {isLoading ? (
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-white/4 last:border-0">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded-full w-48 animate-pulse"/>
                  <div className="h-2 bg-white/5 rounded-full w-24 animate-pulse"/>
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <ListTodo className="w-10 h-10 opacity-20" />
            <p className="text-sm">Không có task nào{activeFilter !== 'all' ? ` ở trạng thái "${FILTERS.find(f=>f.id===activeFilter)?.label}"` : ''}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            <div className="grid grid-cols-[1fr_7rem_6rem_7rem_9rem] gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-700">
              <span>Task</span>
              <span className="text-center">Loại</span>
              <span className="text-center">Ưu tiên</span>
              <span className="text-center">Deadline</span>
              <span className="text-center">Trạng thái</span>
            </div>
            {tasks.map((task: any) => {
              const st = STATUS_MAP[task.status] ?? STATUS_MAP.pending;
              const isClickable = ['pending','in_progress','revision_needed'].includes(task.status);
              return (
                <div key={task.id}
                  onClick={() => {
                    if (!isClickable) return;
                    setSelectedTask(task); // luôn mở modal trước để xem yêu cầu
                  }}
                  className={`grid grid-cols-[1fr_7rem_6rem_7rem_9rem] gap-4 px-6 py-4 items-center border-b border-white/4 last:border-0 transition-colors ${
                    isClickable ? 'cursor-pointer hover:bg-white/[0.025] group' : 'opacity-70'
                  }`}>

                  {/* Task name */}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                      <p className={`text-[13px] font-semibold text-white transition-colors ${isClickable ? 'group-hover:text-blue-300' : ''}`}>
                        {task.title}
                      </p>
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-zinc-600 mt-0.5 ml-3.5 line-clamp-1">{task.description}</p>
                    )}
                    {task.revisionNotes && task.status === 'revision_needed' && (
                      <p className="text-[11px] text-orange-400 mt-1 ml-3.5 line-clamp-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />{task.revisionNotes}
                      </p>
                    )}
                  </div>

                  {/* Type */}
                  <div className="text-center">
                    <span className="text-[11px] text-zinc-500">
                      {TASK_TYPE_LABEL[task.taskType] ?? task.taskType}
                    </span>
                  </div>

                  {/* Priority */}
                  <div className="flex justify-center">
                    {task.priority && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_PILL[task.priority] ?? PRIORITY_PILL.normal}`}>
                        {PRIORITY_LABEL[task.priority] ?? 'TB'}
                      </span>
                    )}
                  </div>

                  {/* Deadline */}
                  <div className="text-center text-[11px] text-zinc-600">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : '—'}
                  </div>

                  {/* Status + CTA */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${st.pill}`}>
                      {st.label}
                    </span>
                    {isClickable && (
                      <span className="text-[10px] text-zinc-700 flex items-center gap-0.5">
                        Xem <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════
          MODAL
      ════════════════════════════════════════════ */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1220] border border-blue-900/30 rounded-2xl shadow-2xl shadow-black/60 flex flex-col max-h-[90vh]">

            {/* Modal header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
              <div className="min-w-0 flex-1 mr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[13px] font-bold text-white">{selectedTask.title}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${(STATUS_MAP[selectedTask.status] ?? STATUS_MAP.pending).pill}`}>
                    {(STATUS_MAP[selectedTask.status] ?? STATUS_MAP.pending).label}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  {TASK_TYPE_LABEL[selectedTask.taskType] ?? selectedTask.taskType}
                  {selectedTask.dueDate && ` · Hạn ${new Date(selectedTask.dueDate).toLocaleDateString('vi-VN')}`}
                </p>
              </div>
              <button onClick={closeModal} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* ════ BRIEF (pending) ════ */}
              {modalMode === 'brief' && (
                <>
                  {/* Task description */}
                  {selectedTask.description && (
                    <div className="bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">Mô tả công việc</p>
                      <p className="text-[13px] text-zinc-300 leading-relaxed">{selectedTask.description}</p>
                    </div>
                  )}

                  {/* Vùng làm việc trên trang */}
                  {region && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">Vùng cần xử lý</p>
                      <PanelPin
                        imageUrl={imageUrl}
                        region={region}
                        taskType={selectedTask.taskType}
                        label={selectedTask.title || (TASK_TYPE_LABEL[selectedTask.taskType] ?? selectedTask.taskType)}
                        sublabel={selectedTask.description}
                        index={0}
                      />
                      {/* Mô tả pin bên dưới ảnh — rõ ràng, không chèn lên nhau */}
                      <div className="mt-2 flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                        style={{ background: PIN_COLORS[selectedTask.taskType] + '15', border: `1px solid ${PIN_COLORS[selectedTask.taskType]}30` }}>
                        <svg width="20" height="26" viewBox="0 0 28 36" className="flex-shrink-0 mt-0.5">
                          <circle cx="14" cy="14" r="13" fill={PIN_COLORS[selectedTask.taskType] ?? '#71717a'} stroke="white" strokeWidth="2"/>
                          <path d="M14 27 L14 36" stroke={PIN_COLORS[selectedTask.taskType] ?? '#71717a'} strokeWidth="3" strokeLinecap="round"/>
                          <text x="14" y="19" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">1</text>
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider"
                              style={{ color: PIN_COLORS[selectedTask.taskType] ?? '#71717a' }}>
                              {TASK_TYPE_LABEL[selectedTask.taskType] ?? selectedTask.taskType}
                            </span>
                          </div>
                          <p className="text-[12px] font-semibold text-white">{selectedTask.title}</p>
                          {selectedTask.description && (
                            <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{selectedTask.description}</p>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-700 mt-1">Hover pin để xem trên ảnh</p>
                    </div>
                  )}

                  {/* Tài nguyên hỗ trợ */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">Tài nguyên hỗ trợ</p>
                    <div className="space-y-2">

                      {/* File trang truyện gốc */}
                      {imageUrl ? (
                        <button
                          onClick={() => downloadFile(imageUrl)}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-blue-500/8 border border-blue-500/20 hover:bg-blue-500/12 transition-colors group text-left">
                          <FileImage className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-blue-300">Trang truyện gốc</p>
                            <p className="text-[10px] text-zinc-600 truncate">{imageUrl}</p>
                          </div>
                          <Download className="w-3.5 h-3.5 text-zinc-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                        </button>
                      ) : selectedTask.pageId ? (
                        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/3 border border-white/6">
                          <Loader2 className="w-4 h-4 text-zinc-600 animate-spin flex-shrink-0" />
                          <p className="text-[12px] text-zinc-600">Đang tải file trang...</p>
                        </div>
                      ) : null}

                      {/* Nếu đã làm task khác trong cùng trang này → không cần tải lại */}
                      {hasPrevApproved && (
                        <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            Bạn đã hoàn thành task khác trên cùng trang này. Tài nguyên hỗ trợ giống nhau — không cần tải lại.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Priority banner nếu urgent */}
                  {selectedTask.priority === 'urgent' && (
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-[12px] text-red-300 font-semibold">Task khẩn cấp — cần hoàn thành sớm nhất có thể</p>
                    </div>
                  )}
                </>
              )}

              {/* ════ SUBMIT (in_progress) ════ */}
              {modalMode === 'submit' && (
                <>
                  {/* Nhắc lại brief ngắn */}
                  {selectedTask.description && (
                    <div className="bg-white/3 border border-white/5 rounded-xl px-3.5 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 mb-1">Yêu cầu</p>
                      <p className="text-[12px] text-zinc-400 leading-relaxed">{selectedTask.description}</p>
                    </div>
                  )}

                  {/* Vùng làm (mini) */}
                  {region && imageUrl && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">Vùng cần xử lý</p>
                      <PanelPin imageUrl={imageUrl} region={region} taskType={selectedTask.taskType}
                        label={selectedTask.title || (TASK_TYPE_LABEL[selectedTask.taskType] ?? selectedTask.taskType)}
                        sublabel={selectedTask.description}
                        index={0}/>
                    </div>
                  )}

                  {/* Upload kết quả */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">
                      File kết quả <span className="text-red-400">*</span>
                    </label>
                    <label className={`flex items-center gap-4 w-full border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
                      uploadFile
                        ? 'border-blue-500/40 bg-blue-500/5'
                        : 'border-white/8 hover:border-blue-500/25 hover:bg-white/3'
                    }`}>
                      <input type="file" accept="image/*,.psd,.ai,.png" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} className="hidden" />
                      {uploadFile ? (
                        <>
                          <div className="w-12 h-12 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-white truncate">{uploadFile.name}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                            <p className="text-[10px] text-blue-400 mt-1">Click để đổi file</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                            <Upload className="w-5 h-5 text-zinc-700" />
                          </div>
                          <div>
                            <p className="text-[12px] text-zinc-400">Click để chọn file kết quả</p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">PNG · JPG · PSD · AI</p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">
                      Ghi chú cho Mangaka <span className="text-zinc-700 normal-case tracking-normal">(tùy chọn)</span>
                    </label>
                    <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
                      placeholder="Những điểm đáng chú ý, vấn đề phát sinh, giải thích kỹ thuật..."
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/40 resize-none transition-all" />
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />{submitError}
                    </p>
                  )}
                </>
              )}

              {/* ════ REVISION NEEDED ════ */}
              {modalMode === 'revision' && (
                <>
                  {/* Yêu cầu sửa từ Mangaka */}
                  <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <p className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">Yêu cầu chỉnh sửa từ Mangaka</p>
                    </div>
                    {selectedTask.revisionNotes ? (
                      <p className="text-[13px] text-zinc-300 leading-relaxed">{selectedTask.revisionNotes}</p>
                    ) : (
                      <p className="text-[12px] text-zinc-500 italic">Mangaka chưa để lại ghi chú cụ thể</p>
                    )}
                  </div>

                  {/* Vùng được đánh dấu */}
                  {region && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">Vùng cần sửa</p>
                      <RevisionPin imageUrl={imageUrl} region={region} taskType={selectedTask.taskType}/>
                      <p className="text-[10px] text-orange-400/70 mt-1.5">Pin cam = vị trí Mangaka yêu cầu chỉnh sửa</p>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/6" />
                    <span className="text-[10px] text-zinc-700">Nộp lại kết quả đã chỉnh sửa</span>
                    <div className="flex-1 h-px bg-white/6" />
                  </div>

                  {/* Upload lại */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">
                      File đã chỉnh sửa <span className="text-red-400">*</span>
                    </label>
                    <label className={`flex items-center gap-4 w-full border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
                      uploadFile
                        ? 'border-orange-500/40 bg-orange-500/5'
                        : 'border-white/8 hover:border-orange-500/25 hover:bg-white/3'
                    }`}>
                      <input type="file" accept="image/*,.psd,.ai,.png" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} className="hidden" />
                      {uploadFile ? (
                        <>
                          <div className="w-12 h-12 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-white truncate">{uploadFile.name}</p>
                            <p className="text-[10px] text-zinc-500">{(uploadFile.size / 1024).toFixed(0)} KB · Click để đổi</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                            <RotateCcw className="w-5 h-5 text-zinc-700" />
                          </div>
                          <div>
                            <p className="text-[12px] text-zinc-400">Chọn file đã chỉnh sửa</p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">PNG · JPG · PSD · AI</p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">Ghi chú thêm</label>
                    <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                      placeholder="Giải thích thay đổi đã thực hiện..."
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/40 resize-none transition-all" />
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />{submitError}
                    </p>
                  )}
                </>
              )}

              {/* ════ DONE (approved / submitted) ════ */}
              {modalMode === 'done' && (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                  {selectedTask.status === 'approved' ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                      </div>
                      <p className="text-sm font-semibold text-white">Mangaka đã duyệt</p>
                      <p className="text-[12px] text-zinc-500">Công việc hoàn tất. Thu nhập sẽ được cộng vào tháng này.</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Clock className="w-7 h-7 text-violet-400" />
                      </div>
                      <p className="text-sm font-semibold text-white">Đã nộp — chờ duyệt</p>
                      <p className="text-[12px] text-zinc-500">Mangaka sẽ xem xét và phê duyệt hoặc yêu cầu chỉnh sửa.</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">

              {/* Pending → Bắt đầu */}
              {modalMode === 'brief' && (
                <div className="flex gap-2">
                  <button onClick={closeModal}
                    className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 hover:text-white transition-colors">
                    Đóng
                  </button>
                  <button
                    onClick={() => handleStart(selectedTask)}
                    disabled={startMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-blue-600/25 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                    {startMutation.isPending
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang cập nhật...</>
                      : <><Play className="w-3.5 h-3.5" />Bắt đầu làm</>}
                  </button>
                </div>
              )}

              {/* In_progress / revision → Nộp */}
              {(modalMode === 'submit' || modalMode === 'revision') && (
                <div className="flex gap-2">
                  <button onClick={closeModal} disabled={submitMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50">
                    Huỷ
                  </button>
                  <button onClick={handleSubmit} disabled={submitMutation.isPending || !uploadFile}
                    className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${
                      modalMode === 'revision'
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:shadow-orange-600/25'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-blue-600/25'
                    }`}>
                    {submitMutation.isPending
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang nộp...</>
                      : modalMode === 'revision'
                        ? <><RotateCcw className="w-3.5 h-3.5" />Nộp lại</>
                        : <><Upload className="w-3.5 h-3.5" />Nộp kết quả</>}
                  </button>
                </div>
              )}

              {/* Done */}
              {modalMode === 'done' && (
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

export default TaskList;
