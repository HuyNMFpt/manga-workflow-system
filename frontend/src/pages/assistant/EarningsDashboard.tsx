import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, FileCheck, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/axios';

const EarningsDashboard = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['assistant', 'earnings'],
    queryFn: async () => { const r = await api.get('/assistant/earnings'); return r.data.data?.data ?? r.data.data; },
  });

  const formatVND = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND' }).format(n ?? 0);

  if (isLoading) return <div className="min-h-screen bg-[#080e1a] flex items-center justify-center"><Loader2 className="w-7 h-7 text-blue-400 animate-spin"/></div>;
  if (isError) return (
    <div className="min-h-screen bg-[#080e1a] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="w-10 h-10 text-red-400"/>
      <button onClick={()=>refetch()} className="px-4 py-2 rounded-xl bg-blue-600/20 text-blue-300 text-sm border border-blue-500/20">Thử lại</button>
    </div>
  );

  // ✅ Đúng field names từ EarningsDTO
  const thisMonthEarnings  = data?.thisMonthEarnings  ?? 0;
  const thisMonthPages     = data?.thisMonthPagesApproved ?? 0;
  const totalEarnings      = data?.totalEarnings      ?? 0;
  const totalPages         = data?.totalPagesApproved ?? 0;
  const monthlyHistory     = data?.monthlyHistory     ?? [];
  const earningsByType     = data?.earningsByType     ?? [];

  return (
    <div className="min-h-full bg-[#080e1a] text-white">
      <div className="relative border-b border-blue-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-64 h-64 rounded-full bg-emerald-600/8 blur-3xl"/>
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-500 mb-2">Assistant · Thu nhập</p>
          <h1 className="text-2xl font-black font-['Syne']">Thu nhập</h1>
          <p className="text-sm text-zinc-600 mt-1">Thống kê số trang đã duyệt và thu nhập theo tháng</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Thu nhập tháng này', value:formatVND(thisMonthEarnings),  icon:DollarSign,color:'text-emerald-400',ring:'ring-emerald-500/20',bg:'bg-emerald-500/8'},
            { label:'Trang tháng này',    value:thisMonthPages,               icon:FileCheck, color:'text-blue-400',   ring:'ring-blue-500/20',   bg:'bg-blue-500/8'   },
            { label:'Tổng thu nhập',      value:formatVND(totalEarnings),     icon:TrendingUp,color:'text-violet-400', ring:'ring-violet-500/20', bg:'bg-violet-500/8' },
            { label:'Tổng trang duyệt',   value:totalPages,                   icon:FileCheck, color:'text-amber-400',  ring:'ring-amber-500/20',  bg:'bg-amber-500/8'  },
          ].map((s,i)=>(
            <div key={i} className={`rounded-2xl ring-1 ${s.ring} ${s.bg} p-5`}>
              <s.icon className={`w-5 h-5 ${s.color} mb-3`} strokeWidth={1.8}/>
              <div className={`text-2xl font-black font-['Syne'] ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-zinc-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* earningsByType — đúng field: taskType, count, totalAmount */}
        {earningsByType.length > 0 && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <span className="text-sm font-bold text-white">Chi tiết theo loại task</span>
            </div>
            <div className="divide-y divide-white/4">
              {earningsByType.map((t:any, i:number)=>(
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-white">{t.taskType}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{t.count} trang</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-400">{formatVND(t.totalAmount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* monthlyHistory — đúng fields: month, earnings, pagesApproved */}
        {monthlyHistory.length > 0 && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <span className="text-sm font-bold text-white">Lịch sử theo tháng</span>
            </div>
            <div className="divide-y divide-white/4">
              {monthlyHistory.map((m:any,i:number)=>(
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-white">{m.month}</p>
                    {/* ✅ pagesApproved (không phải pages) */}
                    <p className="text-[11px] text-zinc-600 mt-0.5">{m.pagesApproved} trang</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-emerald-400">{formatVND(m.earnings)}</p>
                    <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{width:`${Math.min((m.pagesApproved/60)*100,100)}%`}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default EarningsDashboard;
