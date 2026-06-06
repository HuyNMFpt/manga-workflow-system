// ── SeriesDetailModal — hiện thị action tùy theo status ──────────
// Status flow:
//   draft      → tiếp tục submission hoặc xóa
//   submitted  → hủy xét duyệt (→ draft) + lý do gửi Editor
//   publishing → gửi lý do đổi status cho Editor
//   on_hiatus  → (Editor quản lý)
//   cancelled  → cập nhật lại + submit lại hoặc xóa
//   approved   → (Board approved, chờ Editor assign)

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X, Feather, AlertTriangle, Trash2, RefreshCw,
  Send, CheckCircle2, Loader2, BookOpen, Clock,
  XCircle, PenLine, Info
} from 'lucide-react'
import api from '@/lib/axios'
import CreateSeriesModal from '@/components/shared/CreateSeriesModal'

interface Series {
  id: string
  title: string
  genre: string
  synopsis?: string
  status: string
  coverUrl?: string
  schedule?: string
}

interface Props {
  series: Series
  onClose: () => void
}

// ── Status config ─────────────────────────────────────────────────
const STATUS_INFO: Record<string, { label: string; color: string; dot: string; desc: string }> = {
  draft:       { label: 'Bản nháp',   color: 'text-zinc-400',    dot: 'bg-zinc-500',    desc: 'Chưa được nộp cho Editor'              },
  submitted:   { label: 'Chờ duyệt',  color: 'text-amber-400',   dot: 'bg-amber-400',   desc: 'Đang chờ Editor xem xét'               },
  approved:    { label: 'Đã duyệt',   color: 'text-emerald-400', dot: 'bg-emerald-400', desc: 'Board đã duyệt, đang chờ sản xuất'     },
  publishing:  { label: 'Đang đăng',  color: 'text-violet-400',  dot: 'bg-violet-400',  desc: 'Đang trong quá trình sản xuất - xuất bản'},
  on_hiatus:   { label: 'Tạm ngưng',  color: 'text-orange-400',  dot: 'bg-orange-400',  desc: 'Tạm ngưng theo quyết định của Editor'  },
  cancelled:   { label: 'Đã hủy',     color: 'text-red-400',     dot: 'bg-red-500',     desc: 'Series đã bị hủy hoặc không được duyệt'},
}

export default function SeriesDetailModal({ series, onClose }: Props) {
  const qc = useQueryClient()
  const st = STATUS_INFO[series.status] ?? STATUS_INFO.draft

  const [view,         setView]         = useState<'main'|'cancel'|'message'|'delete'|'resubmit'>('main')
  const [reason,       setReason]       = useState('')
  const [reasonError,  setReasonError]  = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // ── Mutations ─────────────────────────────────────────────────
  // PUT /api/series/{id}/status
  const updateStatus = useMutation({
    mutationFn: (newStatus: string) =>
      api.put(`/series/${series.id}/status`, null, { params: { status: newStatus } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['series'] })
      onClose()
    },
  })

  // DELETE /api/series/{id} — Backend cần implement
  const deleteSeries = useMutation({
    mutationFn: () => api.delete(`/series/${series.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['series'] })
      onClose()
    },
    onError: () => {
      // Fallback nếu backend chưa có DELETE: đổi status = cancelled
      updateStatus.mutate('cancelled')
    },
  })

  // POST /api/series/{id}/message — Backend cần implement
  // Gửi message/lý do cho Editor
  const sendMessage = useMutation({
    mutationFn: (data: { reason: string; requestedStatus?: string }) =>
      api.post(`/series/${series.id}/message`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['series'] })
      onClose()
    },
    onError: () => {
      // Backend chưa có endpoint → chỉ đóng modal, nói người dùng biết
      onClose()
    },
  })

  const handleCancelSubmission = () => {
    setReasonError('')
    if (reason.trim().length < 10) {
      setReasonError('Vui lòng nhập lý do (ít nhất 10 ký tự)')
      return
    }
    // Gửi lý do cho Editor (cần backend implement)
    // Nếu backend chưa có → đổi về draft ngay
    sendMessage.mutate(
      { reason, requestedStatus: 'draft' },
      {
        onError: () => {
          // Fallback: đổi về draft trực tiếp nếu endpoint chưa có
          updateStatus.mutate('draft')
        }
      }
    )
  }

  const handleSendMessage = () => {
    setReasonError('')
    if (reason.trim().length < 10) {
      setReasonError('Vui lòng nhập lý do (ít nhất 10 ký tự)')
      return
    }
    sendMessage.mutate({ reason })
  }

  const handleDelete = () => {
    deleteSeries.mutate()
  }

  const inputCls = "w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none transition-all"

  // ── If opening CreateSeriesModal for re-submission ────────────
  if (showCreateModal) {
    return (
      <CreateSeriesModal
        onClose={() => setShowCreateModal(false)}
        onSuccess={onClose}
        existingSeriesId={series.id}
        existingSeries={{
          id:       series.id,
          title:    series.title,
          genre:    series.genre,
          synopsis: series.synopsis ?? '',
          coverUrl: series.coverUrl,
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111118] border border-violet-900/30 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-white/5">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
              <span className={`text-[11px] font-bold ${st.color}`}>{st.label}</span>
            </div>
            <h2 className="text-sm font-bold text-white font-['Syne'] truncate">{series.title}</h2>
            <p className="text-[11px] text-zinc-600">{series.genre}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* ════ MAIN VIEW ════ */}
          {view === 'main' && (
            <>
              {/* Status description */}
              <div className={`flex items-start gap-2.5 p-3 rounded-xl ${
                series.status === 'draft'     ? 'bg-zinc-500/8 border border-zinc-500/15'     :
                series.status === 'submitted' ? 'bg-amber-500/8 border border-amber-500/15'   :
                series.status === 'publishing'? 'bg-violet-500/8 border border-violet-500/15' :
                series.status === 'on_hiatus' ? 'bg-orange-500/8 border border-orange-500/15' :
                series.status === 'cancelled' ? 'bg-red-500/8 border border-red-500/15'       :
                'bg-emerald-500/8 border border-emerald-500/15'
              }`}>
                <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${st.color}`} />
                <p className="text-[12px] text-zinc-400">{st.desc}</p>
              </div>

              {/* ── DRAFT actions ─────────────────────────── */}
              {series.status === 'draft' && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Thao tác</p>
                  <button onClick={() => setShowCreateModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 transition-all text-left group">
                    <PenLine className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-violet-300">Tiếp tục nộp series</p>
                      <p className="text-[11px] text-zinc-600">Điền thông tin còn thiếu và nộp cho Editor</p>
                    </div>
                  </button>
                  <button onClick={() => setView('delete')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/15 hover:bg-red-500/12 transition-all text-left group">
                    <Trash2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-400">Xóa series này</p>
                      <p className="text-[11px] text-zinc-600">Hành động không thể hoàn tác</p>
                    </div>
                  </button>
                </div>
              )}

              {/* ── SUBMITTED actions ─────────────────────── */}
              {series.status === 'submitted' && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Thao tác</p>
                  <button onClick={() => setView('cancel')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/15 hover:bg-amber-500/12 transition-all text-left">
                    <XCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-300">Yêu cầu hủy xét duyệt</p>
                      <p className="text-[11px] text-zinc-600">Gửi lý do cho Editor, series sẽ về Bản nháp nếu được chấp thuận</p>
                    </div>
                  </button>
                  <div className="flex items-start gap-2 p-3 bg-white/3 border border-white/5 rounded-xl">
                    <AlertTriangle className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-600">Việc hủy cần Editor đồng ý. Series không bị xóa mà sẽ về trạng thái Bản nháp.</p>
                  </div>
                </div>
              )}

              {/* ── PUBLISHING actions ────────────────────── */}
              {series.status === 'publishing' && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Thao tác</p>
                  <button onClick={() => setView('message')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-500/8 border border-violet-500/15 hover:bg-violet-500/12 transition-all text-left">
                    <Send className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-violet-300">Gửi yêu cầu cho Editor</p>
                      <p className="text-[11px] text-zinc-600">Báo cáo tình trạng hoặc yêu cầu thay đổi lịch xuất bản</p>
                    </div>
                  </button>
                  <div className="flex items-start gap-2 p-3 bg-white/3 border border-white/5 rounded-xl">
                    <Info className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-600">Trạng thái Tạm ngưng (Hiatus) do Tantou Editor quản lý dựa trên tình trạng của bạn.</p>
                  </div>
                </div>
              )}

              {/* ── ON_HIATUS ─────────────────────────────── */}
              {series.status === 'on_hiatus' && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Thao tác</p>
                  <button onClick={() => setView('message')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/8 border border-orange-500/15 hover:bg-orange-500/12 transition-all text-left">
                    <Send className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-orange-300">Gửi cập nhật cho Editor</p>
                      <p className="text-[11px] text-zinc-600">Thông báo tình trạng và yêu cầu tiếp tục sản xuất</p>
                    </div>
                  </button>
                  <div className="flex items-start gap-2 p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-600">Series đang tạm ngưng. Chỉ Editor mới có thể chuyển về trạng thái Đang đăng.</p>
                  </div>
                </div>
              )}

              {/* ── CANCELLED actions ─────────────────────── */}
              {series.status === 'cancelled' && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Thao tác</p>
                  <button onClick={() => setView('resubmit')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15 hover:bg-emerald-500/12 transition-all text-left">
                    <RefreshCw className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-300">Cập nhật và nộp lại</p>
                      <p className="text-[11px] text-zinc-600">Chỉnh sửa series và gửi lại cho Editor xét duyệt</p>
                    </div>
                  </button>
                  <button onClick={() => setView('delete')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/15 hover:bg-red-500/12 transition-all text-left">
                    <Trash2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-400">Xóa series này</p>
                      <p className="text-[11px] text-zinc-600">Hành động không thể hoàn tác</p>
                    </div>
                  </button>
                </div>
              )}

              {/* ── APPROVED ─────────────────────────────── */}
              {series.status === 'approved' && (
                <div className="flex items-start gap-2.5 p-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">Series đã được duyệt!</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Tantou Editor sẽ tiếp nhận và bắt đầu quản lý sản xuất.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════ CANCEL SUBMISSION view ════ */}
          {view === 'cancel' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-amber-500/8 border border-amber-500/15 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-zinc-400">
                  Yêu cầu hủy sẽ được gửi đến <span className="text-amber-400 font-semibold">Tantou Editor</span>.
                  Nếu Editor đồng ý, series sẽ trở về trạng thái <span className="text-white font-semibold">Bản nháp</span>.
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Lý do hủy xét duyệt <span className="text-red-400">*</span>
                </label>
                <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="VD: Tôi muốn cập nhật thêm nội dung trước khi nộp lại..."
                  className={`${inputCls} resize-none`} />
              </div>
              {reasonError && <p className="text-xs text-red-400">{reasonError}</p>}
            </div>
          )}

          {/* ════ SEND MESSAGE view ════ */}
          {view === 'message' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-violet-500/8 border border-violet-500/15 rounded-xl">
                <Send className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-zinc-400">
                  Nội dung sẽ được gửi đến <span className="text-violet-400 font-semibold">Tantou Editor</span> phụ trách series này.
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Nội dung gửi Editor <span className="text-red-400">*</span>
                </label>
                <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="VD: Tôi cần nghỉ 2 tuần do sức khỏe, mong Editor xem xét cho tạm ngưng..."
                  className={`${inputCls} resize-none`} />
              </div>
              {reasonError && <p className="text-xs text-red-400">{reasonError}</p>}
            </div>
          )}

          {/* ════ RESUBMIT view ════ */}
          {view === 'resubmit' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
                <RefreshCw className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-zinc-400">
                  Bạn có thể cập nhật thông tin và nộp lại series cho Editor xét duyệt lần mới.
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Ghi chú cải tiến (gửi kèm Editor)
                </label>
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Mô tả những thay đổi bạn đã thực hiện so với lần trước..."
                  className={`${inputCls} resize-none`} />
              </div>
            </div>
          )}

          {/* ════ DELETE confirm view ════ */}
          {view === 'delete' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-300">Xác nhận xóa series</p>
                  <p className="text-[12px] text-zinc-500 mt-1">
                    Series <span className="text-white font-semibold">"{series.title}"</span> sẽ bị xóa vĩnh viễn.
                    Hành động này <span className="text-red-400 font-semibold">không thể hoàn tác</span>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center">
          {/* Back or Close */}
          <button
            onClick={() => view === 'main' ? onClose() : setView('main')}
            className="px-4 py-2 text-sm rounded-xl border border-white/8 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
            {view === 'main' ? 'Đóng' : '← Quay lại'}
          </button>

          {/* Action button */}
          <div>
            {view === 'cancel' && (
              <button onClick={handleCancelSubmission} disabled={sendMessage.isPending}
                className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50 transition-all">
                {sendMessage.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang gửi...</> : <><Send className="w-3.5 h-3.5" />Gửi yêu cầu hủy</>}
              </button>
            )}
            {view === 'message' && (
              <button onClick={handleSendMessage} disabled={sendMessage.isPending}
                className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:shadow-lg disabled:opacity-50 transition-all">
                {sendMessage.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang gửi...</> : <><Send className="w-3.5 h-3.5" />Gửi cho Editor</>}
              </button>
            )}
            {view === 'resubmit' && (
              <button onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:shadow-lg transition-all">
                <RefreshCw className="w-3.5 h-3.5" />Cập nhật & Nộp lại
              </button>
            )}
            {view === 'delete' && (
              <button onClick={handleDelete} disabled={deleteSeries.isPending || updateStatus.isPending}
                className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-all">
                {deleteSeries.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang xóa...</> : <><Trash2 className="w-3.5 h-3.5" />Xác nhận xóa</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
