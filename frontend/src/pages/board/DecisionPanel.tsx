import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Ban, Calendar, Target, Loader2, AlertCircle, Check,
  ThumbsUp, ThumbsDown, MinusCircle, Users, Plus, X, Clock
} from 'lucide-react';
import api from '@/lib/axios';

type ActionType = 'cancel' | 'change_schedule' | 'hiatus' | 'reinstate';
const QUORUM = 3; // số phiếu cần để chốt đề xuất (theo backend)

const DECISION_OPTIONS: { value:ActionType; label:string; desc:string; icon:any; color:string }[] = [
  { value:'cancel',          label:'Huỷ series',          desc:'Dừng hoàn toàn, không thể đảo ngược',    icon:Ban,      color:'bg-red-500/15 border-red-500/25 text-red-300'         },
  { value:'change_schedule', label:'Đổi lịch xuất bản',  desc:'Chuyển sang monthly hoặc giảm tần suất', icon:Calendar, color:'bg-amber-500/15 border-amber-500/25 text-amber-300'   },
  { value:'hiatus',          label:'Tạm ngưng (hiatus)',  desc:'Dừng tạm thời, có thể phục hồi',         icon:Target,   color:'bg-violet-500/15 border-violet-500/25 text-violet-300'},
  { value:'reinstate',       label:'Phục hồi series',     desc:'Khôi phục series đã ngưng',              icon:Check,    color:'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'},
];

// Chỉ hiện action HỢP LÝ với trạng thái hiện tại của series — tránh đề xuất vô nghĩa
// (VD: "Phục hồi" cho series đang publishing bình thường, chưa từng bị tạm ngưng)
const getValidActionsForStatus = (seriesStatus?: string) => {
  switch (seriesStatus) {
    case 'on_hiatus':
      return DECISION_OPTIONS.filter(o => o.value === 'reinstate' || o.value === 'cancel');
    case 'publishing':
      return DECISION_OPTIONS.filter(o => o.value !== 'reinstate');
    default:
      // Không rõ trạng thái (dữ liệu cũ backend chưa trả seriesStatus) → hiện hết,
      // để backend validate lại lần cuối khi submit
      return DECISION_OPTIONS;
  }
};

/* ── Vote bar — hiển thị tỉ lệ yes/no/abstain ──────────────────── */
const VoteBar = ({ yes, no, abstain }: { yes:number; no:number; abstain:number }) => {
  const total = Math.max(yes + no + abstain, 1);
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
        {yes     > 0 && <div className="bg-emerald-500" style={{ width:`${(yes/total)*100}%` }}/>}
        {no      > 0 && <div className="bg-red-500"     style={{ width:`${(no/total)*100}%` }}/>}
        {abstain > 0 && <div className="bg-zinc-500"    style={{ width:`${(abstain/total)*100}%` }}/>}
      </div>
      <div className="flex items-center gap-3 text-[10px]">
        <span className="flex items-center gap-1 text-emerald-400"><ThumbsUp className="w-2.5 h-2.5"/>{yes}</span>
        <span className="flex items-center gap-1 text-red-400"><ThumbsDown className="w-2.5 h-2.5"/>{no}</span>
        <span className="flex items-center gap-1 text-zinc-500"><MinusCircle className="w-2.5 h-2.5"/>{abstain}</span>
        <span className="text-zinc-700 ml-auto">{yes+no+abstain}/{QUORUM} phiếu</span>
      </div>
    </div>
  );
};

/* ── Countdown đến deadline vote ─────────────────────────────── */
const daysUntil = (deadline?: string) => {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
};

const DecisionPanel = () => {
  const qc = useQueryClient();

  /* ── state: tạo đề xuất mới ── */
  const [proposeFor,   setProposeFor]   = useState<string|null>(null); // seriesId đang propose
  const [newProposal,  setNewProposal]  = useState<{actionType:ActionType|null; reason:string; newSchedule:string}>({ actionType:null, reason:'', newSchedule:'monthly' });
  const [proposeError, setProposeError] = useState('');

  /* ── state: vote trên 1 proposal ── */
  const [votingOn,    setVotingOn]    = useState<string|null>(null);
  const [viewingVotesFor, setViewingVotesFor] = useState<string|null>(null);

  // GET /board/proposals/{id}/votes — chi tiết ai vote gì, ai chưa vote
  const { data: voteDetails } = useQuery({
    queryKey: ['board', 'proposal-votes', viewingVotesFor],
    queryFn: async () => (await api.get(`/board/proposals/${viewingVotesFor}/votes`)).data.data,
    enabled: !!viewingVotesFor,
  });
  const [voteChoice,  setVoteChoice]  = useState<'yes'|'no'|null>(null);
  const [voteComment, setVoteComment] = useState('');
  const [voteError,   setVoteError]   = useState('');

  /* ── data: series at-risk (cần được đề xuất quyết định) ── */
  const { data:atRiskData, isLoading:loadingAtRisk } = useQuery({
    queryKey: ['board','at-risk'],
    queryFn: async () => { const r = await api.get('/board/at-risk'); return r.data.data; },
  });
  const atRiskSeries: any[] = Array.isArray(atRiskData) ? atRiskData : (atRiskData?.series ?? []);

  // GET /board/hiatus-series — series on_hiatus cần đề xuất tiếp (Phục hồi/Huỷ)
  // Series on_hiatus không nằm trong /board/at-risk (chỉ gồm publishing/approved),
  // nên cần nguồn riêng để vẫn có chỗ tạo đề xuất tiếp cho chúng.
  const { data: hiatusData } = useQuery({
    queryKey: ['board','hiatus-series'],
    queryFn: async () => { const r = await api.get('/board/hiatus-series'); return r.data.data; },
  });
  const hiatusSeries: any[] = Array.isArray(hiatusData) ? hiatusData : [];

  /* ── data: đề xuất đang chờ bỏ phiếu ── */
  const { data:proposalsData, isLoading:loadingProposals, isError, refetch } = useQuery({
    queryKey: ['board','proposals'],
    queryFn: async () => { const r = await api.get('/board/proposals'); return r.data.data; },
  });
  const proposals: any[] = Array.isArray(proposalsData) ? proposalsData : (proposalsData?.proposals ?? []);

  // Series đã có đề xuất đang voting → ẩn khỏi danh sách "cần đề xuất"
  const proposedSeriesIds = new Set(proposals.filter((p:any)=>p.status==='voting').map((p:any)=>p.seriesId));
  const needsProposal = atRiskSeries.filter((s:any) => !proposedSeriesIds.has(s.seriesId));
  const hiatusNeedsProposal = hiatusSeries.filter((s:any) => !proposedSeriesIds.has(s.seriesId));

  /* ── mutations ── */
  const createProposalMutation = useMutation({
    mutationFn: (data:any) => api.post('/board/proposals', data).then(r=>r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['board','proposals'] });
      qc.invalidateQueries({ queryKey:['board','at-risk'] });
      qc.invalidateQueries({ queryKey:['board','hiatus-series'] });
      setProposeFor(null);
      setNewProposal({ actionType:null, reason:'', newSchedule:'monthly' });
    },
    onError: (e:any) => setProposeError(e.response?.data?.message ?? 'Lỗi xảy ra'),
  });

  const voteMutation = useMutation({
    mutationFn: (data:any) => api.post('/board/proposals/vote', data).then(r=>r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['board','proposals'] });
      qc.invalidateQueries({ queryKey:['board','at-risk'] });
      qc.invalidateQueries({ queryKey:['board','rankings'] });
      qc.invalidateQueries({ queryKey:['board','hiatus-series'] });
      setVotingOn(null); setVoteChoice(null); setVoteComment('');
    },
    onError: (e:any) => setVoteError(e.response?.data?.message ?? 'Lỗi xảy ra'),
  });

  const handleCreateProposal = (seriesId:string) => {
    if (!newProposal.actionType) { setProposeError('Chọn loại quyết định'); return; }
    if (!newProposal.reason || newProposal.reason.length < 20) { setProposeError('Lý do cần ít nhất 20 ký tự'); return; }
    setProposeError('');
    createProposalMutation.mutate({
      seriesId,
      actionType: newProposal.actionType,
      newSchedule: newProposal.actionType === 'change_schedule' ? newProposal.newSchedule : null,
      reason: newProposal.reason,
    });
  };

  const handleVote = (proposalId:string) => {
    if (!voteChoice) { setVoteError('Chọn lựa chọn bỏ phiếu'); return; }
    setVoteError('');
    voteMutation.mutate({ proposalId, decision: voteChoice, comment: voteComment || null });
  };

  if (loadingAtRisk || loadingProposals) return (
    <div className="min-h-screen bg-[#03100d] flex items-center justify-center"><Loader2 className="w-7 h-7 text-teal-400 animate-spin"/></div>
  );
  if (isError) return (
    <div className="min-h-screen bg-[#03100d] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="w-10 h-10 text-red-400"/>
      <button onClick={()=>refetch()} className="px-4 py-2 rounded-xl bg-teal-600/20 text-teal-300 text-sm border border-teal-500/20">Thử lại</button>
    </div>
  );

  const votingProposals  = proposals.filter((p:any) => p.status === 'voting');
  const decidedProposals = proposals.filter((p:any) => p.status !== 'voting').slice(0, 5);

  return (
    <div className="min-h-full bg-[#03100d] text-white">
      <div className="relative border-b border-teal-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 left-0 w-64 h-64 rounded-full bg-red-600/6 blur-3xl"/>
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-red-500 mb-2">Board · Quyết định</p>
          <h1 className="text-2xl font-black font-['Syne']">Quyết định chiến lược</h1>
          <p className="text-sm text-zinc-600 mt-1">Quyết định chốt khi hết hạn 7 ngày bỏ phiếu — cần yes &gt; no, ai chưa vote sẽ tự động tính Trung lập</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-8">

        {/* ── Đang bỏ phiếu ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400"/>
            <h2 className="text-sm font-bold text-white">Đề xuất đang bỏ phiếu</h2>
            {votingProposals.length > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{votingProposals.length}</span>}
          </div>

          {votingProposals.length === 0 ? (
            <p className="text-xs text-zinc-700 py-4">Chưa có đề xuất nào đang chờ bỏ phiếu</p>
          ) : votingProposals.map((p:any) => {
            const opt = DECISION_OPTIONS.find(o => o.value === p.actionType);
            const isVotingOpen = votingOn === p.id;
            return (
              <div key={p.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/4 overflow-hidden">
                <div className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {opt && <opt.icon className="w-3.5 h-3.5 text-amber-400"/>}
                        <h3 className="text-[13px] font-bold text-white">{p.seriesTitle}</h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{opt?.label ?? p.actionType}</span>
                      </div>
                      <p className="text-[11px] text-zinc-600">Đề xuất bởi {p.proposedByName ?? 'Board member'} · {p.reason}</p>
                    </div>
                    {p.votingDeadline && (() => {
                      const d = daysUntil(p.votingDeadline);
                      return (
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0 ${
                          d != null && d <= 1 ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-white/5 text-zinc-500 border border-white/8'
                        }`}>
                          {d != null && d > 0 ? `Còn ${d} ngày` : 'Sắp hết hạn'}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="mt-3 max-w-xs">
                    <VoteBar yes={p.voteYes ?? 0} no={p.voteNo ?? 0} abstain={p.voteAbstain ?? 0}/>
                  </div>
                  <p className="text-[10px] text-zinc-700 mt-1.5 italic">
                    Thành viên chưa bỏ phiếu khi hết hạn sẽ tự động tính là Trung lập
                  </p>

                  <button onClick={() => setViewingVotesFor(viewingVotesFor === p.id ? null : p.id)}
                    className="mt-2 text-[11px] text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                    <Users className="w-3 h-3" />
                    {viewingVotesFor === p.id ? 'Ẩn chi tiết phiếu' : 'Xem chi tiết phiếu'}
                  </button>

                  {/* Panel chi tiết — ai vote gì, ai chưa vote */}
                  {viewingVotesFor === p.id && (
                    <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 space-y-2">
                      {!voteDetails ? (
                        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 text-zinc-600 animate-spin"/></div>
                      ) : (
                        <>
                          {voteDetails.voted?.length > 0 ? voteDetails.voted.map((v: any) => (
                            <div key={v.voterId} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                              {v.vote === 'yes'
                                ? <ThumbsUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5"/>
                                : v.vote === 'no'
                                ? <ThumbsDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5"/>
                                : <MinusCircle className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-0.5"/>}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[12px] font-semibold text-white">{v.voterName}</span>
                                  {v.isAutoAbstain && (
                                    <span className="text-[9px] text-zinc-600 italic">(tự động — không vote trước hạn)</span>
                                  )}
                                </div>
                                {v.comment && !v.isAutoAbstain && (
                                  <p className="text-[11px] text-zinc-500 mt-0.5">{v.comment}</p>
                                )}
                              </div>
                            </div>
                          )) : (
                            <p className="text-[11px] text-zinc-700 py-1">Chưa có ai bỏ phiếu</p>
                          )}

                          {voteDetails.pending?.length > 0 && (
                            <div className="pt-1.5 border-t border-white/5">
                              <p className="text-[10px] text-zinc-600 mb-1">Chưa bỏ phiếu:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {voteDetails.pending.map((u: any) => (
                                  <span key={u.voterId} className="text-[11px] text-zinc-500 bg-white/4 border border-white/6 px-2 py-0.5 rounded-md">
                                    {u.voterName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {!isVotingOpen ? (
                    <button onClick={() => { setVotingOn(p.id); setVoteChoice(null); setVoteComment(''); setVoteError(''); }}
                      className="mt-3 px-4 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-300 text-[11px] font-semibold hover:bg-amber-500/25 transition-colors">
                      Bỏ phiếu
                    </button>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-amber-500/10 space-y-3">
                      <div className="flex gap-2">
                        {[
                          { v:'yes' as const,     l:'Đồng ý',     icon:ThumbsUp,     color:'bg-emerald-500/15 border-emerald-500/25 text-emerald-300' },
                          { v:'no' as const,      l:'Không',      icon:ThumbsDown,   color:'bg-red-500/15 border-red-500/25 text-red-300'             },
                        ].map(o => (
                          <button key={o.v} onClick={() => setVoteChoice(o.v)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[11px] font-semibold transition-all ${voteChoice===o.v ? o.color : 'bg-white/3 border-white/6 text-zinc-500 hover:text-zinc-300'}`}>
                            <o.icon className="w-3.5 h-3.5"/>{o.l}
                          </button>
                        ))}
                      </div>
                      <textarea rows={2} value={voteComment} onChange={e=>setVoteComment(e.target.value)}
                        placeholder="Ghi chú thêm (tuỳ chọn)..."
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40 resize-none transition-all"/>
                      {voteError && <p className="text-xs text-red-400">{voteError}</p>}
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setVotingOn(null)} className="px-3 py-1.5 rounded-lg border border-white/8 text-zinc-400 text-[11px] hover:bg-white/5 transition-colors">Huỷ</button>
                        <button onClick={() => handleVote(p.id)} disabled={voteMutation.isPending}
                          className="px-4 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-all">
                          {voteMutation.isPending ? <><Loader2 className="w-3 h-3 animate-spin"/>Đang gửi...</> : 'Xác nhận phiếu bầu'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* ── Series at-risk chưa được đề xuất ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400"/>
            <h2 className="text-sm font-bold text-white">Series cần đề xuất quyết định</h2>
            {needsProposal.length > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">{needsProposal.length}</span>}
          </div>

          {needsProposal.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-700">
              <Check className="w-10 h-10 opacity-20"/>
              <p className="text-sm">Không có series nào cần quyết định</p>
            </div>
          ) : needsProposal.map((s:any) => {
            const isOpen = proposeFor === s.seriesId;
            const isHiatus = s.seriesStatus === 'on_hiatus';
            return (
              <div key={s.seriesId} className={`rounded-2xl border overflow-hidden transition-all ${isOpen ? (isHiatus ? 'border-violet-500/30' : 'border-red-500/30') : 'border-white/5 bg-white/[0.015]'}`}>
                <div className="px-6 py-4 flex items-start gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => { setProposeFor(isOpen ? null : s.seriesId); setNewProposal({ actionType:null, reason:'', newSchedule:'monthly' }); setProposeError(''); }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${isHiatus ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {isHiatus ? 'Tạm ngưng' : 'Cần đề xuất'}
                      </span>
                      <h3 className="text-[13px] font-bold text-white">{s.seriesTitle}</h3>
                    </div>
                    {isHiatus ? (
                      <p className="text-[11px] text-zinc-600">Series đang tạm ngưng — cần đề xuất Phục hồi hoặc Huỷ hẳn</p>
                    ) : (
                      <>
                        <p className="text-[11px] text-zinc-600">
                          Hạng #{s.currentRank ?? 0} · {(s.currentVotes ?? 0).toLocaleString()} votes
                          · <span className="text-red-400">{s.consecutiveLowPeriods ?? 0}/3 kỳ thấp</span>
                        </p>
                        {/* Nối dữ liệu vận hành — series rank thấp có thể do trễ hạn, không chỉ nội dung */}
                        {s.publishTotalCount > 0 ? (
                          <p className="text-[11px] mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-600" />
                            <span className={
                              s.publishOnTimeRate >= 80 ? 'text-emerald-400'
                              : s.publishOnTimeRate >= 50 ? 'text-amber-400' : 'text-red-400'
                            }>
                              {s.publishOnTimeRate}% đúng hạn
                            </span>
                            {s.publishAvgDaysLate > 0 && (
                              <span className="text-zinc-600">· trễ TB {s.publishAvgDaysLate} ngày</span>
                            )}
                            <span className="text-zinc-700">({s.publishTotalCount} chapter)</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-700 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />Chưa xuất bản chapter nào
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {!isOpen && (
                    <button onClick={(e) => { e.stopPropagation(); setProposeFor(s.seriesId); }}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${isHiatus ? 'bg-violet-500/10 border-violet-500/25 text-violet-300 hover:bg-violet-500/20' : 'bg-red-500/10 border-red-500/25 text-red-300 hover:bg-red-500/20'}`}>
                      <Plus className="w-3 h-3"/>Đề xuất
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div className={`px-6 pb-5 border-t pt-4 space-y-4 ${isHiatus ? 'border-violet-500/10 bg-violet-500/3' : 'border-red-500/10 bg-red-500/3'}`}>
                    <p className="text-[11px] text-zinc-600">Đề xuất của bạn sẽ được gửi cho toàn Board bỏ phiếu trong 7 ngày — cần yes &gt; no để thông qua, ai chưa vote khi hết hạn sẽ tự động tính Trung lập.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {getValidActionsForStatus(s.seriesStatus).map(opt => (
                        <button key={opt.value}
                          onClick={() => setNewProposal(prev => ({ ...prev, actionType: opt.value }))}
                          className={`flex flex-col gap-1.5 p-4 rounded-xl border text-left transition-all ${newProposal.actionType===opt.value ? opt.color : 'bg-white/3 border-white/6 hover:bg-white/5'}`}>
                          <opt.icon className={`w-4 h-4 ${newProposal.actionType===opt.value ? '':'text-zinc-600'}`}/>
                          <div className={`text-[12px] font-bold ${newProposal.actionType===opt.value ? '':'text-zinc-500'}`}>{opt.label}</div>
                          <div className={`text-[10px] ${newProposal.actionType===opt.value ? 'opacity-80':'text-zinc-700'}`}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>

                    {newProposal.actionType === 'change_schedule' && (
                      <div>
                        <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-2">Lịch mới</label>
                        <div className="flex gap-2">
                          {[{v:'weekly',l:'Hàng tuần'},{v:'biweekly',l:'2 tuần/lần'},{v:'monthly',l:'Hàng tháng'}].map(o => (
                            <button key={o.v} onClick={() => setNewProposal(prev => ({ ...prev, newSchedule: o.v }))}
                              className={`flex-1 py-2 rounded-xl border text-[11px] font-semibold transition-all ${newProposal.newSchedule===o.v?'bg-amber-500/15 border-amber-500/25 text-amber-300':'bg-white/3 border-white/6 text-zinc-500 hover:text-zinc-300'}`}>
                              {o.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {newProposal.actionType === 'cancel' && (
                      <div className="flex items-start gap-2 p-3 bg-red-500/8 border border-red-500/15 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"/>
                        <p className="text-[11px] text-red-300">Nếu được thông qua, huỷ series là <strong>không thể đảo ngược</strong>.</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">
                        Lý do đề xuất * <span className="text-zinc-700 normal-case tracking-normal font-normal">({newProposal.reason.length}/20 ký tự tối thiểu)</span>
                      </label>
                      <textarea rows={3} value={newProposal.reason}
                        onChange={e => setNewProposal(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Nhập lý do đề xuất..."
                        className={`w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none resize-none transition-all ${isHiatus ? 'focus:border-violet-500/40' : 'focus:border-red-500/40'}`}/>
                    </div>

                    {proposeError && <p className="text-xs text-red-400">{proposeError}</p>}

                    <div className="flex justify-end gap-2">
                      <button onClick={() => setProposeFor(null)} className="px-4 py-2 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">Huỷ</button>
                      <button onClick={() => handleCreateProposal(s.seriesId)} disabled={createProposalMutation.isPending}
                        className={`px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-all flex items-center gap-2 ${newProposal.actionType==='cancel' ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-teal-600 to-emerald-600'}`}>
                        {createProposalMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang gửi...</> : 'Gửi đề xuất cho Board'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* ── Series đang tạm ngưng — cần đề xuất tiếp (Phục hồi/Huỷ) ── */}
        {hiatusNeedsProposal.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400"/>
              <h2 className="text-sm font-bold text-white">Series đang tạm ngưng</h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{hiatusNeedsProposal.length}</span>
            </div>

            {hiatusNeedsProposal.map((s:any) => {
              const isOpen = proposeFor === s.seriesId;
              return (
                <div key={s.seriesId} className={`rounded-2xl border overflow-hidden transition-all ${isOpen ? 'border-violet-500/30' : 'border-white/5 bg-white/[0.015]'}`}>
                  <div className="px-6 py-4 flex items-start gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => { setProposeFor(isOpen ? null : s.seriesId); setNewProposal({ actionType:null, reason:'', newSchedule:'monthly' }); setProposeError(''); }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">Tạm ngưng</span>
                        <h3 className="text-[13px] font-bold text-white">{s.seriesTitle}</h3>
                      </div>
                      <p className="text-[11px] text-zinc-600">Series đang tạm ngưng — cần đề xuất Phục hồi hoặc Huỷ hẳn</p>
                    </div>
                    {!isOpen && (
                      <button onClick={(e) => { e.stopPropagation(); setProposeFor(s.seriesId); }}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/25 text-violet-300 text-[11px] font-semibold hover:bg-violet-500/20 transition-colors">
                        <Plus className="w-3 h-3"/>Đề xuất
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <div className="px-6 pb-5 border-t border-violet-500/10 pt-4 space-y-4 bg-violet-500/3">
                      <p className="text-[11px] text-zinc-600">Đề xuất của bạn sẽ được gửi cho toàn Board bỏ phiếu trong 7 ngày — cần yes &gt; no để thông qua, ai chưa vote khi hết hạn sẽ tự động tính Trung lập.</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {getValidActionsForStatus(s.seriesStatus).map(opt => (
                          <button key={opt.value}
                            onClick={() => setNewProposal(prev => ({ ...prev, actionType: opt.value }))}
                            className={`flex flex-col gap-1.5 p-4 rounded-xl border text-left transition-all ${newProposal.actionType===opt.value ? opt.color : 'bg-white/3 border-white/6 hover:bg-white/5'}`}>
                            <opt.icon className={`w-4 h-4 ${newProposal.actionType===opt.value ? '':'text-zinc-600'}`}/>
                            <div className={`text-[12px] font-bold ${newProposal.actionType===opt.value ? '':'text-zinc-500'}`}>{opt.label}</div>
                            <div className={`text-[10px] ${newProposal.actionType===opt.value ? 'opacity-80':'text-zinc-700'}`}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>

                      {newProposal.actionType === 'cancel' && (
                        <div className="flex items-start gap-2 p-3 bg-red-500/8 border border-red-500/15 rounded-xl">
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"/>
                          <p className="text-[11px] text-red-300">Nếu được thông qua, huỷ series là <strong>không thể đảo ngược</strong>.</p>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">
                          Lý do đề xuất * <span className="text-zinc-700 normal-case tracking-normal font-normal">({newProposal.reason.length}/20 ký tự tối thiểu)</span>
                        </label>
                        <textarea rows={3} value={newProposal.reason}
                          onChange={e => setNewProposal(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="Nhập lý do đề xuất..."
                          className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 resize-none transition-all"/>
                      </div>

                      {proposeError && <p className="text-xs text-red-400">{proposeError}</p>}

                      <div className="flex justify-end gap-2">
                        <button onClick={() => setProposeFor(null)} className="px-4 py-2 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">Huỷ</button>
                        <button onClick={() => handleCreateProposal(s.seriesId)} disabled={createProposalMutation.isPending}
                          className={`px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-all flex items-center gap-2 ${newProposal.actionType==='cancel' ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-teal-600 to-emerald-600'}`}>
                          {createProposalMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang gửi...</> : 'Gửi đề xuất cho Board'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* ── Lịch sử quyết định gần đây ── */}
        {decidedProposals.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-zinc-500">Quyết định gần đây</h2>
            {decidedProposals.map((p:any) => {
              const opt = DECISION_OPTIONS.find(o => o.value === p.actionType);
              const approved = p.status === 'approved';
              const expired  = p.status === 'expired';
              return (
                <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3 rounded-xl border border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-3 min-w-0">
                    {approved ? <Check className="w-4 h-4 text-emerald-400 shrink-0"/>
                      : expired ? <AlertCircle className="w-4 h-4 text-amber-500 shrink-0"/>
                      : <X className="w-4 h-4 text-zinc-600 shrink-0"/>}
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-white truncate">{p.seriesTitle} — {opt?.label ?? p.actionType}</p>
                      <p className="text-[10px] text-zinc-600">{p.voteYes} yes / {p.voteNo} no / {p.voteAbstain} abstain</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    approved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : expired ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                  }`}>
                    {approved ? 'Thông qua' : expired ? 'Hết hạn (thiếu quorum)' : 'Bị bác'}
                  </span>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};
export default DecisionPanel;
