import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, MessageSquare, CheckCircle2, Loader2, AlertCircle,
  Eye, Tag, BookOpen, Users, TrendingUp, ArrowUpRight, RotateCcw,
  Pen, ChevronDown, ChevronUp, Send, X, Clock, AlertTriangle,
  ExternalLink, Download
} from 'lucide-react';
import api from '@/lib/axios';

// ─── Status enum từ backend ───────────────────────────────────────
// ManuscriptStatus: draft | submitted | under_review | approved | rejected | revision_requested
const FILTERS = [
  { id: 'all',                label: 'Tất cả'   },
  { id: 'submitted',          label: 'Chờ xét'  },
  { id: 'under_review',       label: 'Đang xét' },
  { id: 'revision_requested', label: 'Cần sửa'  },
  { id: 'approved',           label: 'Sẵn sàng' },
];

const STATUS_META: Record<string, {
  label: string; dot: string; pill: string;
  bg: string; border: string; desc: string;
}> = {
  submitted: {
    label:'Chờ xét', dot:'bg-amber-400',
    pill:'bg-amber-500/10 text-amber-300 border-amber-500/20',
    bg:'bg-amber-500/5', border:'border-amber-500/20',
    desc:'Mangaka vừa nộp bản thảo — chưa có ai xem.',
  },
  under_review: {
    label:'Đang xét', dot:'bg-blue-400',
    pill:'bg-blue-500/10 text-blue-300 border-blue-500/20',
    bg:'bg-blue-500/5', border:'border-blue-500/15',
    desc:'Đang trong quá trình đọc và ghi chú.',
  },
  revision_requested: {
    label:'Cần sửa', dot:'bg-orange-400',
    pill:'bg-orange-500/10 text-orange-300 border-orange-500/20',
    bg:'bg-orange-500/5', border:'border-orange-500/15',
    desc:'Đã trả lại Mangaka kèm yêu cầu chỉnh sửa.',
  },
  approved: {
    label:'Sẵn sàng', dot:'bg-emerald-400',
    pill:'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    bg:'bg-emerald-500/5', border:'border-emerald-500/15',
    desc:'Đủ chất lượng — chờ nộp lên Board.',
  },
  rejected: {
    label:'Từ chối', dot:'bg-red-500',
    pill:'bg-red-500/10 text-red-300 border-red-500/20',
    bg:'bg-red-500/5', border:'border-red-500/15',
    desc:'Bản thảo đã bị từ chối.',
  },
};
const getStatus = (s: string) => STATUS_META[s] ?? {
  label: s, dot:'bg-zinc-500',
  pill:'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  bg:'bg-white/3', border:'border-white/8',
  desc:'',
};

// ─── Annotation tags ─────────────────────────────────────────────
const ANNOTATION_TAGS = [
  { value:'story',    label:'Kịch bản',   color:'bg-violet-500/15 border-violet-500/25 text-violet-300' },
  { value:'dialogue', label:'Thoại',      color:'bg-blue-500/15 border-blue-500/25 text-blue-300'       },
  { value:'art',      label:'Nghệ thuật', color:'bg-amber-500/15 border-amber-500/25 text-amber-300'    },
  { value:'pacing',   label:'Nhịp độ',    color:'bg-pink-500/15 border-pink-500/25 text-pink-300'       },
  { value:'layout',   label:'Bố cục',     color:'bg-teal-500/15 border-teal-500/25 text-teal-300'       },
];

// ─── Parse raw description string ────────────────────────────────
interface ParsedDesc {
  mainText:    string;
  fields:      { key: string; value: string }[];
  editorNotes: string[];
}
const FIELD_LABEL: Record<string, string> = {
  Target:'Đối tượng', Schedule:'Lịch đăng', Characters:'Nhân vật',
  Plot:'Cốt truyện', Character:'Nhân vật', Audience:'Độc giả',
  PublicationSchedule:'Lịch xuất bản',
};
const parseDesc = (raw?: string): ParsedDesc => {
  if (!raw) return { mainText:'', fields:[], editorNotes:[] };
  const fields: { key:string; value:string }[] = [];
  const editorNotes: string[] = [];
  const tagRegex = /\[([^\]]+?):\s*([^\]]*)\]/g;
  let match: RegExpExecArray | null;
  let cleaned = raw;
  while ((match = tagRegex.exec(raw)) !== null) {
    const key = match[1].trim(), value = match[2].trim();
    if (key.toLowerCase().includes('editor note')) editorNotes.push(value);
    else fields.push({ key, value });
    cleaned = cleaned.replace(match[0], '');
  }
  return { mainText: cleaned.replace(/\n{2,}/g, '\n').trim(), fields, editorNotes };
};
const fKey = (k: string) => FIELD_LABEL[k] ?? k;

// ─── Shared input styles ─────────────────────────────────────────
const inputCls = 'w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40 resize-none transition-all';
const labelCls = 'block text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5';

// ─── InfoBlock ───────────────────────────────────────────────────
const InfoBlock = ({ label, value, span, red }: { label:string; value:string; span?:boolean; red?:boolean }) => (
  <div className={`${span?'col-span-2':''} bg-white/3 border border-white/5 rounded-xl px-4 py-3`}>
    <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-[12px] leading-relaxed ${red?'text-red-300':'text-zinc-300'}`}>{value}</p>
  </div>
);

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const ManuscriptReview = () => {
  const qc = useQueryClient();

  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId,   setExpandedId]   = useState<string|null>(null);

  // Annotation form
  const [aForm, setAForm] = useState({ tag:'story', comment:'', pageNumber:'' });
  const [aErr,  setAErr]  = useState('');

  // Return-to-mangaka form
  const [rForm, setRForm] = useState({ type:'needs_minor_revision', reason:'' });
  const [rErr,  setRErr]  = useState('');

  // Board prep form
  const [bForm, setBForm] = useState({
    audienceSummary:'', marketingAngle:'', whyItWillSell:'',
    recommendedSchedule:'weekly', editorNote:'',
  });
  const [bErr, setBErr] = useState('');

  // ── Query ────────────────────────────────────────────────────
  // Backend GET /editor/manuscripts không nhận param filter
  // → Fetch toàn bộ, filter client-side
  const { data: msData, isLoading, isError, refetch } = useQuery({
    queryKey: ['editor', 'manuscripts'],
    queryFn: async () => {
      const r = await api.get('/editor/manuscripts');
      return r.data.data;
    },
  });
  const allMs: any[] = Array.isArray(msData)
    ? msData : (msData?.content ?? msData?.items ?? []);
  const manuscripts = activeFilter === 'all'
    ? allMs : allMs.filter(m => m.status === activeFilter);

  // ── Mutations ────────────────────────────────────────────────

  // 1. Chuyển submitted → under_review (Editor bắt đầu xem)
  // Backend: PUT /editor/manuscripts/{id}/status body: { status: "under_review" }
  const startReviewMutation = useMutation({
    mutationFn: (id: string) =>
      api.put(`/editor/manuscripts/${id}/status`, { status:'under_review', reason:'' }),
    onSuccess: () => qc.invalidateQueries({ queryKey:['editor','manuscripts'] }),
  });

  // 2. Annotate
  // Backend: POST /editor/manuscripts/{id}/annotate body: { note }
  const annotateMutation = useMutation({
    mutationFn: ({ id, note }: { id:string; note:string }) =>
      api.post(`/editor/manuscripts/${id}/annotate`, { note }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['editor','manuscripts'] });
      setAForm({ tag:'story', comment:'', pageNumber:'' });
      setAErr('');
    },
    onError: (e:any) => setAErr(e.response?.data?.message ?? 'Lỗi xảy ra'),
  });

  // 3. Trả lại Mangaka
  // Backend: PUT /editor/manuscripts/{id}/status
  // Nhận: needs_minor_revision | needs_major_revision | revision_requested
  const returnMutation = useMutation({
    mutationFn: ({ id, type, reason }: { id:string; type:string; reason:string }) =>
      api.put(`/editor/manuscripts/${id}/status`, { status:type, reason }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['editor','manuscripts'] });
      setRForm({ type:'needs_minor_revision', reason:'' });
      setRErr('');
      setExpandedId(null);
    },
    onError: (e:any) => setRErr(e.response?.data?.message ?? 'Lỗi xảy ra'),
  });

  // 4. Submit lên Board
  // Backend: POST /editor/manuscripts/{id}/submit-to-board
  const boardMutation = useMutation({
    mutationFn: ({ id, data }: { id:string; data:any }) =>
      api.post(`/editor/manuscripts/${id}/submit-to-board`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['editor','manuscripts'] });
      setBForm({ audienceSummary:'', marketingAngle:'', whyItWillSell:'', recommendedSchedule:'weekly', editorNote:'' });
      setBErr('');
      setExpandedId(null);
    },
    onError: (e:any) => setBErr(e.response?.data?.message ?? 'Lỗi xảy ra'),
  });

  // ── Handlers ─────────────────────────────────────────────────
  const handleExpand = (m: any) => {
    if (expandedId === m.id) { setExpandedId(null); return; }
    setExpandedId(m.id);
    setAErr(''); setRErr(''); setBErr('');
    // Tự động chuyển submitted → under_review khi Editor mở ra
    if (m.status === 'submitted') {
      startReviewMutation.mutate(m.id);
    }
  };

  const handleAnnotate = (msId: string) => {
    setAErr('');
    if (!aForm.comment.trim()) { setAErr('Vui lòng nhập nội dung'); return; }
    const tag = ANNOTATION_TAGS.find(t => t.value === aForm.tag);
    const note = `[${tag?.label ?? aForm.tag}]${aForm.pageNumber ? ` Trang ${aForm.pageNumber}` : ''}: ${aForm.comment}`;
    annotateMutation.mutate({ id: msId, note });
  };

  const handleReturn = (msId: string) => {
    setRErr('');
    if (rForm.reason.length < 20) { setRErr('Cần ít nhất 20 ký tự'); return; }
    returnMutation.mutate({ id:msId, type:rForm.type, reason:rForm.reason });
  };

  const handleBoard = (msId: string) => {
    setBErr('');
    if (!bForm.audienceSummary.trim()) { setBErr('Vui lòng nhập đối tượng độc giả'); return; }
    if (!bForm.whyItWillSell.trim())   { setBErr('Vui lòng nhập lý do sẽ thành công'); return; }
    boardMutation.mutate({ id:msId, data:bForm });
  };

  // ── Loading / Error ──────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-[#110c05] flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
    </div>
  );
  if (isError) return (
    <div className="min-h-screen bg-[#110c05] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <button onClick={() => refetch()}
        className="px-4 py-2 rounded-xl bg-amber-600/20 text-amber-300 text-sm border border-amber-500/20">
        Thử lại
      </button>
    </div>
  );

  return (
    <div className="min-h-full bg-[#110c05] text-white">

      {/* ── Header ── */}
      <div className="relative border-b border-amber-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-64 h-64 rounded-full bg-amber-600/8 blur-3xl" />
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-500 mb-2">Editor · Bản thảo</p>
          <h1 className="text-2xl font-black font-['Syne']">Xét duyệt bản thảo</h1>
          <p className="text-sm text-zinc-600 mt-1">Đánh giá, ghi chú và quyết định có nộp lên Board không</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* ── Filters ── */}
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map(f => {
            const count = f.id === 'all'
              ? allMs.length
              : allMs.filter(m => m.status === f.id).length;
            return (
              <button key={f.id} onClick={() => setActiveFilter(f.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  activeFilter === f.id
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                    : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
                }`}>
                {f.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 rounded-full ${
                    activeFilter === f.id
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-white/8 text-zinc-500'
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── List ── */}
        {manuscripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <FileText className="w-10 h-10 opacity-20" />
            <p className="text-sm">Không có bản thảo nào{activeFilter !== 'all' ? ` ở trạng thái "${FILTERS.find(f => f.id === activeFilter)?.label}"` : ''}</p>
            {activeFilter === 'all' && (
              <p className="text-[11px] text-zinc-600 max-w-xs text-center leading-relaxed">
                Bản thảo xuất hiện khi Mangaka chọn bạn làm Tantou Editor và nộp hồ sơ.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {manuscripts.map((m: any) => {
              const st        = getStatus(m.status);
              const isExpanded = expandedId === m.id;
              const parsed    = parseDesc(m.description);

              // Preview text cho row
              const previewText = parsed.mainText
                || parsed.fields.map(f => `${fKey(f.key)}: ${f.value}`).join(' · ')
                || '';

              return (
                <div key={m.id}
                  className={`rounded-2xl border overflow-hidden transition-all ${
                    isExpanded
                      ? `${st.border} bg-white/[0.01]`
                      : 'border-white/5 bg-white/[0.015]'
                  }`}>

                  {/* ── Row ── */}
                  <div
                    className="px-6 py-4 flex items-start gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => handleExpand(m)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                        <p className="text-[13px] font-bold text-white">{m.seriesTitle ?? m.title}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${st.pill}`}>
                          {st.label}
                        </span>
                        {m.version && <span className="text-[10px] text-zinc-600">v{m.version}</span>}
                      </div>
                      <p className="text-[11px] text-zinc-600 ml-3.5">
                        {m.submittedBy ?? m.mangakaName ?? 'Mangaka'}
                        {m.submittedAt ? ` · ${new Date(m.submittedAt).toLocaleDateString('vi-VN')}` : ''}
                      </p>
                      {previewText && (
                        <p className="text-[11px] text-zinc-700 mt-1 ml-3.5 line-clamp-1">{previewText}</p>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-1" />
                      : <ChevronDown className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-1" />}
                  </div>

                  {/* ════ EXPANDED BOX ════ */}
                  {isExpanded && (
                    <div className="border-t border-white/5">

                      {/* ══ STATUS: submitted → "Chờ xét" ══ */}
                      {(m.status === 'submitted') && (
                        <div className="px-6 py-5 space-y-4">
                          <div className={`flex items-start gap-3 p-4 rounded-xl ${st.bg} border ${st.border}`}>
                            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[12px] font-semibold text-amber-300 mb-0.5">Bản thảo mới — chưa xem</p>
                              <p className="text-[11px] text-zinc-500 leading-relaxed">
                                Mangaka vừa nộp bản thảo này. Khi bạn mở ra, trạng thái sẽ tự chuyển sang <span className="text-blue-400">"Đang xét"</span>.
                              </p>
                            </div>
                          </div>
                          <ManuscriptInfo m={m} parsed={parsed} />
                          <div className="flex items-center gap-2 pt-1">
                            {startReviewMutation.isPending
                              ? <div className="flex items-center gap-2 text-[12px] text-zinc-500">
                                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />Đang chuyển trạng thái...
                                </div>
                              : <p className="text-[11px] text-zinc-600 italic">
                                  Trạng thái đã tự chuyển sang "Đang xét" khi bạn mở bản thảo này.
                                </p>
                            }
                          </div>
                        </div>
                      )}

                      {/* ══ STATUS: under_review → "Đang xét" ══ */}
                      {m.status === 'under_review' && (
                        <div className="px-6 py-5 space-y-5">
                          {/* Status banner */}
                          <div className={`flex items-start gap-3 p-4 rounded-xl ${st.bg} border ${st.border}`}>
                            <Eye className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[12px] font-semibold text-blue-300 mb-0.5">Đang trong quá trình xét duyệt</p>
                              <p className="text-[11px] text-zinc-500 leading-relaxed">
                                Ghi chú những chỗ cần sửa, hoặc khi đã đọc xong có thể trả lại Mangaka hay nộp lên Board.
                              </p>
                            </div>
                          </div>

                          <ManuscriptInfo m={m} parsed={parsed} />

                          {/* Annotate */}
                          <div className="rounded-xl border border-amber-500/15 bg-amber-500/4 p-4 space-y-3">
                            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Pen className="w-3.5 h-3.5" />Thêm ghi chú đánh dấu
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {ANNOTATION_TAGS.map(t => (
                                <button key={t.value}
                                  onClick={() => setAForm(f => ({ ...f, tag:t.value }))}
                                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                                    aForm.tag === t.value ? t.color : 'bg-white/3 border-white/6 text-zinc-600 hover:text-zinc-300'
                                  }`}>{t.label}</button>
                              ))}
                              <input type="number" min="1" placeholder="Số trang"
                                value={aForm.pageNumber}
                                onChange={e => setAForm(f => ({ ...f, pageNumber:e.target.value }))}
                                className="w-20 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40" />
                            </div>
                            <textarea rows={3} value={aForm.comment}
                              onChange={e => setAForm(f => ({ ...f, comment:e.target.value }))}
                              placeholder="Nội dung cần chỉnh sửa (thoại, kịch bản, layout...)..."
                              className={inputCls} />
                            {aErr && <p className="text-xs text-red-400">{aErr}</p>}
                            <button onClick={() => handleAnnotate(m.id)} disabled={annotateMutation.isPending}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/20 border border-amber-500/25 text-amber-300 text-sm font-semibold hover:bg-amber-600/30 disabled:opacity-50 transition-all">
                              {annotateMutation.isPending
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang gửi...</>
                                : <><Send className="w-3.5 h-3.5"/>Gửi ghi chú</>}
                            </button>
                          </div>

                          {/* Existing annotations */}
                          <ExistingAnnotations annotations={m.annotations} />

                          {/* Actions */}
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <ReturnBox m={m} rForm={rForm} setRForm={setRForm} rErr={rErr} onSubmit={() => handleReturn(m.id)} isPending={returnMutation.isPending} />
                            <BoardBox quick onQuickBoard={() => { setBErr(''); boardMutation.mutate({ id:m.id, data:bForm }); }}/>
                          </div>
                        </div>
                      )}

                      {/* ══ STATUS: revision_requested → "Cần sửa" ══ */}
                      {m.status === 'revision_requested' && (
                        <div className="px-6 py-5 space-y-4">
                          <div className={`flex items-start gap-3 p-4 rounded-xl ${st.bg} border ${st.border}`}>
                            <RotateCcw className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[12px] font-semibold text-orange-300 mb-0.5">Đã trả lại Mangaka để sửa</p>
                              <p className="text-[11px] text-zinc-500 leading-relaxed">
                                Mangaka đang chỉnh sửa. Sau khi họ nộp lại, bản thảo sẽ quay về <span className="text-amber-400">"Chờ xét"</span>.
                              </p>
                            </div>
                          </div>
                          <ManuscriptInfo m={m} parsed={parsed} />
                          {m.rejectionReason && (
                            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-3">
                              <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider mb-1">Yêu cầu chỉnh sửa đã gửi</p>
                              <p className="text-[12px] text-orange-200 leading-relaxed">{m.rejectionReason}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ══ STATUS: approved → "Sẵn sàng" ══ */}
                      {m.status === 'approved' && (
                        <div className="px-6 py-5 space-y-4">
                          <div className={`flex items-start gap-3 p-4 rounded-xl ${st.bg} border ${st.border}`}>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[12px] font-semibold text-emerald-300 mb-0.5">Bản thảo đủ tiêu chuẩn — sẵn sàng nộp Board</p>
                              <p className="text-[11px] text-zinc-500 leading-relaxed">
                                Điền thông tin hồ sơ bên dưới và nộp lên Hội đồng biên tập để xét duyệt xuất bản.
                              </p>
                            </div>
                          </div>
                          <ManuscriptInfo m={m} parsed={parsed} />
                          <FullBoardForm
                            bForm={bForm} setBForm={setBForm} bErr={bErr}
                            onSubmit={() => handleBoard(m.id)}
                            isPending={boardMutation.isPending}
                          />
                        </div>
                      )}

                      {/* ══ STATUS: rejected ══ */}
                      {m.status === 'rejected' && (
                        <div className="px-6 py-5 space-y-4">
                          <div className={`flex items-start gap-3 p-4 rounded-xl ${st.bg} border ${st.border}`}>
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[12px] font-semibold text-red-300 mb-0.5">Bản thảo đã bị từ chối</p>
                              {m.rejectionReason && <p className="text-[11px] text-zinc-500 mt-1">{m.rejectionReason}</p>}
                            </div>
                          </div>
                          <ManuscriptInfo m={m} parsed={parsed} />
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

// ─── Sub-components ───────────────────────────────────────────────

const ManuscriptInfo = ({ m, parsed }: { m: any; parsed: ReturnType<typeof parseDesc> }) => (
  <div className="space-y-3">
    {/* File preview */}
    {m.fileUrl && (
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/3 border-b border-white/5">
          <span className="text-[11px] font-semibold text-zinc-400">Bản thảo đính kèm</span>
          <div className="flex items-center gap-2">
            <a href={m.fileUrl} download
              className="text-[11px] text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
              <Download className="w-3 h-3" />Tải về
            </a>
            <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
              <ExternalLink className="w-3 h-3" />Xem file
            </a>
          </div>
        </div>
        {/\.(jpg|jpeg|png|gif|webp)$/i.test(m.fileUrl) ? (
          <img src={m.fileUrl} alt="Bản thảo" className="w-full max-h-80 object-contain bg-black/20" />
        ) : (
          <div className="flex items-center gap-3 px-4 py-4">
            <FileText className="w-7 h-7 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-zinc-400">File bản thảo (PDF / other)</p>
          </div>
        )}
      </div>
    )}
    {/* Parsed description */}
    <div className="grid grid-cols-2 gap-2">
      <InfoBlock label="Phiên bản" value={`v${m.version ?? 1}`} />
      {m.submittedAt && (
        <InfoBlock label="Ngày nộp" value={new Date(m.submittedAt).toLocaleDateString('vi-VN')} />
      )}
      {parsed.mainText && <InfoBlock label="Mô tả" value={parsed.mainText} span />}
      {parsed.fields.map((f, i) => (
        <InfoBlock key={i} label={fKey(f.key)} value={f.value} />
      ))}
    </div>
  </div>
);

const ExistingAnnotations = ({ annotations }: { annotations?: any[] }) => {
  if (!annotations?.length) return null;
  return (
    <div>
      <p className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-2">
        Ghi chú đã có ({annotations.length})
      </p>
      <div className="space-y-1.5">
        {annotations.map((a: any, i: number) => {
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
  );
};

const ReturnBox = ({ m, rForm, setRForm, rErr, onSubmit, isPending }: any) => (
  <div className="rounded-xl border border-orange-500/15 bg-orange-500/4 p-4 space-y-3">
    <p className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
      <RotateCcw className="w-3.5 h-3.5" />Trả lại Mangaka
    </p>
    <div className="grid grid-cols-2 gap-2">
      {[
        { v:'needs_minor_revision', l:'Sửa nhỏ',  desc:'Thoại, vài trang',     c:'bg-orange-500/15 border-orange-500/25 text-orange-300' },
        { v:'needs_major_revision', l:'Sửa lớn',  desc:'Kịch bản, nhiều trang', c:'bg-red-500/15 border-red-500/25 text-red-300'          },
      ].map(opt => (
        <button key={opt.v}
          onClick={() => setRForm((f: any) => ({ ...f, type:opt.v }))}
          className={`flex flex-col gap-0.5 p-2.5 rounded-xl border text-left transition-all ${
            rForm.type === opt.v ? opt.c : 'bg-white/3 border-white/6 hover:bg-white/5'
          }`}>
          <span className={`text-[12px] font-bold ${rForm.type===opt.v?'':'text-zinc-500'}`}>{opt.l}</span>
          <span className={`text-[10px] ${rForm.type===opt.v?'opacity-70':'text-zinc-700'}`}>{opt.desc}</span>
        </button>
      ))}
    </div>
    <textarea rows={3} value={rForm.reason}
      onChange={e => setRForm((f: any) => ({ ...f, reason:e.target.value }))}
      placeholder="Mô tả cụ thể cần chỉnh sửa..."
      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/40 resize-none transition-all" />
    <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${rForm.reason.length>=20?'bg-emerald-500':'bg-orange-500/40'}`}
        style={{ width:`${Math.min((rForm.reason.length/20)*100,100)}%` }} />
    </div>
    {rErr && <p className="text-xs text-red-400">{rErr}</p>}
    <button onClick={onSubmit} disabled={isPending}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-600/20 border border-orange-500/25 text-orange-300 text-sm font-semibold hover:bg-orange-600/30 disabled:opacity-50 transition-all">
      {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang gửi...</> : <><RotateCcw className="w-3.5 h-3.5"/>Trả lại</>}
    </button>
  </div>
);

const BoardBox = ({ quick, onQuickBoard }: { quick?: boolean; onQuickBoard?: () => void }) => (
  <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/4 p-4 flex flex-col justify-between gap-3">
    <div>
      <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
        <ArrowUpRight className="w-3.5 h-3.5" />Nộp lên Board
      </p>
      <p className="text-[11px] text-zinc-600 leading-relaxed">
        Bản thảo đủ chất lượng? Chuyển sang tab <span className="text-emerald-400">"Sẵn sàng"</span> để điền hồ sơ và nộp Board.
      </p>
    </div>
    <p className="text-[10px] text-zinc-700 leading-relaxed">
      Sau khi approve, series sẽ hiện trong filter "Sẵn sàng" với form đầy đủ.
    </p>
  </div>
);

const FullBoardForm = ({ bForm, setBForm, bErr, onSubmit, isPending }: any) => (
  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/4 p-4 space-y-4">
    <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
      <ArrowUpRight className="w-3.5 h-3.5" />Hồ sơ nộp Board
    </p>
    {[
      { key:'audienceSummary',    label:'Đối tượng độc giả *', icon:Users,      ph:'Nam 15-25 tuổi yêu thích action, fantasy...', required:true  },
      { key:'marketingAngle',     label:'Điểm độc đáo / USP',  icon:Tag,        ph:'Hệ thống magic chưa có trên thị trường...', required:false },
      { key:'whyItWillSell',      label:'Vì sao sẽ thành công *', icon:TrendingUp, ph:'Xu hướng isekai đang tăng, tác giả có 50k follower...', required:true },
      { key:'editorNote',         label:'Ghi chú cho Board',   icon:MessageSquare, ph:'Thông tin bổ sung muốn chia sẻ...', required:false },
    ].map(field => (
      <div key={field.key}>
        <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5 flex items-center gap-1">
          <field.icon className="w-3 h-3" />{field.label}
        </label>
        <textarea rows={2} value={bForm[field.key]}
          onChange={(e: any) => setBForm((f: any) => ({ ...f, [field.key]:e.target.value }))}
          placeholder={field.ph}
          className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/40 resize-none transition-all" />
      </div>
    ))}
    <div>
      <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5 flex items-center gap-1">
        <BookOpen className="w-3 h-3" />Lịch xuất bản đề xuất
      </label>
      <div className="flex gap-2">
        {[{v:'weekly',l:'Hàng tuần'},{v:'biweekly',l:'2 tuần/lần'},{v:'monthly',l:'Hàng tháng'}].map(o => (
          <button key={o.v}
            onClick={() => setBForm((f: any) => ({ ...f, recommendedSchedule:o.v }))}
            className={`flex-1 py-2 rounded-xl border text-[12px] font-semibold transition-all ${
              bForm.recommendedSchedule === o.v
                ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
                : 'bg-white/3 border-white/6 text-zinc-600 hover:text-zinc-300'
            }`}>{o.l}</button>
        ))}
      </div>
    </div>
    {bErr && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">{bErr}</p>}
    <button onClick={onSubmit} disabled={isPending}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-emerald-600/25 disabled:opacity-50 transition-all">
      {isPending
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang nộp...</>
        : <><ArrowUpRight className="w-3.5 h-3.5"/>Nộp lên Board</>}
    </button>
  </div>
);

export default ManuscriptReview;
