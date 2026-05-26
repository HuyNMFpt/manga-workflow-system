import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Upload,
  AlertTriangle,
  BarChart2,
  Award,
  Filter
} from 'lucide-react';

const RankingBoard = () => {
  const [showInput, setShowInput] = useState(false);
  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('csv');
  const [csvText, setCsvText] = useState('');

  const rankings = [
    { rank: 1, title: 'Moonlight Chronicles', votes: 2847, trend: 'up' as const, previousRank: 2, isAtRisk: false },
    { rank: 2, title: 'Shadow Warrior', votes: 2654, trend: 'down' as const, previousRank: 1, isAtRisk: false },
    { rank: 3, title: 'Tokyo Phantom', votes: 2431, trend: 'up' as const, previousRank: 4, isAtRisk: false },
    { rank: 4, title: 'Starlight Academy', votes: 2198, trend: 'stable' as const, previousRank: 4, isAtRisk: false },
    { rank: 5, title: 'Dragon Chronicles', votes: 1987, trend: 'up' as const, previousRank: 6, isAtRisk: false },
    { rank: 25, title: 'Silent Echo', votes: 412, trend: 'down' as const, previousRank: 23, isAtRisk: true },
    { rank: 26, title: 'Lost Dreams', votes: 389, trend: 'down' as const, previousRank: 24, isAtRisk: true },
    { rank: 27, title: 'Falling Star', votes: 342, trend: 'down' as const, previousRank: 25, isAtRisk: true }
  ];

  const atRisk = rankings.filter(r => r.isAtRisk);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Award className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Award className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-lg font-bold text-gray-400">#{rank}</span>;
  };

  const handleCSVParse = () => {
    const lines = csvText.trim().split('\n');
    let count = 0;
    for (const line of lines) {
      const [id, votes] = line.split(',').map(s => s.trim());
      if (id && votes && !isNaN(parseInt(votes))) count++;
    }
    alert(`Đã parse ${count} dòng hợp lệ. Xác nhận để cập nhật.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Bảng xếp hạng</h1>
          <p className="text-gray-400">Xếp hạng tổng hợp sau mỗi kỳ phát hành</p>
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg"
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm font-medium">Nhập dữ liệu vote</span>
        </button>
      </div>

      {/* At Risk Alert */}
      {atRisk.length > 0 && (
        <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-500/30">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">
                {atRisk.length} series trong vùng nguy hiểm
              </h3>
              <p className="text-sm text-red-300 mb-2">
                {atRisk.map(r => r.title).join(', ')}
              </p>
              <p className="text-xs text-red-400">
                Xếp hạng thấp liên tiếp 3 kỳ — Cần xem xét quyết định xuất bản
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CSV Input Panel */}
      {showInput && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex gap-3 mb-5">
            {['csv', 'manual'].map((mode) => (
              <button
                key={mode}
                onClick={() => setInputMode(mode as 'csv' | 'manual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  inputMode === mode
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                {mode === 'csv' ? 'Upload CSV' : 'Nhập thủ công'}
              </button>
            ))}
          </div>

          {inputMode === 'csv' ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-2">
                  Format: <code className="bg-white/10 px-2 py-1 rounded text-purple-400">seriesId,votes</code> mỗi dòng
                </p>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="series-001,2847&#10;series-002,2654&#10;series-003,2431"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCSVParse}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium"
                >
                  Parse & Preview
                </button>
                <button
                  onClick={() => setShowInput(false)}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all"
                >
                  Huỷ
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Nhập thủ công — Sprint 3</p>
            </div>
          )}
        </div>
      )}

      {/* Rankings Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-20">
                  Hạng
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Series
                </th>
                <th className="text-right px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Votes
                </th>
                <th className="text-center px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-32">
                  Xu hướng
                </th>
                <th className="text-center px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider w-32">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rankings.map((item) => (
                <tr
                  key={item.rank}
                  className={`hover:bg-white/5 transition-colors ${
                    item.isAtRisk ? 'bg-red-500/5' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      {getRankBadge(item.rank)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-white">{item.title}</span>
                      {item.isAtRisk && (
                        <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full text-xs font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Nguy hiểm
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-white">
                      {item.votes.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {getTrendIcon(item.trend)}
                      {item.previousRank && (
                        <span className="text-xs text-gray-400">#{item.previousRank}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.isAtRisk ? (
                      <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full text-xs font-medium">
                        Cảnh báo
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full text-xs font-medium">
                        Bình thường
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {rankings.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
            <BarChart2 className="w-10 h-10 text-purple-400" />
          </div>
          <p className="text-lg font-medium text-white mb-2">Chưa có dữ liệu xếp hạng</p>
          <p className="text-sm text-gray-400">Nhập dữ liệu vote từ độc giả để bắt đầu</p>
        </div>
      )}
    </div>
  );
};

export default RankingBoard;
