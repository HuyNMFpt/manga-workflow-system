import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BookOpen, Upload, FileText, Check, Sparkles,
  Loader2, AlertCircle, X, Trash2, Info
} from 'lucide-react';
import api from '@/lib/axios';
import { convertImageFilesIfNeeded } from '@/lib/imageConvert';

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
  previewUrl: string | null;
}

const SeriesSubmission = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');

  // ── Form state ─────────────────────────────────────────────────
  // ✅ publicationSchedule đã bị XÓA khỏi form
  // Backend nhận "weekly" như default — Board sẽ set lại sau khi approve
  const [formData, setFormData] = useState({
    title:            '',
    genre:            '',
    targetAudience:   '',
    synopsis:         '',
    characterSummary: '',
    plotSummary:      '',
    coverLetter:      '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging,    setIsDragging]    = useState(false);
  const [uploadError,   setUploadError]   = useState('');
  const [selectedSeriesId, setSelectedSeriesId] = useState('');

  // ── Queries ────────────────────────────────────────────────────
  const { data: seriesList = [] } = useQuery({
    queryKey: ['series', 'my'],
    queryFn: async () => {
      const res = await api.get('/series/my');
      // ✅ PaginatedResponse { data: [...] }
      const d = res.data;
      if (Array.isArray(d)) return d;
      if (d?.data && Array.isArray(d.data)) return d.data;
      if (d?.data?.data && Array.isArray(d.data.data)) return d.data.data;
      return [];
    },
  });

  // ── Submit mutation ────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async () => {
      let seriesId = selectedSeriesId;

      // Tạo series mới nếu chưa có
      if (!seriesId) {
        const fd = new FormData();
        fd.append('title',    formData.title);
        fd.append('genre',    formData.genre);
        fd.append('synopsis', formData.synopsis);
        // ✅ Gửi "weekly" như default — Board sẽ override sau
        fd.append('schedule', 'weekly');
        const createRes = await api.post('/series', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        seriesId = createRes.data.data?.id ?? createRes.data.data;
      }

      // Submit manuscript — gửi multipart/form-data để backend lưu file thật
      // Backend: POST /api/manuscripts/submit (multipart/form-data)
      // Fields: seriesId, file (binary), description, targetAudience,
      //         publicationSchedule, characterSummary, plotSummary, coverLetter
      const msForm = new FormData();
      msForm.append('seriesId',            seriesId);
      msForm.append('description',         formData.synopsis);
      msForm.append('targetAudience',      formData.targetAudience);
      msForm.append('publicationSchedule', 'weekly');
      msForm.append('characterSummary',    formData.characterSummary);
      msForm.append('plotSummary',         formData.plotSummary || '');
      msForm.append('coverLetter',         formData.coverLetter || '');
      // Đính kèm file thật — backend sẽ lưu và trả về fileUrl thật
      if (uploadedFiles[0]) {
        msForm.append('file', uploadedFiles[0].file);
      }

      await api.post('/manuscripts/submit', msForm, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => setStep('success'),
  });

  // ── File helpers ───────────────────────────────────────────────
  const processFiles = async (files: File[]) => {
    setUploadError('');
    // Tách ảnh (cần convert nếu webp) và PDF (giữ nguyên)
    const images = files.filter(
      f => f.type.startsWith('image/') || /\.(webp|avif|heic|heif|jfif)$/i.test(f.name)
    );
    const pdfs   = files.filter(f => f.type === 'application/pdf');

    if (images.length === 0 && pdfs.length === 0) {
      setUploadError('Chỉ chấp nhận file ảnh (PNG, JPG, WEBP) hoặc PDF');
      return;
    }

    let convertedImages: File[] = [];
    try {
      convertedImages = images.length > 0 ? await convertImageFilesIfNeeded(images) : [];
    } catch (err: any) {
      setUploadError(err.message ?? 'Lỗi xử lý ảnh');
      return;
    }

    const newFiles: UploadedFile[] = [...convertedImages, ...pdfs].map(f => ({
      id:         Date.now() + Math.random(),
      file:       f,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
    e.target.value = '';
  };

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

  // ── Progress steps ─────────────────────────────────────────────
  const STEPS: { id: Step; label: string; Icon: any }[] = [
    { id: 'form',    label: 'Thông tin',   Icon: FileText },
    { id: 'upload',  label: 'Sample pages', Icon: Upload   },
    { id: 'preview', label: 'Xem trước',   Icon: BookOpen },
  ];
  const stepOrder: Step[] = ['form', 'upload', 'preview'];

  // ── Success screen ─────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-full bg-[#0a0a12] flex items-center justify-center">
        <div className="text-center max-w-md px-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3 font-['Syne']">Nộp thành công!</h2>
          <p className="text-zinc-400 text-sm mb-1">
            Series <span className="text-white font-semibold">"{formData.title || '(đã chọn)'}"</span> đã được gửi đến Hội đồng biên tập.
          </p>
          <p className="text-zinc-600 text-xs mb-2">{uploadedFiles.length} sample pages đã được đính kèm.</p>

          {/* Info note */}
          <div className="mt-4 mb-6 p-4 bg-violet-500/8 border border-violet-500/15 rounded-xl text-left">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-violet-300 mb-1">Các bước tiếp theo</p>
                <ul className="text-xs text-zinc-500 space-y-1">
                  <li>• Hội đồng biên tập sẽ review và bỏ phiếu</li>
                  <li>• Nếu được duyệt, lịch xuất bản sẽ được Board set</li>
                  <li>• Bạn sẽ nhận thông báo về kết quả</li>
                </ul>
              </div>
            </div>
          </div>

          <button onClick={() => navigate('/mangaka')}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 transition-all">
            Quay về Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0a0a12] text-white">

      {/* Header */}
      <div className="relative border-b border-violet-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-72 h-72 rounded-full bg-violet-600/8 blur-3xl" />
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-violet-500 mb-2">Mangaka · Nộp series</p>
          <h1 className="text-2xl font-black font-['Syne'] flex items-center gap-2">
            Nộp Series Mới <Sparkles className="w-5 h-5 text-violet-400" />
          </h1>
          <p className="text-sm text-zinc-600 mt-1">Tạo hồ sơ series và gửi lên Hội đồng biên tập để xét duyệt</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6 max-w-2xl">

        {/* Progress */}
        <div className="flex items-center">
          {STEPS.map((s, i) => {
            const isActive    = step === s.id;
            const isCompleted = stepOrder.indexOf(step) > stepOrder.indexOf(s.id);
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 transition-all ${
                    isActive    ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/30' :
                    isCompleted ? 'bg-emerald-500/20 border border-emerald-500/30' :
                    'bg-white/4 border border-white/8'
                  }`}>
                    {isCompleted
                      ? <Check className="w-4 h-4 text-emerald-400" />
                      : <s.Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-600'}`} />}
                  </div>
                  <span className={`text-[11px] font-medium ${isActive ? 'text-white' : 'text-zinc-600'}`}>{s.label}</span>
                </div>
                {i < 2 && <div className={`h-px flex-1 -mt-5 mx-1 ${isCompleted ? 'bg-emerald-500/40' : 'bg-white/6'}`} />}
              </div>
            );
          })}
        </div>

        {/* ─── STEP: FORM ─────────────────────────────────────── */}
        {step === 'form' && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-5">

            {/* Series đã có */}
            {(seriesList as any[]).length > 0 && (
              <div>
                <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">Chọn series đã tạo</label>
                <div className="relative">
                  <select value={selectedSeriesId}
                    onChange={e => setSelectedSeriesId(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-violet-500/40 transition-all">
                    <option value="" className="bg-[#111118]">-- Tạo series mới --</option>
                    {(seriesList as any[]).map(s => <option key={s.id} value={s.id} className="bg-[#111118]">{s.title}</option>)}
                  </select>
                </div>
                {selectedSeriesId && (
                  <p className="text-xs text-zinc-600 mt-1.5">Series đã chọn — thông tin bên dưới sẽ dùng cho hồ sơ nộp</p>
                )}
              </div>
            )}

            {/* Title */}
            {!selectedSeriesId && (
              <>
                <div>
                  <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">
                    Tên series <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                  </label>
                  <input type="text" value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="VD: Moonlight Chronicles"
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Genre */}
                  <div>
                    <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">
                      Thể loại <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                    </label>
                    <div className="relative">
                      <select value={formData.genre} onChange={e => setFormData({ ...formData, genre: e.target.value })}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-violet-500/40 transition-all">
                        <option value="" className="bg-[#111118]">Chọn thể loại</option>
                        {genres.map(g => <option key={g} value={g} className="bg-[#111118]">{g}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Target audience */}
                  <div>
                    <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">
                      Đối tượng <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                    </label>
                    <div className="relative">
                      <select value={formData.targetAudience} onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-violet-500/40 transition-all">
                        <option value="" className="bg-[#111118]">Chọn đối tượng</option>
                        <option value="children"      className="bg-[#111118]">Trẻ em (6-12)</option>
                        <option value="teens"         className="bg-[#111118]">Thiếu niên (13-17)</option>
                        <option value="young_adults"  className="bg-[#111118]">Thanh niên (18-25)</option>
                        <option value="adults"        className="bg-[#111118]">Người lớn (25+)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Synopsis */}
                <div>
                  <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">
                    Tóm tắt cốt truyện <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
                    <span className="text-zinc-700 normal-case tracking-normal font-normal ml-2">({formData.synopsis.length}/500)</span>
                  </label>
                  <textarea rows={4} maxLength={500} value={formData.synopsis}
                    onChange={e => setFormData({ ...formData, synopsis: e.target.value })}
                    placeholder="Mô tả ngắn gọn về cốt truyện, bối cảnh và điểm độc đáo..."
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 resize-none transition-all" />
                </div>
              </>
            )}

            {/* Character summary */}
            <div>
              <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">
                Nhân vật chính
                <span className="text-zinc-700 normal-case tracking-normal font-normal ml-2">({formData.characterSummary.length}/300)</span>
              </label>
              <textarea rows={3} maxLength={300} value={formData.characterSummary}
                onChange={e => setFormData({ ...formData, characterSummary: e.target.value })}
                placeholder="Giới thiệu ngắn về các nhân vật chính..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 resize-none transition-all" />
            </div>

            {/* Cover letter */}
            <div>
              <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">Thư gửi hội đồng</label>
              <textarea rows={3} value={formData.coverLetter}
                onChange={e => setFormData({ ...formData, coverLetter: e.target.value })}
                placeholder="Lý do series xứng đáng được xuất bản..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 resize-none transition-all" />
            </div>

            {/* ✅ NOTE: lịch xuất bản đã bị xóa — Board sẽ set sau */}
            <div className="flex items-start gap-2 p-3 bg-amber-500/6 border border-amber-500/15 rounded-xl">
              <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-500">
                Lịch xuất bản sẽ được <span className="text-amber-400">Hội đồng biên tập</span> quyết định sau khi approve series.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setStep('upload')}
                disabled={!selectedSeriesId && (!formData.title || !formData.genre || !formData.synopsis)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Tiếp theo →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP: UPLOAD ───────────────────────────────────── */}
        {step === 'upload' && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Upload sample pages</h3>
                {/* ✅ Wording đã sửa: "sketch/rough" thay vì "bản thảo hoàn chỉnh" */}
                <p className="text-xs text-zinc-500 mt-1">
                  5–15 trang sketch/rough để hội đồng đánh giá phong cách · PNG, JPG, PDF
                </p>
              </div>
              {uploadedFiles.length > 0 && (
                <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                  <Trash2 className="w-3 h-3" />Xóa tất cả
                </button>
              )}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                isDragging
                  ? 'border-violet-500 bg-violet-500/8 scale-[1.01]'
                  : 'border-white/8 hover:border-violet-500/30 hover:bg-white/3'
              }`}>
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/avif,application/pdf"
                multiple onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <Upload className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 font-medium">Kéo thả hoặc click để chọn</p>
              <p className="text-xs text-zinc-700 mt-1">PNG · JPG · PDF · Nhiều file cùng lúc</p>
            </div>

            {uploadError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />{uploadError}
              </p>
            )}

            {/* File thumbnails */}
            {uploadedFiles.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600 mb-3">
                  Đã chọn: <span className="text-violet-400 font-semibold">{uploadedFiles.length} file</span>
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 max-h-60 overflow-y-auto">
                  {uploadedFiles.map((uf, idx) => (
                    <div key={uf.id} className="relative group aspect-[3/4] rounded-lg overflow-hidden border border-white/8 bg-white/4">
                      {uf.previewUrl
                        ? <img src={uf.previewUrl} alt={`File ${idx + 1}`} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex flex-col items-center justify-center gap-1"><FileText className="w-5 h-5 text-zinc-600" /><span className="text-[9px] text-zinc-600">PDF</span></div>}
                      <div className="absolute top-1 left-1 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center">
                        <span className="text-[9px] text-white font-bold">{idx + 1}</span>
                      </div>
                      <button onClick={() => removeFile(uf.id)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <X className="w-3 h-3 text-white" />
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-1">
              <button onClick={() => setStep('form')}
                className="px-4 py-2 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 hover:text-white transition-colors">
                ← Quay lại
              </button>
              <button
                onClick={() => {
                  if (uploadedFiles.length === 0) { setUploadError('Vui lòng upload ít nhất 1 file'); return; }
                  setStep('preview');
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 transition-all">
                Tiếp theo → ({uploadedFiles.length} file)
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP: PREVIEW ──────────────────────────────────── */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Series info */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="text-sm font-bold text-white mb-4">Thông tin Series</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Tên</span>
                  <span className="text-white font-medium">{formData.title || '(series đã có)'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Thể loại</span>
                  <span className="text-white font-medium">{formData.genre}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Đối tượng</span>
                  <span className="text-white font-medium">{formData.targetAudience}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Lịch xuất bản</span>
                  {/* ✅ Không cho user chọn, hiện rõ là Board sẽ quyết định */}
                  <span className="text-amber-400 text-xs">Do Board quyết định sau khi approve</span>
                </div>
                {formData.synopsis && (
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Tóm tắt</span>
                    <p className="text-zinc-300 text-xs leading-relaxed">{formData.synopsis}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sample pages grid */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Sample pages
                    <span className="ml-2 px-1.5 py-0.5 bg-violet-600/20 text-violet-300 rounded-md text-xs font-normal">
                      {uploadedFiles.length} file
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-600 mt-0.5">Sketch/rough để hội đồng đánh giá phong cách</p>
                </div>
                <button onClick={() => setStep('upload')}
                  className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/20 px-2.5 py-1 rounded-lg transition-colors">
                  Chỉnh sửa
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                {uploadedFiles.map((uf, idx) => (
                  <div key={uf.id}
                    className="relative group aspect-[3/4] rounded-xl overflow-hidden border border-white/8 bg-white/4 hover:border-violet-500/30 transition-all">
                    {uf.previewUrl
                      ? <img src={uf.previewUrl} alt={`Trang ${idx + 1}`} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2">
                          <FileText className="w-6 h-6 text-violet-400" />
                          <span className="text-[9px] text-zinc-500 text-center leading-tight break-all">
                            {uf.file.name.length > 10 ? uf.file.name.slice(0,8) + '…' : uf.file.name}
                          </span>
                        </div>}
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">{idx + 1}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[9px] text-zinc-400 text-center">{(uf.file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {submitMutation.isError && (
              <div className="p-4 bg-red-500/8 border border-red-500/15 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-300">Nộp thất bại. Vui lòng thử lại.</p>
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep('upload')}
                className="px-4 py-2 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 hover:text-white transition-colors">
                ← Quay lại
              </button>
              <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 disabled:opacity-60 transition-all flex items-center gap-2">
                {submitMutation.isPending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang nộp...</>
                  : <>Nộp hồ sơ ({uploadedFiles.length} file) ✓</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriesSubmission;
