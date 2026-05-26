import { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle,
  MessageSquare,
  Download,
  Eye,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';

type PageStatus = 'pending' | 'in_review' | 'approved' | 'needs_revision';

type Page = {
  id: number;
  pageNumber: number;
  chapterNumber: number;
  chapterTitle: string;
  completedBy: string;
  completedAt: string;
  status: PageStatus;
  taskType: string;
  revision: number;
  notes?: string;
};

const PageReview = () => {
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<PageStatus | 'all'>('in_review');

  const pages: Page[] = [
    {
      id: 1,
      pageNumber: 5,
      chapterNumber: 19,
      chapterTitle: 'Moonlight Chronicles Ch.19',
      completedBy: 'Yamada Ken',
      completedAt: '2 giờ trước',
      status: 'in_review',
      taskType: 'Background',
      revision: 1
    },
    {
      id: 2,
      pageNumber: 7,
      chapterNumber: 19,
      chapterTitle: 'Moonlight Chronicles Ch.19',
      completedBy: 'Sato Yuki',
      completedAt: '5 giờ trước',
      status: 'in_review',
      taskType: 'Shading',
      revision: 1
    },
    {
      id: 3,
      pageNumber: 3,
      chapterNumber: 19,
      chapterTitle: 'Moonlight Chronicles Ch.19',
      completedBy: 'Suzuki Mai',
      completedAt: '1 ngày trước',
      status: 'approved',
      taskType: 'Screentone',
      revision: 1
    },
    {
      id: 4,
      pageNumber: 12,
      chapterNumber: 19,
      chapterTitle: 'Moonlight Chronicles Ch.19',
      completedBy: 'Yamada Ken',
      completedAt: '1 ngày trước',
      status: 'needs_revision',
      taskType: 'Background',
      revision: 2,
      notes: 'Cần thêm chi tiết ở phía sau nhân vật'
    }
  ];

  const handleReview = () => {
    if (!selectedPage || !reviewAction) return;
    
    // Handle review logic here
    console.log('Review:', reviewAction, reviewNotes);
    setShowReviewModal(false);
    setSelectedPage(null);
    setReviewAction(null);
    setReviewNotes('');
  };

  const getStatusBadge = (status: PageStatus) => {
    const badges = {
      pending: { label: 'Chờ xử lý', class: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
      in_review: { label: 'Cần duyệt', class: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
      approved: { label: 'Đã duyệt', class: 'bg-green-500/10 text-green-400 border-green-500/30' },
      needs_revision: { label: 'Cần sửa', class: 'bg-orange-500/10 text-orange-400 border-orange-500/30' }
    };
    const badge = badges[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.class}`}>{badge.label}</span>;
  };

  const filteredPages = filterStatus === 'all' 
    ? pages 
    : pages.filter(p => p.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Duyệt trang hoàn thiện</h1>
        <p className="text-gray-400">Xem và phê duyệt công việc từ trợ lý</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Chờ duyệt', value: pages.filter(p => p.status === 'in_review').length, color: 'from-blue-500 to-blue-600' },
          { label: 'Đã duyệt', value: pages.filter(p => p.status === 'approved').length, color: 'from-green-500 to-green-600' },
          { label: 'Cần sửa', value: pages.filter(p => p.status === 'needs_revision').length, color: 'from-orange-500 to-orange-600' },
          { label: 'Tổng cộng', value: pages.length, color: 'from-purple-500 to-purple-600' }
        ].map((stat, index) => (
          <div key={index} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'in_review', label: 'Cần duyệt' },
            { value: 'approved', label: 'Đã duyệt' },
            { value: 'needs_revision', label: 'Cần sửa' }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                filterStatus === filter.value
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page Grid */}
      {filteredPages.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-purple-400" />
          </div>
          <p className="text-lg font-medium text-white mb-2">Không có trang nào</p>
          <p className="text-sm text-gray-400">Chưa có trang nào cần duyệt</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPages.map(page => (
            <div
              key={page.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all"
            >
              {/* Preview */}
              <div className="aspect-[3/4] bg-white/10 relative flex items-center justify-center">
                <span className="text-6xl font-bold text-white/10">{page.pageNumber}</span>
                <div className="absolute top-3 right-3">
                  {getStatusBadge(page.status)}
                </div>
                {page.revision > 1 && (
                  <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-full text-xs font-medium">
                    Rev {page.revision}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-white mb-1">
                    {page.chapterTitle} - Trang {page.pageNumber}
                  </h3>
                  <p className="text-sm text-gray-400">{page.taskType}</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <User className="w-3 h-3" />
                  <span>{page.completedBy}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>{page.completedAt}</span>
                </div>

                {page.notes && (
                  <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <p className="text-xs text-orange-300">{page.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSelectedPage(page);
                      setShowReviewModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-medium"
                  >
                    <Eye className="w-3 h-3" />
                    Xem
                  </button>
                  <button className="px-3 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10 transition-all">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white font-['Syne']">
                  {selectedPage.chapterTitle} - Trang {selectedPage.pageNumber}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedPage.taskType} • {selectedPage.completedBy} • {selectedPage.completedAt}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedPage(null);
                  setReviewAction(null);
                  setReviewNotes('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Page Preview */}
            <div className="p-6">
              <div className="aspect-[3/4] bg-white/10 rounded-lg mb-6 flex items-center justify-center">
                <span className="text-9xl font-bold text-white/10">{selectedPage.pageNumber}</span>
              </div>

              {/* Annotation Note */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">Canvas Annotation</span>
                </div>
                <p className="text-xs text-gray-400">
                  Công cụ vẽ ghi chú trực tiếp (Fabric.js) sẽ được triển khai trong Sprint 2
                </p>
              </div>

              {/* Review Actions */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Quyết định
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setReviewAction('approve')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                        reviewAction === 'approve'
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Phê duyệt
                    </button>
                    <button
                      onClick={() => setReviewAction('reject')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                        reviewAction === 'reject'
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <XCircle className="w-5 h-5" />
                      Yêu cầu sửa
                    </button>
                  </div>
                </div>

                {reviewAction && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Ghi chú {reviewAction === 'reject' && <span className="text-red-400">*</span>}
                    </label>
                    <textarea
                      rows={4}
                      required={reviewAction === 'reject'}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder={
                        reviewAction === 'approve'
                          ? 'Nhận xét (tùy chọn)...'
                          : 'Mô tả chi tiết những điểm cần chỉnh sửa...'
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowReviewModal(false);
                      setSelectedPage(null);
                      setReviewAction(null);
                      setReviewNotes('');
                    }}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleReview}
                    disabled={!reviewAction || (reviewAction === 'reject' && !reviewNotes)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all font-medium shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageReview;
