import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';

// 7 loại task hệ thống đang dùng (khớp Task.TaskType backend)
const TASK_TYPES = [
  { value: 'background',  label: 'Vẽ nền',      desc: 'Vẽ background, khung cảnh, kiến trúc',       color: 'from-blue-500/15 to-blue-600/5 border-blue-500/25 text-blue-300' },
  { value: 'shading',     label: 'Tô bóng',     desc: 'Đổ bóng, tạo chiều sâu, ánh sáng',            color: 'from-violet-500/15 to-violet-600/5 border-violet-500/25 text-violet-300' },
  { value: 'effect',      label: 'Hiệu ứng',    desc: 'Speed line, hiệu ứng phép thuật, hành động',   color: 'from-orange-500/15 to-orange-600/5 border-orange-500/25 text-orange-300' },
  { value: 'screentone',  label: 'Screentone',  desc: 'Tông màu, pattern, texture truyền thống',      color: 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/25 text-emerald-300' },
  { value: 'dialog',      label: 'Hộp thoại',   desc: 'Lettering, bong bóng thoại, font chữ',         color: 'from-amber-500/15 to-amber-600/5 border-amber-500/25 text-amber-300' },
  { value: 'touch_up',    label: 'Chỉnh sửa',   desc: 'Sửa lỗi, làm sạch, chỉnh chi tiết nhỏ',        color: 'from-pink-500/15 to-pink-600/5 border-pink-500/25 text-pink-300' },
  { value: 'other',       label: 'Khác',        desc: 'Công việc khác không thuộc các loại trên',     color: 'from-zinc-500/15 to-zinc-600/5 border-zinc-500/25 text-zinc-300' },
];

export default function SkillSettings() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Dùng chung endpoint GET /users/assistants (đã có sẵn, được mở rộng thêm field `skills`)
  // rồi lọc ra chính mình bằng user.id từ authStore — vì backend chưa có /users/me riêng.
  const { data: assistants = [], isLoading, isError } = useQuery({
    queryKey: ['assistants'],
    queryFn: async () => (await api.get('/users/assistants')).data.data ?? [],
  });
  const me = (assistants as any[]).find(a => a.id === user?.id);

  useEffect(() => {
    if (me && !initialized) {
      setSelected(me.skills ?? []);
      setInitialized(true);
    }
  }, [me, initialized]);

  const saveMutation = useMutation({
    mutationFn: (taskTypes: string[]) =>
      api.put('/users/me/skills', { taskTypes }).then(r => r.data),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['assistants'] }); // refresh cả list Mangaka thấy
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggle = (value: string) => {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const hasChanges = initialized && JSON.stringify([...selected].sort()) !== JSON.stringify([...(me?.skills ?? [])].sort());

  return (
    <div className="min-h-screen bg-[#0a0a12] px-8 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black font-['Syne'] text-white">Kỹ năng của bạn</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Chọn những loại công việc bạn giỏi — hệ thống sẽ ưu tiên giao task phù hợp cho bạn
            </p>
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-500/6 border border-blue-500/15 mt-5 mb-6">
          <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-zinc-400 leading-relaxed">
            Khi Mangaka dùng chức năng <span className="text-blue-300 font-semibold">"Tự động giao task"</span>,
            hệ thống ưu tiên chọn Assistant có kỹ năng khớp với loại task — và trong số đó, ưu tiên người
            đang có ít việc hơn để tránh dồn việc lên 1 người. Bạn có thể chọn nhiều kỹ năng cùng lúc.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 gap-2 text-zinc-500">
            <AlertCircle className="w-8 h-8 text-red-400 opacity-50" />
            <p className="text-sm">Không tải được dữ liệu kỹ năng</p>
          </div>
        ) : (
          <>
            {/* Skill grid */}
            <div className="grid grid-cols-2 gap-3">
              {TASK_TYPES.map(t => {
                const isSelected = selected.includes(t.value);
                return (
                  <button key={t.value} onClick={() => toggle(t.value)}
                    className={`text-left p-4 rounded-2xl border transition-all bg-gradient-to-br ${
                      isSelected
                        ? t.color + ' shadow-lg'
                        : 'from-white/[0.02] to-transparent border-white/6 text-zinc-500 hover:border-white/15'
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${isSelected ? '' : 'text-zinc-300'}`}>{t.label}</span>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-current border-current' : 'border-zinc-700'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#0a0a12]" strokeWidth={3} />}
                      </div>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isSelected ? 'opacity-80' : 'text-zinc-600'}`}>
                      {t.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Save bar */}
            <div className="sticky bottom-6 mt-8">
              <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-[#111118] border border-white/10 shadow-2xl">
                <p className="text-[12px] text-zinc-500">
                  Đã chọn <span className="text-white font-bold">{selected.length}</span> / {TASK_TYPES.length} kỹ năng
                  {selected.length === 0 && (
                    <span className="text-amber-400 ml-1.5">— chưa chọn gì, hệ thống sẽ không tự động giao task loại nào cho bạn</span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  {saved && (
                    <span className="text-[12px] text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />Đã lưu
                    </span>
                  )}
                  <button
                    onClick={() => saveMutation.mutate(selected)}
                    disabled={!hasChanges || saveMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-amber-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    {saveMutation.isPending
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang lưu...</>
                      : <><CheckCircle2 className="w-3.5 h-3.5" />Lưu kỹ năng</>}
                  </button>
                </div>
              </div>
              {saveMutation.isError && (
                <p className="text-xs text-red-400 mt-2 px-1">
                  {(saveMutation.error as any)?.response?.data?.message ?? 'Lưu thất bại, thử lại'}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
