import { 
  ListTodo, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Upload,
  TrendingUp,
  Calendar,
  FileText,
  Sparkles,
  ChevronRight,
  Target
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AssistantDashboard = () => {
  // Mock data - Replace with real API
  const stats = [
    {
      title: 'Đang chờ làm',
      value: '12',
      change: '3 task mới hôm nay',
      icon: ListTodo,
      gradient: 'from-blue-500 to-blue-600',
      trend: 'up'
    },
    {
      title: 'Cần sửa lại',
      value: '2',
      change: 'Cần xem lại',
      icon: AlertCircle,
      gradient: 'from-orange-500 to-orange-600',
      trend: 'neutral'
    },
    {
      title: 'Quá hạn',
      value: '1',
      change: 'Cần ưu tiên',
      icon: Clock,
      gradient: 'from-red-500 to-red-600',
      trend: 'down'
    },
    {
      title: 'Đã duyệt',
      value: '47',
      change: '+8 tuần này',
      icon: CheckCircle2,
      gradient: 'from-green-500 to-green-600',
      trend: 'up'
    }
  ];

  const urgentTasks = [
    { 
      id: 1,
      type: 'Background',
      chapter: 18,
      page: 12,
      deadline: 'Hôm nay',
      status: 'revision_required',
      note: 'Cần thêm chi tiết ở góc trái'
    },
    { 
      id: 2,
      type: 'Inking',
      chapter: 19,
      page: 5,
      deadline: 'Ngày mai',
      status: 'assigned',
      note: null
    },
    { 
      id: 3,
      type: 'Toning',
      chapter: 18,
      page: 15,
      deadline: '2 ngày',
      status: 'in_progress',
      note: null
    }
  ];

  const recentActivity = [
    { action: 'Task Ch.18 - Trang 10 đã được duyệt', time: '1 giờ trước', type: 'success' },
    { action: 'Bạn đã nộp Ch.19 - Trang 3', time: '3 giờ trước', type: 'info' },
    { action: 'Task mới: Background Ch.19 - Trang 8', time: '5 giờ trước', type: 'info' },
    { action: 'Yêu cầu chỉnh sửa Ch.18 - Trang 12', time: '1 ngày trước', type: 'warning' }
  ];

  const quickActions = [
    { icon: ListTodo, label: 'Xem Tasks', gradient: 'from-purple-600 to-purple-700', link: '/assistant/tasks' },
    { icon: Upload, label: 'Nộp bài', gradient: 'from-blue-600 to-blue-700', link: '/assistant/tasks' },
    { icon: TrendingUp, label: 'Thu nhập', gradient: 'from-green-600 to-green-700', link: '/assistant/earnings' },
    { icon: Calendar, label: 'Lịch việc', gradient: 'from-orange-600 to-orange-700', link: '/assistant/tasks' }
  ];

  const getStatusBadge = (status: string) => {
    const badges = {
      assigned: { label: 'Chưa làm', class: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
      in_progress: { label: 'Đang làm', class: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
      revision_required: { label: 'Cần sửa', class: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
      submitted: { label: 'Đã nộp', class: 'bg-green-500/10 text-green-400 border-green-500/30' }
    };
    const badge = badges[status as keyof typeof badges] || badges.assigned;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${badge.class}`}>{badge.label}</span>;
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

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-['Syne'] flex items-center gap-3">
            Chào buổi chiều, Yamada
            <Sparkles className="w-7 h-7 text-purple-400" />
          </h1>
          <p className="text-gray-400">Đây là tổng quan công việc của bạn hôm nay</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {stat.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-400" />}
                {stat.trend === 'down' && <Target className="w-5 h-5 text-red-400" />}
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-300 mb-2">{stat.title}</p>
              <p className="text-xs text-gray-500">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
          <h2 className="text-xl font-bold text-white font-['Syne']">Thao tác nhanh</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.link}
                className={`bg-gradient-to-br ${action.gradient} rounded-xl p-5 flex flex-col items-center gap-3 transition-all hover:scale-105 shadow-lg hover:shadow-2xl text-white group`}
              >
                <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-center">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Urgent Tasks */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-white font-['Syne']">Việc cần làm ngay</h2>
            </div>
            <Link 
              to="/assistant/tasks"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              Xem tất cả
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {urgentTasks.map((task) => (
              <div 
                key={task.id} 
                className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group border border-white/5 hover:border-purple-500/30"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTaskTypeColor(task.type)}`}>
                      {task.type}
                    </span>
                    {getStatusBadge(task.status)}
                  </div>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.deadline}
                  </span>
                </div>
                <p className="text-sm text-white font-medium mb-1">
                  Chapter {task.chapter} · Trang {task.page}
                </p>
                {task.note && (
                  <div className="mt-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-xs text-orange-300">{task.note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Earnings Summary */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-white font-['Syne']">Thu nhập tháng này</h2>
            </div>
            <Link 
              to="/assistant/earnings"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              Chi tiết
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {/* Total Earnings Card */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-green-300 font-medium">Tổng thu nhập</p>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">6,500,000₫</p>
            <p className="text-xs text-green-300">+15% so với tháng trước</p>
          </div>

          {/* Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Trang đã duyệt</p>
                  <p className="text-xs text-gray-400">47 trang</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-white">5,800,000₫</p>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Bonus hoàn thành đúng hạn</p>
                  <p className="text-xs text-gray-400">12 tasks</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-white">700,000₫</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
          <h2 className="text-xl font-bold text-white font-['Syne']">Hoạt động gần đây</h2>
        </div>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-start gap-4 group cursor-pointer hover:bg-white/5 p-3 -mx-3 rounded-lg transition-all">
              <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                activity.type === 'success' ? 'bg-green-400 shadow-lg shadow-green-400/50' :
                activity.type === 'warning' ? 'bg-orange-400 shadow-lg shadow-orange-400/50' :
                'bg-blue-400 shadow-lg shadow-blue-400/50'
              }`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white group-hover:text-purple-400 transition-colors">{activity.action}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssistantDashboard;
