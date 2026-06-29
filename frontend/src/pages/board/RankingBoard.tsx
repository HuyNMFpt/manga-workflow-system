import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, Minus, Upload, BarChart2,
  Loader2, ChevronDown, Star, AlertTriangle, PauseCircle,
  XCircle, RotateCcw, ChevronRight, X
} from 'lucide-react';
import api from '@/lib/axios';

/* ── helpers ─────────────────────────────────────────────────── */
const calcCombinedScore = (entries: any[]): any[] => {
  if (!entries.length) return [];
  const maxVotes = Math.max(...entries.map((r: any) => r.currentVotes ?? 0), 1);
  return entries.map((r: any) => {
    const nv = ((r.currentVotes ?? 0) / maxVotes) * 100;
    const score = r.readerScore != null ? nv * 0.6 + r.readerScore * 0.4 : nv;
    return { ...r, _combinedScore: Math.round(score * 10) / 10 };
  });
};

const StarScore = ({ score }: { score: number | null | undefined }) => {
  if (score == null) return <span className="text-zinc-700 text-[11px]">—</span>;
  const stars = score / 20;
  const full  = Math.floor(stars);
  const half  = stars - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${
          i <= full ? 'text-amber-400 fill-amber-400'
          : i === full+1 && half ? 'text-amber-400 fill-amber-400/40'
          : 'text-zinc-700'}`}/>
      ))}
      <span className="text-[10px] text-zinc-500 ml-1">{score}</span>
    </div>
  );
};

/* ── Decision Modal ──────────────────────────────────────────── */
type DecisionAction = 'hiatus' | 'cancel' | 'reinstate';
interface DecisionModalProps {
  series: any;
  onClose: () => void;
  onSubmit: (payload: { seriesId: string; actionType: DecisionAction; reason: string }) => void;
  isPending: boolean;
}
const DecisionModal = ({ series, onClose, onSubmit, isPending }: DecisionModalProps) => {
  const [action, setAction] = useState<DecisionAction | ''>('');
  const [reason, setReason] = useState('');
  const isOnHiatus = series.status === 'on_hiatus';

  const actions = [
    ...(!isOnHiatus ? [{
      key: 'hiatus' as DecisionAction,
      label: 'Tạm ngưng',
      desc: 'Series tạm dừng xuất bản, có thể khôi phục sau',
      icon: <PauseCircle className="w-5 h-5"/>,
      color: 'border-amber-500/30 bg-amber-500/8 text-amber-400',
      active: 'border-amber-500 bg-amber-500/15',
    }] : []),
    {
      key: 'cancel' as DecisionAction,
      label: 'Hủy series',
      desc: 'Chấm dứt vĩnh viễn, không thể khôi phục',
      icon: <XCircle className="w-5 h-5"/>,
      color: 'border-red-500/30 bg-red-500/8 text-red-400',
      active: 'border-red-500 bg-red-500/15',
    },
    ...(isOnHiatus ? [{
      key: 'reinstate' as DecisionAction,
      label: 'Khôi phục',
      desc: 'Đưa series trở lại trạng thái xuất bản',
      icon: <RotateCcw className="w-5 h-5"/>,
      color: 'border-emerald-500/30 bg-emerald-500/8 text-emerald-400',
      active: 'border-emerald-500 bg-emerald-500/15',
    }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1f1a] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-amber-500 mb-1">Quyết định Ban Biên Tập</p>
            <h2 className="text-base font-bold text-white">{series.seriesTitle}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              {series.isAtRisk && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5"/>At-risk · {series.consecutiveLowPeriods} kỳ thấp
                </span>
              )}
              {isOnHiatus && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Đang tạm ngưng</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Action select */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-zinc-600">Loại quyết định *</p>
            {actions.map(a => (
              <button key={a.key} onClick={() => setAction(a.key)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  action === a.key ? a.active + ' ' + a.color.split(' ')[2] : 'border-white/6 bg-white/3 hover:bg-white/5'
                }`}>
                <span className={action === a.key ? a.color.split(' ')[2] : 'text-zinc-600'}>{a.icon}</span>
                <div>
                  <p className={`text-sm font-semibold ${action === a.key ? a.color.split(' ')[2] : 'text-white'}`}>{a.label}</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">{a.desc}</p>
                </div>
                {action === a.key && <ChevronRight className={`w-4 h-4 ml-auto ${a.color.split(' ')[2]}`}/>}
              </button>
            ))}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.1em] uppercase text-zinc-600 mb-1.5">Lý do *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Nêu rõ lý do để thông báo cho Mangaka và Editor..."
              className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-teal-500/40 resize-none transition-all"/>
          </div>

          {/* Warning for cancel */}
          {action === 'cancel' && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5"/>
              <p className="text-[11px] text-red-400">Hủy series là <strong>không thể hoàn tác</strong>. Mangaka và Editor sẽ được thông báo ngay.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">Huỷ</button>
          <button
            onClick={() => action && reason.trim() && onSubmit({ seriesId: series.seriesId, actionType: action, reason })}
            disabled={!action || !reason.trim() || isPending}
            className={`px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-all flex items-center gap-2 ${
              action === 'cancel' ? 'bg-red-600 hover:bg-red-500'
              : action === 'reinstate' ? 'bg-emerald-600 hover:bg-emerald-500'
              : 'bg-amber-600 hover:bg-amber-500'
            }`}>
            {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang xử lý...</> : 'Xác nhận quyết định'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────── */
const RankingBoard = () => {
  const qc = useQueryClient();
  const [showInput,   setShowInput]   = useState(false);
  const [inputOk,     setInputOk]     = useState(false);
  const [inputError,  setInputError]  = useState('');
  const [decisionTarget, setDecisionTarget] = useState<any>(null);
  const [decisionOk,  setDecisionOk]  = useState('');

  const [form, setForm] = useState({
    seriesId:'', pollPeriod:'', pollYear: new Date().getFullYear().toString(),
    voteCount:'', readerScore:'', notes:'',
    pollDate: new Date().toISOString().split('T')[0],
  });

  const { data: seriesData = [] } = useQuery({
    queryKey: ['series','all'],
    queryFn: async () => { const r = await api.get('/series'); return r.data.data ?? []; },
  });
  const allSeries: any[] = Array.isArray(seriesData) ? seriesData : [];

  const { data: rankData, isLoading } = useQuery({
    queryKey: ['board','rankings'],
    queryFn: async () => { const r = await api.get('/board/rankings'); return r.data.data?.data ?? r.data.data ?? []; },
  });
  const rankings: any[] = Array.isArray(rankData) ? rankData : (rankData?.rankings ?? []);

  const inputMutation = useMutation({
    mutationFn: (payload:any) => api.post('/board/rankings/input', payload).then(r=>r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['board','rankings'] });
      qc.invalidateQueries({ queryKey:['board','at-risk'] });
      setInputOk(true); setShowInput(false);
      setForm({ seriesId:'', pollPeriod:'', pollYear: new Date().getFullYear().toString(), voteCount:'', readerScore:'', notes:'', pollDate: new Date().toISOString().split('T')[0] });
      setTimeout(() => setInputOk(false), 3000);
    },
    onError: (e:any) => setInputError(e.response?.data?.message ?? 'Nhập liệu thất bại'),
  });

  const decisionMutation = useMutation({
    mutationFn: (payload:any) => api.post('/board/decisions', payload).then(r=>r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey:['board','rankings'] });
      qc.invalidateQueries({ queryKey:['board','at-risk'] });
      const labels: Record<string,string> = { hiatus:'Tạm ngưng', cancel:'Hủy series', reinstate:'Khôi phục' };
      setDecisionOk(`✅ Đã ${labels[variables.actionType]} series thành công`);
      setDecisionTarget(null);
      setTimeout(() => setDecisionOk(''), 4000);
    },
  });

  const handleSubmitInput = () => {
    setInputError('');
    if (!form.seriesId || !form.voteCount || !form.pollPeriod) {
      setInputError('Vui lòng điền đầy đủ: Series, kỳ, và số votes'); return;
    }
    const readerScoreVal = form.readerScore ? parseInt(form.readerScore) : null;
    if (readerScoreVal !== null && (readerScoreVal < 0 || readerScoreVal > 100)) {
      setInputError('Reader score phải từ 0 đến 100'); return;
    }
    const newVotes = parseInt(form.voteCount);
    const sameKy = sortedRankings.filter((r:any) =>
      r.pollPeriod === parseInt(form.pollPeriod) && r.pollYear === parseInt(form.pollYear));
    const autoRank = sameKy.filter((r:any) => (r.currentVotes ?? 0) > newVotes).length + 1;
    inputMutation.mutate({
      seriesId: form.seriesId, pollPeriod: parseInt(form.pollPeriod),
      pollYear: parseInt(form.pollYear), rankPosition: autoRank,
      voteCount: newVotes, readerScore: readerScoreVal,
      notes: form.notes || null, pollDate: form.pollDate || null,
    });
  };

  const withScore = calcCombinedScore(rankings);
  const sortedRankings = [...withScore]
    .sort((a,b) => (b._combinedScore ?? 0) - (a._combinedScore ?? 0))
    .map((r,idx) => ({ ...r, currentRank: idx+1 }));

  const atRiskList = sortedRankings.filter((r:any) => r.isAtRisk);

  const trendIcons = {
    up:     <TrendingUp   className="w-4 h-4 text-emerald-400"/>,
    down:   <TrendingDown className="w-4 h-4 text-red-400"/>,
    stable: <Minus        className="w-4 h-4 text-zinc-500"/>,
  };

  return (
    <div className="min-h-full bg-[#03100d] text-white">
      {/* Header */}
      <div className="relative border-b border-teal-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-64 h-64 rounded-full bg-emerald-600/8 blur-3xl"/>
        <div className="relative px-8 pt-8 pb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-500 mb-2">Board · Rankings</p>
            <h1 className="text-2xl font-black font-['Syne']">Bảng xếp hạng</h1>
            <p className="text-sm text-zinc-600 mt-1">Hạng = Votes (60%) + Reader Score (40%)</p>
          </div>
          <button onClick={() => setShowInput(!showInput)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-teal-600/25 hover:shadow-teal-600/40 transition-all">
            <Upload className="w-4 h-4"/>Nhập dữ liệu
          </button>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-teal-500/30"/>Votes <span className="text-zinc-700">60%</span></span>
          <span className="flex items-center gap-1.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400/60"/>Reader Score <span className="text-zinc-700">40%</span></span>
          <span className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-red-500"/>At-risk = rank thấp ≥ 3 kỳ liên tiếp</span>
        </div>

        {/* Decision success toast */}
        {decisionOk && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
            {decisionOk}
          </div>
        )}

        {/* At-risk alert panel */}
        {atRiskList.length > 0 && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400"/>
              <p className="text-sm font-bold text-red-400">{atRiskList.length} series có nguy cơ bị hủy</p>
              <span className="text-[10px] text-zinc-700">— Board cần ra quyết định</span>
            </div>
            <div className="space-y-2">
              {atRiskList.map((r:any) => (
                <div key={r.seriesId} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white/3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-zinc-600 font-['Syne']">#{r.currentRank}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{r.seriesTitle}</p>
                      <p className="text-[10px] text-red-400 mt-0.5">⚠ {r.consecutiveLowPeriods} kỳ xếp hạng thấp · {(r.currentVotes??0).toLocaleString()} votes</p>
                    </div>
                  </div>
                  <button onClick={() => setDecisionTarget(r)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-semibold hover:bg-red-500/25 transition-colors">
                    <AlertTriangle className="w-3 h-3"/>Ra quyết định
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input form */}
        {showInput && (
          <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <p className="text-sm font-bold text-white">Nhập dữ liệu bình chọn kỳ này</p>
              <p className="text-[10px] text-zinc-600">Reader Score: 0–100</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold tracking-[0.1em] uppercase text-zinc-600 mb-1">Series *</label>
                <div className="relative">
                  <select value={form.seriesId} onChange={e=>setForm(p=>({...p,seriesId:e.target.value}))}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:border-teal-500/40 transition-all">
                    <option value="" className="bg-[#0a0a12]">-- Chọn series --</option>
                    {allSeries.filter((s:any)=>s.status==='publishing').map((s:any)=>(
                      <option key={s.id} value={s.id} className="bg-[#0a0a12]">{s.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-zinc-600 pointer-events-none"/>
                </div>
              </div>
              {[
                { key:'pollPeriod', label:'Kỳ * (1-12)', type:'number', placeholder:'VD: 6'   },
                { key:'pollYear',   label:'Năm *',        type:'number', placeholder:'VD: 2026' },
                { key:'voteCount',  label:'Số votes *',   type:'number', placeholder:'VD: 2847' },
                { key:'pollDate',   label:'Ngày poll',    type:'date',   placeholder:''         },
              ].map(f=>(
                <div key={f.key}>
                  <label className="block text-[10px] font-bold tracking-[0.1em] uppercase text-zinc-600 mb-1">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} placeholder={f.placeholder}
                    onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500/40 transition-all"/>
                </div>
              ))}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <label className="block text-[10px] font-bold tracking-[0.1em] uppercase text-amber-500/80 mb-1">★ Reader Score (0–100)</label>
                <input type="number" min="0" max="100" value={form.readerScore} placeholder="VD: 87"
                  onChange={e=>setForm(p=>({...p,readerScore:e.target.value}))}
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"/>
                {form.readerScore && <div className="mt-1.5"><StarScore score={parseInt(form.readerScore)}/></div>}
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold tracking-[0.1em] uppercase text-zinc-600 mb-1">Ghi chú</label>
                <input type="text" value={form.notes} placeholder="Ghi chú (tuỳ chọn)"
                  onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500/40 transition-all"/>
              </div>
            </div>
            {inputError && <p className="text-xs text-red-400">{inputError}</p>}
            {inputOk    && <p className="text-xs text-emerald-400">✅ Nhập dữ liệu thành công!</p>}
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowInput(false)} className="px-4 py-2 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">Huỷ</button>
              <button onClick={handleSubmitInput} disabled={inputMutation.isPending}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2 transition-all">
                {inputMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang nhập...</> : 'Xác nhận'}
              </button>
            </div>
          </div>
        )}

        {/* Rankings table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-teal-400 animate-spin"/></div>
        ) : sortedRankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <BarChart2 className="w-10 h-10 opacity-20"/>
            <p className="text-sm">Chưa có dữ liệu xếp hạng</p>
            <p className="text-xs text-zinc-800">Nhập dữ liệu poll để thấy kết quả</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            <div className="grid grid-cols-[3rem_1fr_6rem_7rem_6rem_6rem_7rem] gap-3 px-6 py-3 border-b border-white/5 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-700">
              <span>Hạng</span><span>Series</span>
              <span className="text-center">Votes</span>
              <span className="text-center flex items-center justify-center gap-1"><Star className="w-2.5 h-2.5 text-amber-500"/>Score</span>
              <span className="text-center">Trend</span>
              <span className="text-center">Status</span>
              <span className="text-center">Quyết định</span>
            </div>
            {sortedRankings.map((r:any, idx:number) => {
              const change = (r.previousRank ?? r.currentRank) - r.currentRank;
              return (
                <div key={r.seriesId ?? idx}
                  className={`grid grid-cols-[3rem_1fr_6rem_7rem_6rem_6rem_7rem] gap-3 px-6 py-4 items-center border-b border-white/4 last:border-0 hover:bg-white/[0.02] transition-colors ${r.isAtRisk?'bg-red-500/3':''}`}>
                  {/* Rank */}
                  <div className="flex items-center justify-center">
                    {r.currentRank===1?<span className="text-xl">🥇</span>
                    :r.currentRank===2?<span className="text-xl">🥈</span>
                    :r.currentRank===3?<span className="text-xl">🥉</span>
                    :<span className="text-sm font-black text-zinc-600 font-['Syne']">#{r.currentRank}</span>}
                  </div>
                  {/* Title + score bar */}
                  <div>
                    <p className="text-[13px] font-semibold text-white">{r.seriesTitle}</p>
                    {r.isAtRisk && <p className="text-[10px] text-red-400 mt-0.5">⚠ {r.consecutiveLowPeriods} kỳ thấp</p>}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 max-w-[80px] h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                          style={{ width:`${Math.min(r._combinedScore??0,100)}%` }}/>
                      </div>
                      <span className="text-[9px] text-zinc-700">{r._combinedScore??0}/100</span>
                    </div>
                  </div>
                  <div className="text-center text-sm font-bold text-white">{(r.currentVotes??0).toLocaleString()}</div>
                  <div className="flex justify-center"><StarScore score={r.readerScore}/></div>
                  {/* Trend */}
                  <div className="flex items-center justify-center gap-1.5">
                    {(trendIcons as any)[r.trend] ?? trendIcons.stable}
                    <span className={`text-[12px] font-semibold ${change>0?'text-emerald-400':change<0?'text-red-400':'text-zinc-500'}`}>
                      {change>0?`+${change}`:change<0?`${change}`:'—'}
                    </span>
                  </div>
                  {/* Status */}
                  <div className="flex justify-center">
                    {r.isAtRisk
                      ?<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">At-risk</span>
                      :<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Safe</span>}
                  </div>
                  {/* Decision button */}
                  <div className="flex justify-center">
                    <button onClick={() => setDecisionTarget(r)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                        r.isAtRisk
                          ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                          : 'bg-white/4 border-white/8 text-zinc-500 hover:bg-white/8 hover:text-zinc-300'
                      }`}>
                      {r.isAtRisk ? '⚠ Xử lý' : 'Quyết định'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {decisionTarget && (
        <DecisionModal
          series={decisionTarget}
          onClose={() => setDecisionTarget(null)}
          onSubmit={(payload) => decisionMutation.mutate(payload)}
          isPending={decisionMutation.isPending}
        />
      )}
    </div>
  );
};
export default RankingBoard;
