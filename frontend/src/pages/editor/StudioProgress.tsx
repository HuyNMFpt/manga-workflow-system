import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Users
} from 'lucide-react';
import { useState } from 'react';

const StudioProgress = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastUpdated = new Date().toLocaleTimeString('vi-VN');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const seriesProgress = [
    {
      id: 1,
      title: 'Moonlight Chronicles',
      genre: 'Fantasy, Romance',
      chapter: 18,
      totalPages: 20,
      completed: 16,
      inProgress: 3,
      overdue: 1,
      daysLeft: 3,
      isUrgent: false,
      mangaka: 'Takehiko Inoue',
      assistants: ['Yamada', 'Sato']
    },
    {
      id: 2,
      title: 'Shadow Warrior',
      genre: 'Action, Martial Arts',
      chapter: 12,
      totalPages: 18,
      completed: 14,
      inProgress: 2,
      overdue: 2,
      daysLeft: 2,
      isUrgent: true,
      mangaka: 'Ken Watanabe',
      assistants: ['Tanaka']
    },
    {
      id: 3,
      title: 'Tokyo Phantom',
      genre: 'Supernatural, Mystery',
      chapter: 8,
      totalPages: 22,
      completed: 18,
      inProgress: 4,
      overdue: 0,
      daysLeft: 5,
      isUrgent: false,
      mangaka: 'Yuki Tanaka',
      assistants: ['Kobayashi', 'Suzuki', 'Ito']
    }
  ];

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'from-green-500 to-green-600';
    if (percentage >= 50) return 'from-blue-500 to-blue-600';
    return 'from-orange-500 to-orange-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Tiến độ Studio</h1>
          <p className="text-gray-400">Theo dõi real-time tiến độ hoàn thiện của từng series</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Cập nhật</span>
        </button>
      </div>

      {/* Live Status */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50"></div>
          <p className="text-sm text-gray-300">
            Cập nhật tự động mỗi 60 giây · Lần cuối: <span className="text-white font-medium">{lastUpdated}</span>
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Tổng series',
            value: seriesProgress.length,
            icon: Activity,
            gradient: 'from-purple-500 to-purple-600'
          },
          {
            label: 'Trang hoàn thành',
            value: seriesProgress.reduce((sum, s) => sum + s.completed, 0),
            icon: CheckCircle2,
            gradient: 'from-green-500 to-green-600'
          },
          {
            label: 'Đang xử lý',
            value: seriesProgress.reduce((sum, s) => sum + s.inProgress, 0),
            icon: Clock,
            gradient: 'from-blue-500 to-blue-600'
          },
          {
            label: 'Quá hạn',
            value: seriesProgress.reduce((sum, s) => sum + s.overdue, 0),
            icon: AlertTriangle,
            gradient: 'from-red-500 to-red-600'
          }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">{stat.label}</p>
                <div className={`w-10 h-10 bg-gradient-to-br ${stat.gradient} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Series Progress Cards */}
      <div className="space-y-4">
        {seriesProgress.map((series) => {
          const percentage = Math.round((series.completed / series.totalPages) * 100);
          const progressColor = getProgressColor(percentage);

          return (
            <div
              key={series.id}
              className={`bg-white/5 backdrop-blur-xl border rounded-2xl overflow-hidden ${
                series.isUrgent ? 'border-orange-500/50' : 'border-white/10'
              }`}
            >
              {/* Header */}
              <div className={`px-6 py-4 border-b flex items-center justify-between ${
                series.isUrgent 
                  ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30' 
                  : 'bg-white/5 border-white/10'
              }`}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-white">{series.title}</h3>
                    {series.isUrgent && (
                      <span className="px-2 py-1 bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-medium rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Sắp deadline
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {series.genre} · Chapter {series.chapter}
                  </p>
                </div>
                <div className={`flex items-center gap-2 text-sm font-medium ${
                  series.isUrgent ? 'text-orange-400' : 'text-gray-400'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span>{series.daysLeft} ngày</span>
                </div>
              </div>

              {/* Progress Section */}
              <div className="p-6 space-y-5">
                {/* Overall Progress */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">Tổng tiến độ</span>
                    <span className="text-sm font-bold text-white">
                      {series.completed}/{series.totalPages} trang ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <div
                      className={`bg-gradient-to-r ${progressColor} h-3 rounded-full transition-all duration-500 shadow-lg`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: 'Đã hoàn thành',
                      value: series.completed,
                      icon: CheckCircle2,
                      gradient: 'from-green-500/20 to-green-600/20',
                      borderColor: 'border-green-500/30',
                      textColor: 'text-green-400'
                    },
                    {
                      label: 'Đang làm',
                      value: series.inProgress,
                      icon: Activity,
                      gradient: 'from-blue-500/20 to-blue-600/20',
                      borderColor: 'border-blue-500/30',
                      textColor: 'text-blue-400'
                    },
                    {
                      label: 'Quá hạn',
                      value: series.overdue,
                      icon: AlertTriangle,
                      gradient: series.overdue > 0 ? 'from-red-500/20 to-red-600/20' : 'from-gray-500/20 to-gray-600/20',
                      borderColor: series.overdue > 0 ? 'border-red-500/30' : 'border-white/10',
                      textColor: series.overdue > 0 ? 'text-red-400' : 'text-gray-400'
                    }
                  ].map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={index}
                        className={`bg-gradient-to-br ${stat.gradient} border ${stat.borderColor} rounded-xl p-4 text-center`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-2 ${stat.textColor}`} />
                        <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                        <p className="text-xs text-gray-400 leading-tight">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Team Info */}
                <div className="bg-white/5 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">Team</p>
                    <p className="text-sm text-white font-medium">
                      {series.mangaka}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Trợ lý: {series.assistants.join(', ')}
                    </p>
                  </div>
                </div>

                {/* Urgent Action */}
                {series.overdue > 0 && (
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all font-medium shadow-lg">
                    <AlertTriangle className="w-4 h-4" />
                    Gửi nhắc nhở cho {series.overdue} task quá hạn
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {seriesProgress.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
            <Activity className="w-10 h-10 text-purple-400" />
          </div>
          <p className="text-lg font-medium text-white mb-2">Không có series nào đang sản xuất</p>
          <p className="text-sm text-gray-400">Chưa có series nào trong giai đoạn serializing</p>
        </div>
      )}
    </div>
  );
};

export default StudioProgress;
