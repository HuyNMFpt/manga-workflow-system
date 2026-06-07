import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, MessageSquare, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Send, Loader2, AlertCircle, Eye, Tag, BookOpen, Users, TrendingUp,
  ArrowUpRight, RotateCcw, Pen
} from 'lucide-react';
import api from '@/lib/axios';

// ── Constants ─────────────────────────────────────────────────────
const FILTERS = [
  { id: 'all',              label: 'Tất cả'       },
  { id: 'pending_review',   label: 'Chờ xét'      },
  { id: 'in_review',        label: 'Đang xét'     },
  { id: 'needs_revision',   label: 'Cần sửa'      },
  { id: 'approved_for_board', label: 'Sẵn sàng'   },
];

const STATUS_MAP: Record<string, { label: string; pill: string; dot: string }> = {
  pending_review:       { label:'Chờ xét',     dot:'bg-amber-400',   pill:'bg-amber-500/10 text-amber-300 border-amber-500/20'       },
  in_review:            { label:'Đang xét',    dot:'bg-blue-400',    pill:'bg-blue-500/10 text-blue-300 border-blue-500/20'           },
  needs_minor_revision: { label:'Sửa nhỏ',     dot:'bg-orange-400',  pill:'bg-orange-500/10 text-orange-300 border-orange-500/20'    },
  needs_major_revision: { label:'Sửa lớn',     dot:'bg-red-400',     pill:'bg-red-500/10 text-red-300 border-red-500/20'             },
  needs_revision:       { label:'Cần sửa',     dot:'bg-orange-400',  pill:'bg-orange-500/10 text-orange-300 border-orange-500/20'    },
  approved_for_board:   { label:'Sẵn sàng',    dot:'bg-emerald-400', pill:'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  rejected:             { label:'Từ chối',      dot:'bg-red-500',     pill:'bg-red-500/10 text-red-300 border-red-500/20'             },
};

const ANNOTATION_TAGS = [
  { value:'story',    label:'Kịch bản',   color:'bg-violet-500/15 border-violet-500/25 text-violet-300' },
  { value:'dialogue', label:'Thoại',      color:'bg-blue-500/15 border-blue-500/25 text-blue-300'       },
  { value:'art',      label:'Nghệ thuật', color:'bg-amber-500/15 border-amber-500/25 text-amber-300'    },
  { value:'pacing',   label:'Nhịp độ',    color:'bg-pink-500/15 border-pink-500/25 text-pink-300'       },
  { value:'layout',   label:'Bố cục',     color:'bg-teal-500/15 border-teal-500/25 text-teal-300'       },
];

const inputCls  = "w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40 resize-none transition-all";
const labelCls  = "block text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5";

// ── Component ─────────────────────────────────────────────────────
const ManuscriptReview = () => {
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId,   setExpandedId]   = useState<string|null>(null);

  // Per-manuscript view mode: 'overview' | 'annotate' | 'board-prep'
  const [viewMode, setViewMode] = useState<Record<string, 'overview'|'annotate'|'board-prep'>>({});

  // Annotation form
  const [annotateForm, setAnnotateForm] = useState({ tag:'story', comment:'', pageNumber:'' });
  const [annotateErr,  setAnnotateErr]  = useState('');

  // Board prep form (submit to board với justification)
  const [boardForm, setBoardForm] = useState({
    audienceSummary:    '',   // Đối tượng độc giả
    marketingAngle:     '',   // Điểm bán hàng độc đáo
    whyItWillSell:      '',   // Vì sao sẽ bán chạy
    recommendedSchedule:'weekly',
    editorNote:         '',   // Ghi chú thêm cho Board
  });
  const [boardErr, setBoardErr] = useState('');

  // Return-to-mangaka form
  const [returnForm, setReturnForm] = useState({ type: 'needs_minor_revision', reason: '' });
  const [returnErr,  setReturnErr]  = useState('');

  // ── Queries ───────────────────────────────────────────────────
  const { data: msData, isLoading, isError, refetch } = useQuery({
    queryKey: ['editor', 'manuscripts', activeFilter],
    queryFn: async () => {
      const params: any = {};
      if (activeFilter !== 'all') params.status = activeFilter;
      const r = await api.get('/editor/manuscripts', { params });
      return r.data.data;
    },
  });
  const manuscripts = Array.isArray(msData) ? msData : (msData?.content ?? msData?.items ?? []);

  // ── Mutations ─────────────────────────────────────────────────

  // 1. Annotate (ghi chú lên bản thảo gửi lại Mangaka)
  // Backend: POST /editor/manuscripts/{id}/annotate → body: { note: string }
  // ✅ Available
  const annotateMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.post(`/editor/manuscripts/${id}/annotate`, { note }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['editor', 'manuscripts'] });
      setAnnotateForm({ tag:'story', comment:'', pageNumber:'' });
      setAnnotateErr('');
    },
    onError: (e: any) => setAnnotateErr(e.response?.data?.message ?? 'Lỗi xảy ra'),
  });

  // 2. Trả lại Mangaka để sửa
  // ⚠️ Backend cần thêm: PUT /editor/manuscripts/{id}/status
  const returnMutation = useMutation({
    mutationFn: ({ id, type, reason }: { id:string; type:string; reason:string }) =>
      api.put(`/editor/manuscripts/${id}/status`, { status: type, reason }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['editor', 'manuscripts'] });
      setReturnForm({ type:'needs_minor_revision', reason:'' });
      setReturnErr('');
      setViewMode({});
    },
    onError: (e: any) => setReturnErr(e.response?.data?.message ?? 'Lỗi. Backend chưa có endpoint này.'),
  });

  // 3. Submit lên Board (approved_for_board)
  // ⚠️ Backend cần thêm: POST /editor/manuscripts/{id}/submit-to-board
  const boardMutation = useMutation({
    mutationFn: ({ id, data }: { id:string; data:any }) =>
      api.post(`/editor/manuscripts/${id}/submit-to-board`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['editor', 'manuscripts'] });
      setBoardForm({ audienceSummary:'', marketingAngle:'', whyItWillSell:'', recommendedSchedule:'weekly', editorNote:'' });
      setBoardErr('');
      setViewMode({});
    },
    onError: (e: any) => setBoardErr(e.response?.data?.message ?? 'Lỗi. Backend chưa có endpoint này.'),
  });

  // ── Handlers ─────────────────────────────────────────────────
  const handleAnnotate = (msId: string) => {
    setAnnotateErr('');
    if (!annotateForm.comment.trim()) { setAnnotateErr('Vui lòng nhập nội dung'); return; }
    const tag = ANNOTATION_TAGS.find(t => t.value === annotateForm.tag);
    const note = `[${tag?.label ?? annotateForm.tag}]${annotateForm.pageNumber ? ` Trang ${annotateForm.pageNumber}` : ''}: ${annotateForm.comment}`;
    annotateMutation.mutate({ id: msId, note });
  };

  const handleReturn = (msId: string) => {
    setReturnErr('');
    if (!returnForm.reason.trim() || returnForm.reason.length < 20) {
      setReturnErr('Vui lòng nhập lý do chi tiết (ít nhất 20 ký tự)'); return;
    }
    returnMutation.mutate({ id: msId, type: returnForm.type, reason: returnForm.reason });
  };

  const handleBoardSubmit = (msId: string) => {
    setBoardErr('');
    if (!boardForm.audienceSummary.trim()) { setBoardErr('Vui lòng nhập thông tin đối tượng độc giả'); return; }
    if (!boardForm.whyItWillSell.trim())   { setBoardErr('Vui lòng nhập lý do series sẽ thành công'); return; }
    boardMutation.mutate({ id: msId, data: boardForm });
  };

  const getView = (id: string) => viewMode[id] ?? 'overview';
  const setView = (id: string, v: 'overview'|'annotate'|'board-prep') =>
    setViewMode(prev => ({ ...prev, [id]: v }));

  // ── Loading/Error ─────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-[#110c05] flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
    </div>
  );
  if (isError) return (
    <div className="min-h-screen bg-[#110c05] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-amber-600/20 text-amber-300 text-sm border border-amber-500/20">Thử lại</button>
    </div>
  );

  return (
    <div className="min-h-full bg-[#110c05] text-white">

      {/* Header */}
      <div className="relative border-b border-amber-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-64 h-64 rounded-full bg-amber-600/8 blur-3xl" />
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-500 mb-2">Editor · Bản thảo</p>
          <h1 className="text-2xl font-black font-['Syne']">Xét duyệt bản thảo</h1>
          <p className="text-sm text-zinc-600 mt-1">Đánh giá, ghi chú và quyết định có nộp lên Board không</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* Filters */}
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                activeFilter === f.id
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
              }`}>{f.label}</button>
          ))}
        </div>

        {/* Manuscript list */}
        {manuscripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-zinc-700">
            <FileText className="w-10 h-10 opacity-20" />
            <p className="text-sm">Không có bản thảo nào</p>
            {activeFilter === 'all' && (
              <div className="max-w-sm text-center space-y-2">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Bản thảo chỉ hiển thị khi <span className="text-amber-400 font-semibold">Mangaka chọn bạn</span> làm Tantou Editor khi tạo series.
                </p>
                <div className="flex items-start gap-2.5 p-3 bg-amber-500/8 border border-amber-500/15 rounded-xl text-left">
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
                  </svg>
                  <div>
                    <p className="text-[11px] text-amber-400 font-semibold mb-0.5">Flow mới</p>
                    <p className="text-[11px] text-zinc-500">
                      Mangaka tạo series → chọn Tantou Editor → 
                      Submit bản thảo → Editor nhận được bản thảo tại đây.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {manuscripts.map((m: any) => {
              const st = STATUS_MAP[m.status] ?? { label:m.status, dot:'bg-zinc-500', pill:'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
              const isExpanded = expandedId === m.id;
              const view = getView(m.id);

              return (
                <div key={m.id} className={`rounded-2xl border overflow-hidden transition-all ${
                  isExpanded ? 'border-amber-500/30' : 'border-white/5 bg-white/[0.015]'
                }`}>

                  {/* ── Row header ── */}
                  <div className="px-6 py-4 flex items-start gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : m.id);
                      if (!isExpanded) setView(m.id, 'overview');
                    }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-[13px] font-bold text-white">{m.seriesTitle ?? m.title}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${st.pill}`}>{st.label}</span>
                        {m.version && <span className="text-[10px] text-zinc-600">v{m.version}</span>}
                      </div>
                      <p className="text-[11px] text-zinc-600">
                        {m.submittedBy ?? m.mangakaName ?? 'Mangaka'}
                        {m.submittedAt ? ` · ${new Date(m.submittedAt).toLocaleDateString('vi-VN')}` : ''}
                      </p>
                      {m.description && (
                        <p className="text-[11px] text-zinc-700 mt-1 line-clamp-1 italic">{m.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Quick action buttons (collapsed) */}
                      {!isExpanded && (
                        <>
                          <button onClick={e => { e.stopPropagation(); setExpandedId(m.id); setView(m.id, 'annotate'); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold hover:bg-amber-500/15 transition-colors">
                            <Pen className="w-3 h-3" />Ghi chú
                          </button>
                          {m.status !== 'approved_for_board' && (
                            <button onClick={e => { e.stopPropagation(); setExpandedId(m.id); setView(m.id, 'board-prep'); }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-500/15 transition-colors">
                              <ArrowUpRight className="w-3 h-3" />Nộp Board
                            </button>
                          )}
                        </>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                    </div>
                  </div>

                  {/* ── Expanded content ── */}
                  {isExpanded && (
                    <div className="border-t border-white/5">

                      {/* Sub-navigation tabs */}
                      <div className="flex items-center gap-1 px-6 py-3 border-b border-white/4 bg-white/[0.01]">
                        {[
                          { id:'overview',   label:'Tổng quan',     icon:Eye          },
                          { id:'annotate',   label:'Ghi chú / Sửa', icon:Pen          },
                          { id:'board-prep', label:'Nộp lên Board', icon:ArrowUpRight  },
                        ].map(tab => (
                          <button key={tab.id}
                            onClick={() => setView(m.id, tab.id as any)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                              view === tab.id
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                                : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
                            }`}>
                            <tab.icon className="w-3 h-3" />
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* ════ OVERVIEW ════ */}
                      {view === 'overview' && (
                        <div className="px-6 py-5 space-y-4">
                          {/* File preview */}
                          {m.fileUrl && (
                            <div className="rounded-xl border border-white/8 overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2.5 bg-white/3 border-b border-white/5">
                                <span className="text-[11px] font-semibold text-zinc-400">Bản thảo đính kèm</span>
                                <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1">
                                  <Eye className="w-3 h-3" />Xem file gốc
                                </a>
                              </div>
                              {/* Preview nếu là ảnh */}
                              {m.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img src={m.fileUrl} alt="Bản thảo" className="w-full max-h-96 object-contain bg-black/20" />
                              ) : (
                                <div className="flex items-center gap-3 px-4 py-4">
                                  <FileText className="w-8 h-8 text-amber-400" />
                                  <div>
                                    <p className="text-sm text-white font-medium">File bản thảo</p>
                                    <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                                      className="text-[11px] text-amber-400 hover:underline">{m.fileUrl}</a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Manuscript info grid */}
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label:'Trạng thái',       value: st.label                                          },
                              { label:'Phiên bản',         value: `v${m.version ?? 1}`                             },
                              { label:'Mô tả',             value: m.description || '—', span: true                 },
                              { label:'Rejection reason',  value: m.rejectionReason || '—', span: true             },
                            ].map((info, i) => (
                              <div key={i} className={`${info.span ? 'col-span-2' : ''} bg-white/3 border border-white/5 rounded-xl px-4 py-3`}>
                                <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider mb-1">{info.label}</p>
                                <p className="text-[12px] text-zinc-300">{info.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Existing annotations */}
                          {(m.annotations ?? []).length > 0 && (
                            <div>
                              <p className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Ghi chú đã có ({m.annotations.length})</p>
                              <div className="space-y-1.5">
                                {m.annotations.map((a: any, i: number) => {
                                  const tag = ANNOTATION_TAGS.find(t => t.label === a.tag || t.value === a.tag);
                                  return (
                                    <div key={i} className="flex items-start gap-2 p-2.5 bg-white/3 border border-white/5 rounded-xl">
                                      {tag && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex-shrink-0 ${tag.color}`}>{tag.label}</span>}
                                      <p className="text-[12px] text-zinc-400 flex-1">{a.note ?? a.comment}</p>
                                      {a.pageNumber && <span className="text-[10px] text-zinc-700 flex-shrink-0">tr.{a.pageNumber}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ════ ANNOTATE / TRẢ LẠI MANGAKA ════ */}
                      {view === 'annotate' && (
                        <div className="px-6 py-5 space-y-5">

                          {/* Annotation form */}
                          <div className="rounded-xl border border-amber-500/15 bg-amber-500/4 p-4 space-y-3">
                            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Thêm ghi chú đánh dấu</p>

                            {/* Tag + Page */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex gap-1.5 flex-wrap">
                                {ANNOTATION_TAGS.map(t => (
                                  <button key={t.value}
                                    onClick={() => setAnnotateForm(f => ({ ...f, tag: t.value }))}
                                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                                      annotateForm.tag === t.value ? t.color : 'bg-white/3 border-white/6 text-zinc-600 hover:text-zinc-300'
                                    }`}>{t.label}</button>
                                ))}
                              </div>
                              <input type="number" min="1"
                                value={annotateForm.pageNumber}
                                onChange={e => setAnnotateForm(f => ({ ...f, pageNumber: e.target.value }))}
                                placeholder="Số trang"
                                className="w-24 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40" />
                            </div>

                            <textarea rows={3}
                              value={annotateForm.comment}
                              onChange={e => setAnnotateForm(f => ({ ...f, comment: e.target.value }))}
                              placeholder="Nội dung cần chỉnh sửa (thoại, kịch bản, layout...)..."
                              className={`${inputCls}`} />

                            {annotateErr && <p className="text-xs text-red-400">{annotateErr}</p>}

                            <button onClick={() => handleAnnotate(m.id)} disabled={annotateMutation.isPending}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/20 border border-amber-500/25 text-amber-300 text-sm font-semibold hover:bg-amber-600/30 disabled:opacity-50 transition-all">
                              {annotateMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang gửi...</> : <><Send className="w-3.5 h-3.5"/>Gửi ghi chú</>}
                            </button>
                          </div>

                          {/* Divider */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="text-[11px] text-zinc-700">hoặc trả lại Mangaka</span>
                            <div className="flex-1 h-px bg-white/5" />
                          </div>

                          {/* Return to Mangaka */}
                          <div className="rounded-xl border border-orange-500/15 bg-orange-500/4 p-4 space-y-3">
                            <p className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">Trả lại Mangaka để chỉnh sửa</p>

                            {/* Severity */}
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { v:'needs_minor_revision', l:'Sửa nhỏ',  desc:'Thoại, vài trang',   c:'bg-orange-500/15 border-orange-500/25 text-orange-300' },
                                { v:'needs_major_revision', l:'Sửa lớn',  desc:'Kịch bản, nhiều trang', c:'bg-red-500/15 border-red-500/25 text-red-300'      },
                              ].map(opt => (
                                <button key={opt.v}
                                  onClick={() => setReturnForm(f => ({ ...f, type: opt.v }))}
                                  className={`flex flex-col gap-0.5 p-3 rounded-xl border text-left transition-all ${
                                    returnForm.type === opt.v ? opt.c : 'bg-white/3 border-white/6 hover:bg-white/5'
                                  }`}>
                                  <span className={`text-[12px] font-bold ${returnForm.type===opt.v?'':'text-zinc-500'}`}>{opt.l}</span>
                                  <span className={`text-[10px] ${returnForm.type===opt.v?'opacity-70':'text-zinc-700'}`}>{opt.desc}</span>
                                </button>
                              ))}
                            </div>

                            <div>
                              <label className={labelCls}>Lý do chi tiết <span className="text-red-400">*</span></label>
                              <textarea rows={4}
                                value={returnForm.reason}
                                onChange={e => setReturnForm(f => ({ ...f, reason: e.target.value }))}
                                placeholder="Mô tả cụ thể những gì cần chỉnh sửa để Mangaka biết cần làm gì..."
                                className={`${inputCls}`} />
                              <div className="mt-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${returnForm.reason.length>=20?'bg-emerald-500':'bg-red-500/50'}`}
                                  style={{ width:`${Math.min((returnForm.reason.length/20)*100,100)}%` }} />
                              </div>
                            </div>

                            {returnErr && <p className="text-xs text-red-400">{returnErr}</p>}

                            <button onClick={() => handleReturn(m.id)} disabled={returnMutation.isPending}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600/20 border border-orange-500/25 text-orange-300 text-sm font-semibold hover:bg-orange-600/30 disabled:opacity-50 transition-all">
                              {returnMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang gửi...</> : <><RotateCcw className="w-3.5 h-3.5"/>Trả lại Mangaka</>}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ════ BOARD PREP ════ */}
                      {view === 'board-prep' && (
                        <div className="px-6 py-5 space-y-4">
                          <div className="flex items-start gap-2.5 p-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
                            <ArrowUpRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[12px] font-semibold text-emerald-300">Chuẩn bị hồ sơ nộp Board</p>
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                Điền đầy đủ thông tin để thuyết phục Hội đồng biên tập tại sao series này xứng đáng được xuất bản.
                              </p>
                            </div>
                          </div>

                          {/* Audience summary */}
                          <div>
                            <label className={labelCls}>
                              <Users className="w-3 h-3 inline mr-1" />
                              Đối tượng độc giả <span className="text-red-400">*</span>
                            </label>
                            <textarea rows={2}
                              value={boardForm.audienceSummary}
                              onChange={e => setBoardForm(f => ({ ...f, audienceSummary: e.target.value }))}
                              placeholder="VD: Nam 15-25 tuổi yêu thích action, fantasy. So sánh với One Piece, Demon Slayer..."
                              className={`${inputCls}`} />
                          </div>

                          {/* Marketing angle */}
                          <div>
                            <label className={labelCls}>
                              <Tag className="w-3 h-3 inline mr-1" />
                              Điểm độc đáo / USP
                            </label>
                            <textarea rows={2}
                              value={boardForm.marketingAngle}
                              onChange={e => setBoardForm(f => ({ ...f, marketingAngle: e.target.value }))}
                              placeholder="VD: Hệ thống magic độc đáo chưa có trong thị trường manga Việt Nam..."
                              className={`${inputCls}`} />
                          </div>

                          {/* Why it will sell */}
                          <div>
                            <label className={labelCls}>
                              <TrendingUp className="w-3 h-3 inline mr-1" />
                              Vì sao sẽ thành công <span className="text-red-400">*</span>
                            </label>
                            <textarea rows={3}
                              value={boardForm.whyItWillSell}
                              onChange={e => setBoardForm(f => ({ ...f, whyItWillSell: e.target.value }))}
                              placeholder="VD: Xu hướng isekai đang tăng mạnh, tác giả có 50k follower, art style phù hợp thị hiếu hiện tại..."
                              className={`${inputCls}`} />
                          </div>

                          {/* Recommended schedule */}
                          <div>
                            <label className={labelCls}>
                              <BookOpen className="w-3 h-3 inline mr-1" />
                              Lịch xuất bản đề xuất
                            </label>
                            <div className="flex gap-2">
                              {[
                                { v:'weekly',   l:'Hàng tuần'  },
                                { v:'biweekly', l:'2 tuần/lần' },
                                { v:'monthly',  l:'Hàng tháng' },
                              ].map(o => (
                                <button key={o.v}
                                  onClick={() => setBoardForm(f => ({ ...f, recommendedSchedule: o.v }))}
                                  className={`flex-1 py-2 rounded-xl border text-[12px] font-semibold transition-all ${
                                    boardForm.recommendedSchedule === o.v
                                      ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
                                      : 'bg-white/3 border-white/6 text-zinc-600 hover:text-zinc-300'
                                  }`}>{o.l}</button>
                              ))}
                            </div>
                          </div>

                          {/* Editor note to board */}
                          <div>
                            <label className={labelCls}>
                              <MessageSquare className="w-3 h-3 inline mr-1" />
                              Ghi chú thêm cho Board
                            </label>
                            <textarea rows={2}
                              value={boardForm.editorNote}
                              onChange={e => setBoardForm(f => ({ ...f, editorNote: e.target.value }))}
                              placeholder="Bất kỳ thông tin bổ sung nào muốn chia sẻ với Board..."
                              className={`${inputCls}`} />
                          </div>

                          {boardErr && (
                            <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">{boardErr}</p>
                          )}

                          <div className="flex justify-between items-center pt-1">
                            <button onClick={() => setView(m.id, 'overview')}
                              className="px-4 py-2 text-sm rounded-xl border border-white/8 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
                              ← Quay lại
                            </button>
                            <button onClick={() => handleBoardSubmit(m.id)} disabled={boardMutation.isPending}
                              className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:shadow-lg hover:shadow-emerald-600/25 disabled:opacity-50 transition-all">
                              {boardMutation.isPending
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang nộp...</>
                                : <><ArrowUpRight className="w-3.5 h-3.5"/>Nộp lên Board</>}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManuscriptReview;
