import { 
  FileText, 
  Activity, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Sparkles,
  ChevronRight,
  Target
} from 'lucide-react';
import { Link } from 'react-router-dom';

const EditorDashboard = () => {
  // Mock data - Replace with real API
  const stats = [
    {
      title: 'Đang xét duyệt',
      value: '8',
      change: '3 bản thảo mới',
      icon: FileText,
      gradient: 'from-blue-500 to-blue-600',
      trend: 'up'
    },
    {
      title: 'Đang serializing',
      value: '12',
      change: 'Tiến độ tốt',
      icon: CheckCircle2,
      gradient: 'from-green-500 to-green-600',
      trend: 'up'
    },
    {
      title: 'Series nguy hiểm',
      value: '2',
      change: 'Cần theo dõi',
      icon: AlertTriangle,
      gradient: 'from-red-500 to-red-600',
      trend: 'down'
    },
    {
      title: 'Deadline tuần này',
      value: '5',
      change: '2 ngày nữa',
      icon: Clock,
      gradient: 'from-orange-500 to-orange-600',
      trend: 'neutral'
    }
  ];

  const manuscriptsToReview = [
    {
      id: 1,
      title: 'Tokyo Phantom',
      genre: 'Action, Supernatural',
      status: 'in_review',
      submittedDate: '2 ngày trước',
      pages: 18
    },
    {
      id: 2,
      title: 'Starlight Academy',
      genre: 'School, Romance',
      status: 'in_review',
      submittedDate: '1 ngày trước',
      pages: 22
    },
    {
      id: 3,
      title: 'Dragon Chronicles',
      genre: 'Fantasy, Adventure',
      status: 'in_review',
      submittedDate: '5 giờ trước',
      pages: 20
    }
  ];

  const studioProgress = [
    {
      id: 1,
      series: 'Moonlight Chronicles',
      chapter: 18,
      totalPages: 20,
      completed: 16,
      inProgress: 3,
      overdue: 1,
      deadline: '3 ngày',
      isUrgent: false
    },
    {
      id: 2,
      series: 'Shadow Warrior',
      chapter: 12,
      totalPages: 18,
      completed: 14,
      inProgress: 2,
      overdue: 0,
      deadline: '2 ngày',
      isUrgent: true
    }
  ];

  const quickActions = [
    { icon: FileText, label: 'Xét duyệt', gradient: 'from-purple-600 to-purple-700', link: '/editor/manuscripts' },
    { icon: Activity, label: 'Tiến độ', gradient: 'from-blue-600 to-blue-700', link: '/editor/progress' },
    { icon: Users, label: 'Mangaka', gradient: 'from-green-600 to-green-700', link: '/editor/manuscripts' },
    { icon: Calendar, label: 'Lịch họp', gradient: 'from-orange-600 to-orange-700', link: '/editor/progress' }
  ];

  const getStatusBadge = (status: string) => {
    const badges = {
      in_review: { label: 'Đang xét', class: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
      approved: { label: 'Đã duyệt', class: 'bg-green-500/10 text-green-400 border-green-500/30' },
      revision: { label: 'Cần sửa', class: 'bg-orange-500/10 text-orange-400 border-orange-500/30' }
    };
    const badge = badges[status as keyof typeof badges] || badges.in_review;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.class}`}>{badge.label}</span>;
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-['Syne'] flex items-center gap-3">
            Chào buổi chiều, Tanaka
            <Sparkles className="w-7 h-7 text-purple-400" />
          </h1>
          <p className="text-gray-400">Tổng quan bản thảo và tiến độ studio</p>
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
        {/* Manuscripts to Review */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-white font-['Syne']">Bản thảo cần xét duyệt</h2>
            </div>
            <Link 
              to="/editor/manuscripts"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              Xem tất cả
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {manuscriptsToReview.map((manuscript) => (
              <Link
                key={manuscript.id}
                to="/editor/manuscripts"
                className="block bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group border border-white/5 hover:border-purple-500/30"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1 group-hover:text-purple-400 transition-colors">
                      {manuscript.title}
                    </h3>
                    <p className="text-sm text-gray-400">{manuscript.genre}</p>
                  </div>
                  {getStatusBadge(manuscript.status)}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{manuscript.pages} trang</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {manuscript.submittedDate}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Studio Progress Overview */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-white font-['Syne']">Tiến độ studio</h2>
            </div>
            <Link 
              to="/editor/progress"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              Chi tiết
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {studioProgress.map((item) => {
              const percentage = Math.round((item.completed / item.totalPages) * 100);
              return (
                <div
                  key={item.id}
                  className={`bg-white/5 rounded-xl p-4 border ${
                    item.isUrgent ? 'border-orange-500/30' : 'border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{item.series}</h3>
                      <p className="text-xs text-gray-400 mt-1">Chapter {item.chapter}</p>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      item.isUrgent ? 'text-orange-400' : 'text-gray-400'
                    }`}>
                      {item.isUrgent ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {item.deadline}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-gray-400">Tiến độ</span>
                      <span className="text-white font-medium">{item.completed}/{item.totalPages} trang</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          percentage >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' : 
                          percentage >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                          'bg-gradient-to-r from-orange-500 to-orange-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full">
                      ✓ {item.completed} hoàn thành
                    </span>
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">
                      ↻ {item.inProgress} đang làm
                    </span>
                    {item.overdue > 0 && (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full">
                        ! {item.overdue} quá hạn
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorDashboard;
