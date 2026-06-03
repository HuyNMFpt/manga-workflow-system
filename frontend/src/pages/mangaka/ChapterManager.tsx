import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Upload, Loader2, AlertCircle, CheckCircle2, ChevronDown, FileText } from 'lucide-react';
import api from '@/lib/axios';
import { Chapter, Series } from '@/types';

const fetchMySeries = async (): Promise<Series[]> => {
  const res = await api.get('/series/my');
  return res.data.data ?? [];
};
const fetchChapters = async (seriesId: string): Promise<Chapter[]> => {
  const res = await api.get(`/chapters/series/${seriesId}`);
  return res.data.data ?? [];
};

const CHAPTER_STATUS_LABELS: Record<string, string> = {
  not_started: 'Chưa bắt đầu',
  in_progress: 'Đang làm',
  pending_review: 'Chờ duyệt',
  editor_review: 'Editor review',
  approved: 'Đã duyệt',
  published: 'Đã xuất bản',
};
const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  pending_review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  editor_review: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  approved: 'bg-green-500/10 text-green-400 border-green-500/30',
  published: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
};

type Tab = 'list' | 'create' | 'upload';

export default function ChapterManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [selectedSeriesId, setSelectedSeriesId] = useState('');

  // Create chapter form
  const [createForm, setCreateForm] = useState({ chapterNumber: '', title: '', notes: '' });
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  // Upload page form
  const [uploadChapterId, setUploadChapterId] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [pageFile, setPageFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const { data: seriesList = [], isLoading: loadingSeries } = useQuery({ queryKey: ['series', 'my'], queryFn: fetchMySeries });
  const { data: chapters = [], isLoading: loadingChapters, refetch: refetchChapters } = useQuery({
    queryKey: ['chapters', selectedSeriesId],
    queryFn: () => fetchChapters(selectedSeriesId),
    enabled: !!selectedSeriesId,
  });

  // Create chapter mutation
  const createMutation = useMutation({
    mutationFn: (data: { seriesId: string; chapterNumber: number; title: string; notes: string }) =>
      api.post('/chapters', data).then(r => r.data),
    onSuccess: () => {
      setCreateSuccess(true);
      setCreateForm({ chapterNumber: '', title: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['chapters', selectedSeriesId] });
      setTimeout(() => setCreateSuccess(false), 3000);
    },
    onError: (e: any) => setCreateError(e.response?.data?.message ?? 'Có lỗi xảy ra'),
  });

  // Upload page mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post('/pages/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
    onSuccess: () => {
      setUploadSuccess(true);
      setPageNumber(''); setPageFile(null); setUploadNotes('');
      setTimeout(() => setUploadSuccess(false), 3000);
    },
    onError: (e: any) => setUploadError(e.response?.data?.message ?? 'Upload thất bại'),
  });

  const handleCreate = () => {
    setCreateError('');
    if (!selectedSeriesId) { setCreateError('Vui lòng chọn series'); return; }
    if (!createForm.chapterNumber) { setCreateError('Vui lòng nhập số chapter'); return; }
    createMutation.mutate({
      seriesId: selectedSeriesId,
      chapterNumber: parseInt(createForm.chapterNumber),
      title: createForm.title,
      notes: createForm.notes,
    });
  };

  const handleUpload = () => {
    setUploadError('');
    if (!uploadChapterId) { setUploadError('Vui lòng chọn chapter'); return; }
    if (!pageNumber) { setUploadError('Vui lòng nhập số trang'); return; }
    if (!pageFile) { setUploadError('Vui lòng chọn file ảnh'); return; }
    const fd = new FormData();
    fd.append('chapterId', uploadChapterId);
    fd.append('pageNumber', pageNumber);
    fd.append('file', pageFile);
    if (uploadNotes) fd.append('notes', uploadNotes);
    uploadMutation.mutate(fd);
  };

  const TABS = [
    { key: 'list'   as Tab, label: 'Danh sách Chapter', icon: BookOpen },
    { key: 'create' as Tab, label: 'Tạo Chapter mới',   icon: Plus    },
    { key: 'upload' as Tab, label: 'Upload Trang',       icon: Upload  },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Chapter & Trang</h1>
        <p className="text-gray-400">Quản lý chapters và upload trang truyện</p>
      </div>

      {/* Series selector */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Series</label>
        {loadingSeries ? <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" />Đang tải...</div> : (
          <div className="relative">
            <select value={selectedSeriesId} onChange={e => setSelectedSeriesId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">-- Chọn series --</option>
              {seriesList.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 rounded-xl p-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: List */}
      {activeTab === 'list' && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 font-['Syne']">Danh sách Chapter</h2>
          {!selectedSeriesId ? (
            <p className="text-gray-400 text-sm">Chọn series để xem danh sách chapters.</p>
          ) : loadingChapters ? (
            <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" />Đang tải...</div>
          ) : chapters.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>Chưa có chapter nào</p>
              <button onClick={() => setActiveTab('create')} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700 transition-all">+ Tạo chapter đầu tiên</button>
            </div>
          ) : (
            <div className="space-y-3">
              {(chapters as Chapter[]).map(chapter => (
                <div key={chapter.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-purple-500/50 transition-all">
                  <div>
                    <p className="font-semibold text-white">Chapter {chapter.chapterNumber}{chapter.title ? `: ${chapter.title}` : ''}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {chapter.totalPages ?? 0} trang
                      {chapter.deadline ? ` · Deadline: ${new Date(chapter.deadline).toLocaleDateString('vi-VN')}` : ''}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[chapter.status] ?? STATUS_COLORS.not_started}`}>
                    {CHAPTER_STATUS_LABELS[chapter.status] ?? chapter.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Create chapter */}
      {activeTab === 'create' && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-6 font-['Syne']">Tạo Chapter mới</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Số chapter <span className="text-red-400">*</span></label>
              <input type="number" min="1" value={createForm.chapterNumber}
                onChange={e => setCreateForm({ ...createForm, chapterNumber: e.target.value })}
                placeholder="VD: 1" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tên chapter</label>
              <input type="text" value={createForm.title}
                onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="VD: Khởi đầu mới" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Ghi chú</label>
              <textarea rows={3} value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Ghi chú cho chapter..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            </div>
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">{createError}</div>}
            {createSuccess && <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-sm text-green-300 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Tạo chapter thành công!</div>}
            <button onClick={handleCreate} disabled={createMutation.isPending || !selectedSeriesId}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium disabled:opacity-60">
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Đang tạo...</> : <><Plus className="w-4 h-4" />Tạo Chapter</>}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Upload page */}
      {activeTab === 'upload' && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-6 font-['Syne']">Upload Trang Truyện</h2>
          <div className="space-y-4 max-w-lg">
            {/* Chapter selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Chapter <span className="text-red-400">*</span></label>
              {!selectedSeriesId ? (
                <p className="text-sm text-gray-400">Chọn series trước để xem chapters.</p>
              ) : (
                <div className="relative">
                  <select value={uploadChapterId} onChange={e => setUploadChapterId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">-- Chọn chapter --</option>
                    {(chapters as Chapter[]).map(c => <option key={c.id} value={c.id}>Chapter {c.chapterNumber}{c.title ? `: ${c.title}` : ''}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Số trang <span className="text-red-400">*</span></label>
              <input type="number" min="1" value={pageNumber} onChange={e => setPageNumber(e.target.value)}
                placeholder="VD: 1" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">File ảnh <span className="text-red-400">*</span></label>
              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${pageFile ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:border-purple-500/50'}`}>
                <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={e => setPageFile(e.target.files?.[0] ?? null)} className="hidden" />
                {pageFile ? (
                  <div className="text-center"><CheckCircle2 className="w-8 h-8 text-purple-400 mx-auto mb-2" /><p className="text-sm text-white">{pageFile.name}</p><p className="text-xs text-gray-400">{(pageFile.size / 1024).toFixed(0)} KB</p></div>
                ) : (
                  <div className="text-center"><Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-400">Click để chọn file</p><p className="text-xs text-gray-500 mt-1">PNG, JPG</p></div>
                )}
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Ghi chú</label>
              <input type="text" value={uploadNotes} onChange={e => setUploadNotes(e.target.value)}
                placeholder="Ghi chú cho trang này..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            {uploadError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">{uploadError}</div>}
            {uploadSuccess && <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-sm text-green-300 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Upload trang thành công!</div>}
            <button onClick={handleUpload} disabled={uploadMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium disabled:opacity-60">
              {uploadMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Đang upload...</> : <><Upload className="w-4 h-4" />Upload Trang</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
