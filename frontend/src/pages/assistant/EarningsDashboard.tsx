import { 
  TrendingUp, 
  DollarSign, 
  FileCheck, 
  Clock,
  Calendar,
  Target,
  Award
} from 'lucide-react';

const EarningsDashboard = () => {
  const ratePerType = {
    'Background': 150000,
    'Inking': 100000,
    'Toning': 80000,
    'Effects': 120000,
    'Text Cleanup': 60000
  };

  const completedTasks = [
    { type: 'Background', count: 12, amount: 150000 },
    { type: 'Inking', count: 18, amount: 100000 },
    { type: 'Toning', count: 10, amount: 80000 },
    { type: 'Effects', count: 7, amount: 120000 }
  ];

  const totalPages = completedTasks.reduce((sum, task) => sum + task.count, 0);
  const totalEarnings = completedTasks.reduce((sum, task) => sum + (task.count * task.amount), 0);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const monthlyHistory = [
    { month: 'Tháng 10', earnings: 5200000, pages: 38 },
    { month: 'Tháng 11', earnings: 6100000, pages: 45 },
    { month: 'Tháng 12', earnings: 6500000, pages: 47 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne']">Thu nhập</h1>
        <p className="text-gray-400">Thống kê số trang đã duyệt và thu nhập theo tháng</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: 'Tổng thu nhập tháng này',
            value: formatVND(totalEarnings),
            change: '+15% so với tháng trước',
            icon: DollarSign,
            gradient: 'from-green-500 to-green-600',
            bgGradient: 'from-green-500/20 to-green-600/20',
            borderColor: 'border-green-500/30'
          },
          {
            label: 'Trang đã duyệt',
            value: `${totalPages} trang`,
            change: '+8 trang tuần này',
            icon: FileCheck,
            gradient: 'from-blue-500 to-blue-600',
            bgGradient: 'from-blue-500/20 to-blue-600/20',
            borderColor: 'border-blue-500/30'
          },
          {
            label: 'Trạng thái thanh toán',
            value: 'Chờ xử lý',
            change: 'Dự kiến 5 ngày nữa',
            icon: Clock,
            gradient: 'from-orange-500 to-orange-600',
            bgGradient: 'from-orange-500/20 to-orange-600/20',
            borderColor: 'border-orange-500/30'
          }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`bg-gradient-to-br ${stat.bgGradient} border ${stat.borderColor} backdrop-blur-xl rounded-2xl p-6`}
            >
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-white/80">{stat.label}</p>
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
              <p className="text-sm text-white/60">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
              <h2 className="text-xl font-bold text-white font-['Syne']">Xu hướng 3 tháng</h2>
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>

          {/* Simple Bar Chart */}
          <div className="space-y-4">
            {monthlyHistory.map((data, index) => {
              const maxEarning = Math.max(...monthlyHistory.map(m => m.earnings));
              const percentage = (data.earnings / maxEarning) * 100;
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">{data.month}</span>
                    <span className="text-sm font-semibold text-white">{formatVND(data.earnings)}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500 shadow-lg shadow-purple-500/50"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{data.pages} trang</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Stats */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-white font-['Syne']">Hiệu suất làm việc</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                label: 'Tỷ lệ hoàn thành đúng hạn',
                value: '95%',
                icon: Target,
                gradient: 'from-green-500 to-green-600',
                percentage: 95
              },
              {
                label: 'Trang được duyệt lần đầu',
                value: '88%',
                icon: Award,
                gradient: 'from-blue-500 to-blue-600',
                percentage: 88
              },
              {
                label: 'Đánh giá trung bình',
                value: '4.8/5',
                icon: Award,
                gradient: 'from-purple-500 to-purple-600',
                percentage: 96
              }
            ].map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${metric.gradient} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm text-gray-300">{metric.label}</span>
                    </div>
                    <span className="text-lg font-bold text-white">{metric.value}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${metric.gradient} h-2 rounded-full`}
                      style={{ width: `${metric.percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Breakdown by Type */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-white font-['Syne']">Chi tiết theo loại việc</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            Tháng này
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Loại việc</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Số trang</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Đơn giá</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {completedTasks.map((task, index) => (
                <tr key={index} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                      <span className="text-white font-medium">{task.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-white">{task.count}</td>
                  <td className="px-6 py-4 text-right text-gray-400">{formatVND(task.amount)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-white">
                    {formatVND(task.count * task.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/20 bg-white/5">
                <td colSpan={3} className="px-6 py-4 font-bold text-white">Tổng cộng</td>
                <td className="px-6 py-4 text-right font-bold text-2xl text-green-400">
                  {formatVND(totalEarnings)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Rate Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white font-['Syne']">Bảng đơn giá hiện tại</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody className="divide-y divide-white/5">
              {Object.entries(ratePerType).map(([type, rate], index) => (
                <tr key={index} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-3 text-white">{type}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-300">
                    {formatVND(rate)} / trang
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EarningsDashboard;
