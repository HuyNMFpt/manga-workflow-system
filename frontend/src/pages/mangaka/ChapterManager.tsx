import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Plus, Upload, Loader2, CheckCircle2, ChevronDown,
  FileText, Layers, AlertTriangle, ClipboardList, Clock, X, Trash2, Pencil, MoreHorizontal
} from 'lucide-react';
import api from '@/lib/axios';
import { convertImageFilesIfNeeded } from '@/lib/imageConvert';
import { Chapter, Series } from '@/types';

const fetchMySeries  = async (): Promise<Series[]> => {
  const r = await api.get('/series/my');
  return r.data.data?.data ?? [];
};
const fetchChapters = async (id: string): Promise<Chapter[]> => {
  const r = await api.get(`/chapters/series/${id}`);
  return r.data.data ?? [];
};

// ✅ Khớp với backend ChapterStatus enum
const STATUS_MAP: Record<string, { label: string; pill: string }> = {
  in_progress:    { label:'Đang làm',      pill:'bg-blue-500/10 text-blue-300 border-blue-500/20'          },
  pending_review: { label:'Chờ duyệt',     pill:'bg-amber-500/10 text-amber-300 border-amber-500/20'       },
  editor_review:  { label:'Editor review', pill:'bg-violet-500/10 text-violet-300 border-violet-500/20'    },
  approved:       { label:'Đã duyệt',      pill:'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  published:      { label:'Đã xuất bản',   pill:'bg-teal-500/10 text-teal-300 border-teal-500/20'          },
};

/* ── Deadline display với real-time countdown ──────────────── */
const useDeadlineCountdown = (deadlineStr: string | undefined) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!deadlineStr) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadlineStr]);
  if (!deadlineStr) return null;
  const target = new Date(deadlineStr + (deadlineStr.length === 10 ? 'T23:59:59' : '')).getTime();
  const diff   = target - now;
  const isOverdue = diff < 0;
  const abs    = Math.abs(diff);
  const days   = Math.floor(abs / 86400000);
  const hours  = Math.floor((abs % 86400000) / 3600000);
  const mins   = Math.floor((abs % 3600000) / 60000);
  const secs   = Math.floor((abs % 60000) / 1000);
  return { isOverdue, days, hours, mins, secs };
};

const DeadlineCell = ({ deadline, status }: { deadline?: string; status: string }) => {
  const cd = useDeadlineCountdown(deadline);
  if (!cd) return <span className="text-zinc-700">—</span>;
  if (status === 'published' || status === 'approved')
    return <span className="text-zinc-600 text-[11px]">{new Date(deadline!).toLocaleDateString('vi-VN')}</span>;
  if (cd.isOverdue) return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 flex items-center gap-1">
        <AlertTriangle className="w-2.5 h-2.5"/>Quá hạn
      </span>
      <span className="text-[10px] text-red-500">
        {cd.days > 0 ? `${cd.days} ngày` : `${cd.hours}g ${cd.mins}p`}
      </span>
    </div>
  );
  const isUrgent  = cd.days < 1;
  const isWarning = cd.days <= 2;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-[11px] font-mono tabular-nums ${isUrgent ? 'text-red-400 font-bold' : isWarning ? 'text-amber-400' : 'text-zinc-500'}`}>
        {cd.days > 0
          ? `${cd.days}n ${cd.hours}g ${cd.mins}p`
          : `${String(cd.hours).padStart(2,'0')}:${String(cd.mins).padStart(2,'0')}:${String(cd.secs).padStart(2,'0')}`}
      </span>
      <span className="text-[9px] text-zinc-700">{new Date(deadline!).toLocaleDateString('vi-VN')}</span>
    </div>
  );
};

type Tab = 'list' | 'create' | 'upload';
type UploadMode = 'image' | 'pdf';

interface FileItem { id: string; file: File; preview: string; }

export default function ChapterManager() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('list');
  // Edit/delete chapter states
  const [editChapter,   setEditChapter]   = useState<any>(null);
  const [editForm,      setEditForm]      = useState({ chapterNumber: '', title: '', notes: '' });
  const [editErr,       setEditErr]       = useState('');
  const [deleteChapter, setDeleteChapter] = useState<any>(null);
  // Delete page state
  const [deletePageId,  setDeletePageId]  = useState<string | null>(null);
  // Batch upload progress tracker
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');

  // Create form
  const [createForm, setCreateForm] = useState({ chapterNumber:'', title:'', notes:'' });
  const [createErr, setCreateErr]   = useState('');
  const [createOk,  setCreateOk]    = useState(false);

  // Upload form
  const [uploadChapterId, setUploadChapterId] = useState('');
  const [uploadMode,      setUploadMode]      = useState<UploadMode>('image');
  const [uploadNotes,     setUploadNotes]     = useState('');
  const [uploadErr,       setUploadErr]       = useState('');
  const [uploadOk,        setUploadOk]        = useState<string>('');

  // Multi-image state
  const [fileItems,   setFileItems]   = useState<FileItem[]>([]);
  const [dragIdx,     setDragIdx]     = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // PDF state
  const [pdfFile,      setPdfFile]      = useState<File | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);

  // Publish button removed — Editor publishes via StudioProgress

  // ── Queries ──────────────────────────────────────────────────
  const { data: allSeries = [], isLoading: loadSeries } = useQuery({
    queryKey: ['series', 'my'],
    queryFn: fetchMySeries,
  });
  const seriesList = (allSeries as any[]).filter(
    (s: any) => s.status === 'approved' || s.status === 'publishing'
  );
  const { data: chapters = [], isLoading: loadChapters } = useQuery({
    queryKey: ['chapters', selectedSeriesId],
    queryFn: () => fetchChapters(selectedSeriesId),
    enabled: !!selectedSeriesId,
  });

  // GET /api/pages?chapterId={id} — list trang của chapter đang chọn để upload
  const { data: chapterPages = [] } = useQuery({
    queryKey: ['chapter-pages', uploadChapterId],
    queryFn: async () => {
      const r = await api.get(`/pages`, { params: { chapterId: uploadChapterId } });
      return r.data.data ?? [];
    },
    enabled: !!uploadChapterId,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (d: { seriesId:string; chapterNumber:number; title:string; notes:string }) =>
      api.post('/chapters', d).then(r => r.data),
    onSuccess: () => {
      setCreateOk(true);
      setCreateForm({ chapterNumber:'', title:'', notes:'' });
      qc.invalidateQueries({ queryKey: ['chapters', selectedSeriesId] });
      setTimeout(() => setCreateOk(false), 3000);
    },
    onError: (e: any) => setCreateErr(e.response?.data?.message ?? 'Có lỗi xảy ra'),
  });

  // ── PUT /api/chapters/{id} — sửa chapter ──
  const updateChapterMutation = useMutation({
    mutationFn: (d: { id: string; chapterNumber: number; title: string; notes?: string }) =>
      api.put(`/chapters/${d.id}`, {
        chapterNumber: d.chapterNumber,
        title: d.title,
        notes: d.notes ?? '',
      }).then(r => r.data),
    onSuccess: () => {
      setEditChapter(null);
      setEditErr('');
      qc.invalidateQueries({ queryKey: ['chapters', selectedSeriesId] });
    },
    onError: (e: any) => setEditErr(e.response?.data?.message ?? 'Không sửa được chapter'),
  });

  // ── DELETE /api/chapters/{id} — xoá chapter ──
  const deleteChapterMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/chapters/${id}`).then(r => r.data),
    onSuccess: () => {
      setDeleteChapter(null);
      qc.invalidateQueries({ queryKey: ['chapters', selectedSeriesId] });
    },
    onError: (e: any) => alert(e.response?.data?.message ?? 'Không xoá được chapter'),
  });

  // ── DELETE /api/pages/{id} — xoá 1 trang trong chapter ──
  const deletePageMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/pages/${id}`).then(r => r.data),
    onSuccess: () => {
      setDeletePageId(null);
      // Invalidate mọi query liên quan chapter/pages để refresh list ảnh
      qc.invalidateQueries({ queryKey: ['chapter-pages'] });
      qc.invalidateQueries({ queryKey: ['chapters', selectedSeriesId] });
    },
    onError: (e: any) => alert(e.response?.data?.message ?? 'Không xoá được trang'),
  });

  const batchMutation = useMutation({
    mutationFn: (fd: FormData) =>
      api.post('/pages/batch', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
    onSuccess: (_, fd) => {
      const count = fileItems.length;
      setUploadOk(`✅ Upload thành công ${count} trang!`);
      setFileItems([]); setUploadNotes('');
      qc.invalidateQueries({ queryKey: ['chapters', selectedSeriesId] });
      setTimeout(() => setUploadOk(''), 4000);
    },
    onError: (e: any) => setUploadErr(e.response?.data?.message ?? 'Upload thất bại'),
  });

  const pdfMutation = useMutation({
    mutationFn: (fd: FormData) =>
      api.post('/pages/upload-pdf', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
    onSuccess: (res) => {
      const count = res?.data?.length ?? pdfPageCount ?? 0;
      setUploadOk(`✅ Upload PDF thành công — ${count} trang được tạo!`);
      setPdfFile(null); setPdfPageCount(null); setUploadNotes('');
      qc.invalidateQueries({ queryKey: ['chapters', selectedSeriesId] });
      setTimeout(() => setUploadOk(''), 4000);
    },
    onError: (e: any) => setUploadErr(e.response?.data?.message ?? 'Upload PDF thất bại'),
  });

  // Drag-to-reorder handlers
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver  = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop      = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const next = [...fileItems];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setFileItems(next);
    setDragIdx(null); setDragOverIdx(null);
  };

  // Add images
  const handleImageFiles = async (files: FileList) => {
    const accepted = Array.from(files).filter(f => f.type.startsWith('image/') || /\.(webp|avif|heic|heif|jfif)$/i.test(f.name));
    if (accepted.length === 0) return;
    try {
      const converted = await convertImageFilesIfNeeded(accepted);
      const items: FileItem[] = converted.map(f => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        preview: URL.createObjectURL(f),
      }));
      setFileItems(prev => [...prev, ...items]);
    } catch (e: any) {
      alert(e.message ?? 'Lỗi xử lý ảnh');
    }
  };

  // Handle PDF — count pages via ArrayBuffer
  const handlePdfFile = async (file: File) => {
    setPdfFile(file);
    // Estimate page count từ PDF binary (tìm /Page objects)
    try {
      const buf = await file.arrayBuffer();
      const text = new TextDecoder('latin1').decode(buf);
      const matches = text.match(/\/Type\s*\/Page[^s]/g);
      setPdfPageCount(matches ? matches.length : null);
    } catch { setPdfPageCount(null); }
  };

  // Submit batch images
  const handleBatchUpload = async () => {
    setUploadErr('');
    if (!uploadChapterId) { setUploadErr('Chọn chapter'); return; }
    if (fileItems.length === 0) { setUploadErr('Chọn ít nhất 1 ảnh'); return; }

    // Chia thành chunk nhỏ để tránh vượt giới hạn size / timeout (ngrok 5MB, backend 50MB)
    const CHUNK_SIZE = 3;   // 3 ảnh/lần → an toàn với ảnh đã nén ~1MB/ảnh
    const chunks: typeof fileItems[] = [];
    for (let i = 0; i < fileItems.length; i += CHUNK_SIZE) {
      chunks.push(fileItems.slice(i, i + CHUNK_SIZE));
    }

    setBatchProgress({ current: 0, total: fileItems.length });
    try {
      let uploaded = 0;
      for (const chunk of chunks) {
        const fd = new FormData();
        fd.append('chapterId', uploadChapterId);
        chunk.forEach(item => fd.append('files', item.file));
        if (uploadNotes) fd.append('notes', uploadNotes);
        // Gọi trực tiếp API để có thể chờ tuần tự
        await api.post('/pages/batch', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploaded += chunk.length;
        setBatchProgress({ current: uploaded, total: fileItems.length });
      }
      // Thành công tất cả
      setUploadOk(`Đã upload ${fileItems.length} trang thành công`);
      setFileItems([]);
      setUploadNotes('');
      setBatchProgress(null);
      qc.invalidateQueries({ queryKey: ['chapters', selectedSeriesId] });
      qc.invalidateQueries({ queryKey: ['chapter-pages', uploadChapterId] });
      setTimeout(() => setUploadOk(''), 4000);
    } catch (err: any) {
      setBatchProgress(null);
      const done = err.__uploaded ?? 0;
      setUploadErr(
        done > 0
          ? `Upload thất bại ở trang ${done + 1}/${fileItems.length}. ${done} trang đầu đã upload thành công — hãy xoá các ảnh đã upload trong danh sách và thử lại phần còn lại.`
          : (err.response?.data?.message ?? 'Upload thất bại — thử lại với ít ảnh hơn')
      );
      // Refresh để user thấy phần đã upload được
      qc.invalidateQueries({ queryKey: ['chapters', selectedSeriesId] });
      qc.invalidateQueries({ queryKey: ['chapter-pages', uploadChapterId] });
    }
  };

  // Submit PDF
  const handlePdfUpload = () => {
    setUploadErr('');
    if (!uploadChapterId) { setUploadErr('Chọn chapter'); return; }
    if (!pdfFile) { setUploadErr('Chọn file PDF'); return; }
    const fd = new FormData();
    fd.append('chapterId', uploadChapterId);
    fd.append('file', pdfFile);
    if (uploadNotes) fd.append('notes', uploadNotes);
    pdfMutation.mutate(fd);
  };

  const isPending = batchMutation.isPending || pdfMutation.isPending || batchProgress !== null;


  // ── Shared components ─────────────────────────────────────────
  const SelectField = ({ value, onChange, children, label }: any) => (
    <div>
      {label && (
        <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select value={value} onChange={onChange}
          className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-violet-500/40 transition-all">
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-zinc-600 pointer-events-none" />
      </div>
    </div>
  );

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key:'list',   label:'Danh sách',   icon: BookOpen },
    { key:'create', label:'Tạo chapter', icon: Plus     },
    { key:'upload', label:'Upload trang', icon: Upload  },
  ];

  return (
    <div className="min-h-full bg-[#0a0a12] text-white">

      {/* Header */}
      <div className="relative border-b border-violet-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-12 w-56 h-56 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-blue-500 mb-2">Mangaka · Chapters</p>
          <h1 className="text-2xl font-black font-['Syne']">Chapter & Trang</h1>
          <p className="text-sm text-zinc-600 mt-1">Quản lý chapters và upload trang truyện</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* Series selector */}
        <div className="max-w-sm">
          <SelectField label="Series" value={selectedSeriesId} onChange={(e: any) => setSelectedSeriesId(e.target.value)}>
            <option value="" className="bg-[#111118]">-- Chọn series --</option>
            {seriesList.length === 0
              ? <option disabled className="bg-[#111118]">-- Chưa có series được duyệt --</option>
              : (seriesList as any[]).map((s: any) => (
                  <option key={s.id} value={s.id} className="bg-[#111118]">{s.title}</option>
                ))
            }
          </SelectField>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/4 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                tab === t.key
                  ? 'bg-[#111118] text-white border border-violet-500/20 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-300'
              }`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: List ── */}
        {tab === 'list' && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            {!loadSeries && seriesList.length === 0 && (
              <div className="mt-1 flex items-start gap-2.5 p-3 bg-amber-500/8 border border-amber-500/15 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-semibold text-amber-400">Chưa có series nào được duyệt</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    Chỉ upload chapter cho series có status{' '}
                    <span className="text-emerald-400 font-medium">approved</span> hoặc{' '}
                    <span className="text-violet-400 font-medium">publishing</span>.
                  </p>
                </div>
              </div>
            )}

            {!selectedSeriesId ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-zinc-700">
                <Layers className="w-8 h-8 opacity-20" />
                <p className="text-sm">Chọn series để xem chapters</p>
              </div>
            ) : loadChapters ? (
              <div className="flex items-center justify-center py-10 gap-2 text-zinc-600">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Đang tải...</span>
              </div>
            ) : (chapters as Chapter[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-zinc-700">
                <FileText className="w-8 h-8 opacity-20" />
                <p className="text-sm">Chưa có chapter nào</p>
                <button onClick={() => setTab('create')}
                  className="text-xs text-violet-400 border border-violet-500/20 px-3 py-1.5 rounded-lg hover:bg-violet-500/8 transition-colors">
                  + Tạo chapter đầu tiên
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_5rem_8rem_8rem_7rem_5rem] gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-700">
                  <span>Chapter</span>
                  <span className="text-center">Trang</span>
                  <span className="text-center">Deadline</span>
                  <span className="text-center">Trạng thái</span>
                  <span className="text-center">Task</span>
                  <span className="text-center">Thao tác</span>
                </div>
                {(chapters as Chapter[]).map(c => {
                  const st = STATUS_MAP[c.status] ?? STATUS_MAP.in_progress;
                  const canAssign = c.status !== 'published';
                  const isOverdue = c.deadline
                    ? new Date(c.deadline + 'T23:59:59').getTime() < Date.now()
                      && c.status !== 'published' && c.status !== 'approved'
                    : false;
                  return (
                    <div key={c.id}
                      className={`grid grid-cols-[1fr_5rem_8rem_8rem_7rem_5rem] gap-4 px-6 py-4 items-center border-b border-white/4 last:border-0 hover:bg-white/[0.02] transition-colors ${isOverdue ? 'bg-red-500/3' : ''}`}>

                      <div>
                        <p className="text-[13px] font-semibold text-white flex items-center gap-2">
                          Chapter {c.chapterNumber}{c.title ? `: ${c.title}` : ''}
                          {isOverdue && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-red-500/12 text-red-400 border border-red-500/25 font-bold uppercase tracking-wide">
                              Trễ hạn
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="text-center text-sm text-zinc-500">{c.totalPages ?? '—'}</div>

                      <div className="flex justify-center">
                        <DeadlineCell deadline={c.deadline} status={c.status} />
                      </div>

                      <div className="flex justify-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.pill}`}>
                          {st.label}
                        </span>
                      </div>

                      {/* Giao task */}
                      <div className="flex justify-center">
                        {canAssign ? (
                          <button
                            onClick={() => navigate('/mangaka/assign-tasks', {
                              state: { seriesId: selectedSeriesId, chapterId: c.id }
                            })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/12 border border-violet-500/20 text-violet-300 text-[11px] font-semibold hover:bg-violet-500/20 transition-all">
                            <ClipboardList className="w-3 h-3" />Giao task
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-700">—</span>
                        )}
                      </div>

                      {/* Thao tác — Sửa / Xoá */}
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditChapter(c);
                            setEditForm({
                              chapterNumber: String(c.chapterNumber),
                              title: c.title ?? '',
                              notes: (c as any).notes ?? '',
                            });
                            setEditErr('');
                          }}
                          className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 text-zinc-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center"
                          title="Sửa chapter">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeleteChapter(c)}
                          disabled={c.status === 'published'}
                          className="w-7 h-7 rounded-lg bg-red-500/8 border border-red-500/15 text-red-400 hover:bg-red-500/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                          title={c.status === 'published' ? 'Chapter đã xuất bản — không thể xoá' : 'Xoá chapter'}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ── Tab: Create ── */}
        {tab === 'create' && (
          <div className="max-w-lg rounded-2xl border border-white/5 bg-white/[0.015] p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">Số chapter *</label>
              <input type="number" min="1" value={createForm.chapterNumber}
                onChange={e => setCreateForm({ ...createForm, chapterNumber: e.target.value })}
                placeholder="VD: 1"
                className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none transition-all ${
                  createForm.chapterNumber && (chapters as Chapter[]).some(c => c.chapterNumber === parseInt(createForm.chapterNumber))
                    ? 'border-red-500/50 focus:border-red-500/60'
                    : 'border-white/8 focus:border-violet-500/40'
                }`} />
              {/* Cảnh báo trùng số chapter */}
              {createForm.chapterNumber && (chapters as Chapter[]).some(c => c.chapterNumber === parseInt(createForm.chapterNumber)) && (
                <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Chapter {createForm.chapterNumber} đã tồn tại trong series này
                </p>
              )}
              {/* Gợi ý số chapter tiếp theo */}
              {!createForm.chapterNumber && (chapters as Chapter[]).length > 0 && (
                <p className="text-[10px] text-zinc-700 mt-1.5">
                  Chapter hiện có: {(chapters as Chapter[]).map(c => c.chapterNumber).sort((a,b)=>a-b).join(', ')}
                  {' '}· Tiếp theo: <span
                    className="text-violet-400 cursor-pointer hover:underline"
                    onClick={() => {
                      const max = Math.max(...(chapters as Chapter[]).map(c => c.chapterNumber));
                      setCreateForm({ ...createForm, chapterNumber: String(max + 1) });
                    }}>
                    Chapter {Math.max(...(chapters as Chapter[]).map(c => c.chapterNumber)) + 1}
                  </span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">Tên chapter</label>
              <input type="text" value={createForm.title}
                onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="VD: Khởi đầu mới"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">Ghi chú</label>
              <textarea rows={3} value={createForm.notes}
                onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Ghi chú cho chapter..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 resize-none transition-all" />
            </div>
            {createErr && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">{createErr}</p>}
            {createOk  && (
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-xl px-3 py-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />Tạo chapter thành công!
              </div>
            )}
            <button
              onClick={() => {
                setCreateErr('');
                if (!selectedSeriesId) { setCreateErr('Vui lòng chọn series'); return; }
                if (!createForm.chapterNumber) { setCreateErr('Nhập số chapter'); return; }
                const num = parseInt(createForm.chapterNumber);
                if ((chapters as Chapter[]).some(c => c.chapterNumber === num)) {
                  setCreateErr(`Chapter ${num} đã tồn tại. Vui lòng chọn số chapter khác.`);
                  return;
                }
                createMutation.mutate({
                  seriesId: selectedSeriesId,
                  chapterNumber: parseInt(createForm.chapterNumber),
                  title: createForm.title,
                  notes: createForm.notes,
                });
              }}
              disabled={createMutation.isPending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-600/25 disabled:opacity-60 transition-all">
              {createMutation.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang tạo...</>
                : <><Plus className="w-4 h-4" />Tạo Chapter</>}
            </button>
          </div>
        )}

        {/* ── Tab: Upload ── */}
        {tab === 'upload' && (
          <div className="max-w-2xl space-y-5">

            {/* Chapter selector */}
            <SelectField label="Chapter *" value={uploadChapterId} onChange={(e: any) => {
              setUploadChapterId(e.target.value);
              setFileItems([]); setPdfFile(null); setPdfPageCount(null); setUploadErr('');
            }}>
              <option value="" className="bg-[#111118]">-- Chọn chapter --</option>
              {(chapters as Chapter[]).map(c => (
                <option key={c.id} value={c.id} className="bg-[#111118]">
                  Chapter {c.chapterNumber}{c.title ? `: ${c.title}` : ''}
                </option>
              ))}
            </SelectField>

            {/* Trang hiện có — thumbnails + nút xoá */}
            {uploadChapterId && (() => {
              const pages = chapterPages as any[];
              const maxPage = pages.length > 0 ? Math.max(...pages.map((p:any) => p.pageNumber)) : 0;
              return pages.length > 0 ? (
                <div className="rounded-2xl border border-white/6 bg-white/[0.015] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-zinc-500">
                      Chapter đã có <span className="text-violet-400 font-semibold">{pages.length} trang</span>
                      {' '}(trang 1–{maxPage}) · Trang mới sẽ bắt đầu từ <span className="text-violet-400 font-semibold">trang {maxPage + 1}</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {[...pages].sort((a,b)=>a.pageNumber-b.pageNumber).map((p:any) => (
                      <div key={p.id} className="group relative aspect-[2/3] rounded-lg overflow-hidden border border-white/8 bg-black/30">
                        <img src={p.thumbnailUrl ?? p.imageUrl} alt={`Trang ${p.pageNumber}`}
                          className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 text-center text-[10px] text-white py-0.5">
                          Trang {p.pageNumber}
                        </div>
                        <button onClick={() => setDeletePageId(p.id)}
                          disabled={deletePageMutation.isPending}
                          className="absolute top-1 right-1 w-6 h-6 rounded-md bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all disabled:opacity-30"
                          title="Xoá trang này">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-600">Chapter chưa có trang nào · Bắt đầu từ trang 1</p>
              );
            })()}

            {/* Mode toggle */}
            <div className="flex gap-2">
              {(['image', 'pdf'] as UploadMode[]).map(m => (
                <button key={m} onClick={() => {
                  setUploadMode(m);
                  setFileItems([]); setPdfFile(null); setPdfPageCount(null); setUploadErr('');
                }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    uploadMode === m
                      ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                      : 'bg-white/3 border-white/8 text-zinc-500 hover:text-zinc-300'
                  }`}>
                  {m === 'image' ? '🖼 Upload nhiều ảnh' : '📄 Upload PDF'}
                </button>
              ))}
            </div>

            {/* ── Mode: Multi-image ── */}
            {uploadMode === 'image' && (
              <div className="space-y-4">
                {/* Drop zone */}
                <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                  fileItems.length > 0 ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/8 hover:border-violet-500/25 hover:bg-white/3'
                }`}>
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" multiple
                    onChange={e => e.target.files && handleImageFiles(e.target.files)} className="hidden" />
                  <Upload className="w-6 h-6 text-zinc-700 mx-auto mb-1" />
                  <p className="text-xs text-zinc-600">Click hoặc kéo thả nhiều ảnh vào đây</p>
                  <p className="text-[10px] text-zinc-800 mt-0.5">PNG · JPG · WEBP</p>
                </label>

                {/* Preview + drag-to-reorder */}
                {fileItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-600">
                      <span className="text-violet-400 font-semibold">{fileItems.length} ảnh</span>
                      {' '}· Kéo thả để sắp xếp thứ tự trang — ảnh đầu tiên = trang tiếp theo của chapter
                    </p>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {fileItems.map((item, idx) => (
                        <div key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={e => handleDragOver(e, idx)}
                          onDrop={() => handleDrop(idx)}
                          onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-grab active:cursor-grabbing transition-all ${
                            dragOverIdx === idx ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/6 bg-white/3'
                          } ${dragIdx === idx ? 'opacity-40' : ''}`}>
                          <span className="text-[10px] text-zinc-600 w-5 text-right font-mono">{idx + 1}</span>
                          <img src={item.preview} className="w-8 h-8 rounded object-cover border border-white/10" />
                          <p className="flex-1 text-[11px] text-zinc-400 truncate">{item.file.name}</p>
                          <p className="text-[10px] text-zinc-700">{(item.file.size / 1024).toFixed(0)} KB</p>
                          <button onClick={() => {
                            URL.revokeObjectURL(item.preview);
                            setFileItems(prev => prev.filter(f => f.id !== item.id));
                          }} className="text-zinc-700 hover:text-red-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setFileItems([])}
                      className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors">
                      Xóa tất cả
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Mode: PDF ── */}
            {uploadMode === 'pdf' && (
              <div className="space-y-3">
                <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                  pdfFile ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/8 hover:border-violet-500/25 hover:bg-white/3'
                }`}>
                  <input type="file" accept=".pdf,application/pdf"
                    onChange={e => e.target.files?.[0] && handlePdfFile(e.target.files[0])} className="hidden" />
                  {pdfFile ? (
                    <div className="text-center">
                      <CheckCircle2 className="w-6 h-6 text-violet-400 mx-auto mb-1" />
                      <p className="text-xs text-violet-300 font-medium">{pdfFile.name}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                        {pdfPageCount != null && ` · ~${pdfPageCount} trang`}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-zinc-700 mx-auto mb-1" />
                      <p className="text-xs text-zinc-600">Click để chọn file PDF</p>
                      <p className="text-[10px] text-zinc-800 mt-0.5">Tối đa 50MB</p>
                    </div>
                  )}
                </label>
                {pdfFile && pdfPageCount != null && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-violet-500/6 border border-violet-500/15">
                    <FileText className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Hệ thống sẽ extract <span className="text-violet-300 font-semibold">{pdfPageCount} trang</span> từ PDF này
                      và lưu thành từng trang ảnh riêng. Editor có thể annotation bình thường sau khi upload xong.
                    </p>
                  </div>
                )}
                {pdfFile && (
                  <button onClick={() => { setPdfFile(null); setPdfPageCount(null); }}
                    className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors">
                    Xóa file
                  </button>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">Ghi chú</label>
              <input type="text" value={uploadNotes} onChange={e => setUploadNotes(e.target.value)}
                placeholder="Ghi chú cho trang (tuỳ chọn)"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all" />
            </div>

            {/* Progress bar khi đang upload nhiều batch */}
            {batchProgress && (
              <div className="rounded-xl bg-violet-500/8 border border-violet-500/20 px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-violet-300 font-semibold">Đang upload theo lô...</span>
                  <span className="text-zinc-400 tabular-nums">{batchProgress.current}/{batchProgress.total} trang</span>
                </div>
                <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
                </div>
                <p className="text-[10px] text-zinc-600">Không đóng trang này cho đến khi upload xong.</p>
              </div>
            )}

            {uploadErr && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">{uploadErr}</p>}
            {uploadOk  && (
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-xl px-3 py-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />{uploadOk}
              </div>
            )}

            <button
              onClick={uploadMode === 'image' ? handleBatchUpload : handlePdfUpload}
              disabled={isPending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-600/25 disabled:opacity-60 transition-all">
              {isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {uploadMode === 'pdf'
                      ? 'Đang extract PDF...'
                      : batchProgress
                        ? `Đang upload ${batchProgress.current}/${batchProgress.total} ảnh...`
                        : 'Đang upload...'}
                  </>
                : <><Upload className="w-4 h-4" />{uploadMode === 'pdf' ? 'Upload PDF' : `Upload ${fileItems.length > 0 ? fileItems.length + ' ảnh' : 'ảnh'}`}</>}
            </button>
          </div>
        )}
      </div>

      {/* ═══ MODAL: Sửa chapter ═══ */}
      {editChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !updateChapterMutation.isPending && setEditChapter(null)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-[#111118] border border-violet-900/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-violet-400" />Sửa chapter
              </h3>
              <button onClick={() => setEditChapter(null)}
                className="w-7 h-7 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">Số chapter *</label>
                <input type="number" min="1" value={editForm.chapterNumber}
                  onChange={e => setEditForm({ ...editForm, chapterNumber: e.target.value })}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">Tên chapter</label>
                <input type="text" value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="VD: Cuộc gặp gỡ định mệnh"
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">Ghi chú</label>
                <textarea rows={3} value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Ghi chú nội bộ..."
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 resize-none" />
              </div>
              {editErr && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2">{editErr}</p>}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/5">
              <button onClick={() => setEditChapter(null)}
                className="px-4 py-2 text-sm rounded-xl border border-white/8 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
                Huỷ
              </button>
              <button
                onClick={() => {
                  setEditErr('');
                  const num = parseInt(editForm.chapterNumber);
                  if (!num || num < 1) { setEditErr('Số chapter không hợp lệ'); return; }
                  // Chặn trùng số chapter (trừ chính nó)
                  if ((chapters as Chapter[]).some(c => c.id !== editChapter.id && c.chapterNumber === num)) {
                    setEditErr(`Số chapter ${num} đã tồn tại`); return;
                  }
                  updateChapterMutation.mutate({
                    id: editChapter.id,
                    chapterNumber: num,
                    title: editForm.title,
                    notes: editForm.notes,
                  });
                }}
                disabled={updateChapterMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-600/25 disabled:opacity-60 transition-all">
                {updateChapterMutation.isPending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang lưu...</>
                  : <><CheckCircle2 className="w-3.5 h-3.5" />Lưu thay đổi</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Xoá chapter ═══ */}
      {deleteChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !deleteChapterMutation.isPending && setDeleteChapter(null)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-[#111118] border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Xoá Chapter {deleteChapter.chapterNumber}{deleteChapter.title ? `: ${deleteChapter.title}` : ''}?</h3>
              <p className="text-[12px] text-zinc-500 leading-relaxed">
                Toàn bộ trang và task thuộc chapter này sẽ bị xoá vĩnh viễn.
                Hành động không thể hoàn tác.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/5">
              <button onClick={() => setDeleteChapter(null)}
                className="px-4 py-2 text-sm rounded-xl border border-white/8 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
                Huỷ
              </button>
              <button
                onClick={() => deleteChapterMutation.mutate(deleteChapter.id)}
                disabled={deleteChapterMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-red-600/20 border border-red-500/30 text-red-300 font-semibold hover:bg-red-600/30 disabled:opacity-60 transition-all">
                {deleteChapterMutation.isPending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang xoá...</>
                  : <><Trash2 className="w-3.5 h-3.5" />Xoá chapter</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Xoá trang ═══ */}
      {deletePageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !deletePageMutation.isPending && setDeletePageId(null)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-[#111118] border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 space-y-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Xoá trang này?</h3>
              <p className="text-[12px] text-zinc-500 leading-relaxed">
                Ảnh trang và mọi task liên quan sẽ bị xoá vĩnh viễn. Các trang sau sẽ được đánh số lại.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/5">
              <button onClick={() => setDeletePageId(null)}
                className="px-4 py-2 text-sm rounded-xl border border-white/8 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
                Huỷ
              </button>
              <button
                onClick={() => deletePageMutation.mutate(deletePageId)}
                disabled={deletePageMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-red-600/20 border border-red-500/30 text-red-300 font-semibold hover:bg-red-600/30 disabled:opacity-60 transition-all">
                {deletePageMutation.isPending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang xoá...</>
                  : <><Trash2 className="w-3.5 h-3.5" />Xoá trang</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
