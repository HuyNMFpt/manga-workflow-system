import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, Upload, BarChart2,
  Loader2, ChevronDown, Star, AlertTriangle, ArrowRight
} from 'lucide-react';
import api from '@/lib/axios';

/* ── Bayesian Weighted Rating ────────────────────────────────────
   R = (v·S + m·C) / (v + m)
   S = reader score thô (1–10)
   v = số reader vote của series
   m = 20  (ngưỡng tối thiểu)
   C = 6.8 (điểm nền toàn hệ thống — default khi ít data)
─────────────────────────────────────────────────────────────── */
const M = 20;
const C_DEFAULT = 6.8;

const calcBayesian = (entries: any[]): any[] => {
  if (!entries.length) return [];

  // Tính C động từ data thực nếu đủ series có readerScore
  const withScore = entries.filter((r: any) => r.readerScore != null && r.readerVoteCount != null);
  const C = withScore.length >= 5
    ? withScore.reduce((sum: number, r: any) => sum + r.readerScore, 0) / withScore.length
    : C_DEFAULT;

  return entries.map((r: any) => {
    const S = r.readerScore   ?? null;
    const v = r.readerVoteCount ?? 0;
    // Nếu series chưa có reader score → hiển thị null, không xếp theo R
    const R = S != null
      ? Math.round(((v * S + M * C) / (v + M)) * 100) / 100
      : null;
    return { ...r, _R: R, _C: Math.round(C * 100) / 100 };
  });
};

/* ── Star display (thang 1-10 → 0-5 sao) ─────────────────────── */
const StarScore = ({ score, raw }: { score: number | null | undefined; raw?: number | null }) => {
  if (score == null) return <span className="text-zinc-700 text-[11px]">—</span>;
  const stars = (score / 10) * 5;   // 1-10 → 0-5 sao
  const full  = Math.floor(stars);
  const half  = stars - full >= 0.5;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(i => (
          <Star key={i} className={`w-3 h-3 ${
            i <= full ? 'text-amber-400 fill-amber-400'
            : i === full+1 && half ? 'text-amber-400 fill-amber-400/40'
            : 'text-zinc-700'}`}/>
        ))}
      </div>
      <span className="text-[10px] text-zinc-400 font-semibold">{score.toFixed(2)}</span>
      {raw != null && raw !== score && (
        <span className="text-[9px] text-zinc-700">S={raw}</span>
      )}
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
    voteCount:'', readerScore:'', readerVoteCount:'', notes:'',
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
      setForm({ seriesId:'', pollPeriod:'', pollYear: new Date().getFullYear().toString(), voteCount:'', readerScore:'', readerVoteCount:'', notes:'', pollDate: new Date().toISOString().split('T')[0] });
      setTimeout(() => setInputOk(false), 3000);
    },
    onError: (e:any) => setInputError(e.response?.data?.message ?? 'Nhập liệu thất bại'),
  });

  const handleSubmitInput = () => {
    setInputError('');
    if (!form.seriesId || !form.voteCount || !form.pollPeriod) {
      setInputError('Vui lòng điền đầy đủ: Series, kỳ, và số votes'); return;
    }
    const readerScoreVal     = form.readerScore     ? parseFloat(form.readerScore)     : null;
    const readerVoteCountVal = form.readerVoteCount ? parseInt(form.readerVoteCount)   : null;
    if (readerScoreVal !== null && (readerScoreVal < 1 || readerScoreVal > 10)) {
      setInputError('Reader score phải từ 1 đến 10'); return;
    }
    if (readerVoteCountVal !== null && readerVoteCountVal < 0) {
      setInputError('Số reader vote không hợp lệ'); return;
    }
    const newVotes = parseInt(form.voteCount);
    const sameKy = sortedRankings.filter((r:any) =>
      r.pollPeriod === parseInt(form.pollPeriod) && r.pollYear === parseInt(form.pollYear));
    const autoRank = sameKy.filter((r:any) => (r.currentVotes ?? 0) > newVotes).length + 1;
    inputMutation.mutate({
      seriesId: form.seriesId, pollPeriod: parseInt(form.pollPeriod),
      pollYear: parseInt(form.pollYear), rankPosition: autoRank,
      voteCount: newVotes, readerScore: readerScoreVal,
      readerVoteCount: readerVoteCountVal,
      notes: form.notes || null, pollDate: form.pollDate || null,
    });
  };

  // Tính R Bayesian cho từng series, sort theo R (series không có R xếp cuối theo voteCount)
  const withR = calcBayesian(rankings);
  const sortedRankings = [...withR].sort((a, b) => {
    if (a._R != null && b._R != null) return b._R - a._R;
    if (a._R != null) return -1;
    if (b._R != null) return 1;
    return (b.currentVotes ?? 0) - (a.currentVotes ?? 0);
  }).map((r, idx) => ({ ...r, currentRank: idx + 1 }));

  const atRiskList = sortedRankings.filter((r:any) => r.isAtRisk);

  // C hiện tại để hiển thị ở legend
  const currentC = withR[0]?._C ?? C_DEFAULT;

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
            <p className="text-sm text-zinc-600 mt-1">
              Xếp hạng theo Bayesian Weighted Rating
              <span className="ml-2 text-zinc-700">R = (v·S + {M}·C) / (v + {M})</span>
            </p>
          </div>
          <button onClick={() => setShowInput(!showInput)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-teal-600/25 hover:shadow-teal-600/40 transition-all">
            <Upload className="w-4 h-4"/>Nhập dữ liệu
          </button>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* Legend + công thức */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1.5 font-mono bg-white/3 px-2 py-1 rounded-lg border border-white/5">
            R = (v·S + {M}·C) / (v + {M})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-zinc-500">C</span> = {currentC} (điểm nền hệ thống)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-zinc-500">m</span> = {M} vote tối thiểu
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-red-500"/>At-risk = rank thấp ≥ 3 kỳ liên tiếp
          </span>
        </div>

        {/* At-risk alert */}
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
              <p className="text-[10px] text-zinc-600 font-mono">R = (v·S + {M}·{C_DEFAULT}) / (v + {M})</p>
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
                { key:'voteCount',  label:'Votes poll *', type:'number', placeholder:'VD: 2847' },
                { key:'pollDate',   label:'Ngày poll',    type:'date',   placeholder:''         },
              ].map(f=>(
                <div key={f.key}>
                  <label className="block text-[10px] font-bold tracking-[0.1em] uppercase text-zinc-600 mb-1">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} placeholder={f.placeholder}
                    onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500/40 transition-all"/>
                </div>
              ))}

              {/* Reader Score + Reader Vote Count — highlighted, dùng tính R */}
              <div className="md:col-span-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 grid grid-cols-2 gap-3">
                <div className="col-span-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-amber-500/80">
                    ★ Reader Rating — dùng tính R
                  </p>
                  {form.readerScore && form.readerVoteCount && (() => {
                    const S = parseFloat(form.readerScore);
                    const v = parseInt(form.readerVoteCount);
                    if (!isNaN(S) && !isNaN(v) && S >= 1 && S <= 10) {
                      const R = ((v * S + M * C_DEFAULT) / (v + M)).toFixed(2);
                      return <span className="text-[10px] text-amber-400 font-mono font-bold">R = {R}</span>;
                    }
                    return null;
                  })()}
                </div>
                <div>
                  <label className="block text-[10px] text-amber-500/60 mb-1">S — Điểm thô (1.0 – 10.0)</label>
                  <input type="number" min="1" max="10" step="0.1"
                    value={form.readerScore} placeholder="VD: 8.5"
                    onChange={e=>setForm(p=>({...p,readerScore:e.target.value}))}
                    className="w-full bg-transparent border-b border-amber-500/20 pb-1 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/60"/>
                </div>
                <div>
                  <label className="block text-[10px] text-amber-500/60 mb-1">v — Số reader vote</label>
                  <input type="number" min="0"
                    value={form.readerVoteCount} placeholder="VD: 142"
                    onChange={e=>setForm(p=>({...p,readerVoteCount:e.target.value}))}
                    className="w-full bg-transparent border-b border-amber-500/20 pb-1 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/60"/>
                </div>
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
            <div className="grid grid-cols-[3rem_1fr_6rem_8rem_5rem_6rem_6rem] gap-3 px-6 py-3 border-b border-white/5 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-700">
              <span>Hạng</span><span>Series</span>
              <span className="text-center">Votes</span>
              <span className="text-center flex items-center justify-center gap-1">
                <Star className="w-2.5 h-2.5 text-amber-500"/>R (Weighted)
              </span>
              <span className="text-center text-zinc-800">v</span>
              <span className="text-center">Trend</span>
              <span className="text-center">Status</span>
            </div>
            {sortedRankings.map((r:any, idx:number) => {
              const change = (r.previousRank ?? r.currentRank) - r.currentRank;
              return (
                <div key={r.seriesId ?? idx}
                  className={`grid grid-cols-[3rem_1fr_6rem_8rem_5rem_6rem_6rem] gap-3 px-6 py-4 items-center border-b border-white/4 last:border-0 hover:bg-white/[0.02] transition-colors ${r.isAtRisk?'bg-red-500/3':''}`}>
                  {/* Rank */}
                  <div className="flex items-center justify-center">
                    {r.currentRank===1?<span className="text-xl">🥇</span>
                    :r.currentRank===2?<span className="text-xl">🥈</span>
                    :r.currentRank===3?<span className="text-xl">🥉</span>
                    :<span className="text-sm font-black text-zinc-600 font-['Syne']">#{r.currentRank}</span>}
                  </div>
                  {/* Title */}
                  <div>
                    <p className="text-[13px] font-semibold text-white">{r.seriesTitle}</p>
                    {r.isAtRisk && <p className="text-[10px] text-red-400 mt-0.5">⚠ {r.consecutiveLowPeriods} kỳ thấp</p>}
                    {r._R == null && <p className="text-[10px] text-zinc-700 mt-0.5 italic">Chưa có reader rating</p>}
                  </div>
                  {/* Poll votes */}
                  <div className="text-center text-sm font-bold text-white">{(r.currentVotes??0).toLocaleString()}</div>
                  {/* R — Bayesian weighted score */}
                  <div className="flex justify-center">
                    <StarScore score={r._R} raw={r.readerScore}/>
                  </div>
                  {/* v — reader vote count */}
                  <div className="text-center text-[11px] text-zinc-600">
                    {r.readerVoteCount != null ? r.readerVoteCount.toLocaleString() : '—'}
                  </div>
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
