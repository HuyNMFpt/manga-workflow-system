import { useState } from 'react';
import { 
  FileText, 
  BookOpen, 
  ChevronRight,
  MessageSquare,
  Check,
  X,
  Save,
  Filter
} from 'lucide-react';

const ManuscriptReview = () => {
  const [activeFilter, setActiveFilter] = useState('in_review');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filters = [
    { id: 'in_review', label: 'Đang xét', count: 8 },
    { id: 'pending_review', label: 'Chờ xét', count: 3 },
    { id: 'approved_for_board', label: 'Đã duyệt', count: 12 }
  ];

  const manuscripts = [
    {
      id: 1,
      title: 'Tokyo Phantom',
      genre: 'Action, Supernatural',
      synopsis: 'Một thám tử trẻ phát hiện khả năng nhìn thấy linh hồn và phải giải quyết những vụ án siêu nhiên tại Tokyo.',
      status: 'in_review',
      pages: 18,
      submittedDate: '2 ngày trước',
      mangaka: 'Takehiko Inoue'
    },
    {
      id: 2,
      title: 'Starlight Academy',
      genre: 'School, Romance, Drama',
      synopsis: 'Câu chuyện về nhóm học sinh trường nghệ thuật nổi tiếng và những mối quan hệ phức tạp giữa họ.',
      status: 'in_review',
      pages: 22,
      submittedDate: '1 ngày trước',
      mangaka: 'Yuki Tanaka'
    },
    {
      id: 3,
      title: 'Dragon Chronicles',
      genre: 'Fantasy, Adventure',
      synopsis: 'Hành trình tìm kiếm 7 viên ngọc rồng để cứu thế giới khỏi bóng tối.',
      status: 'in_review',
      pages: 20,
      submittedDate: '5 giờ trước',
      mangaka: 'Ken Watanabe'
    }
  ];

  const annotationTags = [
    { id: 'story', label: 'Kịch bản', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    { id: 'dialogue', label: 'Thoại', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    { id: 'art', label: 'Nghệ thuật', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    { id: 'pacing', label: 'Nhịp độ', color: 'bg-green-500/10 text-green-400 border-green-500/30' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Xét duyệt bản thảo</h1>
        <p className="text-gray-400">Đọc và ghi chú trực tiếp lên từng trang bản thảo</p>
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeFilter === filter.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {filter.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeFilter === filter.id ? 'bg-white/20' : 'bg-white/10'
              }`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Manuscript Cards */}
      <div className="space-y-4">
        {manuscripts.map((manuscript) => {
          const isExpanded = expandedId === manuscript.id;
          
          return (
            <div
              key={manuscript.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* Card Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : manuscript.id)}
                className="w-full flex items-center gap-4 p-5 hover:bg-white/5 transition-all text-left"
              >
                <div className="w-16 h-20 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                  <BookOpen className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{manuscript.title}</h3>
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full text-xs font-medium">
                      Đang xét
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{manuscript.genre}</p>
                  <p className="text-sm text-gray-300 line-clamp-1">{manuscript.synopsis}</p>
                </div>
                <ChevronRight 
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`} 
                />
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-white/10">
                  <div className="p-6 space-y-6">
                    {/* Meta Info */}
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-gray-400">Tác giả:</span>
                        <span className="text-white ml-2 font-medium">{manuscript.mangaka}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Số trang:</span>
                        <span className="text-white ml-2 font-medium">{manuscript.pages} trang</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Nộp lúc:</span>
                        <span className="text-white ml-2 font-medium">{manuscript.submittedDate}</span>
                      </div>
                    </div>

                    {/* Page Thumbnails */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                        Trang bản thảo
                      </p>
                      <div className="grid grid-cols-6 md:grid-cols-10 gap-3">
                        {Array.from({ length: manuscript.pages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            className="aspect-[3/4] bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:border-purple-500/50 hover:bg-white/10 transition-all group cursor-pointer"
                          >
                            <span className="text-xs text-gray-400 group-hover:text-white font-medium">
                              {pageNum}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Annotation Tools Preview */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-6">
                      <div className="flex items-center justify-center flex-col">
                        <MessageSquare className="w-12 h-12 text-purple-400 mb-4" />
                        <p className="text-white font-medium mb-2">Canvas Annotation Tool</p>
                        <p className="text-sm text-gray-400 text-center mb-4">
                          Fabric.js — Sprint 2 · Circle · Arrow · Text · Highlight
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                            <span className="text-xs text-red-400">●</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                            <span className="text-xs text-blue-400">→</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                            <span className="text-xs text-green-400">A</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                            <span className="text-xs text-yellow-400">✓</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Annotation Tag Categories */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                        Loại ghi chú
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {annotationTags.map((tag) => (
                          <button
                            key={tag.id}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium ${tag.color} hover:opacity-80 transition-opacity`}
                          >
                            {tag.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-medium">
                        <Save className="w-4 h-4" />
                        Lưu nháp
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all font-medium shadow-lg">
                        <X className="w-4 h-4" />
                        Cần chỉnh sửa
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all font-medium shadow-lg">
                        <Check className="w-4 h-4" />
                        Duyệt lên HĐ
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State (if no manuscripts) */}
      {manuscripts.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
            <FileText className="w-10 h-10 text-purple-400" />
          </div>
          <p className="text-lg font-medium text-white mb-2">Không có bản thảo nào</p>
          <p className="text-sm text-gray-400">Chưa có bản thảo nào cần xét duyệt</p>
        </div>
      )}
    </div>
  );
};

export default ManuscriptReview;
