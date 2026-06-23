import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Award, Trophy, Activity, Loader2, Zap } from 'lucide-react';
import api from '@/lib/axios';
import { SeriesRanking } from '@/types';

const fetchMyRankings = async (): Promise<SeriesRanking[]> => {
  const res = await api.get('/rankings/my');
  return res.data.data;
};

const MyRankings = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'current'|'last_month'|'last_quarter'>('current');

  const { data: rankings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['rankings', 'my'],
    queryFn: fetchMyRankings,
  });

  const atRisk   = rankings.filter(s => s.isAtRisk);
  const avgRank  = rankings.length ? Math.round(rankings.reduce((a,s)=>a+s.currentRank,0)/rankings.length) : 0;
  const top10    = rankings.filter(s => s.currentRank <= 10).length;

  const TREND_ICON = {
    up:     <TrendingUp  className="w-4 h-4 text-emerald-400" />,
    down:   <TrendingDown className="w-4 h-4 text-red-400"    />,
    stable: <Minus        className="w-4 h-4 text-zinc-500"   />,
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
    </div>
  );
  if (isError) return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center gap-4">
      <AlertTriangle className="w-10 h-10 text-red-400" />
      <p className="text-zinc-400 text-sm">Không thể tải xếp hạng</p>
      <button onClick={()=>refetch()} className="px-4 py-2 rounded-xl bg-violet-600/20 text-violet-300 text-sm border border-violet-500/20 hover:bg-violet-600/30 transition-colors">Thử lại</button>
    </div>
  );

  return (
    <div className="min-h-full bg-[#0a0a12] text-white">

      {/* Header */}
      <div className="relative border-b border-violet-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-72 h-72 rounded-full bg-amber-600/6 blur-3xl" />
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-500 mb-2">Mangaka · Rankings</p>
          <h1 className="text-2xl font-black font-['Syne']">Bảng xếp hạng</h1>
          <p className="text-sm text-zinc-600 mt-1">Theo dõi thứ hạng và phát hiện nguy hiểm</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-8">

        {/* At-risk banner */}
        {atRisk.length > 0 && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-4 flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-4.5 h-4.5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-300">Cảnh báo: Series có nguy cơ bị huỷ</p>
              <p className="text-xs text-zinc-500 mt-1">
                <span className="text-red-400">{atRisk.map(s=>s.seriesTitle).join(', ')}</span> đang xếp hạng thấp liên tiếp.
                Hội đồng có thể ra quyết định trong kỳ tới.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Tổng series',   value: rankings.length, color:'text-violet-400', ring:'ring-violet-500/20', bg:'bg-violet-500/8',  icon: Trophy       },
            { label:'Hạng TB',        value: rankings.length ? `#${avgRank}` : '—', color:'text-amber-400',  ring:'ring-amber-500/20',  bg:'bg-amber-500/8',   icon: Activity     },
            { label:'Top 10',         value: top10,           color:'text-emerald-400',ring:'ring-emerald-500/20',bg:'bg-emerald-500/8', icon: Award        },
            { label:'Nguy hiểm',      value: atRisk.length,   color: atRisk.length>0?'text-red-400':'text-zinc-500', ring: atRisk.length>0?'ring-red-500/20':'ring-zinc-700/20', bg: atRisk.length>0?'bg-red-500/8':'bg-zinc-500/5', icon: AlertTriangle },
          ].map((s,i)=>(
            <div key={i} className={`rounded-2xl ring-1 ${s.ring} ${s.bg} p-5`}>
              <s.icon className={`w-5 h-5 ${s.color} mb-3`} strokeWidth={1.8} />
              <div className={`text-3xl font-black font-['Syne'] ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-zinc-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Period filter */}
        <div className="flex items-center gap-1">
          {[{v:'current',l:'Hiện tại'},{v:'last_month',l:'Tháng trước'},{v:'last_quarter',l:'Quý trước'}].map(p=>(
            <button key={p.v} onClick={()=>setSelectedPeriod(p.v as any)}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                selectedPeriod===p.v
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
              }`}>{p.l}</button>
          ))}
        </div>

        {/* Rankings list */}
        {rankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <Trophy className="w-10 h-10 opacity-20" />
            <p className="text-sm">Chưa có dữ liệu xếp hạng</p>
            <p className="text-xs text-zinc-800">Dữ liệu sẽ xuất hiện sau khi hội đồng nhập kết quả</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[3rem_1fr_6rem_6rem_5rem] gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-700">
              <span>Hạng</span>
              <span>Series</span>
              <span className="text-center">Bình chọn</span>
              <span className="text-center">Thay đổi</span>
              <span className="text-center">Trạng thái</span>
            </div>

            {rankings.map((s, idx) => {
              const rankChange = (s.previousRank ?? s.currentRank) - s.currentRank;
              return (
                <div key={s.seriesId}
                  className={`grid grid-cols-[3rem_1fr_6rem_6rem_5rem] gap-4 px-6 py-4 items-center border-b border-white/4 last:border-0 hover:bg-white/[0.02] transition-colors ${s.isAtRisk ? 'bg-red-500/3' : ''}`}>

                  {/* Rank */}
                  <div className="flex items-center justify-center">
                    {s.currentRank === 1 ? <span className="text-xl">🥇</span>
                    : s.currentRank === 2 ? <span className="text-xl">🥈</span>
                    : s.currentRank === 3 ? <span className="text-xl">🥉</span>
                    : <span className="text-sm font-black text-zinc-500 font-['Syne']">#{s.currentRank}</span>}
                  </div>

                  {/* Title */}
                  <div>
                    <p className="text-[13px] font-semibold text-white">{s.seriesTitle}</p>
                    {s.isAtRisk && <p className="text-[10px] text-red-400 mt-0.5">⚠ At-risk</p>}
                  </div>

                  {/* Votes */}
                  <div className="text-center">
                    <span className="text-sm font-bold text-white">{s.currentVotes.toLocaleString()}</span>
                  </div>

                  {/* Change */}
                  <div className="flex items-center justify-center gap-1.5">
                    {TREND_ICON[s.trend]}
                    <span className={`text-[12px] font-semibold ${
                      rankChange > 0 ? 'text-emerald-400' : rankChange < 0 ? 'text-red-400' : 'text-zinc-500'
                    }`}>
                      {rankChange > 0 ? `+${rankChange}` : rankChange < 0 ? `${rankChange}` : '—'}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex justify-center">
                    {s.isAtRisk
                      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Nguy hiểm</span>
                      : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">An toàn</span>}
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

export default MyRankings;
