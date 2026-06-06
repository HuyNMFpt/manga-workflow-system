import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Upload, BarChart2, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

const RankingBoard = () => {
  const qc = useQueryClient();
  const [showInput,  setShowInput]  = useState(false);
  const [inputOk,    setInputOk]    = useState(false);
  const [inputError, setInputError] = useState('');

  // Form state — ✅ PollInputRequest fields
  const [form, setForm] = useState({
    seriesId:'', pollPeriod:'', pollYear: new Date().getFullYear().toString(),
    rankPosition:'', voteCount:'', readerScore:'', notes:'',
    pollDate: new Date().toISOString().split('T')[0],
  });

  const { data: rankData, isLoading } = useQuery({
    queryKey: ['board','rankings'],
    queryFn: async () => { const r = await api.get('/board/rankings'); return r.data.data?.data ?? r.data.data ?? []; }, // PAGINATED
  });
  // ✅ SeriesRankingDTO array
  const rankings: any[] = Array.isArray(rankData) ? rankData : (rankData?.rankings ?? []);

  // ✅ POST /board/rankings/input với đúng PollInputRequest fields
  const inputMutation = useMutation({
    mutationFn: (payload:any) => api.post('/board/rankings/input', payload).then(r=>r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['board','rankings'] });
      qc.invalidateQueries({ queryKey:['board','at-risk'] });
      setInputOk(true); setShowInput(false);
      setForm({ seriesId:'', pollPeriod:'', pollYear: new Date().getFullYear().toString(), rankPosition:'', voteCount:'', readerScore:'', notes:'', pollDate: new Date().toISOString().split('T')[0] });
      setTimeout(()=>setInputOk(false), 3000);
    },
    onError: (e:any) => setInputError(e.response?.data?.message ?? 'Nhập liệu thất bại'),
  });

  const handleSubmitInput = () => {
    setInputError('');
    if (!form.seriesId || !form.rankPosition || !form.voteCount || !form.pollPeriod) {
      setInputError('Vui lòng điền đầy đủ: Series ID, kỳ, hạng, votes');
      return;
    }
    inputMutation.mutate({
      seriesId:     form.seriesId,
      pollPeriod:   parseInt(form.pollPeriod),
      pollYear:     parseInt(form.pollYear),
      rankPosition: parseInt(form.rankPosition),
      voteCount:    parseInt(form.voteCount),
      readerScore:  form.readerScore ? parseInt(form.readerScore) : null,
      notes:        form.notes || null,
      pollDate:     form.pollDate || null,
    });
  };

  const TREND_ICON = {
    up:     <TrendingUp  className="w-4 h-4 text-emerald-400"/>,
    down:   <TrendingDown className="w-4 h-4 text-red-400"/>,
    stable: <Minus        className="w-4 h-4 text-zinc-500"/>,
  };

  return (
    <div className="min-h-full bg-[#03100d] text-white">
      <div className="relative border-b border-teal-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-64 h-64 rounded-full bg-emerald-600/8 blur-3xl"/>
        <div className="relative px-8 pt-8 pb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-500 mb-2">Board · Rankings</p>
            <h1 className="text-2xl font-black font-['Syne']">Bảng xếp hạng</h1>
            <p className="text-sm text-zinc-600 mt-1">Nhập dữ liệu poll sau mỗi kỳ</p>
          </div>
          <button onClick={()=>setShowInput(!showInput)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-teal-600/25 hover:shadow-teal-600/40 transition-all">
            <Upload className="w-4 h-4"/>Nhập dữ liệu
          </button>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* Input form — ✅ PollInputRequest fields */}
        {showInput && (
          <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-6 space-y-4">
            <p className="text-sm font-bold text-white">Nhập dữ liệu bình chọn kỳ này</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key:'seriesId',    label:'Series ID *',  type:'text',   placeholder:'UUID của series' },
                { key:'pollPeriod',  label:'Kỳ * (1-12)',  type:'number', placeholder:'VD: 6'           },
                { key:'pollYear',    label:'Năm *',        type:'number', placeholder:'VD: 2026'         },
                { key:'rankPosition',label:'Hạng *',       type:'number', placeholder:'VD: 1'            },
                { key:'voteCount',   label:'Số votes *',   type:'number', placeholder:'VD: 2847'         },
                { key:'readerScore', label:'Reader score', type:'number', placeholder:'VD: 95'           },
                { key:'pollDate',    label:'Ngày poll',    type:'date',   placeholder:''                 },
              ].map(f=>(
                <div key={f.key}>
                  <label className="block text-[10px] font-bold tracking-[0.1em] uppercase text-zinc-600 mb-1">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} placeholder={f.placeholder}
                    onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500/40 transition-all"/>
                </div>
              ))}
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold tracking-[0.1em] uppercase text-zinc-600 mb-1">Ghi chú</label>
                <input type="text" value={form.notes} placeholder="Ghi chú (tuỳ chọn)"
                  onChange={e=>setForm(prev=>({...prev,notes:e.target.value}))}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500/40 transition-all"/>
              </div>
            </div>
            {inputError && <p className="text-xs text-red-400">{inputError}</p>}
            {inputOk    && <p className="text-xs text-emerald-400">✅ Nhập dữ liệu thành công!</p>}
            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowInput(false)} className="px-4 py-2 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">Huỷ</button>
              <button onClick={handleSubmitInput} disabled={inputMutation.isPending}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold disabled:opacity-60 transition-all flex items-center gap-2">
                {inputMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Đang nhập...</> : 'Xác nhận'}
              </button>
            </div>
          </div>
        )}

        {/* Rankings table — ✅ SeriesRankingDTO fields */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-teal-400 animate-spin"/></div>
        ) : rankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <BarChart2 className="w-10 h-10 opacity-20"/>
            <p className="text-sm">Chưa có dữ liệu xếp hạng</p>
            <p className="text-xs text-zinc-800">Nhập dữ liệu poll để thấy kết quả</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            <div className="grid grid-cols-[3rem_1fr_7rem_8rem_6rem] gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-700">
              <span>Hạng</span><span>Series</span><span className="text-center">Votes</span><span className="text-center">Thay đổi</span><span className="text-center">Status</span>
            </div>
            {rankings.map((r:any, idx:number) => {
              // ✅ currentRank, previousRank, currentVotes, seriesTitle, isAtRisk, trend
              const change = (r.previousRank ?? r.currentRank) - r.currentRank;
              return (
                <div key={r.seriesId ?? idx}
                  className={`grid grid-cols-[3rem_1fr_7rem_8rem_6rem] gap-4 px-6 py-4 items-center border-b border-white/4 last:border-0 hover:bg-white/[0.02] transition-colors ${r.isAtRisk ? 'bg-red-500/3':''}`}>
                  <div className="flex items-center justify-center">
                    {r.currentRank===1 ? <span className="text-xl">🥇</span>
                    : r.currentRank===2 ? <span className="text-xl">🥈</span>
                    : r.currentRank===3 ? <span className="text-xl">🥉</span>
                    : <span className="text-sm font-black text-zinc-600 font-['Syne']">#{r.currentRank}</span>}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{r.seriesTitle}</p>
                    {r.isAtRisk && <p className="text-[10px] text-red-400 mt-0.5">⚠ {r.consecutiveLowPeriods} kỳ thấp</p>}
                  </div>
                  <div className="text-center text-sm font-bold text-white">{(r.currentVotes ?? 0).toLocaleString()}</div>
                  <div className="flex items-center justify-center gap-1.5">
                    {(TREND_ICON as any)[r.trend] ?? TREND_ICON.stable}
                    <span className={`text-[12px] font-semibold ${change>0?'text-emerald-400':change<0?'text-red-400':'text-zinc-500'}`}>
                      {change>0?`+${change}`:change<0?`${change}`:'—'}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    {r.isAtRisk
                      ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">At-risk</span>
                      : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Safe</span>}
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
