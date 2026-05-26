import { useState } from 'react';
import { 
  Users, 
  MousePointer,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

type TaskType = 'background' | 'shading' | 'effects' | 'screentone' | 'inking' | 'cleanup';
type Assistant = {
  id: number;
  name: string;
  specialty: string;
  availability: 'available' | 'busy';
};

type Task = {
  id: number;
  zone: { x: number; y: number; width: number; height: number };
  type: TaskType;
  assignedTo: number | null;
  description: string;
  priority: 'high' | 'medium' | 'low';
};

const TaskAssignment = () => {
  const [selectedPage, setSelectedPage] = useState(1);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentZone, setCurrentZone] = useState<{ x: number; y: number } | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>('background');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [tempTask, setTempTask] = useState<Partial<Task> | null>(null);

  const assistants: Assistant[] = [
    { id: 1, name: 'Yamada Ken', specialty: 'Background', availability: 'available' },
    { id: 2, name: 'Sato Yuki', specialty: 'Shading', availability: 'available' },
    { id: 3, name: 'Tanaka Hiro', specialty: 'Effects', availability: 'busy' },
    { id: 4, name: 'Suzuki Mai', specialty: 'Screentone', availability: 'available' }
  ];

  const taskTypes: Array<{ value: TaskType; label: string; color: string }> = [
    { value: 'background', label: 'Vẽ nền', color: 'bg-blue-500' },
    { value: 'shading', label: 'Tô bóng', color: 'bg-purple-500' },
    { value: 'effects', label: 'Hiệu ứng', color: 'bg-orange-500' },
    { value: 'screentone', label: 'Screentone', color: 'bg-green-500' },
    { value: 'inking', label: 'Nét mực', color: 'bg-red-500' },
    { value: 'cleanup', label: 'Dọn dẹp', color: 'bg-yellow-500' }
  ];

  const chapters = [
    { id: 1, number: 19, title: 'Moonlight Chronicles Ch.19', pages: 20, status: 'in_progress' },
    { id: 2, number: 20, title: 'Moonlight Chronicles Ch.20', pages: 22, status: 'draft' }
  ];

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setIsDrawing(true);
    setCurrentZone({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentZone) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const endX = ((e.clientX - rect.left) / rect.width) * 100;
    const endY = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newTask: Task = {
      id: Date.now(),
      zone: {
        x: Math.min(currentZone.x, endX),
        y: Math.min(currentZone.y, endY),
        width: Math.abs(endX - currentZone.x),
        height: Math.abs(endY - currentZone.y)
      },
      type: selectedTaskType,
      assignedTo: null,
      description: '',
      priority: 'medium'
    };
    
    setTempTask(newTask);
    setShowTaskForm(true);
    setIsDrawing(false);
    setCurrentZone(null);
  };

  const handleSaveTask = () => {
    if (tempTask) {
      setTasks([...tasks, tempTask as Task]);
      setTempTask(null);
      setShowTaskForm(false);
    }
  };

  const handleAssignAll = () => {
    // Auto-assign tasks based on assistant specialty
    const updatedTasks = tasks.map(task => {
      if (task.assignedTo) return task;
      
      const suitableAssistant = assistants.find(a => 
        a.availability === 'available' && 
        a.specialty.toLowerCase() === task.type
      );
      
      return {
        ...task,
        assignedTo: suitableAssistant?.id || assistants.find(a => a.availability === 'available')?.id || null
      };
    });
    
    setTasks(updatedTasks);
  };

  const getTaskTypeColor = (type: TaskType) => {
    return taskTypes.find(t => t.value === type)?.color || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Phân công công việc</h1>
        <p className="text-gray-400">Chọn vùng trên trang và giao việc cho trợ lý</p>
      </div>

      {/* Chapter Selector */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
          <h2 className="text-xl font-bold text-white font-['Syne']">Chọn Chapter</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chapters.map(chapter => (
            <button
              key={chapter.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white">{chapter.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  chapter.status === 'in_progress' 
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' 
                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                }`}>
                  {chapter.status === 'in_progress' ? 'Đang làm' : 'Nháp'}
                </span>
              </div>
              <p className="text-sm text-gray-400">{chapter.pages} trang</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Page Canvas */}
        <div className="lg:col-span-2 space-y-4">
          {/* Task Type Selector */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <MousePointer className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Chọn loại công việc:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {taskTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setSelectedTaskType(type.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTaskType === type.value
                      ? `${type.color} text-white shadow-lg`
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page Viewer with Zone Selection */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white font-['Syne']">
                Trang {selectedPage}
              </h3>
              <div className="flex gap-2">
                {Array.from({ length: 5 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setSelectedPage(n)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                      selectedPage === n
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas */}
            <div 
              className="relative bg-white/10 aspect-[3/4] rounded-lg overflow-hidden cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            >
              {/* Mock page content */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                [Nội dung trang truyện]
              </div>

              {/* Existing tasks */}
              {tasks.filter(t => t.assignedTo !== null).map(task => (
                <div
                  key={task.id}
                  className={`absolute border-2 ${getTaskTypeColor(task.type).replace('bg-', 'border-')} opacity-50`}
                  style={{
                    left: `${task.zone.x}%`,
                    top: `${task.zone.y}%`,
                    width: `${task.zone.width}%`,
                    height: `${task.zone.height}%`
                  }}
                >
                  <div className={`${getTaskTypeColor(task.type)} text-white text-xs px-2 py-1`}>
                    {taskTypes.find(t => t.value === task.type)?.label}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-3">
              💡 Nhấn và kéo trên trang để chọn vùng cần giao việc
            </p>
          </div>
        </div>

        {/* Task List & Assistants */}
        <div className="space-y-4">
          {/* Assistants */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white font-['Syne']">Trợ lý</h3>
            </div>
            <div className="space-y-2">
              {assistants.map(assistant => (
                <div
                  key={assistant.id}
                  className="bg-white/5 rounded-lg p-3 border border-white/5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{assistant.name}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      assistant.availability === 'available' ? 'bg-green-400' : 'bg-orange-400'
                    }`}></span>
                  </div>
                  <p className="text-xs text-gray-400">{assistant.specialty}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Task Queue */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white font-['Syne']">
                Công việc ({tasks.length})
              </h3>
              {tasks.length > 0 && (
                <button
                  onClick={handleAssignAll}
                  className="text-xs px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                >
                  Tự động phân công
                </button>
              )}
            </div>
            
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Chưa có công việc nào</p>
                <p className="text-xs mt-1">Vẽ vùng trên trang để tạo</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tasks.map((task, index) => {
                  const assignedAssistant = assistants.find(a => a.id === task.assignedTo);
                  return (
                    <div
                      key={task.id}
                      className="bg-white/5 rounded-lg p-3 border border-white/5"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getTaskTypeColor(task.type)}`}>
                          {taskTypes.find(t => t.value === task.type)?.label}
                        </span>
                        <button
                          onClick={() => setTasks(tasks.filter(t => t.id !== task.id))}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <select
                        value={task.assignedTo || ''}
                        onChange={(e) => {
                          const updatedTasks = [...tasks];
                          updatedTasks[index].assignedTo = parseInt(e.target.value) || null;
                          setTasks(updatedTasks);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
                      >
                        <option value="">Chọn trợ lý</option>
                        {assistants.map(a => (
                          <option key={a.id} value={a.id} disabled={a.availability === 'busy'}>
                            {a.name} {a.availability === 'busy' ? '(Bận)' : ''}
                          </option>
                        ))}
                      </select>
                      {assignedAssistant && (
                        <div className="flex items-center gap-1 mt-2">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          <span className="text-xs text-green-400">Đã phân công</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit */}
          {tasks.length > 0 && tasks.every(t => t.assignedTo !== null) && (
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium"
            >
              <Send className="w-4 h-4" />
              Gửi công việc ({tasks.length})
            </button>
          )}
        </div>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && tempTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Chi tiết công việc</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Mô tả</label>
                <textarea
                  rows={3}
                  value={tempTask.description || ''}
                  onChange={(e) => setTempTask({ ...tempTask, description: e.target.value })}
                  placeholder="VD: Vẽ nền rừng với ánh trăng..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Độ ưu tiên</label>
                <div className="flex gap-2">
                  {['high', 'medium', 'low'].map(p => (
                    <button
                      key={p}
                      onClick={() => setTempTask({ ...tempTask, priority: p as any })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        tempTask.priority === p
                          ? p === 'high' ? 'bg-red-600 text-white' :
                            p === 'medium' ? 'bg-orange-600 text-white' :
                            'bg-green-600 text-white'
                          : 'bg-white/5 border border-white/10 text-gray-400'
                      }`}
                    >
                      {p === 'high' ? 'Cao' : p === 'medium' ? 'Trung bình' : 'Thấp'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTaskForm(false);
                  setTempTask(null);
                }}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveTask}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskAssignment;
