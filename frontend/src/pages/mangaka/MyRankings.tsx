import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  AlertTriangle,
  Award,
  BarChart2,
  Calendar,
  Target,
  Activity
} from 'lucide-react';

type Series = {
  id: number;
  title: string;
  currentRank: number;
  previousRank: number;
  trend: 'up' | 'down' | 'stable';
  currentVotes: number;
  previousVotes: number;
  isAtRisk: boolean;
  consecutiveLowPeriods: number;
  lastUpdate: string;
};

const MyRankings = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'last_month' | 'last_quarter'>('current');

  const mySeries: Series[] = [
    {
      id: 1,
      title: 'Moonlight Chronicles',
      currentRank: 3,
      previousRank: 4,
      trend: 'up',
      currentVotes: 2431,
      previousVotes: 2198,
      isAtRisk: false,
      consecutiveLowPeriods: 0,
      lastUpdate: '2 ngày trước'
    },
    {
      id: 2,
      title: 'Shadow Warrior',
      currentRank: 8,
      previousRank: 7,
      trend: 'down',
      currentVotes: 1876,
      previousVotes: 1923,
      isAtRisk: false,
      consecutiveLowPeriods: 1,
      lastUpdate: '2 ngày trước'
    },
    {
      id: 3,
      title: 'Starlight Academy',
      currentRank: 24,
      previousRank: 21,
      trend: 'down',
      currentVotes: 543,
      previousVotes: 687,
      isAtRisk: true,
      consecutiveLowPeriods: 3,
      lastUpdate: '2 ngày trước'
    }
  ];

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-5 h-5 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-5 h-5 text-red-400" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Award className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Award className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const atRiskSeries = mySeries.filter(s => s.isAtRisk);
  const avgRank = Math.round(mySeries.reduce((sum, s) => sum + s.currentRank, 0) / mySeries.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Xếp hạng Series</h1>
        <p className="text-gray-400">Theo dõi thứ hạng và nhận thông báo nguy hiểm</p>
      </div>

      {/* At Risk Alert */}
      {atRiskSeries.length > 0 && (
        <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-500/30">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2 font-['Syne']">
                ⚠️ Cảnh báo: Series có nguy cơ bị hủy
              </h3>
              <p className="text-red-300 mb-3">
                {atRiskSeries.map(s => s.title).join(', ')} đang xếp hạng thấp liên tiếp 3 kỳ.
              </p>
              <p className="text-sm text-red-400">
                Hội đồng biên tập có thể đưa ra quyết định về series này trong kỳ tới. Hãy cố gắng cải thiện chất lượng và thu hút độc giả!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: 'Tổng series',
            value: mySeries.length,
            icon: BarChart2,
            gradient: 'from-purple-500 to-purple-600'
          },
          {
            label: 'Xếp hạng trung bình',
            value: `#${avgRank}`,
            icon: Target,
            gradient: 'from-blue-500 to-blue-600'
          },
          {
            label: 'Series top 10',
            value: mySeries.filter(s => s.currentRank <= 10).length,
            icon: Award,
            gradient: 'from-green-500 to-green-600'
          },
          {
            label: 'Series nguy hiểm',
            value: atRiskSeries.length,
            icon: AlertTriangle,
            gradient: atRiskSeries.length > 0 ? 'from-red-500 to-red-600' : 'from-gray-500 to-gray-600'
          }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-300">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Period Filter */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-400 mr-2">Kỳ:</span>
          {[
            { value: 'current', label: 'Hiện tại' },
            { value: 'last_month', label: 'Tháng trước' },
            { value: 'last_quarter', label: 'Quý trước' }
          ].map(period => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === period.value
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Series Rankings */}
      <div className="space-y-4">
        {mySeries.map(series => {
          const rankChange = series.previousRank - series.currentRank;
          const voteChange = series.currentVotes - series.previousVotes;
          const voteChangePercent = ((voteChange / series.previousVotes) * 100).toFixed(1);

          return (
            <div
              key={series.id}
              className={`bg-white/5 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all ${
                series.isAtRisk 
                  ? 'border-red-500/50 hover:border-red-500/70' 
                  : 'border-white/10 hover:border-purple-500/50'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start gap-6">
                  {/* Rank Badge */}
                  <div className={`flex-shrink-0 w-20 h-20 rounded-xl flex items-center justify-center border-2 ${
                    series.isAtRisk
                      ? 'bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30'
                      : series.currentRank <= 10
                      ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}>
                    {getRankBadge(series.currentRank) || (
                      <span className="text-2xl font-bold text-white">#{series.currentRank}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1 font-['Syne']">
                          {series.title}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Cập nhật: {series.lastUpdate}
                        </p>
                      </div>
                      {series.isAtRisk && (
                        <span className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          Nguy hiểm
                        </span>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Rank Change */}
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {getTrendIcon(series.trend)}
                          <span className="text-sm text-gray-400">Thay đổi hạng</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {rankChange > 0 ? '+' : ''}{rankChange}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Từ #{series.previousRank}
                        </p>
                      </div>

                      {/* Votes */}
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-gray-400">Lượt bình chọn</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {series.currentVotes.toLocaleString()}
                        </p>
                        <p className={`text-xs mt-1 ${voteChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {voteChange >= 0 ? '+' : ''}{voteChange} ({voteChange >= 0 ? '+' : ''}{voteChangePercent}%)
                        </p>
                      </div>

                      {/* Warning Level */}
                      <div className={`rounded-lg p-4 ${
                        series.isAtRisk 
                          ? 'bg-red-500/10 border border-red-500/30' 
                          : 'bg-white/5'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-400">Mức cảnh báo</span>
                        </div>
                        <p className={`text-2xl font-bold ${series.isAtRisk ? 'text-red-400' : 'text-green-400'}`}>
                          {series.consecutiveLowPeriods}/3
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Kỳ xếp hạng thấp
                        </p>
                      </div>
                    </div>

                    {/* Warning Message */}
                    {series.isAtRisk && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-sm text-red-300">
                          <strong>Lưu ý:</strong> Series này đã xếp hạng thấp {series.consecutiveLowPeriods} kỳ liên tiếp. 
                          Hội đồng biên tập có thể đưa ra quyết định về tương lai của series trong kỳ tới.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-3 font-['Syne']">💡 Cách cải thiện xếp hạng</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-purple-400 mt-1">•</span>
            <span>Cải thiện chất lượng cốt truyện và nghệ thuật để thu hút độc giả</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400 mt-1">•</span>
            <span>Tương tác với fan trên mạng xã hội và diễn đàn</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400 mt-1">•</span>
            <span>Đảm bảo xuất bản đúng lịch và giữ chất lượng ổn định</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400 mt-1">•</span>
            <span>Lắng nghe phản hồi từ biên tập viên và độc giả</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default MyRankings;
