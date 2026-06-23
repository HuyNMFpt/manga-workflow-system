import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Ban, Calendar, Target, Loader2, AlertCircle, Check } from 'lucide-react';
import api from '@/lib/axios';

type ActionType = 'cancel' | 'change_schedule' | 'hiatus' | 'reinstate';

const DECISION_OPTIONS: { value:ActionType; label:string; desc:string; icon:any; color:string }[] = [
  { value:'cancel',          label:'Huỷ series',          desc:'Dừng hoàn toàn, không thể đảo ngược',    icon:Ban,          color:'bg-red-500/15 border-red-500/25 text-red-300'        },
  { value:'change_schedule', label:'Đổi lịch xuất bản',  desc:'Chuyển sang monthly hoặc giảm tần suất', icon:Calendar,     color:'bg-amber-500/15 border-amber-500/25 text-amber-300'  },
  { value:'hiatus',          label:'Tạm ngưng (hiatus)',  desc:'Dừng tạm thời, có thể phục hồi',         icon:Target,       color:'bg-violet-500/15 border-violet-500/25 text-violet-300'},
  { value:'reinstate',       label:'Phục hồi series',     desc:'Khôi phục series đã ngưng',              icon:Check,        color:'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'},
];

const DecisionPanel = () => {
  const qc = useQueryClient();
  const [selectedId,  setSelectedId]  = useState<string|null>(null);
  const [decisions,   setDecisions]   = useState<Record<string,{actionType:ActionType|null;reason:string;newSchedule:string}>>({});
  const [errors,      setErrors]      = useState<Record<string,string>>({});
  const [submitted,   setSubmitted]   = useState<string[]>([]);

  const { data:atRiskData, isLoading, isError, refetch } = useQuery({
    queryKey: ['board','at-risk'],
    queryFn: async () => { const r = await api.get('/board/at-risk'); return r.data.data; },
  });
  // ✅ SeriesRankingDTO array
  const atRiskSeries: any[] = Array.isArray(atRiskData) ? atRiskData : (atRiskData?.series ?? []);

  // ✅ POST /board/decisions với EditorialDecisionRequest fields
  const decisionMutation = useMutation({
    mutationFn: (data:any) => api.post('/board/decisions', data).then(r=>r.data),
    onSuccess: (_,vars) => {
      qc.invalidateQueries({ queryKey:['board','at-risk'] });
      qc.invalidateQueries({ queryKey:['board','stats'] });
      setSubmitted(prev=>[...prev, vars.seriesId]);
      setSelectedId(null);
    },
    onError: (e:any,vars) => setErrors(prev=>({...prev,[vars.seriesId]:e.response?.data?.message ?? 'Lỗi xảy ra'})),
  });

  const initDecision = (id:string) => {
    if (!decisions[id]) setDecisions(prev=>({...prev,[id]:{actionType:null,reason:'',newSchedule:'monthly'}}));
  };

  const handleSubmit = (seriesId:string) => {
    const d = decisions[seriesId];
    if (!d?.actionType) { setErrors(prev=>({...prev,[seriesId]:'Chọn loại quyết định'})); return; }
    if (!d.reason || d.reason.length < 20) { setErrors(prev=>({...prev,[seriesId]:'Lý do cần ít nhất 20 ký tự'})); return; }
    setErrors(prev=>{ const n={...prev}; delete n[seriesId]; return n; });

    // ✅ EditorialDecisionRequest: seriesId, actionType, newSchedule, reason, effectiveDate
    decisionMutation.mutate({
      seriesId,
      actionType:   d.actionType,
      newSchedule:  d.actionType === 'change_schedule' ? d.newSchedule : null,
      reason:       d.reason,
      effectiveDate: new Date().toISOString().split('T')[0],
    });
  };

  if (isLoading) return <div className="min-h-screen bg-[#03100d] flex items-center justify-center"><Loader2 className="w-7 h-7 text-teal-400 animate-spin"/></div>;
  if (isError) return (
    <div className="min-h-screen bg-[#03100d] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="w-10 h-10 text-red-400"/>
      <button onClick={()=>refetch()} className="px-4 py-2 rounded-xl bg-teal-600/20 text-teal-300 text-sm border border-teal-500/20">Thử lại</button>
    </div>
  );

  return (
    <div className="min-h-full bg-[#03100d] text-white">
      <div className="relative border-b border-teal-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 left-0 w-64 h-64 rounded-full bg-red-600/6 blur-3xl"/>
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-red-500 mb-2">Board · Quyết định</p>
          <h1 className="text-2xl font-black font-['Syne']">Quyết định chiến lược</h1>
          <p className="text-sm text-zinc-600 mt-1">Ra quyết định cho series xếp hạng thấp liên tiếp</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-4">
        {atRiskSeries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <Check className="w-10 h-10 opacity-20"/>
            <p className="text-sm">Không có series nào cần quyết định</p>
          </div>
        ) : atRiskSeries.map((s:any) => {
          // ✅ SeriesRankingDTO fields
          const id       = s.seriesId;
          const d        = decisions[id] ?? { actionType:null, reason:'', newSchedule:'monthly' };
          const isOpen   = selectedId === id;
          const isDone   = submitted.includes(id);

          return (
            <div key={id} className={`rounded-2xl border overflow-hidden transition-all ${isDone ? 'border-emerald-500/20 opacity-60' : isOpen ? 'border-red-500/30' : 'border-white/5 bg-white/[0.015]'}`}>
              <div className="px-6 py-4 flex items-start gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={()=>{ if(!isDone){ setSelectedId(isOpen ? null : id); initDecision(id); } }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {isDone
                      ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Đã xử lý</span>
                      : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Cần quyết định</span>}
                    {/* ✅ seriesTitle */}
                    <h3 className="text-[13px] font-bold text-white">{s.seriesTitle}</h3>
                  </div>
                  {/* ✅ currentRank, currentVotes, consecutiveLowPeriods */}
                  <p className="text-[11px] text-zinc-600">
                    Hạng #{s.currentRank ?? 0} · {(s.currentVotes ?? 0).toLocaleString()} votes
                    · <span className="text-red-400">{s.consecutiveLowPeriods ?? 0}/3 kỳ thấp</span>
                  </p>
                </div>
              </div>

              {isOpen && !isDone && (
                <div className="px-6 pb-5 border-t border-red-500/10 pt-4 space-y-4 bg-red-500/3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {DECISION_OPTIONS.map(opt=>(
                      <button key={opt.value}
                        onClick={()=>setDecisions(prev=>({...prev,[id]:{...d,actionType:opt.value}}))}
                        className={`flex flex-col gap-1.5 p-4 rounded-xl border text-left transition-all ${d.actionType===opt.value ? opt.color : 'bg-white/3 border-white/6 hover:bg-white/5'}`}>
                        <opt.icon className={`w-4 h-4 ${d.actionType===opt.value ? '':'text-zinc-600'}`}/>
                        <div className={`text-[12px] font-bold ${d.actionType===opt.value ? '':'text-zinc-500'}`}>{opt.label}</div>
                        <div className={`text-[10px] ${d.actionType===opt.value ? 'opacity-80':'text-zinc-700'}`}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* New schedule — chỉ khi change_schedule */}
                  {d.actionType === 'change_schedule' && (
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-2">Lịch mới</label>
                      <div className="flex gap-2">
                        {[{v:'weekly',l:'Hàng tuần'},{v:'biweekly',l:'2 tuần/lần'},{v:'monthly',l:'Hàng tháng'}].map(o=>(
                          <button key={o.v} onClick={()=>setDecisions(prev=>({...prev,[id]:{...d,newSchedule:o.v}}))}
                            className={`flex-1 py-2 rounded-xl border text-[11px] font-semibold transition-all ${d.newSchedule===o.v?'bg-amber-500/15 border-amber-500/25 text-amber-300':'bg-white/3 border-white/6 text-zinc-500 hover:text-zinc-300'}`}>
                            {o.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {d.actionType === 'cancel' && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/8 border border-red-500/15 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"/>
                      <p className="text-[11px] text-red-300">Quyết định huỷ series là <strong>không thể đảo ngược</strong>.</p>
                    </div>
                  )}

                  {/* ✅ reason field (không phải justification) */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-600 mb-1.5">
                      Lý do * <span className="text-zinc-700 normal-case tracking-normal font-normal">({d.reason.length}/20 ký tự tối thiểu)</span>
                    </label>
                    <textarea rows={3} value={d.reason}
                      onChange={e=>setDecisions(prev=>({...prev,[id]:{...d,reason:e.target.value}}))}
                      placeholder="Nhập lý do quyết định..."
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/40 resize-none transition-all"/>
                  </div>

                  {errors[id] && <p className="text-xs text-red-400">{errors[id]}</p>}

                  <div className="flex justify-end gap-2">
                    <button onClick={()=>setSelectedId(null)} className="px-4 py-2 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">Huỷ</button>
                    <button onClick={()=>handleSubmit(id)} disabled={decisionMutation.isPending}
                      className={`px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-all flex items-center gap-2 ${d.actionType==='cancel' ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-teal-600 to-emerald-600'}`}>
                      {decisionMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang xử lý...</> : 'Xác nhận quyết định'}
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
export default DecisionPanel;
