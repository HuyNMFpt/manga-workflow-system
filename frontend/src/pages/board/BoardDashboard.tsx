import { 
  Users, 
  BarChart2, 
  AlertTriangle, 
  CheckCircle2,
  TrendingDown,
  Sparkles,
  ChevronRight,
  Target,
  TrendingUp,
  Vote
} from 'lucide-react';
import { Link } from 'react-router-dom';

const BoardDashboard = () => {
  // Mock data - Replace with real API
  const stats = [
    {
      title: 'Chờ bình duyệt',
      value: '5',
      change: '3 series mới tuần này',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      trend: 'up'
    },
    {
      title: 'Tổng series active',
      value: '28',
      change: 'Đang serializing',
      icon: BarChart2,
      gradient: 'from-green-500 to-green-600',
      trend: 'neutral'
    },
    {
      title: 'Series nguy hiểm',
      value: '3',
      change: 'Cần quyết định',
      icon: AlertTriangle,
      gradient: 'from-red-500 to-red-600',
      trend: 'down'
    },
    {
      title: 'Quyết định tháng này',
      value: '8',
      change: '2 chờ phê duyệt',
      icon: CheckCircle2,
      gradient: 'from-purple-500 to-purple-600',
      trend: 'up'
    }
  ];

  const pendingVotes = [
    {
      id: 1,
      title: 'Dragon Chronicles',
      genre: 'Fantasy, Adventure',
      submittedDate: '2 ngày trước',
      votesReceived: 3,
      votesNeeded: 5,
      status: 'voting'
    },
    {
      id: 2,
      title: 'Cyber Warriors',
      genre: 'Sci-fi, Action',
      submittedDate: '1 ngày trước',
      votesReceived: 1,
      votesNeeded: 5,
      status: 'voting'
    },
    {
      id: 3,
      title: 'Love in Autumn',
      genre: 'Romance, Drama',
      submittedDate: '5 giờ trước',
      votesReceived: 0,
      votesNeeded: 5,
      status: 'new'
    }
  ];

  const atRiskSeries = [
    {
      id: 1,
      title: 'Falling Star',
      rank: 27,
      votes: 342,
      trend: 'down',
      periodsLow: 3
    },
    {
      id: 2,
      title: 'Lost Dreams',
      rank: 26,
      votes: 389,
      trend: 'down',
      periodsLow: 3
    },
    {
      id: 3,
      title: 'Silent Echo',
      rank: 25,
      votes: 412,
      trend: 'down',
      periodsLow: 4
    }
  ];

  const quickActions = [
    { icon: Vote, label: 'Bỏ phiếu', gradient: 'from-purple-600 to-purple-700', link: '/board/voting' },
    { icon: BarChart2, label: 'Xếp hạng', gradient: 'from-blue-600 to-blue-700', link: '/board/rankings' },
    { icon: AlertTriangle, label: 'Quyết định', gradient: 'from-red-600 to-red-700', link: '/board/decisions' },
    { icon: Users, label: 'Thành viên', gradient: 'from-green-600 to-green-700', link: '/board/voting' }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-['Syne'] flex items-center gap-3">
            Editorial Board
            <Sparkles className="w-7 h-7 text-purple-400" />
          </h1>
          <p className="text-gray-400">Bình duyệt series và quản lý bảng xếp hạng</p>
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
        {/* Pending Votes */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-white font-['Syne']">Chờ bình duyệt</h2>
            </div>
            <Link 
              to="/board/voting"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              Bỏ phiếu
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {pendingVotes.map((series) => (
              <Link
                key={series.id}
                to="/board/voting"
                className="block bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group border border-white/5 hover:border-purple-500/30"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1 group-hover:text-purple-400 transition-colors">
                      {series.title}
                    </h3>
                    <p className="text-sm text-gray-400">{series.genre}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    series.status === 'new' 
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  }`}>
                    {series.status === 'new' ? 'Mới' : 'Đang vote'}
                  </span>
                </div>
                
                {/* Vote Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Đã nhận phiếu</span>
                    <span className="text-white font-medium">
                      {series.votesReceived}/{series.votesNeeded}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${(series.votesReceived / series.votesNeeded) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{series.submittedDate}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* At Risk Series */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-white font-['Syne']">Series nguy hiểm</h2>
            </div>
            <Link 
              to="/board/decisions"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              Quyết định
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {atRiskSeries.map((series) => (
              <Link
                key={series.id}
                to="/board/decisions"
                className="block bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/30 rounded-xl p-4 hover:from-red-500/20 hover:to-red-600/20 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-red-500/30">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold mb-1">{series.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <span>Hạng #{series.rank}</span>
                      <span>•</span>
                      <span>{series.votes.toLocaleString()} votes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {series.periodsLow} kỳ thấp liên tiếp
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Decisions */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
          <h2 className="text-xl font-bold text-white font-['Syne']">Quyết định gần đây</h2>
        </div>
        <div className="space-y-3">
          {[
            { series: 'Moonlight Chronicles', decision: 'Phê duyệt xuất bản hàng tuần', time: '2 ngày trước', type: 'success' },
            { series: 'Shadow Blade', decision: 'Đổi sang hàng tháng', time: '3 ngày trước', type: 'warning' },
            { series: 'Lost Paradise', decision: 'Thử thách 3 tháng', time: '5 ngày trước', type: 'info' },
            { series: 'Dark Universe', decision: 'Hủy series', time: '1 tuần trước', type: 'error' }
          ].map((activity, index) => (
            <div key={index} className="flex items-start gap-4 group cursor-pointer hover:bg-white/5 p-3 -mx-3 rounded-lg transition-all">
              <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                activity.type === 'success' ? 'bg-green-400 shadow-lg shadow-green-400/50' :
                activity.type === 'warning' ? 'bg-orange-400 shadow-lg shadow-orange-400/50' :
                activity.type === 'error' ? 'bg-red-400 shadow-lg shadow-red-400/50' :
                'bg-blue-400 shadow-lg shadow-blue-400/50'
              }`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white group-hover:text-purple-400 transition-colors">
                  <span className="font-semibold">{activity.series}</span> — {activity.decision}
                </p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BoardDashboard;
