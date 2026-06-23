import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  Users, MousePointer, Trash2, Send, CheckCircle2,
  AlertCircle, Loader2, ChevronDown, Crosshair, X
} from 'lucide-react';
import api from '@/lib/axios';
import { taskService } from '@/services/taskService';
import { Series, Chapter } from '@/types';

const fetchMySeries   = async (): Promise<Series[]>  => { const r = await api.get('/series/my'); return r.data.data?.data ?? []; };
const fetchChapters   = async (id:string): Promise<Chapter[]> => { const r = await api.get(`/chapters/series/${id}`); return r.data.data ?? []; };
const fetchAssistants = async () => { const r = await api.get('/users/assistants'); return r.data.data ?? []; };

type TaskType = 'background'|'shading'|'effect'|'screentone'|'dialog'|'touch_up'|'other';

const TASK_TYPES: { value:TaskType; label:string; color:string; dot:string; pinColor:string }[] = [
  { value:'background', label:'Vẽ nền',    color:'bg-blue-500/15 border-blue-500/25 text-blue-300',      dot:'bg-blue-400',    pinColor:'#60a5fa' },
  { value:'shading',    label:'Tô bóng',   color:'bg-violet-500/15 border-violet-500/25 text-violet-300', dot:'bg-violet-400',  pinColor:'#a78bfa' },
  { value:'effect',     label:'Hiệu ứng',  color:'bg-orange-500/15 border-orange-500/25 text-orange-300', dot:'bg-orange-400',  pinColor:'#fb923c' },
  { value:'screentone', label:'Screentone',color:'bg-emerald-500/15 border-emerald-500/25 text-emerald-300',dot:'bg-emerald-400',pinColor:'#34d399' },
  { value:'dialog',     label:'Hộp thoại', color:'bg-yellow-500/15 border-yellow-500/25 text-yellow-300', dot:'bg-yellow-400',  pinColor:'#facc15' },
  { value:'touch_up',   label:'Chỉnh sửa', color:'bg-pink-500/15 border-pink-500/25 text-pink-300',       dot:'bg-pink-400',    pinColor:'#f472b6' },
  { value:'other',      label:'Khác',      color:'bg-zinc-500/15 border-zinc-500/25 text-zinc-400',        dot:'bg-zinc-500',    pinColor:'#71717a' },
];

interface LocalTask {
  id: number;
  x: number; y: number;     // % position trên ảnh
  type: TaskType;
  assignedTo: string | null;
  title: string;
  description: string;
  priority: 'low'|'normal'|'high'|'urgent';
}

// ── Pin SVG ──────────────────────────────────────────────────────
const Pin = ({ color, index, onClick, onRemove, selected }: {
  color: string; index: number; onClick: () => void; onRemove: () => void; selected: boolean;
}) => (
  <div className="relative group" style={{ width: 28, height: 36 }}>
    <svg width="28" height="36" viewBox="0 0 28 36" className="cursor-pointer drop-shadow-lg" onClick={onClick}>
      <circle cx="14" cy="14" r="13" fill={color} stroke="white" strokeWidth="2"/>
      <path d="M14 27 L14 36" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <text x="14" y="19" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{index + 1}</text>
    </svg>
    {/* Remove button */}
    <button
      onClick={e => { e.stopPropagation(); onRemove(); }}
      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ fontSize: 9 }}>
      ×
    </button>
    {/* Pulse ring khi selected */}
    {selected && (
      <div className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: color, opacity: 0.5 }}/>
    )}
  </div>
);

export default function TaskAssignment() {
  const qc = useQueryClient();
  const location = useLocation();

  const [selectedSeriesId,  setSelectedSeriesId]  = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedPageNum,   setSelectedPageNum]   = useState(1);
  const [selectedTaskType,  setSelectedTaskType]  = useState<TaskType>('background');
  const [tasks,             setTasks]             = useState<LocalTask[]>([]);
  const [selectedPinId,     setSelectedPinId]     = useState<number|null>(null);
  const [showTaskForm,      setShowTaskForm]       = useState(false);
  const [tempTask,          setTempTask]           = useState<Partial<LocalTask>|null>(null);
  const [submitSuccess,     setSubmitSuccess]      = useState(false);
  const [submitError,       setSubmitError]        = useState('');

  // Auto-select từ ChapterManager navigate
  useEffect(() => {
    const state = location.state as { seriesId?: string; chapterId?: string } | null;
    if (state?.seriesId)  setSelectedSeriesId(state.seriesId);
    if (state?.chapterId) setSelectedChapterId(state.chapterId);
  }, [location.state]);

  const { data:allSeries=[], isLoading:loadSeries } = useQuery({ queryKey:['series','my'], queryFn:fetchMySeries });
  const seriesList = (allSeries as any[]).filter((s:any) => ['approved','publishing'].includes(s.status));

  const { data:chapters=[],   isLoading:loadChapters }  = useQuery({ queryKey:['chapters',selectedSeriesId], queryFn:()=>fetchChapters(selectedSeriesId), enabled:!!selectedSeriesId });
  const { data:assistants=[],  isLoading:loadAssistants } = useQuery({ queryKey:['assistants'], queryFn:fetchAssistants });
  const { data:pagesData=[] } = useQuery({
    queryKey: ['pages', selectedChapterId],
    queryFn: async () => { const r = await api.get('/pages', { params:{ chapterId:selectedChapterId } }); return r.data.data ?? []; },
    enabled: !!selectedChapterId,
  });

  const selectedChapter = (chapters as any[]).find((c:any)=>c.id===selectedChapterId);
  const pageCount = (selectedChapter as any)?.totalPages ?? 5;
  // eslint-disable-next-line eqeqeq
  const currentPageImage = (pagesData as any[]).find((p:any) => p.pageNumber == selectedPageNum)?.imageUrl ?? null;

  const getTypeConfig = (type: TaskType) => TASK_TYPES.find(t=>t.value===type) ?? TASK_TYPES[TASK_TYPES.length-1];

  // ── Click on image → place pin ──────────────────────────────
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedChapterId) return;
    if ((e.target as HTMLElement).closest('.pin-element')) return;
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const img = imgRef.current;
    // Tính tọa độ theo vùng ảnh thật (loại trừ letterbox từ object-contain)
    let x: number, y: number;
    if (img && img.naturalWidth) {
      const cw = rect.width, ch = rect.height;
      const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
      const rw = img.naturalWidth * scale, rh = img.naturalHeight * scale;
      const offX = (cw - rw) / 2, offY = (ch - rh) / 2;
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      // Nếu click ngoài vùng ảnh thật → bỏ qua
      if (cx < offX || cx > offX + rw || cy < offY || cy > offY + rh) return;
      x = ((cx - offX) / rw) * 100;
      y = ((cy - offY) / rh) * 100;
    } else {
      x = ((e.clientX - rect.left) / rect.width) * 100;
      y = ((e.clientY - rect.top) / rect.height) * 100;
    }
    const newTask: Partial<LocalTask> = {
      id: Date.now(), x, y,
      type: selectedTaskType,
      assignedTo: null, title: '', description: '', priority: 'normal',
    };
    setTempTask(newTask);
    setShowTaskForm(true);
  };

  const createMutation = useMutation({
    mutationFn: (t: LocalTask) => {
      // eslint-disable-next-line eqeqeq
      const page = (pagesData as any[]).find((p:any) => p.pageNumber == selectedPageNum);
      if (!page?.id) return Promise.reject(new Error('Trang này chưa được upload. Vui lòng upload trang trước khi giao task.'));
      return taskService.create({
        pageId:      page.id,
        assignedTo:  t.assignedTo!,
        title:       t.title || `${getTypeConfig(t.type).label} - Trang ${selectedPageNum}`,
        description: t.description,
        taskType:    t.type,
        priority:    t.priority,
        // Lưu tọa độ pin (x, y) thay vì rectangle zone
        panelRegion: JSON.stringify({ x: t.x, y: t.y, width: 0, height: 0 }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey:['tasks'] }),
    onError: (e:any) => setSubmitError(e.message ?? e.response?.data?.message ?? 'Có lỗi khi gửi task.'),
  });

  const handleSubmitAll = async () => {
    setSubmitError(''); setSubmitSuccess(false);
    if (tasks.some(t=>!t.assignedTo)) { setSubmitError('Còn task chưa phân công!'); return; }
    try {
      await Promise.all(tasks.map(t => createMutation.mutateAsync(t)));
      setSubmitSuccess(true); setTasks([]); setSelectedPinId(null);
    } catch { setSubmitError('Có lỗi khi gửi task. Vui lòng thử lại.'); }
  };

  const SelectField = ({ label, value, onChange, children, placeholder }: any) => (
    <div>
      {label && <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">{label}</label>}
      <div className="relative">
        <select value={value} onChange={onChange}
          className="w-full bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-violet-500/40 transition-all">
          {placeholder && <option value="" className="bg-[#111118]">{placeholder}</option>}
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-zinc-600 pointer-events-none"/>
      </div>
    </div>
  );

  // Pin được chọn (để highlight trong sidebar)
  const selectedPin = tasks.find(t => t.id === selectedPinId);

  return (
    <div className="min-h-full bg-[#0a0a12] text-white">
      {/* Header */}
      <div className="relative border-b border-violet-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-64 h-64 rounded-full bg-emerald-600/6 blur-3xl"/>
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-500 mb-2">Mangaka · Task</p>
          <h1 className="text-2xl font-black font-['Syne']">Phân công công việc</h1>
          <p className="text-sm text-zinc-600 mt-1">Click lên trang để đặt pin và giao việc cho trợ lý</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <SelectField label="1. Chọn series" value={selectedSeriesId} placeholder="-- Chọn series --"
            onChange={(e:any)=>{ setSelectedSeriesId(e.target.value); setSelectedChapterId(''); setTasks([]); }}>
            {seriesList.length===0
              ? <option disabled className="bg-[#111118]">-- Chưa có series được duyệt --</option>
              : (seriesList as any[]).map((s:any)=><option key={s.id} value={s.id} className="bg-[#111118]">{s.title}</option>)}
          </SelectField>
          {selectedSeriesId && (
            <SelectField label="2. Chọn chapter" value={selectedChapterId} placeholder="-- Chọn chapter --"
              onChange={(e:any)=>{ setSelectedChapterId(e.target.value); setTasks([]); setSelectedPinId(null); }}>
              {(chapters as any[]).length===0
                ? <option disabled className="bg-[#111118]">-- Chưa có chapter nào --</option>
                : (chapters as any[]).map((c:any)=>(
                    <option key={c.id} value={c.id} className="bg-[#111118]">
                      Chapter {c.chapterNumber}{c.title?`: ${c.title}`:''}
                    </option>
                  ))}
            </SelectField>
          )}
        </div>

        {selectedChapterId && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

            {/* Left: canvas */}
            <div className="space-y-4">

              {/* Task type selector */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MousePointer className="w-3.5 h-3.5 text-emerald-400"/>
                  <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600">Loại công việc đang chọn</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TASK_TYPES.map(t => (
                    <button key={t.value} onClick={() => setSelectedTaskType(t.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                        selectedTaskType===t.value ? t.color : 'bg-white/3 border-white/6 text-zinc-600 hover:text-zinc-300'
                      }`}>
                      <span className={`w-2 h-2 rounded-full ${t.dot}`}/>
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-700 mt-2">
                  Chọn loại → Click lên ảnh để đặt pin · Pin sẽ có màu tương ứng
                </p>
              </div>

              {/* Page canvas */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-5">
                {/* Page selector */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-zinc-600"/>
                    <span className="text-sm font-semibold text-white">Trang {selectedPageNum}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {Array.from({ length: Math.min(pageCount, 10) }, (_,i) => i+1).map(n => {
                      // eslint-disable-next-line eqeqeq
                      const hasImage = (pagesData as any[]).some((p:any) => p.pageNumber == n);
                      const pinCount = tasks.filter(t => /* task on this page */true).length; // simplified
                      return (
                        <button key={n} onClick={() => setSelectedPageNum(n)}
                          className={`relative w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
                            selectedPageNum===n
                              ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/40'
                              : 'bg-white/4 border border-white/6 text-zinc-500 hover:text-white hover:bg-white/8'
                          }`}>
                          {n}
                          {hasImage && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-[#0a0a12]"/>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Image + pins */}
                <div
                  className="relative bg-gradient-to-br from-zinc-900 to-zinc-950 aspect-[3/4] rounded-xl overflow-hidden cursor-crosshair select-none border border-white/5"
                  onClick={handleImageClick}>

                  {currentPageImage
                    ? <img ref={imgRef} src={currentPageImage} alt={`Trang ${selectedPageNum}`} className="absolute inset-0 w-full h-full object-contain" draggable={false}/>
                    : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-800">
                        <MousePointer className="w-8 h-8"/>
                        <span className="text-xs">Click để đặt pin giao việc</span>
                        {(pagesData as any[]).length===0 && (
                          <span className="text-[10px] text-zinc-700 mt-1">Chưa có trang nào được upload</span>
                        )}
                      </div>
                    )
                  }

                  {/* Pins */}
                  {tasks.map((task, idx) => {
                    const cfg = getTypeConfig(task.type);
                    return (
                      <div key={task.id}
                        className="pin-element absolute"
                        style={{ left:`calc(${task.x}% - 14px)`, top:`calc(${task.y}% - 36px)`, zIndex: selectedPinId===task.id ? 20 : 10 }}>
                        <Pin
                          color={cfg.pinColor}
                          index={idx}
                          selected={selectedPinId===task.id}
                          onClick={() => setSelectedPinId(selectedPinId===task.id ? null : task.id)}
                          onRemove={() => { setTasks(tasks.filter(t=>t.id!==task.id)); if(selectedPinId===task.id) setSelectedPinId(null); }}
                        />
                      </div>
                    );
                  })}

                  {/* Tooltip khi pin được chọn */}
                  {selectedPin && (() => {
                    const cfg = getTypeConfig(selectedPin.type);
                    return (
                      <div className="absolute z-30 pointer-events-none"
                        style={{ left:`${Math.min(selectedPin.x + 5, 65)}%`, top:`${Math.max(selectedPin.y - 30, 5)}%` }}>
                        <div className="bg-[#0e0e1a] border border-white/15 rounded-xl px-3 py-2.5 shadow-2xl min-w-44 pointer-events-auto">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={`w-2 h-2 rounded-full ${cfg.dot}`}/>
                            <span className="text-[11px] font-bold text-white">{cfg.label}</span>
                          </div>
                          {selectedPin.title && <p className="text-[11px] text-zinc-300 mb-1">{selectedPin.title}</p>}
                          {selectedPin.description && <p className="text-[10px] text-zinc-500 leading-relaxed">{selectedPin.description}</p>}
                          {selectedPin.assignedTo ? (
                            <div className="flex items-center gap-1 mt-1.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400"/>
                              <span className="text-[10px] text-emerald-400">
                                {(assistants as any[]).find((a:any)=>a.id===selectedPin.assignedTo)?.name ?? 'Đã phân công'}
                              </span>
                            </div>
                          ) : (
                            <p className="text-[10px] text-amber-400 mt-1.5">Chưa phân công</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <p className="text-[10px] text-zinc-700 mt-2 text-center">
                  Click lên ảnh để đặt pin · Hover pin để xem thông tin · Click pin để chọn
                </p>
              </div>
            </div>

            {/* Right: assistants + task list */}
            <div className="space-y-4">

              {/* Assistants */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-zinc-500"/>
                  <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600">Trợ lý</span>
                </div>
                {loadAssistants ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-zinc-600"/></div>
                ) : (assistants as any[]).length===0 ? (
                  <p className="text-xs text-zinc-700 text-center py-4">Không có trợ lý</p>
                ) : (
                  <div className="divide-y divide-white/4">
                    {(assistants as any[]).map((a:any) => (
                      <div key={a.id} className="px-4 py-2.5 flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600/40 to-fuchsia-600/40 border border-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-300 flex-shrink-0">
                          {a.name?.slice(0,1)}
                        </div>
                        <p className="text-[12px] font-medium text-white truncate flex-1">{a.name ?? a.displayName ?? a.username ?? a.email}</p>
                        <span className={`w-1.5 h-1.5 rounded-full ${(a.isActive||a.active)?'bg-emerald-400':'bg-zinc-600'}`}/>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Task list */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600">Công việc</span>
                  <span className="text-[11px] text-zinc-600">{tasks.length} task</span>
                </div>
                {tasks.length===0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-zinc-800">
                    <AlertCircle className="w-5 h-5"/>
                    <p className="text-[11px]">Click lên ảnh để tạo task</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/4 max-h-72 overflow-y-auto">
                    {tasks.map((task, idx) => {
                      const cfg = getTypeConfig(task.type);
                      const isSelected = selectedPinId===task.id;
                      return (
                        <div key={task.id}
                          onClick={() => setSelectedPinId(isSelected ? null : task.id)}
                          className={`p-3 cursor-pointer transition-colors ${isSelected?'bg-white/[0.04]':'hover:bg-white/[0.02]'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {/* Pin mini */}
                              <svg width="14" height="18" viewBox="0 0 28 36">
                                <circle cx="14" cy="14" r="13" fill={cfg.pinColor} stroke="white" strokeWidth="2"/>
                                <text x="14" y="19" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{idx+1}</text>
                                <path d="M14 27 L14 36" stroke={cfg.pinColor} strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
                            </div>
                            <button onClick={e=>{ e.stopPropagation(); setTasks(tasks.filter(t=>t.id!==task.id)); if(isSelected) setSelectedPinId(null); }}
                              className="text-zinc-700 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3 h-3"/>
                            </button>
                          </div>
                          {task.title && <p className="text-[11px] text-zinc-400 mb-1.5 truncate">{task.title}</p>}
                          <select value={task.assignedTo||''} onClick={e=>e.stopPropagation()}
                            onChange={e=>{ const u=[...tasks]; u[idx].assignedTo=e.target.value||null; setTasks(u); }}
                            className="w-full bg-[#111118] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-violet-500/30 transition-all appearance-none">
                            <option value="" className="bg-[#111118]">Chọn trợ lý</option>
                            {(assistants as any[]).map((a:any)=>(
                              <option key={a.id} value={a.id} className="bg-[#111118]">{a.name ?? a.displayName ?? a.username ?? a.email}</option>
                            ))}
                          </select>
                          {task.assignedTo && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400"/>
                              <span className="text-[10px] text-emerald-400">Đã phân công</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {submitError && <p className="text-[11px] text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">{submitError}</p>}
              {submitSuccess && (
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-xl px-3 py-2 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5"/>Gửi thành công!
                </div>
              )}
              {tasks.length > 0 && (
                <button onClick={handleSubmitAll} disabled={createMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-600/25 disabled:opacity-60 transition-all">
                  {createMutation.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang gửi...</>
                    : <><Send className="w-3.5 h-3.5"/>Gửi ({tasks.length})</>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task form modal — hiện sau khi click đặt pin */}
      {showTaskForm && tempTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#111118] border border-violet-900/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Pin preview */}
                <svg width="20" height="26" viewBox="0 0 28 36">
                  <circle cx="14" cy="14" r="13" fill={getTypeConfig(tempTask.type!).pinColor} stroke="white" strokeWidth="2"/>
                  <text x="14" y="19" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{tasks.length+1}</text>
                  <path d="M14 27 L14 36" stroke={getTypeConfig(tempTask.type!).pinColor} strokeWidth="3" strokeLinecap="round"/>
                </svg>
                <h3 className="text-sm font-bold text-white">Chi tiết công việc</h3>
              </div>
              <button onClick={() => { setShowTaskForm(false); setTempTask(null); }}
                className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-white">
                <X className="w-3.5 h-3.5"/>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">Tiêu đề</label>
              <input type="text" value={tempTask.title||''} onChange={e=>setTempTask({...tempTask,title:e.target.value})}
                placeholder={`VD: ${getTypeConfig(tempTask.type!).label} vùng này...`}
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all"/>
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">Mô tả yêu cầu</label>
              <textarea rows={3} value={tempTask.description||''} onChange={e=>setTempTask({...tempTask,description:e.target.value})}
                placeholder="Mô tả chi tiết cho Assistant..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 resize-none transition-all"/>
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-2">Độ ưu tiên</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { v:'urgent', l:'Khẩn',  c:'bg-red-500/15 border-red-500/25 text-red-300'      },
                  { v:'high',   l:'Cao',    c:'bg-orange-500/15 border-orange-500/25 text-orange-300' },
                  { v:'normal', l:'TB',     c:'bg-blue-500/15 border-blue-500/25 text-blue-300'   },
                  { v:'low',    l:'Thấp',   c:'bg-zinc-500/15 border-zinc-500/25 text-zinc-400'   },
                ].map(p => (
                  <button key={p.v} onClick={() => setTempTask({...tempTask, priority: p.v as any})}
                    className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                      tempTask.priority===p.v ? p.c : 'bg-white/3 border-white/6 text-zinc-600 hover:text-zinc-300'
                    }`}>{p.l}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => { setShowTaskForm(false); setTempTask(null); }}
                className="flex-1 py-2 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 hover:text-white transition-colors">Huỷ</button>
              <button onClick={() => {
                if (tempTask) {
                  setTasks([...tasks, tempTask as LocalTask]);
                  setSelectedPinId(tempTask.id as number);
                  setTempTask(null); setShowTaskForm(false);
                }
              }} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-600/25 transition-all">
                Đặt pin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
