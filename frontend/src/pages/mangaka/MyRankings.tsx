import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  Award, BarChart2, Target, Activity, Loader2
} from 'lucide-react';
import api from '@/lib/axios';
import { SeriesRanking } from '@/types';

const fetchMyRankings = async (): Promise<SeriesRanking[]> => {
  const res = await api.get('/rankings/my');
  return res.data.data;
};

const MyRankings = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'last_month' | 'last_quarter'>('current');

  const { data: rankings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['rankings', 'my'],
    queryFn: fetchMyRankings,
  });

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

  const atRiskSeries = rankings.filter(s => s.isAtRisk);
  const avgRank = rankings.length
    ? Math.round(rankings.reduce((sum, s) => sum + s.currentRank, 0) / rankings.length)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="ml-3 text-gray-400">Đang tải xếp hạng...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-red-300">Không thể tải dữ liệu xếp hạng</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all">
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Xếp hạng Series</h1>
        <p className="text-gray-400">Theo dõi thứ hạng và nhận thông báo nguy hiểm</p>
      </div>

      {atRiskSeries.length > 0 && (
        <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-500/30">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2 font-['Syne']">⚠️ Cảnh báo: Series có nguy cơ bị hủy</h3>
              <p className="text-red-300 mb-2">{atRiskSeries.map(s => s.seriesTitle).join(', ')} đang xếp hạng thấp liên tiếp.</p>
              <p className="text-sm text-red-400">Hội đồng biên tập có thể đưa ra quyết định về series này trong kỳ tới.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Tổng series', value: rankings.length, icon: BarChart2, gradient: 'from-purple-500 to-purple-600' },
          { label: 'Xếp hạng TB', value: rankings.length ? `#${avgRank}` : '—', icon: Target, gradient: 'from-blue-500 to-blue-600' },
          { label: 'Series top 10', value: rankings.filter(s => s.currentRank <= 10).length, icon: Award, gradient: 'from-green-500 to-green-600' },
          { label: 'Series nguy hiểm', value: atRiskSeries.length, icon: AlertTriangle, gradient: atRiskSeries.length > 0 ? 'from-red-500 to-red-600' : 'from-gray-500 to-gray-600' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-300">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 mr-2">Kỳ:</span>
          {[{ value: 'current', label: 'Hiện tại' }, { value: 'last_month', label: 'Tháng trước' }, { value: 'last_quarter', label: 'Quý trước' }].map(p => (
            <button key={p.value} onClick={() => setSelectedPeriod(p.value as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedPeriod === p.value ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {rankings.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>Chưa có dữ liệu xếp hạng</p>
          <p className="text-sm mt-1 text-gray-500">Dữ liệu sẽ xuất hiện sau khi hội đồng nhập kết quả bình chọn</p>
        </div>
      )}

      <div className="space-y-4">
        {rankings.map(series => {
          const rankChange = (series.previousRank ?? series.currentRank) - series.currentRank;
          return (
            <div key={series.seriesId} className={`bg-white/5 backdrop-blur-xl border rounded-2xl p-6 transition-all ${series.isAtRisk ? 'border-red-500/50 hover:border-red-500/70' : 'border-white/10 hover:border-purple-500/50'}`}>
              <div className="flex items-start gap-6">
                <div className={`flex-shrink-0 w-20 h-20 rounded-xl flex items-center justify-center border-2 ${series.isAtRisk ? 'bg-red-500/20 border-red-500/30' : series.currentRank <= 10 ? 'bg-purple-500/20 border-purple-500/30' : 'bg-white/5 border-white/10'}`}>
                  {getRankBadge(series.currentRank) || <span className="text-2xl font-bold text-white">#{series.currentRank}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-white font-['Syne']">{series.seriesTitle}</h3>
                    {series.isAtRisk && (
                      <span className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Nguy hiểm
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">{getTrendIcon(series.trend)}<span className="text-sm text-gray-400">Thay đổi hạng</span></div>
                      <p className="text-2xl font-bold text-white">{rankChange > 0 ? '+' : ''}{rankChange}</p>
                      <p className="text-xs text-gray-500 mt-1">Từ #{series.previousRank ?? '—'}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-blue-400" /><span className="text-sm text-gray-400">Lượt bình chọn</span></div>
                      <p className="text-2xl font-bold text-white">{series.currentVotes.toLocaleString()}</p>
                    </div>
                    <div className={`rounded-lg p-4 ${series.isAtRisk ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'}`}>
                      <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-400">Trạng thái</span></div>
                      <p className={`text-lg font-bold ${series.isAtRisk ? 'text-red-400' : 'text-green-400'}`}>{series.isAtRisk ? '⚠️ At-Risk' : '✅ An toàn'}</p>
                    </div>
                  </div>
                  {series.isAtRisk && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="text-sm text-red-300"><strong>Lưu ý:</strong> Hội đồng biên tập có thể đưa ra quyết định về series này trong kỳ tới.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyRankings;
