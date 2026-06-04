import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Check, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/axios';

interface VoteForm {
  decision: 'approve' | 'reject' | 'revision' | '';
  justification: string;
  schedule: string;
}
const EMPTY_FORM: VoteForm = { decision:'', justification:'', schedule:'weekly' };

const SCHEDULE_OPTIONS = [
  { value:'weekly',   label:'Hàng tuần'  },
  { value:'biweekly', label:'2 tuần/lần' },
  { value:'monthly',  label:'Hàng tháng' },
];

const VotingQueue = () => {
  const qc = useQueryClient();
  // ✅ Chỉ 1 submission expand cùng lúc
  const [expandedId,  setExpandedId]  = useState<string|null>(null);
  const [voteForm,    setVoteForm]    = useState<VoteForm>(EMPTY_FORM);
  const [submitError, setSubmitError] = useState('');
  const [submitted,   setSubmitted]   = useState<string[]>([]);

  const { data: queueData, isLoading, isError, refetch } = useQuery({
    queryKey: ['board','voting-queue'],
    queryFn: async () => { const r = await api.get('/board/voting-queue'); return r.data.data; },
    retry: 1,
  });

  // ✅ SubmissionDetailDTO dùng submissionId (không phải id)
  const submissions: any[] = Array.isArray(queueData) ? queueData : (queueData?.content ?? queueData?.items ?? []);

  const voteMutation = useMutation({
    mutationFn: (data:any) => api.post('/board/vote', data).then(r=>r.data),
    onSuccess: (_,vars) => {
      qc.invalidateQueries({ queryKey:['board','voting-queue'] });
      qc.invalidateQueries({ queryKey:['board','stats'] });
      setSubmitted(prev=>[...prev, vars.submissionId]);
      setExpandedId(null);
      setVoteForm(EMPTY_FORM);
      setSubmitError('');
    },
    onError: (e:any) => setSubmitError(e.response?.data?.message ?? 'Lỗi xảy ra'),
  });

  const handleToggle = (id: string) => {
    if (expandedId === id) { setExpandedId(null); setVoteForm(EMPTY_FORM); setSubmitError(''); }
    else { setExpandedId(id); setVoteForm(EMPTY_FORM); setSubmitError(''); }
  };

  const handleVote = (submissionId: string) => {
    setSubmitError('');
    if (!voteForm.decision) { setSubmitError('Vui lòng chọn quyết định'); return; }
    // ✅ Backend VoteRequest yêu cầu min 50 ký tự (không phải 100)
    if (voteForm.justification.length < 50) {
      setSubmitError(`Justification cần ít nhất 50 ký tự (hiện tại: ${voteForm.justification.length})`);
      return;
    }
    voteMutation.mutate({ submissionId, decision:voteForm.decision, justification:voteForm.justification, schedule:voteForm.schedule });
  };

  if (isLoading) return <div className="min-h-screen bg-[#03100d] flex items-center justify-center"><Loader2 className="w-7 h-7 text-teal-400 animate-spin"/></div>;
  if (isError) return (
    <div className="min-h-screen bg-[#03100d] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="w-10 h-10 text-red-400"/>
      <p className="text-zinc-400 text-sm">Không thể tải danh sách</p>
      <button onClick={()=>refetch()} className="px-4 py-2 rounded-xl bg-teal-600/20 text-teal-300 text-sm border border-teal-500/20">Thử lại</button>
    </div>
  );

  return (
    <div className="min-h-full bg-[#03100d] text-white">
      <div className="relative border-b border-teal-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-64 h-64 rounded-full bg-teal-600/8 blur-3xl"/>
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-teal-500 mb-2">Board · Bình duyệt</p>
          <h1 className="text-2xl font-black font-['Syne']">Hàng chờ bình duyệt</h1>
          <p className="text-sm text-zinc-600 mt-1">
            {submissions.length > 0 ? `${submissions.length} series đang chờ vote` : 'Không có series nào chờ duyệt'}
          </p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-3">
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <BookOpen className="w-10 h-10 opacity-20"/>
            <p className="text-sm">Không có series nào chờ duyệt</p>
          </div>
        ) : submissions.map((s:any) => {
          // ✅ SubmissionDetailDTO dùng submissionId làm key
          const id        = s.submissionId ?? s.id;
          const isExpanded = expandedId === id;
          const isDone    = submitted.includes(id) || s.hasVoted;

          return (
            <div key={id} className={`rounded-2xl border overflow-hidden transition-all ${isDone ? 'border-emerald-500/20 opacity-70' : isExpanded ? 'border-teal-500/30 bg-teal-500/3' : 'border-white/5 bg-white/[0.015]'}`}>

              {/* Header */}
              <div className={`px-6 py-4 flex items-start gap-4 transition-colors ${isDone ? 'cursor-default' : 'cursor-pointer hover:bg-white/[0.02]'}`}
                onClick={() => !isDone && handleToggle(id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {/* ✅ seriesTitle (không phải title) */}
                    <h3 className="text-[13px] font-bold text-white">{s.seriesTitle}</h3>
                    {isDone && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Đã vote</span>}
                  </div>
                  {/* ✅ mangakaName, seriesGenre */}
                  <p className="text-[11px] text-zinc-600">{s.mangakaName}{s.seriesGenre ? ` · ${s.seriesGenre}` : ''}</p>
                  {s.synopsis && <p className="text-[11px] text-zinc-700 mt-1 line-clamp-2">{s.synopsis}</p>}
                  {s.coverLetter && <p className="text-[11px] text-zinc-700 mt-0.5 line-clamp-1 italic">"{s.coverLetter}"</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    {/* ✅ voteYes (không phải approveVotes), hardcode /3 vì không có totalVotesNeeded */}
                    <div className="text-lg font-black text-teal-400 font-['Syne']">{s.voteYes ?? 0}/3</div>
                    <div className="text-[10px] text-zinc-700">phiếu approve</div>
                  </div>
                  {!isDone && (
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${isExpanded ? 'bg-teal-500/15 border-teal-500/25 text-teal-400' : 'border-white/8 text-zinc-600'}`}>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
                    </div>
                  )}
                </div>
              </div>

              {/* Vote form — chỉ hiện khi isExpanded */}
              {isExpanded && !isDone && (
                <div className="px-6 pb-6 border-t border-teal-500/10 pt-5 space-y-4">
                  {/* Decision */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-2">Quyết định *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { v:'approve', l:'Approve',c:'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' },
                        { v:'reject',  l:'Reject', c:'bg-red-500/15 border-red-500/30 text-red-300'             },
                        { v:'revision',l:'Cần sửa',c:'bg-amber-500/15 border-amber-500/30 text-amber-300'       },
                      ].map(d=>(
                        <button key={d.v} onClick={()=>setVoteForm(f=>({...f,decision:d.v as any}))}
                          className={`py-2.5 rounded-xl border text-[12px] font-bold transition-all ${voteForm.decision===d.v ? d.c : 'bg-white/3 border-white/6 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
                          {d.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Schedule — chỉ khi approve */}
                  {voteForm.decision === 'approve' && (
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-2">Lịch xuất bản</label>
                      <div className="flex gap-2">
                        {SCHEDULE_OPTIONS.map(o=>(
                          <button key={o.value} onClick={()=>setVoteForm(f=>({...f,schedule:o.value}))}
                            className={`flex-1 py-2 rounded-xl border text-[11px] font-semibold transition-all ${voteForm.schedule===o.value ? 'bg-teal-500/15 border-teal-500/25 text-teal-300' : 'bg-white/3 border-white/6 text-zinc-500 hover:text-zinc-300'}`}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Justification — ✅ min 50 ký tự theo backend */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">
                      Lý do * <span className="text-zinc-700 normal-case tracking-normal font-normal">({voteForm.justification.length}/50 ký tự tối thiểu)</span>
                    </label>
                    <textarea rows={4} value={voteForm.justification}
                      onChange={e=>setVoteForm(f=>({...f,justification:e.target.value}))}
                      placeholder="Nhập lý do quyết định (ít nhất 50 ký tự)..."
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500/40 resize-none transition-all"/>
                    <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${voteForm.justification.length>=50?'bg-emerald-500':voteForm.justification.length>=25?'bg-amber-500':'bg-red-500'}`}
                        style={{width:`${Math.min((voteForm.justification.length/50)*100,100)}%`}}/>
                    </div>
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0"/>{submitError}
                    </p>
                  )}

                  <div className="flex justify-between items-center pt-1">
                    <button onClick={()=>{setExpandedId(null);setVoteForm(EMPTY_FORM);setSubmitError('');}}
                      className="px-4 py-2 rounded-xl border border-white/8 text-zinc-500 text-sm hover:bg-white/5 hover:text-white transition-colors">
                      Huỷ
                    </button>
                    <button onClick={()=>handleVote(id)} disabled={voteMutation.isPending}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-teal-600/20 hover:shadow-teal-600/35 disabled:opacity-60 transition-all flex items-center gap-2">
                      {voteMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang gửi...</> : <><Check className="w-3.5 h-3.5"/>Xác nhận vote</>}
                    </button>
                  </div>
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
