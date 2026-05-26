import { useState } from 'react';
import { 
  BookOpen, 
  Upload,
  FileText,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Sparkles,
  Save
} from 'lucide-react';

const SeriesSubmission = () => {
  const [step, setStep] = useState<'form' | 'upload' | 'preview' | 'success'>('form');
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    targetAudience: '',
    publicationSchedule: 'weekly',
    synopsis: '',
    characterSummary: '',
    plotSummary: ''
  });
  const [uploadedPages, setUploadedPages] = useState<number>(0);

  const genres = [
    'Shonen', 'Seinen', 'Shojo', 'Josei', 'Kodomo',
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
    'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
    'Sports', 'Supernatural', 'Thriller'
  ];

  const handleSubmit = () => {
    setStep('success');
  };

  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-3xl flex items-center justify-center border-2 border-green-500/30">
            <Check className="w-12 h-12 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 font-['Syne']">
            Nộp thành công!
          </h2>
          <p className="text-gray-400 mb-6">
            Series "{formData.title}" đã được gửi đến Hội đồng biên tập. Bạn sẽ nhận thông báo khi có kết quả bình duyệt.
          </p>
          <button
            onClick={() => window.location.href = '/mangaka'}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium"
          >
            Quay về Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne'] flex items-center gap-3">
          Nộp Series Mới
          <Sparkles className="w-7 h-7 text-purple-400" />
        </h1>
        <p className="text-gray-400">Tạo hồ sơ series và nộp bản thảo lên Hội đồng biên tập</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          {[
            { id: 'form', label: 'Thông tin', icon: FileText },
            { id: 'upload', label: 'Bản thảo', icon: Upload },
            { id: 'preview', label: 'Xem trước', icon: BookOpen }
          ].map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isCompleted = ['form', 'upload'].indexOf(step) > ['form', 'upload'].indexOf(s.id);
            
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all ${
                    isActive ? 'bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg' :
                    isCompleted ? 'bg-gradient-to-br from-green-500 to-green-600' :
                    'bg-white/5 border border-white/10'
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive || isCompleted ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`h-0.5 flex-1 -mt-8 ${isCompleted ? 'bg-green-500' : 'bg-white/10'}`}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Step */}
      {step === 'form' && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tên Series <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="VD: Moonlight Chronicles"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Genre */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Thể loại <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Chọn thể loại</option>
                {genres.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Đối tượng độc giả <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Chọn đối tượng</option>
                <option value="children">Trẻ em (6-12)</option>
                <option value="teens">Thiếu niên (13-17)</option>
                <option value="young_adults">Thanh niên (18-25)</option>
                <option value="adults">Người lớn (25+)</option>
              </select>
            </div>

            {/* Publication Schedule */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lịch xuất bản đề xuất
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'weekly', label: 'Hàng tuần' },
                  { value: 'biweekly', label: '2 tuần/lần' },
                  { value: 'monthly', label: 'Hàng tháng' }
                ].map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, publicationSchedule: s.value })}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      formData.publicationSchedule === s.value
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tóm tắt cốt truyện <span className="text-red-400">*</span>
                <span className="text-gray-500 text-xs ml-2">({formData.synopsis.length}/500)</span>
              </label>
              <textarea
                rows={4}
                required
                maxLength={500}
                value={formData.synopsis}
                onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                placeholder="Mô tả ngắn gọn về cốt truyện, bối cảnh, và điểm độc đáo của series..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Character Summary */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nhân vật chính
                <span className="text-gray-500 text-xs ml-2">({formData.characterSummary.length}/300)</span>
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={formData.characterSummary}
                onChange={(e) => setFormData({ ...formData, characterSummary: e.target.value })}
                placeholder="Giới thiệu ngắn về các nhân vật chính..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setFormData({
                title: '',
                genre: '',
                targetAudience: '',
                publicationSchedule: 'weekly',
                synopsis: '',
                characterSummary: '',
                plotSummary: ''
              })}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all"
            >
              Đặt lại
            </button>
            <button
              onClick={() => setStep('upload')}
              disabled={!formData.title || !formData.genre || !formData.synopsis}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              Tiếp theo
            </button>
          </div>
        </div>
      )}

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-3xl flex items-center justify-center border-2 border-purple-500/30">
              <Upload className="w-12 h-12 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Upload bản thảo</h3>
            <p className="text-gray-400 mb-6">
              Tải lên 15-20 trang bản thảo đầu tiên (PNG, JPG, hoặc PDF)
            </p>
            <button
              onClick={() => {
                setUploadedPages(18);
                setTimeout(() => setStep('preview'), 1000);
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium"
            >
              Chọn file
            </button>
            {uploadedPages > 0 && (
              <p className="text-green-400 text-sm mt-4">
                ✓ Đã tải lên {uploadedPages} trang
              </p>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep('form')}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all"
            >
              Quay lại
            </button>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 font-['Syne']">Thông tin Series</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Tên:</span>
                <span className="text-white ml-2 font-medium">{formData.title}</span>
              </div>
              <div>
                <span className="text-gray-400">Thể loại:</span>
                <span className="text-white ml-2 font-medium">{formData.genre}</span>
              </div>
              <div>
                <span className="text-gray-400">Đối tượng:</span>
                <span className="text-white ml-2 font-medium">{formData.targetAudience}</span>
              </div>
              <div>
                <span className="text-gray-400">Lịch xuất bản:</span>
                <span className="text-white ml-2 font-medium">{formData.publicationSchedule}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">Tóm tắt:</span>
                <p className="text-white mt-1">{formData.synopsis}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 font-['Syne']">Bản thảo</h3>
            <div className="grid grid-cols-6 gap-3">
              {Array.from({ length: uploadedPages }, (_, i) => i + 1).map(n => (
                <div key={n} className="aspect-[3/4] bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-gray-400">{n}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all"
            >
              Quay lại
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium"
            >
              Nộp hồ sơ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeriesSubmission;
