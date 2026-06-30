import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, Upload, BarChart2,
  Loader2, ChevronDown, Star, AlertTriangle, ArrowRight
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

/* ── Main Component ──────────────────────────────────────────── */
const RankingBoard = () => {
  const qc = useQueryClient();
  const [showInput,  setShowInput]  = useState(false);
  const [inputOk,    setInputOk]    = useState(false);
  const [inputError, setInputError] = useState('');

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

        {/* At-risk alert — trỏ sang trang Quyết định để Board bỏ phiếu tập thể */}
        {atRiskList.length > 0 && (
          <Link to="/board/decisions"
            className="flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-5 hover:bg-red-500/8 transition-colors group">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0"/>
              <div>
                <p className="text-sm font-bold text-red-400">{atRiskList.length} series có nguy cơ bị hủy</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  {atRiskList.slice(0,3).map((r:any)=>r.seriesTitle).join(', ')}
                  {atRiskList.length > 3 ? ` +${atRiskList.length-3} khác` : ''}
                  — cần Board đề xuất và bỏ phiếu quyết định
                </p>
              </div>
            </div>
            <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-semibold group-hover:bg-red-500/25 transition-colors">
              Đến trang Quyết định<ArrowRight className="w-3.5 h-3.5"/>
            </span>
          </Link>
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
            <div className="grid grid-cols-[3rem_1fr_6rem_7rem_6rem_6rem] gap-3 px-6 py-3 border-b border-white/5 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-700">
              <span>Hạng</span><span>Series</span>
              <span className="text-center">Votes</span>
              <span className="text-center flex items-center justify-center gap-1"><Star className="w-2.5 h-2.5 text-amber-500"/>Score</span>
              <span className="text-center">Trend</span>
              <span className="text-center">Status</span>
            </div>
            {sortedRankings.map((r:any, idx:number) => {
              const change = (r.previousRank ?? r.currentRank) - r.currentRank;
              return (
                <div key={r.seriesId ?? idx}
                  className={`grid grid-cols-[3rem_1fr_6rem_7rem_6rem_6rem] gap-3 px-6 py-4 items-center border-b border-white/4 last:border-0 hover:bg-white/[0.02] transition-colors ${r.isAtRisk?'bg-red-500/3':''}`}>
                  <div className="flex items-center justify-center">
                    {r.currentRank===1?<span className="text-xl">🥇</span>
                    :r.currentRank===2?<span className="text-xl">🥈</span>
                    :r.currentRank===3?<span className="text-xl">🥉</span>
                    :<span className="text-sm font-black text-zinc-600 font-['Syne']">#{r.currentRank}</span>}
                  </div>
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
                  <div className="flex items-center justify-center gap-1.5">
                    {(trendIcons as any)[r.trend] ?? trendIcons.stable}
                    <span className={`text-[12px] font-semibold ${change>0?'text-emerald-400':change<0?'text-red-400':'text-zinc-500'}`}>
                      {change>0?`+${change}`:change<0?`${change}`:'—'}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    {r.isAtRisk
                      ?<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">At-risk</span>
                      :<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Safe</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default RankingBoard;
