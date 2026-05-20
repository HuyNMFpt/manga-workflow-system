import { useState } from 'react';
import { 
  ListTodo, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Upload,
  Download,
  FileImage,
  X,
  Filter
} from 'lucide-react';

const TaskList = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const filters = [
    { id: 'all', label: 'Tất cả', count: 15 },
    { id: 'assigned', label: 'Chờ làm', count: 5 },
    { id: 'in_progress', label: 'Đang làm', count: 7 },
    { id: 'submitted', label: 'Đã nộp', count: 2 },
    { id: 'revision_required', label: 'Cần sửa', count: 1 },
    { id: 'approved', label: 'Đã duyệt', count: 0 }
  ];

  const tasks = [
    {
      id: 1,
      type: 'Background',
      chapter: 18,
      page: 12,
      deadline: '2024-01-25',
      status: 'revision_required',
      instructions: 'Vẽ background phòng khách, có cửa sổ lớn nhìn ra vườn',
      revisionNote: 'Cần thêm chi tiết ở góc trái, cây cối chưa rõ'
    },
    {
      id: 2,
      type: 'Inking',
      chapter: 19,
      page: 5,
      deadline: '2024-01-26',
      status: 'assigned',
      instructions: 'Inking cho nhân vật chính, focus vào mắt và tóc'
    },
    {
      id: 3,
      type: 'Toning',
      chapter: 18,
      page: 15,
      deadline: '2024-01-27',
      status: 'in_progress',
      instructions: 'Screentone cho cảnh đêm, tạo không khí u ám'
    },
    {
      id: 4,
      type: 'Effects',
      chapter: 19,
      page: 8,
      deadline: '2024-01-28',
      status: 'submitted',
      instructions: 'Thêm hiệu ứng tia sáng và motion lines'
    }
  ];

  const getDeadlineInfo = (deadline: string) => {
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
    if (diff < 0) return { text: 'Quá hạn', class: 'text-red-400', icon: AlertCircle };
    if (diff === 0) return { text: 'Hôm nay', class: 'text-orange-400', icon: Clock };
    if (diff <= 2) return { text: `${diff} ngày`, class: 'text-yellow-400', icon: Clock };
    return { text: `${diff} ngày`, class: 'text-gray-400', icon: Clock };
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      assigned: { label: 'Chưa làm', class: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
      in_progress: { label: 'Đang làm', class: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
      revision_required: { label: 'Cần sửa', class: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
      submitted: { label: 'Đã nộp', class: 'bg-green-500/10 text-green-400 border-green-500/30' },
      approved: { label: 'Đã duyệt', class: 'bg-green-500/10 text-green-400 border-green-500/30' }
    };
    const badge = badges[status as keyof typeof badges] || badges.assigned;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.class}`}>{badge.label}</span>;
  };

  const getTaskTypeColor = (type: string) => {
    const colors = {
      'Background': 'bg-blue-500/10 text-blue-400',
      'Inking': 'bg-purple-500/10 text-purple-400',
      'Toning': 'bg-green-500/10 text-green-400',
      'Effects': 'bg-orange-500/10 text-orange-400'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500/10 text-gray-400';
  };

  const handleSubmitClick = (task: any) => {
    setSelectedTask(task);
    setShowSubmitModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Công việc của tôi</h1>
        <p className="text-gray-400">Danh sách các trang được giao, sắp xếp theo deadline</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Đang chờ', count: 12, icon: ListTodo, gradient: 'from-blue-500 to-blue-600' },
          { label: 'Cần sửa', count: 1, icon: AlertCircle, gradient: 'from-orange-500 to-orange-600' },
          { label: 'Đã duyệt', count: 47, icon: CheckCircle2, gradient: 'from-green-500 to-green-600' }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-center">
              <div className={`w-10 h-10 mx-auto mb-3 bg-gradient-to-br ${stat.gradient} rounded-lg flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.count}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeFilter === filter.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {filter.label}
              {filter.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeFilter === filter.id ? 'bg-white/20' : 'bg-white/10'
                }`}>
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Task Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((task) => {
          const deadline = getDeadlineInfo(task.deadline);
          const DeadlineIcon = deadline.icon;
          
          return (
            <div
              key={task.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:border-purple-500/50 transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTaskTypeColor(task.type)}`}>
                    {task.type}
                  </span>
                  {getStatusBadge(task.status)}
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${deadline.class}`}>
                  <DeadlineIcon className="w-3 h-3" />
                  {deadline.text}
                </div>
              </div>

              {/* Task Info */}
              <h3 className="text-white font-semibold mb-3">
                Chapter {task.chapter} · Trang {task.page}
              </h3>

              {/* Instructions */}
              {task.instructions && (
                <div className="bg-white/5 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-400 mb-1 font-medium">Hướng dẫn từ tác giả</p>
                  <p className="text-sm text-gray-300">{task.instructions}</p>
                </div>
              )}

              {/* Revision Note */}
              {task.status === 'revision_required' && task.revisionNote && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-3">
                  <p className="text-xs text-orange-400 mb-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Yêu cầu chỉnh sửa
                  </p>
                  <p className="text-sm text-orange-300">{task.revisionNote}</p>
                </div>
              )}

              {/* Preview Area */}
              <div className="bg-white/5 rounded-lg h-32 mb-4 flex items-center justify-center border border-white/5">
                <p className="text-xs text-gray-500">Xem preview vùng được giao</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all text-sm font-medium">
                  <Download className="w-4 h-4" />
                  Tải file
                </button>
                
                {['assigned', 'in_progress', 'revision_required'].includes(task.status) && (
                  <button 
                    onClick={() => handleSubmitClick(task)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all text-sm font-medium shadow-lg"
                  >
                    <Upload className="w-4 h-4" />
                    {task.status === 'revision_required' ? 'Nộp lại' : 'Nộp bài'}
                  </button>
                )}

                {task.status === 'approved' && (
                  <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Đã duyệt
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Modal */}
      {showSubmitModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold text-white font-['Syne']">Nộp công việc</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedTask.type} — Chapter {selectedTask.chapter}, Trang {selectedTask.page}
                </p>
              </div>
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  File hoàn thiện <span className="text-red-400">*</span>
                </label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors cursor-pointer group">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileImage className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-sm text-white mb-2">Kéo thả hoặc click để chọn file</p>
                  <p className="text-xs text-gray-500">PNG, PSD, JPG — tối đa 50MB</p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Ghi chú (tuỳ chọn)
                </label>
                <textarea
                  rows={4}
                  placeholder="Thêm ghi chú cho tác giả..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-white/10">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all font-medium"
              >
                Huỷ
              </button>
              <button className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium shadow-lg">
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
