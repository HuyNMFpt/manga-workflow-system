import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BookOpen, Upload, FileText, Check, Sparkles, Loader2, AlertCircle, X, Trash2, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/axios';

const genres = [
  'Shonen','Seinen','Shojo','Josei','Kodomo',
  'Action','Adventure','Comedy','Drama','Fantasy',
  'Horror','Mystery','Romance','Sci-Fi','Slice of Life',
  'Sports','Supernatural','Thriller',
];

type Step = 'form' | 'upload' | 'preview' | 'success';

interface UploadedFile {
  id: number;
  file: File;
  previewUrl: string | null; // null nếu là PDF
}

const SeriesSubmission = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState({
    title: '', genre: '', targetAudience: '',
    publicationSchedule: 'weekly',
    synopsis: '', characterSummary: '', plotSummary: '', coverLetter: '',
  });

  // ✅ Multi-file state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [selectedSeriesId, setSelectedSeriesId] = useState('');

  // Load series đã có
  const { data: seriesList = [] } = useQuery({
    queryKey: ['series', 'my'],
    queryFn: async () => {
      const res = await api.get('/series/my');
      return res.data.data ?? [];
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      let seriesId = selectedSeriesId;

      if (!seriesId) {
        const fd = new FormData();
        fd.append('title', formData.title);
        fd.append('genre', formData.genre);
        fd.append('synopsis', formData.synopsis);
        fd.append('schedule', formData.publicationSchedule);
        const createRes = await api.post('/series', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        seriesId = createRes.data.data?.id ?? createRes.data.data;
      }

      const payload = {
        seriesId,
        fileUrl: uploadedFiles[0]
          ? URL.createObjectURL(uploadedFiles[0].file)
          : '',
        description: formData.synopsis,
        targetAudience: formData.targetAudience,
        publicationSchedule: formData.publicationSchedule,
        characterSummary: formData.characterSummary,
        plotSummary: formData.plotSummary,
        coverLetter: formData.coverLetter,
      };

      await api.post('/manuscripts/submit', payload);
    },
    onSuccess: () => setStep('success'),
  });

  // ── File helpers ───────────────────────────────────────────────

  const processFiles = (files: File[]) => {
    setUploadError('');
    const newFiles: UploadedFile[] = files
      .filter(f => f.type.startsWith('image/') || f.type === 'application/pdf')
      .map(f => ({
        id: Date.now() + Math.random(),
        file: f,
        previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      }));

    if (newFiles.length === 0) {
      setUploadError('Chỉ chấp nhận file ảnh (PNG, JPG) hoặc PDF');
      return;
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
    e.target.value = ''; // Reset input để có thể chọn lại cùng file
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (id: number) => {
    setUploadedFiles(prev => {
      const removed = prev.find(f => f.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAll = () => {
    uploadedFiles.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
    setUploadedFiles([]);
  };

  // ── Success ────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-3xl flex items-center justify-center border-2 border-green-500/30">
            <Check className="w-12 h-12 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 font-['Syne']">Nộp thành công!</h2>
          <p className="text-gray-400 mb-2">
            Series "{formData.title || '(đã chọn)'}" đã được gửi đến Hội đồng biên tập.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            {uploadedFiles.length} file bản thảo đã được đính kèm.
          </p>
          <button onClick={() => navigate('/mangaka')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium">
            Quay về Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Progress steps ─────────────────────────────────────────────
  const STEPS: { id: Step; label: string; Icon: any }[] = [
    { id: 'form',    label: 'Thông tin', Icon: FileText },
    { id: 'upload',  label: 'Bản thảo',  Icon: Upload   },
    { id: 'preview', label: 'Xem trước', Icon: BookOpen },
  ];
  const stepOrder: Step[] = ['form', 'upload', 'preview'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne'] flex items-center gap-3">
          Nộp Series Mới <Sparkles className="w-7 h-7 text-purple-400" />
        </h1>
        <p className="text-gray-400">Tạo hồ sơ series và nộp bản thảo lên Hội đồng biên tập</p>
      </div>

      {/* Progress */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const isActive    = step === s.id;
            const isCompleted = stepOrder.indexOf(step) > stepOrder.indexOf(s.id);
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all ${
                    isActive    ? 'bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg' :
                    isCompleted ? 'bg-gradient-to-br from-green-500 to-green-600' :
                    'bg-white/5 border border-white/10'
                  }`}>
                    <s.Icon className={`w-5 h-5 ${isActive || isCompleted ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>{s.label}</span>
                </div>
                {i < 2 && <div className={`h-0.5 flex-1 -mt-8 ${isCompleted ? 'bg-green-500' : 'bg-white/10'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── STEP FORM ────────────────────────────────────────────── */}
      {step === 'form' && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
          {seriesList.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Chọn series đã tạo (hoặc tạo mới)</label>
              <select value={selectedSeriesId} onChange={e => setSelectedSeriesId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">-- Tạo series mới --</option>
                {(seriesList as any[]).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Tên Series <span className="text-red-400">*</span></label>
              <input type="text" value={formData.title} disabled={!!selectedSeriesId}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="VD: Moonlight Chronicles"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Thể loại <span className="text-red-400">*</span></label>
              <select value={formData.genre} disabled={!!selectedSeriesId}
                onChange={e => setFormData({ ...formData, genre: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50">
                <option value="">Chọn thể loại</option>
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Đối tượng <span className="text-red-400">*</span></label>
              <select value={formData.targetAudience}
                onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Chọn đối tượng</option>
                <option value="children">Trẻ em (6-12)</option>
                <option value="teens">Thiếu niên (13-17)</option>
                <option value="young_adults">Thanh niên (18-25)</option>
                <option value="adults">Người lớn (25+)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Lịch xuất bản đề xuất</label>
              <div className="grid grid-cols-3 gap-3">
                {[{v:'weekly',l:'Hàng tuần'},{v:'biweekly',l:'2 tuần/lần'},{v:'monthly',l:'Hàng tháng'}].map(s => (
                  <button key={s.v} type="button" onClick={() => setFormData({ ...formData, publicationSchedule: s.v })}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      formData.publicationSchedule === s.v ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                    }`}>{s.l}</button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tóm tắt cốt truyện <span className="text-red-400">*</span>
                <span className="text-gray-500 text-xs ml-2">({formData.synopsis.length}/500)</span>
              </label>
              <textarea rows={4} maxLength={500} value={formData.synopsis} disabled={!!selectedSeriesId}
                onChange={e => setFormData({ ...formData, synopsis: e.target.value })}
                placeholder="Mô tả ngắn gọn về cốt truyện, bối cảnh và điểm độc đáo..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none disabled:opacity-50" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nhân vật chính <span className="text-gray-500 text-xs">({formData.characterSummary.length}/300)</span>
              </label>
              <textarea rows={3} maxLength={300} value={formData.characterSummary}
                onChange={e => setFormData({ ...formData, characterSummary: e.target.value })}
                placeholder="Giới thiệu ngắn về các nhân vật chính..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Thư gửi hội đồng</label>
              <textarea rows={3} value={formData.coverLetter}
                onChange={e => setFormData({ ...formData, coverLetter: e.target.value })}
                placeholder="Lý do series xứng đáng được xuất bản..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setStep('upload')}
              disabled={!selectedSeriesId && (!formData.title || !formData.genre || !formData.synopsis)}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg disabled:opacity-40 font-medium">
              Tiếp theo →
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP UPLOAD ──────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-['Syne']">Upload bản thảo</h3>
              <p className="text-sm text-gray-400 mt-1">Kéo thả hoặc chọn nhiều file cùng lúc · PNG, JPG, PDF</p>
            </div>
            {uploadedFiles.length > 0 && (
              <button onClick={clearAll} className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
              </button>
            )}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
              isDragging
                ? 'border-purple-500 bg-purple-500/10 scale-[1.01]'
                : 'border-white/10 hover:border-purple-500/50 hover:bg-white/5'
            }`}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,application/pdf"
              multiple
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-1">Kéo thả file vào đây</p>
            <p className="text-gray-400 text-sm mb-3">hoặc click để chọn file</p>
            <p className="text-gray-500 text-xs">PNG · JPG · PDF · Nhiều file cùng lúc</p>
          </div>

          {uploadError && (
            <p className="text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />{uploadError}
            </p>
          )}

          {/* File list after upload */}
          {uploadedFiles.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">
                Đã chọn: <span className="text-purple-400">{uploadedFiles.length} file</span>
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-72 overflow-y-auto">
                {uploadedFiles.map((uf, idx) => (
                  <div key={uf.id} className="relative group aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-white/5">
                    {/* Thumbnail */}
                    {uf.previewUrl ? (
                      <img src={uf.previewUrl} alt={`File ${idx + 1}`}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <FileText className="w-6 h-6 text-gray-400" />
                        <span className="text-xs text-gray-500 text-center px-1 leading-tight">PDF</span>
                      </div>
                    )}

                    {/* Page number badge */}
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">{idx + 1}</span>
                    </div>

                    {/* Remove button — show on hover */}
                    <button
                      onClick={() => removeFile(uf.id)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center">
                        <X className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep('form')}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all">
              ← Quay lại
            </button>
            <button
              onClick={() => {
                if (uploadedFiles.length === 0) { setUploadError('Vui lòng upload ít nhất 1 file bản thảo'); return; }
                setStep('preview');
              }}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium">
              Tiếp theo → ({uploadedFiles.length} file)
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP PREVIEW ─────────────────────────────────────────── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Series info */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 font-['Syne']">Thông tin Series</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">Tên:</span><span className="text-white ml-2 font-medium">{formData.title || '(series đã có)'}</span></div>
              <div><span className="text-gray-400">Thể loại:</span><span className="text-white ml-2 font-medium">{formData.genre}</span></div>
              <div><span className="text-gray-400">Đối tượng:</span><span className="text-white ml-2 font-medium">{formData.targetAudience}</span></div>
              <div><span className="text-gray-400">Lịch xuất bản:</span><span className="text-white ml-2 font-medium">{formData.publicationSchedule}</span></div>
              {formData.synopsis && (
                <div className="col-span-2"><span className="text-gray-400">Tóm tắt:</span><p className="text-white mt-1">{formData.synopsis}</p></div>
              )}
            </div>
          </div>

          {/* ✅ Grid preview tất cả files */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white font-['Syne']">
                Bản thảo đính kèm
                <span className="ml-2 px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded-full text-sm font-normal">
                  {uploadedFiles.length} file
                </span>
              </h3>
              <button onClick={() => setStep('upload')}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                Chỉnh sửa
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {uploadedFiles.map((uf, idx) => (
                <div key={uf.id}
                  className="relative group aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:border-purple-500/50 transition-all">

                  {/* Image preview or PDF icon */}
                  {uf.previewUrl ? (
                    <img src={uf.previewUrl} alt={`Trang ${idx + 1}`}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                      <FileText className="w-7 h-7 text-purple-400" />
                      <span className="text-[10px] text-gray-400 text-center leading-tight break-all">
                        {uf.file.name.length > 12 ? uf.file.name.slice(0, 10) + '…' : uf.file.name}
                      </span>
                    </div>
                  )}

                  {/* Page number */}
                  <div className="absolute top-1.5 left-1.5 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center">
                    <span className="text-[11px] text-white font-bold">{idx + 1}</span>
                  </div>

                  {/* File size on hover */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-gray-300 text-center">
                      {(uf.file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {submitMutation.isError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">Nộp thất bại. Vui lòng thử lại.</p>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep('upload')}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all">
              ← Quay lại
            </button>
            <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium disabled:opacity-60 flex items-center gap-2">
              {submitMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" />Đang nộp...</>
                : <>Nộp hồ sơ ({uploadedFiles.length} file) ✓</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeriesSubmission;
