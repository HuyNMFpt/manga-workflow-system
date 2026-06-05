import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, MousePointer, Trash2, Send, CheckCircle2, AlertCircle, Loader2, ChevronDown, Crosshair } from 'lucide-react';
import api from '@/lib/axios';
import { taskService } from '@/services/taskService';
import { Series, Chapter } from '@/types';

// ✅ /series/my → PaginatedResponse { data: [...] }
const fetchMySeries   = async (): Promise<Series[]>  => {
  const r = await api.get('/series/my');
  const d = r.data;
  if (Array.isArray(d)) return d;
  if (d?.data && Array.isArray(d.data)) return d.data;
  if (d?.data?.data && Array.isArray(d.data.data)) return d.data.data;
  return [];
};
const fetchChapters   = async (id:string): Promise<Chapter[]> => { const r = await api.get(`/chapters/series/${id}`);   return r.data.data ?? []; };
const fetchAssistants = async () => { const r = await api.get('/users/assistants'); return r.data.data ?? []; };

type TaskType = 'background'|'shading'|'effect'|'screentone'|'dialog'|'touch_up'|'other';
interface LocalTask { id:number; zone:{x:number;y:number;width:number;height:number}; type:TaskType; assignedTo:string|null; title:string; description:string; priority:'low'|'normal'|'high'|'urgent'; }

const TASK_TYPES: {value:TaskType;label:string;color:string;dot:string}[] = [
  { value:'background', label:'Vẽ nền',    color:'bg-blue-500/15 border-blue-500/25 text-blue-300',    dot:'bg-blue-400'    },
  { value:'shading',    label:'Tô bóng',   color:'bg-violet-500/15 border-violet-500/25 text-violet-300', dot:'bg-violet-400' },
  { value:'effect',     label:'Hiệu ứng',  color:'bg-orange-500/15 border-orange-500/25 text-orange-300',dot:'bg-orange-400' },
  { value:'screentone', label:'Screentone',color:'bg-emerald-500/15 border-emerald-500/25 text-emerald-300',dot:'bg-emerald-400'},
  { value:'dialog',     label:'Hộp thoại', color:'bg-yellow-500/15 border-yellow-500/25 text-yellow-300',dot:'bg-yellow-400' },
  { value:'touch_up',   label:'Chỉnh sửa', color:'bg-pink-500/15 border-pink-500/25 text-pink-300',      dot:'bg-pink-400'   },
  { value:'other',      label:'Khác',      color:'bg-zinc-500/15 border-zinc-500/25 text-zinc-400',       dot:'bg-zinc-500'   },
];

const TaskAssignment = () => {
  const qc = useQueryClient();
  const [selectedSeriesId,   setSelectedSeriesId]   = useState('');
  const [selectedChapterId,  setSelectedChapterId]  = useState('');
  const [selectedPageNum,    setSelectedPageNum]    = useState(1);
  const [selectedTaskType,   setSelectedTaskType]   = useState<TaskType>('background');
  const [tasks,              setTasks]              = useState<LocalTask[]>([]);
  const [isDrawing,          setIsDrawing]          = useState(false);
  const [startPoint,         setStartPoint]         = useState<{x:number;y:number}|null>(null);
  const [showTaskForm,       setShowTaskForm]       = useState(false);
  const [tempTask,           setTempTask]           = useState<Partial<LocalTask>|null>(null);
  const [submitSuccess,      setSubmitSuccess]      = useState(false);
  const [submitError,        setSubmitError]        = useState('');

  const { data:seriesList=[], isLoading:loadSeries }    = useQuery({ queryKey:['series','my'],           queryFn:fetchMySeries });
  const { data:chapters=[],   isLoading:loadChapters }  = useQuery({ queryKey:['chapters',selectedSeriesId], queryFn:()=>fetchChapters(selectedSeriesId), enabled:!!selectedSeriesId });
  const { data:assistants=[],  isLoading:loadAssistants } = useQuery({ queryKey:['assistants'],          queryFn:fetchAssistants });

  // u2705 Load pages u0111u1ec3 hiu1ec7n u1ea3nh trong canvas — GET /api/pages?chapterId={id}
  const { data:pagesData=[] } = useQuery({
    queryKey: ["pages", selectedChapterId],
    queryFn: async () => {
      const r = await api.get("/pages", { params: { chapterId: selectedChapterId } });
      return r.data.data ?? [];
    },
    enabled: !!selectedChapterId,
  });

  const selectedChapter = (chapters as any[]).find((c:any)=>c.id===selectedChapterId);
  const pageCount = (selectedChapter as any)?.totalPages ?? 5;
  // u2705 T�m u1ea3nh cu1ee7a trang hiu1ec7n tu1ea1i
  const currentPageImage = (pagesData as any[]).find((p:any) => p.pageNumber === selectedPageNum)?.imageUrl ?? null;

  const createMutation = useMutation({
    mutationFn: (t:LocalTask) => taskService.create({
      // ✅ Lấy pageId thật từ pagesData, fallback tạo fake nếu chưa upload
      pageId: (pagesData as any[]).find((p:any)=>p.pageNumber===selectedPageNum)?.id
              ?? `${selectedChapterId}_page_${selectedPageNum}`,
      assignedTo:t.assignedTo!,
      title:t.title||`${TASK_TYPES.find(x=>x.value===t.type)?.label} - Trang ${selectedPageNum}`,
      description:t.description, taskType:t.type, priority:t.priority, panelRegion: JSON.stringify(t.zone), // ✅ Backend expects String
    }),
    onSuccess:()=>qc.invalidateQueries({queryKey:['tasks']}),
  });

  const handleMouseDown = (e:React.MouseEvent<HTMLDivElement>) => {
    if(!selectedChapterId) return;
    const r=e.currentTarget.getBoundingClientRect();
    setIsDrawing(true);
    setStartPoint({x:((e.clientX-r.left)/r.width)*100,y:((e.clientY-r.top)/r.height)*100});
  };
  const handleMouseUp = (e:React.MouseEvent<HTMLDivElement>) => {
    if(!isDrawing||!startPoint) return;
    const r=e.currentTarget.getBoundingClientRect();
    const ex=((e.clientX-r.left)/r.width)*100, ey=((e.clientY-r.top)/r.height)*100;
    const zone={x:Math.min(startPoint.x,ex),y:Math.min(startPoint.y,ey),width:Math.abs(ex-startPoint.x),height:Math.abs(ey-startPoint.y)};
    if(zone.width<3||zone.height<3){setIsDrawing(false);setStartPoint(null);return;}
    setTempTask({id:Date.now(),zone,type:selectedTaskType,assignedTo:null,title:'',description:'',priority:'normal'});
    setShowTaskForm(true); setIsDrawing(false); setStartPoint(null);
  };

  const handleSubmitAll = async () => {
    setSubmitError(''); setSubmitSuccess(false);
    if(tasks.some(t=>!t.assignedTo)){setSubmitError('Còn task chưa phân công!');return;}
    try{ await Promise.all(tasks.map(t=>createMutation.mutateAsync(t))); setSubmitSuccess(true); setTasks([]); }
    catch{ setSubmitError('Có lỗi khi gửi task. Vui lòng thử lại.'); }
  };

  const getTypeStyle = (type:TaskType) => TASK_TYPES.find(t=>t.value===type) ?? TASK_TYPES[TASK_TYPES.length-1];

  const SelectField = ({label,value,onChange,children,placeholder}:any) => (
    <div>
      {label && <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">{label}</label>}
      <div className="relative">
        <select value={value} onChange={onChange}
          className="w-full bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-violet-500/40 transition-all">
          {placeholder && <option value="" className="bg-[#111118]">{placeholder}</option>}
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-zinc-600 pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-[#0a0a12] text-white">

      {/* Header */}
      <div className="relative border-b border-violet-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-64 h-64 rounded-full bg-emerald-600/6 blur-3xl" />
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-500 mb-2">Mangaka · Task</p>
          <h1 className="text-2xl font-black font-['Syne']">Phân công công việc</h1>
          <p className="text-sm text-zinc-600 mt-1">Chọn vùng trên trang và giao việc cho trợ lý</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* Step 1 + 2 selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <SelectField label="1. Chọn series" value={selectedSeriesId} placeholder="-- Chọn series --"
            onChange={(e:any)=>{setSelectedSeriesId(e.target.value);setSelectedChapterId('');setTasks([]);}}>
            {(seriesList as any[]).map((s:any)=><option key={s.id} value={s.id} className="bg-[#111118]">{s.title}</option>)}
          </SelectField>

          {selectedSeriesId && (
            <SelectField label="2. Chọn chapter" value={selectedChapterId} placeholder="-- Chọn chapter --"
              onChange={(e:any)=>{setSelectedChapterId(e.target.value);setTasks([]);}}>
              {(chapters as any[]).map((c:any)=><option key={c.id} value={c.id} className="bg-[#111118]">Chapter {c.chapterNumber}{c.title?`: ${c.title}`:''}</option>)}
            </SelectField>
          )}
        </div>

        {/* Canvas + sidebar */}
        {selectedChapterId && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">

            {/* Left: canvas */}
            <div className="space-y-4">
              {/* Task type */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MousePointer className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600">Loại công việc</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TASK_TYPES.map(t=>(
                    <button key={t.value} onClick={()=>setSelectedTaskType(t.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                        selectedTaskType===t.value ? t.color : 'bg-white/3 border-white/6 text-zinc-600 hover:text-zinc-300'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page canvas */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-zinc-600" />
                    <span className="text-sm font-semibold text-white">Trang {selectedPageNum}</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({length:Math.min(pageCount,8)},(_,i)=>i+1).map(n=>{
                      const hasImage = (pagesData as any[]).some((p:any) => p.pageNumber === n);
                      return (
                        <button key={n} onClick={()=>setSelectedPageNum(n)}
                          className={`relative w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
                            selectedPageNum===n ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/40' : 'bg-white/4 border border-white/6 text-zinc-500 hover:text-white hover:bg-white/8'
                          }`}>
                          {n}
                          {/* ✅ Dot indicator nếu trang đã có ảnh */}
                          {hasImage && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-[#0a0a12]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative bg-gradient-to-br from-zinc-900 to-zinc-950 aspect-[3/4] rounded-xl overflow-hidden cursor-crosshair select-none border border-white/5"
                  onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
                  {/* ✅ Hiện ảnh trang thật nếu đã upload */}
                  {currentPageImage ? (
                    <img
                      src={currentPageImage}
                      alt={`Trang ${selectedPageNum}`}
                      className="absolute inset-0 w-full h-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-800">
                      <MousePointer className="w-8 h-8" />
                      <span className="text-xs">Kéo để chọn vùng</span>
                      {selectedChapterId && (pagesData as any[]).length === 0 && (
                        <span className="text-[10px] text-zinc-700 mt-1">Chưa có trang nào được upload</span>
                      )}
                    </div>
                  )}
                  {/* Zones */}
                  {tasks.filter(t=>t.assignedTo).map(task=>{
                    const ts = getTypeStyle(task.type);
                    return (
                      <div key={task.id} className="absolute border-2 border-dashed" style={{
                        left:`${task.zone.x}%`,top:`${task.zone.y}%`,width:`${task.zone.width}%`,height:`${task.zone.height}%`,
                        borderColor: ts.dot.replace('bg-','').split('-')[0]==='bg' ? '#8b5cf6' : `var(--tw-${ts.dot.replace('bg-','')})`
                      }}>
                        <span className={`text-[9px] font-bold px-1 py-0.5 ${ts.dot} text-white`}>{ts.label}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-700 mt-2 text-center">Nhấn và kéo để chọn vùng cần giao việc</p>
              </div>
            </div>

            {/* Right: assistants + task queue */}
            <div className="space-y-4">
              {/* Assistants */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600">Trợ lý</span>
                </div>
                {loadAssistants ? (
                  <div className="flex items-center justify-center py-6 text-zinc-700"><Loader2 className="w-4 h-4 animate-spin" /></div>
                ) : (assistants as any[]).length === 0 ? (
                  <p className="text-xs text-zinc-700 text-center py-4">Không có trợ lý</p>
                ) : (
                  <div className="divide-y divide-white/4">
                    {(assistants as any[]).map((a:any)=>(
                      <div key={a.id} className="px-4 py-2.5 flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600/40 to-fuchsia-600/40 border border-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-300 flex-shrink-0">
                          {a.name?.slice(0,1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-white truncate">{a.name ?? a.displayName ?? a.username ?? a.email}</p>
                        </div>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${(a.isActive||a.active)?'bg-emerald-400':'bg-zinc-600'}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Task queue */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600">Công việc</span>
                  <span className="text-[11px] text-zinc-600">{tasks.length} task</span>
                </div>

                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-zinc-800">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-[11px]">Vẽ vùng để tạo task</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/4 max-h-64 overflow-y-auto">
                    {tasks.map((task,idx)=>{
                      const ts = getTypeStyle(task.type);
                      return (
                        <div key={task.id} className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ts.color}`}>{ts.label}</span>
                            <button onClick={()=>setTasks(tasks.filter(t=>t.id!==task.id))} className="text-zinc-700 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <select value={task.assignedTo||''} onChange={e=>{ const u=[...tasks]; u[idx].assignedTo=e.target.value||null; setTasks(u); }}
                            className="w-full bg-[#111118] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-violet-500/30 transition-all appearance-none">
                            <option value="" className="bg-[#111118]">Chọn trợ lý</option>
                            {(assistants as any[]).map((a:any)=><option key={a.id} value={a.id} className="bg-[#111118]">{a.name ?? a.displayName ?? a.username ?? a.email}</option>)}
                          </select>
                          {task.assignedTo && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
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
              {submitSuccess && <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-xl px-3 py-2 text-[11px]"><CheckCircle2 className="w-3.5 h-3.5" />Gửi thành công!</div>}

              {tasks.length > 0 && (
                <button onClick={handleSubmitAll} disabled={createMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-600/25 disabled:opacity-60 transition-all">
                  {createMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang gửi...</> : <><Send className="w-3.5 h-3.5" />Gửi ({tasks.length})</>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task form modal */}
      {showTaskForm && tempTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#111118] border border-violet-900/30 rounded-2xl p-6 shadow-2xl shadow-black/50 space-y-4">
            <h3 className="text-sm font-bold text-white">Chi tiết công việc</h3>
            <div>
              <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">Tiêu đề</label>
              <input type="text" value={tempTask.title||''} onChange={e=>setTempTask({...tempTask,title:e.target.value})}
                placeholder="VD: Vẽ nền thành phố..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">Mô tả</label>
              <textarea rows={3} value={tempTask.description||''} onChange={e=>setTempTask({...tempTask,description:e.target.value})}
                placeholder="Mô tả chi tiết..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 resize-none transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-2">Ưu tiên</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[{v:'urgent',l:'Khẩn',c:'bg-red-500/15 border-red-500/25 text-red-300'},{v:'high',l:'Cao',c:'bg-orange-500/15 border-orange-500/25 text-orange-300'},{v:'normal',l:'TB',c:'bg-blue-500/15 border-blue-500/25 text-blue-300'},{v:'low',l:'Thấp',c:'bg-zinc-500/15 border-zinc-500/25 text-zinc-400'}].map(p=>(
                  <button key={p.v} onClick={()=>setTempTask({...tempTask,priority:p.v as any})}
                    className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${tempTask.priority===p.v ? p.c : 'bg-white/3 border-white/6 text-zinc-600 hover:text-zinc-300'}`}>{p.l}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={()=>{setShowTaskForm(false);setTempTask(null);}}
                className="flex-1 py-2 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 hover:text-white transition-colors">Huỷ</button>
              <button onClick={()=>{if(tempTask){setTasks([...tasks,tempTask as LocalTask]);setTempTask(null);setShowTaskForm(false);}}}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-600/25 transition-all">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskAssignment;
