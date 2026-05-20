import { 
  BookOpen, 
  FileText, 
  CheckSquare, 
  Clock,
  Plus,
  Upload,
  Calendar,
  TrendingUp,
  Target,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MangakaDashboard = () => {
  // Mock data
  const stats = [
    {
      title: 'Series đang hoạt động',
      value: '3',
      change: '+1 tháng này',
      icon: BookOpen,
      gradient: 'from-purple-500 to-purple-600',
      trend: 'up'
    },
    {
      title: 'Tổng số Chapter',
      value: '47',
      change: '+5 tuần này',
      icon: FileText,
      gradient: 'from-blue-500 to-blue-600',
      trend: 'up'
    },
    {
      title: 'Công việc chờ xử lý',
      value: '8',
      change: '2 hết hạn hôm nay',
      icon: CheckSquare,
      gradient: 'from-orange-500 to-orange-600',
      trend: 'neutral'
    },
    {
      title: 'Deadline sắp tới',
      value: '4',
      change: 'Gần nhất: 2 ngày',
      icon: Clock,
      gradient: 'from-red-500 to-red-600',
      trend: 'down'
    }
  ];

  const recentSeries = [
    { 
      name: 'Moonlight Chronicles', 
      chapters: 18, 
      totalChapters: 24, 
      status: 'Đang tiến hành',
      lastUpdate: '2 ngày trước',
      progress: 75
    },
    { 
      name: 'Shadow Warrior', 
      chapters: 12, 
      totalChapters: 12, 
      status: 'Hoàn thành',
      lastUpdate: '1 tuần trước',
      progress: 100
    },
    { 
      name: 'Starlight Academy', 
      chapters: 8, 
      totalChapters: 20, 
      status: 'Đang tiến hành',
      lastUpdate: '3 ngày trước',
      progress: 40
    }
  ];

  const recentActivity = [
    { action: 'Chapter 18 được biên tập viên phê duyệt', time: '2 giờ trước', type: 'success' },
    { action: 'Nhiệm vụ mới: Vẽ nền cho Ch.19', time: '5 giờ trước', type: 'info' },
    { action: 'Nhắc nhở deadline: Ch.19 còn 2 ngày', time: '1 ngày trước', type: 'warning' },
    { action: 'Trợ lý Yamada hoàn thành tô màu', time: '1 ngày trước', type: 'success' },
    { action: 'Chapter 17 đã được xuất bản', time: '3 ngày trước', type: 'success' }
  ];

  const pendingTasks = [
    { title: 'Hoàn thành phác thảo Chapter 19', assignee: 'Bạn', dueDate: 'Ngày mai', priority: 'high' },
    { title: 'Kiểm tra bản vẽ của trợ lý', assignee: 'Bạn', dueDate: 'Hôm nay', priority: 'high' },
    { title: 'Nộp storyboard Chapter 20', assignee: 'Bạn', dueDate: '3 ngày nữa', priority: 'medium' },
    { title: 'Duyệt chỉnh sửa cuối Ch.18', assignee: 'Biên tập viên Tanaka', dueDate: 'Hôm nay', priority: 'medium' }
  ];

  const quickActions = [
    { icon: Plus, label: 'Tạo Series mới', gradient: 'from-purple-600 to-purple-700', link: '/mangaka/submit-series' },
    { icon: Upload, label: 'Upload Chapter', gradient: 'from-blue-600 to-blue-700', link: '/mangaka/chapters' },
    { icon: CheckSquare, label: 'Giao việc', gradient: 'from-green-600 to-green-700', link: '/mangaka/assign-tasks' },
    { icon: Calendar, label: 'Xem xếp hạng', gradient: 'from-orange-600 to-orange-700', link: '/mangaka/rankings' }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-['Syne'] flex items-center gap-3">
            Chào mừng trở lại, Takehiko
            <Sparkles className="w-7 h-7 text-purple-400" />
          </h1>
          <p className="text-gray-400">Đây là tình hình dự án manga của bạn hôm nay</p>
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
        {/* My Series */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-white font-['Syne']">Series của tôi</h2>
            </div>
            <Link 
              to="/mangaka/series"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              Xem tất cả
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentSeries.map((series, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group border border-white/5 hover:border-purple-500/30">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">{series.name}</h3>
                    <p className="text-sm text-gray-400">
                      {series.chapters}/{series.totalChapters} chapters • {series.lastUpdate}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    series.status === 'Hoàn thành' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  }`}>
                    {series.status}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500 shadow-lg shadow-purple-500/50"
                    style={{ width: `${series.progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{series.progress}% hoàn thành</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-white font-['Syne']">Công việc chờ xử lý</h2>
            </div>
            <Link
              to="/mangaka/review-pages"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              Xem tất cả
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {pendingTasks.map((task, index) => (
              <div key={index} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all group cursor-pointer border border-white/5 hover:border-purple-500/30">
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-white/5 text-purple-600 focus:ring-purple-500 cursor-pointer" 
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-sm mb-1.5 group-hover:text-purple-400 transition-colors">{task.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                      <span>{task.assignee}</span>
                      <span>•</span>
                      <span>{task.dueDate}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium border ${
                        task.priority === 'high' 
                          ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      }`}>
                        {task.priority === 'high' ? 'Ưu tiên cao' : 'Trung bình'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                activity.type === 'warning' ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' :
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

export default MangakaDashboard;
