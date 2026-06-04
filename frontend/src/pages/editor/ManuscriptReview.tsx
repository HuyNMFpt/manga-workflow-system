import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, MessageSquare, Check, X, Loader2, AlertCircle, Filter } from 'lucide-react';
import api from '@/lib/axios';

const FILTERS = [
  { id: 'all',              label: 'Tất cả'    },
  { id: 'in_review',        label: 'Đang xét'  },
  { id: 'pending_review',   label: 'Chờ xét'   },
  { id: 'approved_for_board', label: 'Đã duyệt'},
];

const STATUS_MAP: Record<string, { label: string; pill: string }> = {
  pending_review:       { label:'Chờ xét',     pill:'bg-amber-500/10 text-amber-300 border-amber-500/20'     },
  in_review:            { label:'Đang xét',    pill:'bg-blue-500/10 text-blue-300 border-blue-500/20'         },
  needs_minor_revision: { label:'Sửa nhỏ',     pill:'bg-orange-500/10 text-orange-300 border-orange-500/20'  },
  needs_major_revision: { label:'Sửa lớn',     pill:'bg-red-500/10 text-red-300 border-red-500/20'           },
  approved_for_board:   { label:'Đã duyệt',    pill:'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'},
};

const ANNOTATION_TAGS = [
  { value:'story',    label:'Kịch bản', color:'bg-violet-500/15 border-violet-500/25 text-violet-300' },
  { value:'dialogue', label:'Thoại',    color:'bg-blue-500/15 border-blue-500/25 text-blue-300'       },
  { value:'art',      label:'Nghệ thuật',color:'bg-amber-500/15 border-amber-500/25 text-amber-300'  },
  { value:'pacing',   label:'Nhịp độ',  color:'bg-pink-500/15 border-pink-500/25 text-pink-300'      },
];

const ManuscriptReview = () => {
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter]   = useState('all');
  const [expandedId,   setExpandedId]     = useState<string|null>(null);
  const [showAnnotate, setShowAnnotate]   = useState<string|null>(null);
  const [annotateForm, setAnnotateForm]   = useState({ tag: 'story', comment: '', pageNumber: '' });
  const [annotateErr,  setAnnotateErr]    = useState('');

  // ✅ GET /api/editor/manuscripts
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

  // ✅ POST /api/editor/manuscripts/{id}/annotate
  const annotateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`/editor/manuscripts/${id}/annotate`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['editor', 'manuscripts'] });
      setShowAnnotate(null);
      setAnnotateForm({ tag: 'story', comment: '', pageNumber: '' });
    },
    onError: (e: any) => setAnnotateErr(e.response?.data?.message ?? 'Lỗi xảy ra'),
  });

  const handleAnnotate = (manuscriptId: string) => {
    setAnnotateErr('');
    if (!annotateForm.comment.trim()) { setAnnotateErr('Vui lòng nhập nội dung ghi chú'); return; }
    annotateMutation.mutate({ id: manuscriptId, data: annotateForm });
  };

  if (isLoading) return <div className="min-h-screen bg-[#110c05] flex items-center justify-center"><Loader2 className="w-7 h-7 text-amber-400 animate-spin" /></div>;
  if (isError)   return (
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
          <p className="text-sm text-zinc-600 mt-1">Review và ghi chú lên bản thảo của Mangaka</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* Filters */}
        <div className="flex items-center gap-1">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                activeFilter === f.id ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
              }`}>{f.label}</button>
          ))}
        </div>

        {/* Manuscripts */}
        {manuscripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <FileText className="w-10 h-10 opacity-20" />
            <p className="text-sm">Không có bản thảo nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {manuscripts.map((m: any) => {
              const st = STATUS_MAP[m.status] ?? { label: m.status, pill: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
              const isExpanded = expandedId === m.id;
              return (
                <div key={m.id} className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
                  {/* Header row */}
                  <div className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[13px] font-bold text-white">{m.seriesTitle ?? m.title}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${st.pill}`}>{st.label}</span>
                      </div>
                      <p className="text-[11px] text-zinc-600">{m.mangakaName ?? m.mangaka} · {m.totalPages ?? '?'} trang · {m.submittedAt ? new Date(m.submittedAt).toLocaleDateString('vi-VN') : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); setShowAnnotate(showAnnotate === m.id ? null : m.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold hover:bg-amber-500/20 transition-colors">
                        <MessageSquare className="w-3 h-3" />Ghi chú
                      </button>
                    </div>
                  </div>

                  {/* Annotation form */}
                  {showAnnotate === m.id && (
                    <div className="px-6 pb-5 border-t border-white/5 pt-4 space-y-3">
                      <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-zinc-600">Thêm ghi chú</p>

                      {/* Tag */}
                      <div className="flex gap-2">
                        {ANNOTATION_TAGS.map(t => (
                          <button key={t.value} onClick={() => setAnnotateForm(f => ({ ...f, tag: t.value }))}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                              annotateForm.tag === t.value ? t.color : 'bg-white/3 border-white/6 text-zinc-600 hover:text-zinc-300'
                            }`}>{t.label}</button>
                        ))}
                      </div>

                      {/* Page number */}
                      <input type="number" min="1" value={annotateForm.pageNumber}
                        onChange={e => setAnnotateForm(f => ({ ...f, pageNumber: e.target.value }))}
                        placeholder="Số trang (tuỳ chọn)"
                        className="w-32 bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40 transition-all" />

                      {/* Comment */}
                      <textarea rows={3} value={annotateForm.comment}
                        onChange={e => setAnnotateForm(f => ({ ...f, comment: e.target.value }))}
                        placeholder="Nội dung ghi chú..."
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40 resize-none transition-all" />

                      {annotateErr && <p className="text-xs text-red-400">{annotateErr}</p>}

                      <div className="flex gap-2">
                        <button onClick={() => setShowAnnotate(null)}
                          className="px-3 py-2 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">Huỷ</button>
                        <button onClick={() => handleAnnotate(m.id)} disabled={annotateMutation.isPending}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-amber-600/25 disabled:opacity-60 transition-all flex items-center gap-1.5">
                          {annotateMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang lưu...</> : <><Check className="w-3.5 h-3.5" />Lưu ghi chú</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Existing annotations */}
                  {isExpanded && m.annotations && m.annotations.length > 0 && (
                    <div className="px-6 pb-4 border-t border-white/5 pt-4">
                      <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-700 mb-3">Ghi chú hiện tại ({m.annotations.length})</p>
                      <div className="space-y-2">
                        {m.annotations.map((a: any, i: number) => {
                          const tag = ANNOTATION_TAGS.find(t => t.value === a.tag);
                          return (
                            <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/3 border border-white/5">
                              {tag && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex-shrink-0 ${tag.color}`}>{tag.label}</span>}
                              <p className="text-[12px] text-zinc-400 flex-1">{a.comment}</p>
                              {a.pageNumber && <span className="text-[10px] text-zinc-700 flex-shrink-0">tr.{a.pageNumber}</span>}
                            </div>
                          );
                        })}
                      </div>
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
