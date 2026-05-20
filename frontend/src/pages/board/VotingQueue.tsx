import { useState } from 'react';
import { 
  BookOpen, 
  ChevronRight,
  Check,
  X,
  RefreshCcw,
  Calendar,
  Filter
} from 'lucide-react';

const VotingQueue = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [votes, setVotes] = useState<Record<number, any>>({});

  const series = [
    {
      id: 1,
      title: 'Dragon Chronicles',
      genre: 'Fantasy, Adventure',
      synopsis: 'Hành trình tìm kiếm 7 viên ngọc rồng để cứu thế giới khỏi bóng tối. Một câu chuyện về tình bạn, lòng dũng cảm và hy sinh.',
      pages: 20,
      mangaka: 'Ken Watanabe',
      votesReceived: 3,
      votesNeeded: 5
    },
    {
      id: 2,
      title: 'Cyber Warriors',
      genre: 'Sci-fi, Action',
      synopsis: 'Năm 2157, một nhóm hackers tinh nhuệ chiến đấu chống lại tập đoàn AI độc tài cai trị thế giới.',
      pages: 22,
      mangaka: 'Yuki Tanaka',
      votesReceived: 1,
      votesNeeded: 5
    },
    {
      id: 3,
      title: 'Love in Autumn',
      genre: 'Romance, Drama',
      synopsis: 'Câu chuyện tình yêu tuổi học trò giữa hai người đến từ hai thế giới khác nhau, bắt đầu vào mùa thu năm ấy.',
      pages: 18,
      mangaka: 'Mika Sato',
      votesReceived: 0,
      votesNeeded: 5
    }
  ];

  const [formData, setFormData] = useState<Record<number, {
    decision: 'approve' | 'reject' | 'revision' | null;
    schedule?: string;
    justification: string;
  }>>({});

  const handleVoteSubmit = (seriesId: number) => {
    const vote = formData[seriesId];
    if (!vote?.decision || vote.justification.length < 100) return;
    
    setVotes(prev => ({ ...prev, [seriesId]: vote }));
    setExpandedId(null);
    setFormData(prev => {
      const { [seriesId]: _, ...rest } = prev;
      return rest;
    });
  };

  const updateFormData = (seriesId: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [seriesId]: {
        ...prev[seriesId],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Hàng chờ bình duyệt</h1>
          <p className="text-gray-400">Bỏ phiếu thông qua series mới và xác định lịch xuất bản</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all">
          <RefreshCcw className="w-4 h-4" />
          <span className="text-sm font-medium">Cập nhật</span>
        </button>
      </div>

      {/* Series Cards */}
      <div className="space-y-4">
        {series.map((item) => {
          const isExpanded = expandedId === item.id;
          const hasVoted = !!votes[item.id];
          const currentForm = formData[item.id] || { decision: null, justification: '' };

          if (hasVoted) {
            return (
              <div
                key={item.id}
                className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-2xl p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl flex items-center justify-center border border-green-500/30">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-green-300">
                      Đã bỏ phiếu: {votes[item.id].decision === 'approve' ? 'Duyệt' : 
                        votes[item.id].decision === 'reject' ? 'Từ chối' : 'Cần sửa'} — Đang chờ các thành viên khác
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* Card Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full flex items-center gap-4 p-5 hover:bg-white/5 transition-all text-left"
              >
                <div className="w-16 h-20 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                  <BookOpen className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{item.genre}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{item.pages} trang</span>
                    <span>•</span>
                    <span>{item.mangaka}</span>
                    <span>•</span>
                    <span>{item.votesReceived}/{item.votesNeeded} phiếu</span>
                  </div>
                </div>
                <ChevronRight 
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`} 
                />
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-white/10 p-6 space-y-6">
                  {/* Synopsis */}
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                      Tóm tắt nội dung
                    </p>
                    <p className="text-sm text-gray-300 leading-relaxed">{item.synopsis}</p>
                  </div>

                  {/* Sample Pages */}
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                      Trang mẫu
                    </p>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                      {Array.from({ length: Math.min(item.pages, 6) }, (_, i) => i + 1).map((pageNum) => (
                        <div
                          key={pageNum}
                          className="aspect-[3/4] bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:border-purple-500/50 hover:bg-white/10 transition-all cursor-pointer"
                        >
                          <span className="text-xs text-gray-400 font-medium">{pageNum}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Voting Form */}
                  <form onSubmit={(e) => { e.preventDefault(); handleVoteSubmit(item.id); }} className="space-y-5 border-t border-white/10 pt-6">
                    {/* Decision Buttons */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                        Quyết định
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'approve', label: 'Duyệt', gradient: 'from-green-500 to-green-600' },
                          { value: 'revision', label: 'Cần sửa', gradient: 'from-orange-500 to-orange-600' },
                          { value: 'reject', label: 'Từ chối', gradient: 'from-red-500 to-red-600' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateFormData(item.id, 'decision', option.value)}
                            className={`px-4 py-3 rounded-xl font-medium transition-all ${
                              currentForm.decision === option.value
                                ? `bg-gradient-to-r ${option.gradient} text-white shadow-lg`
                                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Schedule (if approved) */}
                    {currentForm.decision === 'approve' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                          Hình thức xuất bản
                        </label>
                        <select
                          value={currentForm.schedule || 'weekly'}
                          onChange={(e) => updateFormData(item.id, 'schedule', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="weekly">Hàng tuần</option>
                          <option value="biweekly">Hai tuần một lần</option>
                          <option value="monthly">Hàng tháng</option>
                        </select>
                      </div>
                    )}

                    {/* Justification */}
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                        Lý do <span className="text-red-400">*</span>
                        <span className="text-gray-500 normal-case ml-2">
                          (tối thiểu 100 ký tự — {currentForm.justification.length}/100)
                        </span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={currentForm.justification}
                        onChange={(e) => updateFormData(item.id, 'justification', e.target.value)}
                        placeholder="Nhận xét và lý do quyết định của bạn..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>Cần 60% thành viên đồng ý</span>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(null)}
                          className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all font-medium"
                        >
                          Đóng
                        </button>
                        <button
                          type="submit"
                          disabled={!currentForm.decision || currentForm.justification.length < 100}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Gửi phiếu
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {series.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
            <Check className="w-10 h-10 text-purple-400" />
          </div>
          <p className="text-lg font-medium text-white mb-2">Không có series nào chờ bình duyệt</p>
          <p className="text-sm text-gray-400">Tất cả series đã được xét duyệt</p>
        </div>
      )}
    </div>
  );
};

export default VotingQueue;
