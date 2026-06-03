import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, MousePointer, Trash2, Send, CheckCircle2, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import api from '@/lib/axios';
import { taskService } from '@/services/taskService';
import { Series, Chapter } from '@/types';

const fetchMySeries = async (): Promise<Series[]> => {
  const res = await api.get('/series/my');
  return res.data.data ?? [];
};
const fetchChapters = async (seriesId: string): Promise<Chapter[]> => {
  const res = await api.get(`/chapters/series/${seriesId}`);
  return res.data.data ?? [];
};
const fetchAssistants = async () => {
  const res = await api.get('/users/assistants');
  return res.data.data ?? [];
};

type TaskType = 'background' | 'shading' | 'effect' | 'screentone' | 'dialog' | 'touch_up' | 'other';
interface LocalTask {
  id: number;
  zone: { x: number; y: number; width: number; height: number };
  type: TaskType;
  assignedTo: string | null;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

const TASK_TYPES: Array<{ value: TaskType; label: string; color: string }> = [
  { value: 'background', label: 'Vẽ nền',    color: 'bg-blue-500'   },
  { value: 'shading',    label: 'Tô bóng',   color: 'bg-purple-500' },
  { value: 'effect',     label: 'Hiệu ứng',  color: 'bg-orange-500' },
  { value: 'screentone', label: 'Screentone', color: 'bg-green-500'  },
  { value: 'dialog',     label: 'Hộp thoại', color: 'bg-yellow-500' },
  { value: 'touch_up',   label: 'Chỉnh sửa', color: 'bg-pink-500'   },
  { value: 'other',      label: 'Khác',       color: 'bg-gray-500'   },
];

const TaskAssignment = () => {
  const queryClient = useQueryClient();
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedPageNum, setSelectedPageNum] = useState(1);
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>('background');
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [tempTask, setTempTask] = useState<Partial<LocalTask> | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { data: seriesList = [], isLoading: loadingSeries } = useQuery({ queryKey: ['series', 'my'], queryFn: fetchMySeries });
  const { data: chapters = [], isLoading: loadingChapters } = useQuery({ queryKey: ['chapters', selectedSeriesId], queryFn: () => fetchChapters(selectedSeriesId), enabled: !!selectedSeriesId });
  const { data: assistants = [], isLoading: loadingAssistants } = useQuery({ queryKey: ['assistants'], queryFn: fetchAssistants });

  const selectedChapter = chapters.find((c: any) => c.id === selectedChapterId);
  const pageCount = (selectedChapter as any)?.totalPages ?? 5;

  const createTaskMutation = useMutation({
    mutationFn: (task: LocalTask) => taskService.create({
      pageId: `${selectedChapterId}_page_${selectedPageNum}`,
      assignedTo: task.assignedTo!,
      title: task.title || `${TASK_TYPES.find(t => t.value === task.type)?.label} - Trang ${selectedPageNum}`,
      description: task.description,
      taskType: task.type,
      priority: task.priority,
      panelRegion: task.zone,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedChapterId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setIsDrawing(true);
    setStartPoint({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const endX = ((e.clientX - rect.left) / rect.width) * 100;
    const endY = ((e.clientY - rect.top) / rect.height) * 100;
    const zone = { x: Math.min(startPoint.x, endX), y: Math.min(startPoint.y, endY), width: Math.abs(endX - startPoint.x), height: Math.abs(endY - startPoint.y) };
    if (zone.width < 3 || zone.height < 3) { setIsDrawing(false); setStartPoint(null); return; }
    setTempTask({ id: Date.now(), zone, type: selectedTaskType, assignedTo: null, title: '', description: '', priority: 'normal' });
    setShowTaskForm(true); setIsDrawing(false); setStartPoint(null);
  };

  const handleSubmitAll = async () => {
    setSubmitError(''); setSubmitSuccess(false);
    if (tasks.some(t => !t.assignedTo)) { setSubmitError('Còn task chưa được phân công!'); return; }
    try {
      await Promise.all(tasks.map(t => createTaskMutation.mutateAsync(t)));
      setSubmitSuccess(true); setTasks([]);
    } catch { setSubmitError('Có lỗi khi gửi task. Vui lòng thử lại.'); }
  };

  const getTypeColor = (type: TaskType) => TASK_TYPES.find(t => t.value === type)?.color ?? 'bg-gray-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Phân công công việc</h1>
        <p className="text-gray-400">Chọn vùng trên trang và giao việc cho trợ lý</p>
      </div>

      {/* Series selector */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4 font-['Syne']">1. Chọn Series</h2>
        {loadingSeries ? <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" />Đang tải...</div> : (
          <div className="relative">
            <select value={selectedSeriesId} onChange={e => { setSelectedSeriesId(e.target.value); setSelectedChapterId(''); setTasks([]); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">-- Chọn series --</option>
              {seriesList.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Chapter selector */}
      {selectedSeriesId && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 font-['Syne']">2. Chọn Chapter</h2>
          {loadingChapters ? <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" />Đang tải...</div>
            : chapters.length === 0 ? <p className="text-gray-400 text-sm">Chưa có chapter nào. Hãy tạo chapter trước.</p>
            : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chapters.map((chapter: any) => (
                <button key={chapter.id} onClick={() => { setSelectedChapterId(chapter.id); setTasks([]); }}
                  className={`p-4 rounded-xl border text-left transition-all ${selectedChapterId === chapter.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:border-purple-500/50'}`}>
                  <p className="font-semibold text-white">Chapter {chapter.chapterNumber}: {chapter.title}</p>
                  <p className="text-sm text-gray-400 mt-1">{chapter.totalPages ?? '?'} trang</p>
                </button>
              ))}
            </div>}
        </div>
      )}

      {/* Canvas + right panel */}
      {selectedChapterId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3"><MousePointer className="w-4 h-4 text-purple-400" /><span className="text-sm font-medium text-gray-300">Loại công việc:</span></div>
              <div className="flex flex-wrap gap-2">
                {TASK_TYPES.map(type => (
                  <button key={type.value} onClick={() => setSelectedTaskType(type.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedTaskType === type.value ? `${type.color} text-white shadow-lg` : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'}`}>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white font-['Syne']">Trang {selectedPageNum}</h3>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: Math.min(pageCount, 10) }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setSelectedPageNum(n)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${selectedPageNum === n ? 'bg-purple-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="relative bg-white/10 aspect-[3/4] rounded-lg overflow-hidden cursor-crosshair select-none" onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">[Trang {selectedPageNum} — Kéo để chọn vùng]</div>
                {tasks.filter(t => t.assignedTo).map(task => (
                  <div key={task.id} className={`absolute border-2 ${getTypeColor(task.type).replace('bg-', 'border-')} opacity-60`}
                    style={{ left: `${task.zone.x}%`, top: `${task.zone.y}%`, width: `${task.zone.width}%`, height: `${task.zone.height}%` }}>
                    <div className={`${getTypeColor(task.type)} text-white text-xs px-1 py-0.5`}>{TASK_TYPES.find(t => t.value === task.type)?.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">💡 Nhấn và kéo trên trang để chọn vùng cần giao việc</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-purple-400" /><h3 className="text-lg font-bold text-white font-['Syne']">Trợ lý</h3></div>
              {loadingAssistants ? <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" />Đang tải...</div>
                : assistants.length === 0 ? <p className="text-sm text-gray-400">Không có trợ lý.</p>
                : <div className="space-y-2">{assistants.map((a: any) => (
                    <div key={a.id} className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-white">{a.name}</span><span className={`w-2 h-2 rounded-full ${a.isActive ? 'bg-green-400' : 'bg-gray-400'}`} /></div>
                      <p className="text-xs text-gray-400">{a.email}</p>
                    </div>
                  ))}</div>}
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 font-['Syne']">Công việc ({tasks.length})</h3>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm"><AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Chưa có công việc</p><p className="text-xs mt-1">Vẽ vùng trên trang để tạo</p></div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {tasks.map((task, idx) => (
                    <div key={task.id} className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getTypeColor(task.type)}`}>{TASK_TYPES.find(t => t.value === task.type)?.label}</span>
                        <button onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <select value={task.assignedTo || ''} onChange={e => { const u = [...tasks]; u[idx].assignedTo = e.target.value || null; setTasks(u); }}
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white">
                        <option value="">Chọn trợ lý</option>
                        {assistants.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      {task.assignedTo && <div className="flex items-center gap-1 mt-2"><CheckCircle2 className="w-3 h-3 text-green-400" /><span className="text-xs text-green-400">Đã phân công</span></div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {submitError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">{submitError}</div>}
            {submitSuccess && <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-sm text-green-300">✅ Đã gửi công việc thành công!</div>}

            {tasks.length > 0 && (
              <button onClick={handleSubmitAll} disabled={createTaskMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium disabled:opacity-60">
                {createTaskMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Đang gửi...</> : <><Send className="w-4 h-4" />Gửi công việc ({tasks.length})</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Task form modal */}
      {showTaskForm && tempTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Chi tiết công việc</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Tiêu đề</label>
                <input type="text" value={tempTask.title || ''} onChange={e => setTempTask({ ...tempTask, title: e.target.value })}
                  placeholder="VD: Vẽ nền thành phố ban đêm..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Mô tả</label>
                <textarea rows={3} value={tempTask.description || ''} onChange={e => setTempTask({ ...tempTask, description: e.target.value })}
                  placeholder="Mô tả chi tiết yêu cầu..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Độ ưu tiên</label>
                <div className="flex gap-2">
                  {[{ value: 'urgent', label: 'Khẩn', color: 'bg-red-600' }, { value: 'high', label: 'Cao', color: 'bg-orange-600' }, { value: 'normal', label: 'TB', color: 'bg-blue-600' }, { value: 'low', label: 'Thấp', color: 'bg-gray-600' }].map(p => (
                    <button key={p.value} onClick={() => setTempTask({ ...tempTask, priority: p.value as any })}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tempTask.priority === p.value ? `${p.color} text-white` : 'bg-white/5 border border-white/10 text-gray-400'}`}>{p.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowTaskForm(false); setTempTask(null); }} className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all">Hủy</button>
              <button onClick={() => { if (tempTask) { setTasks([...tasks, tempTask as LocalTask]); setTempTask(null); setShowTaskForm(false); } }} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskAssignment;
