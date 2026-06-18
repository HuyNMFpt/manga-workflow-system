import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Check, Loader2, AlertCircle, ChevronDown, ChevronUp,
  Users, Tag, TrendingUp, MessageSquare, FileText, Calendar, User,
  ExternalLink, ImageIcon, Download
} from 'lucide-react';
import api from '@/lib/axios';

// ─── Types ────────────────────────────────────────────────────────
interface VoteForm {
  decision: 'approve' | 'reject' | 'revision' | '';
  justification: string;
  schedule: string;
}
const EMPTY_FORM: VoteForm = { decision: '', justification: '', schedule: 'weekly' };

const SCHEDULE_OPTIONS = [
  { value: 'weekly',   label: 'Hàng tuần'  },
  { value: 'biweekly', label: '2 tuần/lần' },
  { value: 'monthly',  label: 'Hàng tháng' },
];

// ─── Sub-components ───────────────────────────────────────────────
const InfoBlock = ({ label, value, icon: Icon, span = false }: {
  label: string; value?: string; icon?: any; span?: boolean;
}) => (
  <div className={`${span ? 'col-span-2' : ''} bg-white/3 border border-white/5 rounded-xl px-4 py-3`}>
    <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider mb-1 flex items-center gap-1">
      {Icon && <Icon className="w-3 h-3" />}{label}
    </p>
    <p className="text-[12px] text-zinc-300 leading-relaxed">{value || '—'}</p>
  </div>
);

// ─── Main component ───────────────────────────────────────────────
const VotingQueue = () => {
  const qc = useQueryClient();

  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<Record<string, 'series' | 'manuscript' | 'editor-notes' | 'vote'>>({});
  const [voteForm,    setVoteForm]    = useState<VoteForm>(EMPTY_FORM);
  const [submitError, setSubmitError] = useState('');
  const [submitted,   setSubmitted]   = useState<string[]>([]);

  // ── Fetch voting queue ─────────────────────────────────────────
  // Backend: GET /board/voting-queue
  // Returns: SubmissionDetailDTO[] (paginated or plain array)
  // SubmissionDetailDTO fields:
  //   submissionId, seriesTitle, mangakaName, seriesGenre, synopsis
  //   coverLetter, voteYes, hasVoted
  //   (NEW — từ Editor submit-to-board form):
  //     audienceSummary, marketingAngle, whyItWillSell, recommendedSchedule, editorNote
  //     editorName, submittedAt
  const { data: queueData, isLoading, isError, refetch } = useQuery({
    queryKey: ['board', 'voting-queue'],
    queryFn: async () => {
      const r = await api.get('/board/voting-queue');
      return r.data.data ?? [];
    },
    retry: 1,
  });

  const submissions: any[] = (() => {
    const raw: any[] = Array.isArray(queueData)
      ? queueData
      : (queueData?.content ?? queueData?.items ?? []);

    // Dedup theo seriesId — chỉ giữ submission mới nhất (submissionRound cao nhất)
    const latestBySeriesId = raw.reduce((acc: Record<string, any>, s: any) => {
      const key = s.seriesId;
      if (!key) return acc;
      const existing = acc[key];
      if (!existing || (s.submissionRound ?? 0) > (existing.submissionRound ?? 0)) {
        acc[key] = s;
      }
      return acc;
    }, {});
    return Object.values(latestBySeriesId);
  })();

  // ── Vote mutation ──────────────────────────────────────────────
  // Backend: POST /board/vote
  // Body: { submissionId, decision, justification, schedule }
  // VoteRequest.justification min 50 ký tự
  const voteMutation = useMutation({
    mutationFn: (data: any) => api.post('/board/vote', data).then(r => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['board', 'voting-queue'] });
      qc.invalidateQueries({ queryKey: ['board', 'stats'] });
      setSubmitted(prev => [...prev, vars.submissionId]);
      setExpandedId(null);
      setVoteForm(EMPTY_FORM);
      setSubmitError('');
    },
    onError: (e: any) => setSubmitError(e.response?.data?.message ?? 'Lỗi xảy ra'),
  });

  // ── Helpers ───────────────────────────────────────────────────
  const getTab = (id: string) => activeTab[id] ?? 'series';
  const setTab = (id: string, tab: 'series' | 'manuscript' | 'editor-notes' | 'vote') =>
    setActiveTab(prev => ({ ...prev, [id]: tab }));

  const handleToggle = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setVoteForm(EMPTY_FORM);
      setSubmitError('');
    } else {
      setExpandedId(id);
      setVoteForm(EMPTY_FORM);
      setSubmitError('');
      setTab(id, 'series');
    }
  };

  const handleVote = (submissionId: string) => {
    setSubmitError('');
    if (!voteForm.decision) { setSubmitError('Vui lòng chọn quyết định'); return; }
    if (voteForm.justification.length < 50) {
      setSubmitError(`Justification cần ít nhất 50 ký tự (hiện tại: ${voteForm.justification.length})`);
      return;
    }
    voteMutation.mutate({
      submissionId,
      decision:      voteForm.decision,
      justification: voteForm.justification,
      schedule:      voteForm.schedule,
    });
  };

  // ── Loading / Error ───────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-[#03100d] flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-teal-400 animate-spin" />
    </div>
  );
  if (isError) return (
    <div className="min-h-screen bg-[#03100d] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-zinc-400 text-sm">Không thể tải danh sách</p>
      <button onClick={() => refetch()}
        className="px-4 py-2 rounded-xl bg-teal-600/20 text-teal-300 text-sm border border-teal-500/20">
        Thử lại
      </button>
    </div>
  );

  return (
    <div className="min-h-full bg-[#03100d] text-white">

      {/* ── Header ── */}
      <div className="relative border-b border-teal-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-64 h-64 rounded-full bg-teal-600/8 blur-3xl" />
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-teal-500 mb-2">Board · Bình duyệt</p>
          <h1 className="text-2xl font-black font-['Syne']">Hàng chờ bình duyệt</h1>
          <p className="text-sm text-zinc-600 mt-1">
            {submissions.length > 0
              ? `${submissions.length} series đang chờ vote`
              : 'Không có series nào chờ duyệt'}
          </p>
        </div>
      </div>

      {/* ── List ── */}
      <div className="px-8 py-8 space-y-3">
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <BookOpen className="w-10 h-10 opacity-20" />
            <p className="text-sm">Không có series nào chờ duyệt</p>
            <p className="text-xs text-zinc-700 max-w-xs text-center leading-relaxed">
              Series sẽ xuất hiện ở đây sau khi Tantou Editor đánh giá bản thảo và nộp lên Board.
            </p>
          </div>
        ) : submissions.map((s: any) => {
          const id         = s.submissionId ?? s.id;
          const isExpanded = expandedId === id;
          const isDone     = submitted.includes(id) || s.hasVoted;
          const tab        = getTab(id);

          return (
            <div key={id} className={`rounded-2xl border overflow-hidden transition-all ${
              isDone     ? 'border-emerald-500/20 opacity-70' :
              isExpanded ? 'border-teal-500/30 bg-teal-500/[0.02]' :
                           'border-white/5 bg-white/[0.015]'
            }`}>

              {/* ── Row header ── */}
              <div
                className={`px-6 py-4 flex items-start gap-4 transition-colors ${
                  isDone ? 'cursor-default' : 'cursor-pointer hover:bg-white/[0.02]'
                }`}
                onClick={() => !isDone && handleToggle(id)}>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="text-[13px] font-bold text-white">{s.seriesTitle}</h3>
                    {isDone && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Đã vote
                      </span>
                    )}
                    {s.seriesGenre && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/15">
                        {s.seriesGenre}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    {s.mangakaName && <span>Mangaka: <span className="text-zinc-500">{s.mangakaName}</span></span>}
                    {s.editorName  && <span> · Editor: <span className="text-zinc-500">{s.editorName}</span></span>}
                    {s.submittedAt && <span> · {new Date(s.submittedAt).toLocaleDateString('vi-VN')}</span>}
                  </p>
                  {s.synopsis && (
                    <p className="text-[11px] text-zinc-700 mt-1 line-clamp-2">{s.synopsis}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-black text-teal-400 font-['Syne']">{s.voteYes ?? 0}/3</div>
                    <div className="text-[10px] text-zinc-700">phiếu approve</div>
                  </div>
                  {!isDone && (
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                      isExpanded
                        ? 'bg-teal-500/15 border-teal-500/25 text-teal-400'
                        : 'border-white/8 text-zinc-600'
                    }`}>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Expanded content ── */}
              {isExpanded && !isDone && (
                <div className="border-t border-teal-500/10">

                  {/* Tab nav */}
                  <div className="flex items-center gap-1 px-6 py-3 border-b border-white/4 bg-white/[0.01]">
                    {[
                      { id: 'series',       label: 'Series Info',     icon: BookOpen      },
                      { id: 'editor-notes', label: 'Đánh giá Editor', icon: FileText      },
                      { id: 'manuscript',   label: 'Bản thảo',        icon: ImageIcon     },
                      { id: 'vote',         label: 'Bỏ phiếu',        icon: Check         },
                    ].map(t => (
                      <button key={t.id}
                        onClick={() => setTab(id, t.id as any)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                          tab === t.id
                            ? 'bg-teal-500/15 text-teal-300 border border-teal-500/25'
                            : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
                        }`}>
                        <t.icon className="w-3 h-3" />{t.label}
                      </button>
                    ))}
                  </div>

                  {/* ════ TAB: Manuscript Preview ════ */}
                  {tab === 'manuscript' && (
                    <div className="px-6 py-5 space-y-4">
                      {/* fileUrl từ SubmissionDetailDTO — Mangaka upload lúc tạo series */}
                      {s.fileUrl ? (
                        <>
                          {/* Action bar */}
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                              Bản thảo sơ bộ · v{s.submissionRound ?? 1}
                            </p>
                            <div className="flex items-center gap-2">
                              <a
                                href={s.fileUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-zinc-400 text-[11px] font-medium hover:text-white hover:bg-white/8 transition-colors">
                                <Download className="w-3 h-3" />Tải xuống
                              </a>
                              <a
                                href={s.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/15 border border-teal-500/25 text-teal-300 text-[11px] font-medium hover:bg-teal-600/25 transition-colors">
                                <ExternalLink className="w-3 h-3" />Mở tab mới
                              </a>
                            </div>
                          </div>

                          {/* Preview area */}
                          {/\.(jpg|jpeg|png|gif|webp)$/i.test(s.fileUrl) ? (
                            // Image preview
                            <div className="rounded-xl overflow-hidden border border-white/8 bg-black/30">
                              <img
                                src={s.fileUrl}
                                alt={`Bản thảo — ${s.seriesTitle}`}
                                className="w-full max-h-[600px] object-contain"
                              />
                            </div>
                          ) : /\.pdf$/i.test(s.fileUrl) ? (
                            // PDF embed
                            <div className="rounded-xl overflow-hidden border border-white/8 bg-black/20">
                              <div className="flex items-center justify-between px-4 py-2.5 bg-white/3 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-teal-400" />
                                  <span className="text-[12px] font-semibold text-zinc-300">PDF Bản thảo</span>
                                </div>
                                <span className="text-[10px] text-zinc-600">
                                  Nếu không load được, dùng nút "Mở tab mới"
                                </span>
                              </div>
                              <iframe
                                src={s.fileUrl}
                                className="w-full h-[600px]"
                                title={`Bản thảo — ${s.seriesTitle}`}
                              />
                            </div>
                          ) : (
                            // Generic file — show link + info
                            <div className="rounded-xl border border-white/8 bg-white/3 p-6 flex flex-col items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                                <FileText className="w-7 h-7 text-teal-400" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-white mb-1">File bản thảo</p>
                                <p className="text-[11px] text-zinc-600 max-w-xs break-all">{s.fileUrl}</p>
                              </div>
                              <a
                                href={s.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600/20 border border-teal-500/25 text-teal-300 text-sm font-semibold hover:bg-teal-600/30 transition-all">
                                <ExternalLink className="w-3.5 h-3.5" />Mở file
                              </a>
                            </div>
                          )}

                          {/* Description từ manuscript */}
                          {s.description && (
                            <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3">
                              <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                                Mô tả bản thảo
                              </p>
                              <p className="text-[12px] text-zinc-400 leading-relaxed">{s.description}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        // No file uploaded
                        <div className="flex flex-col items-center justify-center py-14 gap-3 text-zinc-700">
                          <ImageIcon className="w-10 h-10 opacity-20" />
                          <p className="text-sm">Không có file bản thảo</p>
                          <p className="text-[11px] text-zinc-700 max-w-xs text-center leading-relaxed">
                            Mangaka chưa upload file hoặc backend chưa lưu
                            <code className="ml-1 text-zinc-600">fileUrl</code> vào
                            <code className="ml-1 text-zinc-600">SubmissionDetailDTO</code>
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => setTab(id, 'vote')}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600/20 to-emerald-600/20 border border-teal-500/25 text-teal-300 text-sm font-semibold hover:from-teal-600/30 hover:to-emerald-600/30 transition-all">
                        Tiến hành bỏ phiếu →
                      </button>
                    </div>
                  )}

                  {/* ════ TAB: Series Info ════ */}
                  {tab === 'series' && (
                    <div className="px-6 py-5 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <InfoBlock label="Tác giả"  value={s.mangakaName} icon={User} />
                        <InfoBlock label="Thể loại"  value={s.seriesGenre} icon={Tag}  />
                        {s.synopsis    && <InfoBlock label="Tóm tắt nội dung" value={s.synopsis}    span icon={BookOpen} />}
                        {s.coverLetter && <InfoBlock label="Lời giới thiệu"   value={s.coverLetter} span icon={MessageSquare} />}
                      </div>

                      {/* Vote progress */}
                      <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3">
                        <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Trạng thái vote</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min(((s.voteYes ?? 0) / 3) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-bold text-teal-400">{s.voteYes ?? 0}/3</span>
                        </div>
                        <p className="text-[10px] text-zinc-700 mt-1">
                          Cần 3 phiếu approve để được xuất bản
                        </p>
                      </div>

                      <button
                        onClick={() => setTab(id, 'editor-notes')}
                        className="w-full py-2.5 rounded-xl bg-teal-600/10 border border-teal-500/20 text-teal-300 text-sm font-medium hover:bg-teal-600/15 transition-all">
                        Xem đánh giá của Editor →
                      </button>
                    </div>
                  )}

                  {/* ════ TAB: Editor Notes ════ */}
                  {tab === 'editor-notes' && (
                    <div className="px-6 py-5 space-y-4">

                      {(s.audienceSummary || s.marketingAngle || s.whyItWillSell || s.editorNote) ? (
                        <div className="grid grid-cols-2 gap-3">
                          {s.editorName && (
                            <InfoBlock label="Tantou Editor" value={s.editorName} icon={User} />
                          )}
                          {s.submittedAt && (
                            <InfoBlock label="Ngày nộp" value={new Date(s.submittedAt).toLocaleDateString('vi-VN')} icon={Calendar} />
                          )}
                          {s.audienceSummary && (
                            <InfoBlock label="Đối tượng độc giả" value={s.audienceSummary} span icon={Users} />
                          )}
                          {s.marketingAngle && (
                            <InfoBlock label="Điểm độc đáo / USP" value={s.marketingAngle} span icon={Tag} />
                          )}
                          {s.whyItWillSell && (
                            <InfoBlock label="Vì sao sẽ thành công" value={s.whyItWillSell} span icon={TrendingUp} />
                          )}
                          {s.recommendedSchedule && (
                            <InfoBlock label="Lịch xuất bản đề xuất" value={
                              s.recommendedSchedule === 'weekly'   ? 'Hàng tuần'  :
                              s.recommendedSchedule === 'biweekly' ? '2 tuần/lần' : 'Hàng tháng'
                            } icon={Calendar} />
                          )}
                          {s.editorNote && (
                            <InfoBlock label="Ghi chú thêm từ Editor" value={s.editorNote} span icon={MessageSquare} />
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 text-zinc-700">
                          <FileText className="w-8 h-8 opacity-20" />
                          <p className="text-sm">Chưa có đánh giá từ Editor</p>
                          <p className="text-[11px] text-zinc-600 text-center max-w-xs leading-relaxed">
                            Editor chưa điền thông tin đánh giá khi nộp lên Board
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => setTab(id, 'manuscript')}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600/20 to-emerald-600/20 border border-teal-500/25 text-teal-300 text-sm font-semibold hover:from-teal-600/30 hover:to-emerald-600/30 transition-all">
                        Xem bản thảo →
                      </button>
                    </div>
                  )}

                  {/* ════ TAB: Vote ════ */}
                  {tab === 'vote' && (
                    <div className="px-6 pb-6 pt-5 space-y-4">

                      {/* Decision buttons */}
                      <div>
                        <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-2">
                          Quyết định *
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { v: 'approve',  l: 'Approve', c: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' },
                            { v: 'reject',   l: 'Reject',  c: 'bg-red-500/15 border-red-500/30 text-red-300'             },
                            { v: 'revision', l: 'Cần sửa', c: 'bg-amber-500/15 border-amber-500/30 text-amber-300'       },
                          ].map(d => (
                            <button key={d.v}
                              onClick={() => setVoteForm(f => ({ ...f, decision: d.v as any }))}
                              className={`py-2.5 rounded-xl border text-[12px] font-bold transition-all ${
                                voteForm.decision === d.v
                                  ? d.c
                                  : 'bg-white/3 border-white/6 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                              }`}>
                              {d.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Schedule — bắt buộc khi approve */}
                      {voteForm.decision === 'approve' && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold tracking-[0.12em] uppercase text-emerald-400">
                              Lịch xuất bản *
                            </label>
                            <span className="text-[10px] text-zinc-600">Quyết định tần suất ra chapter</span>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'weekly',   label: 'Hàng tuần',   desc: '~4 chapter/tháng' },
                              { value: 'biweekly', label: '2 tuần/lần',  desc: '~2 chapter/tháng' },
                              { value: 'monthly',  label: 'Hàng tháng',  desc: '1 chapter/tháng'  },
                            ].map(o => (
                              <button key={o.value}
                                onClick={() => setVoteForm(f => ({ ...f, schedule: o.value }))}
                                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-center transition-all ${
                                  voteForm.schedule === o.value
                                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                                    : 'bg-white/3 border-white/8 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                }`}>
                                <span className="text-[13px] font-bold">{o.label}</span>
                                <span className={`text-[10px] ${voteForm.schedule === o.value ? 'text-emerald-500/70' : 'text-zinc-700'}`}>
                                  {o.desc}
                                </span>
                              </button>
                            ))}
                          </div>

                          {s.recommendedSchedule && (
                            <p className="text-[10px] text-zinc-600 flex items-center gap-1">
                              <span className="text-zinc-700">Editor đề xuất:</span>
                              <span
                                className="text-teal-400 font-semibold cursor-pointer hover:text-teal-300 underline underline-offset-2"
                                onClick={() => setVoteForm(f => ({ ...f, schedule: s.recommendedSchedule }))}>
                                {s.recommendedSchedule === 'weekly'   ? 'Hàng tuần'  :
                                 s.recommendedSchedule === 'biweekly' ? '2 tuần/lần' : 'Hàng tháng'}
                              </span>
                              <span className="text-zinc-700">— click để chọn</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Justification */}
                      <div>
                        <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">
                          Lý do / Đánh giá *{' '}
                          <span className="text-zinc-700 normal-case tracking-normal font-normal">
                            ({voteForm.justification.length}/50 ký tự tối thiểu)
                          </span>
                        </label>
                        <textarea
                          rows={5}
                          value={voteForm.justification}
                          onChange={e => setVoteForm(f => ({ ...f, justification: e.target.value }))}
                          placeholder={
                            voteForm.decision === 'approve'
                              ? 'Nêu lý do tại sao series này xứng đáng được xuất bản...'
                              : voteForm.decision === 'reject'
                              ? 'Giải thích lý do từ chối để Mangaka và Editor hiểu...'
                              : 'Mô tả cụ thể những gì cần chỉnh sửa trước khi được chấp thuận...'
                          }
                          className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500/40 resize-none transition-all"
                        />
                        {/* Progress bar */}
                        <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              voteForm.justification.length >= 50 ? 'bg-emerald-500' :
                              voteForm.justification.length >= 25 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min((voteForm.justification.length / 50) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {submitError && (
                        <p className="text-xs text-red-400 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{submitError}
                        </p>
                      )}

                      <div className="flex justify-between items-center pt-1">
                        <button
                          onClick={() => { setExpandedId(null); setVoteForm(EMPTY_FORM); setSubmitError(''); }}
                          className="px-4 py-2 rounded-xl border border-white/8 text-zinc-500 text-sm hover:bg-white/5 hover:text-white transition-colors">
                          Huỷ
                        </button>
                        <button
                          onClick={() => handleVote(id)}
                          disabled={voteMutation.isPending}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-teal-600/20 hover:shadow-teal-600/35 disabled:opacity-60 transition-all flex items-center gap-2">
                          {voteMutation.isPending
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang gửi...</>
                            : <><Check className="w-3.5 h-3.5" />Xác nhận vote</>}
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
    </div>
  );
};

export default VotingQueue;
