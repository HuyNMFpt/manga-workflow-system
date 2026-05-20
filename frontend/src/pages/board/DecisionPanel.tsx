import { useState } from 'react';
import { 
  AlertTriangle, 
  XCircle, 
  Calendar,
  Check,
  ArrowRight,
  Ban,
  Clock,
  MonitorPlay,
  Target
} from 'lucide-react';

type Decision = 'cancel' | 'monthly' | 'digital' | 'probation';

const DecisionPanel = () => {
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null);
  const [decisions, setDecisions] = useState<Record<number, {
    decision: Decision | null;
    justification: string;
  }>>({});
  const [submitted, setSubmitted] = useState<number[]>([]);

  const atRiskSeries = [
    {
      id: 1,
      title: 'Falling Star',
      rank: 27,
      votes: 342,
      periodsLow: 3,
      genre: 'Romance, Drama'
    },
    {
      id: 2,
      title: 'Lost Dreams',
      rank: 26,
      votes: 389,
      periodsLow: 3,
      genre: 'Fantasy, Adventure'
    },
    {
      id: 3,
      title: 'Silent Echo',
      rank: 25,
      votes: 412,
      periodsLow: 4,
      genre: 'Mystery, Thriller'
    }
  ];

  const decisionOptions: Array<{
    value: Decision;
    label: string;
    desc: string;
    icon: any;
    gradient: string;
  }> = [
    {
      value: 'cancel',
      label: 'Huỷ series',
      desc: 'Chấm dứt xuất bản hoàn toàn',
      icon: Ban,
      gradient: 'from-red-500 to-red-600'
    },
    {
      value: 'monthly',
      label: 'Đổi sang hàng tháng',
      desc: 'Giảm tần suất để cải thiện',
      icon: Calendar,
      gradient: 'from-orange-500 to-orange-600'
    },
    {
      value: 'digital',
      label: 'Chỉ đăng online',
      desc: 'Rút khỏi bản in, giữ digital',
      icon: MonitorPlay,
      gradient: 'from-yellow-500 to-yellow-600'
    },
    {
      value: 'probation',
      label: 'Thử thách 3 tháng',
      desc: 'Cho cơ hội cải thiện xếp hạng',
      icon: Target,
      gradient: 'from-blue-500 to-blue-600'
    }
  ];

  const updateDecision = (seriesId: number, field: string, value: any) => {
    setDecisions(prev => ({
      ...prev,
      [seriesId]: {
        ...prev[seriesId],
        [field]: value
      }
    }));
  };

  const handleSubmit = (seriesId: number) => {
    const decision = decisions[seriesId];
    if (!decision?.decision || decision.justification.length < 100) return;
    
    setSubmitted(prev => [...prev, seriesId]);
    setSelectedSeries(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Quyết định xuất bản</h1>
        <p className="text-gray-400">Xử lý series xếp hạng thấp liên tiếp (cần 60% đa số)</p>
      </div>

      {/* At Risk Series */}
      {atRiskSeries.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl flex items-center justify-center">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <p className="text-lg font-medium text-white mb-2">Không có series nào cần xử lý</p>
          <p className="text-sm text-gray-400">
            Series sẽ xuất hiện ở đây khi xếp hạng thấp 3 kỳ liên tiếp
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {atRiskSeries.map((series) => {
            const isSelected = selectedSeries === series.id;
            const hasSubmitted = submitted.includes(series.id);
            const currentDecision = decisions[series.id] || { decision: null, justification: '' };

            if (hasSubmitted) {
              return (
                <div
                  key={series.id}
                  className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-2xl p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl flex items-center justify-center border border-green-500/30">
                      <Check className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{series.title}</h3>
                      <p className="text-sm text-green-300">
                        Quyết định đã được ghi nhận — đang chờ đủ phiếu từ thành viên khác
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={series.id}
                className={`bg-white/5 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all ${
                  isSelected ? 'border-purple-500/50' : 'border-white/10'
                }`}
              >
                {/* Header */}
                <div className="flex items-center gap-4 p-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-500/30">
                    <AlertTriangle className="w-7 h-7 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1">{series.title}</h3>
                    <p className="text-sm text-gray-400 mb-2">{series.genre}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Hạng #{series.rank}</span>
                      <span>•</span>
                      <span>{series.votes.toLocaleString()} votes</span>
                      <span>•</span>
                      <span className="text-red-400 font-medium">
                        {series.periodsLow} kỳ thấp liên tiếp
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSeries(isSelected ? null : series.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {isSelected ? 'Đóng' : 'Xử lý'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Decision Form */}
                {isSelected && (
                  <div className="border-t border-white/10 p-6 space-y-6">
                    {/* Decision Options */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                        Chọn quyết định
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        {decisionOptions.map((option) => {
                          const Icon = option.icon;
                          const isActive = currentDecision.decision === option.value;
                          
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateDecision(series.id, 'decision', option.value)}
                              className={`p-4 rounded-xl text-left transition-all ${
                                isActive
                                  ? `bg-gradient-to-br ${option.gradient} text-white shadow-lg border-2 border-white/20`
                                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <Icon className={`w-5 h-5 mb-3 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                              <p className={`text-sm font-bold mb-1 ${isActive ? 'text-white' : 'text-white'}`}>
                                {option.label}
                              </p>
                              <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                                {option.desc}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Justification */}
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                        Lý do quyết định <span className="text-red-400">*</span>
                        <span className="text-gray-500 normal-case ml-2">
                          ({currentDecision.justification.length}/100)
                        </span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={currentDecision.justification}
                        onChange={(e) => updateDecision(series.id, 'justification', e.target.value)}
                        placeholder="Giải thích lý do quyết định của bạn..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-2 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <p className="text-xs text-blue-300">
                        Cần 60% thành viên hội đồng đồng ý để quyết định có hiệu lực
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={() => setSelectedSeries(null)}
                        className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all font-medium"
                      >
                        Huỷ
                      </button>
                      <button
                        onClick={() => handleSubmit(series.id)}
                        disabled={!currentDecision.decision || currentDecision.justification.length < 100}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Gửi phiếu quyết định
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DecisionPanel;
