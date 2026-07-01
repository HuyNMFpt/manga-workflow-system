import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Feather, X, ChevronDown, Upload, Check, FileText, Users, Loader2, ArrowRight, Sparkles } from 'lucide-react'
import { GENRE_OPTIONS } from '@/lib/constants'
import api from '@/lib/axios'

interface Props {
  onClose: () => void
  onSuccess?: () => void
  existingSeriesId?: string
  existingSeries?: {
    id: string
    title: string
    genre: string
    synopsis: string
    coverUrl?: string
  }
}

const GENRE_LIST: string[] = (GENRE_OPTIONS as string[]) ?? [
  'Action','Adventure','Comedy','Drama','Fantasy','Horror',
  'Mystery','Romance','Sci-Fi','Slice of Life','Sports','Supernatural','Thriller',
  'Shonen','Seinen','Shojo','Josei',
]

const AUDIENCE_OPTIONS = [
  { value: 'children',     label: 'Trẻ em (6-12)'      },
  { value: 'teens',        label: 'Thiếu niên (13-17)'  },
  { value: 'young_adults', label: 'Thanh niên (18-25)'  },
  { value: 'adults',       label: 'Người lớn (25+)'     },
]

type Step = 'series' | 'manuscript' | 'success'

export default function CreateSeriesModal({ onClose, onSuccess, existingSeriesId, existingSeries }: Props) {
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('series')
  const [createdSeriesId, setCreatedSeriesId] = useState<string | null>(null)

  // ── Step 1 state ────────────────────────────────────────────
  const [seriesForm, setSeriesForm] = useState({
    title:    existingSeries?.title    ?? '',
    genre:    existingSeries?.genre    ?? '',
    synopsis: existingSeries?.synopsis ?? '',
  })
  const [coverFile,        setCoverFile]        = useState<File | null>(null)
  const [coverPreview,     setCoverPreview]     = useState<string | null>(existingSeries?.coverUrl ?? null)
  const [seriesError,    setSeriesError]    = useState('')
  const [assignedEditor, setAssignedEditor] = useState<string | null>(null) // tên editor được assign từ response

  // ── Step 2 state ────────────────────────────────────────────
  const [msForm, setMsForm] = useState({
    targetAudience:   '',
    description:      '',
    characterSummary: '',
    plotSummary:      '',
    coverLetter:      '',
  })
  const [draftFile,    setDraftFile]    = useState<File | null>(null)
  const [draftPreview, setDraftPreview] = useState<string | null>(null)
  const [msError,      setMsError]      = useState('')

  // ── Mutation 1: Create/Update series ────────────────────────
  const createSeriesMutation = useMutation({
    mutationFn: async () => {
      if (existingSeriesId) {
        const fd = new FormData()
        fd.append('title',    seriesForm.title.trim())
        fd.append('genre',    seriesForm.genre)
        fd.append('synopsis', seriesForm.synopsis)
        if (coverFile) fd.append('cover', coverFile)
        await api.put(`/series/${existingSeriesId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        return existingSeriesId
      }
      const fd = new FormData()
      fd.append('title',    seriesForm.title.trim())
      fd.append('genre',    seriesForm.genre)
      fd.append('synopsis', seriesForm.synopsis)
      if (coverFile) fd.append('cover', coverFile)
      const r = await api.post('/series', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return r.data.data?.id ?? r.data.data
    },
    onSuccess: (id) => {
      setCreatedSeriesId(id)
      qc.invalidateQueries({ queryKey: ['series'] })
      setStep('manuscript')
    },
    onError: (e: any) => setSeriesError(e.response?.data?.message ?? 'Tạo series thất bại'),
  })

  // ── Mutation 2: Submit manuscript ───────────────────────────
  const submitMsMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.append('seriesId',            createdSeriesId ?? '')
      fd.append('description',         msForm.description)
      fd.append('targetAudience',      msForm.targetAudience)
      fd.append('publicationSchedule', 'weekly')
      fd.append('characterSummary',    msForm.characterSummary)
      fd.append('plotSummary',         msForm.plotSummary || '')
      fd.append('coverLetter',         msForm.coverLetter || '')
      if (draftFile) fd.append('file', draftFile)
      const res = await api.post('/manuscripts/submit', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data.data?.assignedEditorName ?? null
    },
    onSuccess: (editorName) => {
      setAssignedEditor(editorName)
      qc.invalidateQueries({ queryKey: ['series'] })
      onSuccess?.()
      setStep('success')
    },
    onError: (e: any) => setMsError(e.response?.data?.message ?? 'Nộp bản thảo thất bại'),
  })

  // ── Handlers ────────────────────────────────────────────────
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setCoverFile(f)
    setCoverPreview(f ? URL.createObjectURL(f) : null)
  }
  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setDraftFile(f)
    setDraftPreview(f && f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
  }

  const handleStepOne = (e: React.FormEvent) => {
    e.preventDefault()
    setSeriesError('')
    if (!seriesForm.title.trim())        { setSeriesError('Vui lòng nhập tên series'); return }
    if (!seriesForm.genre)               { setSeriesError('Vui lòng chọn thể loại'); return }
    if (seriesForm.synopsis.length < 50) { setSeriesError(`Tóm tắt cần ít nhất 50 ký tự (${seriesForm.synopsis.length}/50)`); return }
    createSeriesMutation.mutate()
  }

  const handleStepTwo = (e: React.FormEvent) => {
    e.preventDefault()
    setMsError('')
    if (!draftFile)             { setMsError('Vui lòng chọn file bản thảo sơ bộ'); return }
    if (!msForm.targetAudience) { setMsError('Vui lòng chọn đối tượng độc giả'); return }
    submitMsMutation.mutate()
  }

  const handleSkipMs = () => {
    qc.invalidateQueries({ queryKey: ['series'] })
    onSuccess?.()
    onClose()
  }

  // ── Styles ──────────────────────────────────────────────────
  const selectCls = "w-full bg-[#0f0f1a] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-violet-500/50 transition-all"
  const inputCls  = "w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-all"
  const labelCls  = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#111118] border border-violet-900/30 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Feather className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-bold text-white font-['Syne']">
              {step === 'series'     ? (existingSeriesId ? 'Tiếp tục series' : 'Tạo series mới') :
               step === 'manuscript' ? 'Nộp bản thảo sơ bộ' : 'Hoàn tất!'}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Step indicator ── */}
        {step !== 'success' && (
          <div className="flex items-center gap-0 px-6 pt-4 pb-0 flex-shrink-0">
            {[
              { id: 'series',     label: 'Thông tin series' },
              { id: 'manuscript', label: 'Bản thảo & Editor' },
            ].map((s, i) => {
              const done   = step === 'manuscript' && s.id === 'series'
              const active = step === s.id
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      done   ? 'bg-emerald-500 text-white' :
                      active ? 'bg-violet-600 text-white' : 'bg-white/8 text-zinc-600'
                    }`}>
                      {done ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 ${active ? 'text-violet-300' : 'text-zinc-600'}`}>{s.label}</span>
                  </div>
                  {i < 1 && <div className={`flex-1 h-px mx-2 mb-4 ${done ? 'bg-emerald-500/50' : 'bg-white/8'}`} />}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* ════ STEP 1 ════ */}
          {step === 'series' && (
            <form id="form-series" onSubmit={handleStepOne} className="space-y-4">

              {/* Cover + Title + Genre */}
              <div className="flex items-start gap-4">
                <label className="flex-shrink-0 cursor-pointer">
                  <div className={`w-16 h-20 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${
                    coverPreview ? 'border-violet-500/40' : 'border-white/10 hover:border-violet-500/30'
                  }`}>
                    {coverPreview
                      ? <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                      : <Feather className="w-5 h-5 text-zinc-700" />}
                  </div>
                  <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleCoverChange} className="hidden" />
                  <p className="text-[10px] text-zinc-700 mt-1 text-center">Ảnh bìa</p>
                </label>

                <div className="flex-1 space-y-3">
                  <div>
                    <label className={labelCls}>Tên series <span className="text-red-400">*</span></label>
                    <input placeholder="VD: Dragon Soul..." value={seriesForm.title}
                      onChange={e => setSeriesForm(f => ({ ...f, title: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Thể loại <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <select value={seriesForm.genre}
                        onChange={e => setSeriesForm(f => ({ ...f, genre: e.target.value }))}
                        className={selectCls}>
                        <option value="" className="bg-[#111118]">Chọn thể loại</option>
                        {GENRE_LIST.map(g => <option key={g} value={g} className="bg-[#111118]">{g}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-zinc-600 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Synopsis */}
              <div>
                <label className={labelCls}>
                  Tóm tắt <span className="text-red-400">*</span>
                  <span className="text-zinc-700 normal-case tracking-normal font-normal ml-1">
                    ({seriesForm.synopsis.length}/50 ký tự tối thiểu)
                  </span>
                </label>
                <textarea rows={3} placeholder="Mô tả nội dung, bối cảnh và điểm độc đáo..."
                  value={seriesForm.synopsis}
                  onChange={e => setSeriesForm(f => ({ ...f, synopsis: e.target.value }))}
                  className={`${inputCls} resize-none`} />
                <div className="mt-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    seriesForm.synopsis.length >= 50 ? 'bg-emerald-500' :
                    seriesForm.synopsis.length >= 25 ? 'bg-amber-500' : 'bg-red-500/50'
                  }`} style={{ width: `${Math.min((seriesForm.synopsis.length / 50) * 100, 100)}%` }} />
                </div>
              </div>

              {/* ── Tantou Editor — tự động assign ── */}
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-violet-500/20 bg-violet-500/6">
                <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-semibold text-violet-300">Hệ thống sẽ tự chọn Tantou Editor</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">
                    Khi bạn nộp bản thảo, hệ thống tự động chọn Editor có ít việc nhất để phụ trách series này.
                    Bạn sẽ thấy tên Editor được assign ở bước xác nhận.
                  </p>
                </div>
              </div>

              {seriesError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {seriesError}
                </p>
              )}
            </form>
          )}

          {/* ════ STEP 2 ════ */}
          {step === 'manuscript' && (
            <form id="form-ms" onSubmit={handleStepTwo} className="space-y-4">

              {/* Auto-assign reminder */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-violet-500/8 border border-violet-500/20">
                <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <p className="text-[11px] text-zinc-400">
                  Tantou Editor sẽ được hệ thống tự chọn khi bạn nộp bản thảo.
                </p>
              </div>

              {/* Target audience */}
              <div>
                <label className={labelCls}>Đối tượng độc giả <span className="text-red-400">*</span></label>
                <div className="relative">
                  <select value={msForm.targetAudience}
                    onChange={e => setMsForm(f => ({ ...f, targetAudience: e.target.value }))}
                    className={selectCls}>
                    <option value="" className="bg-[#111118]">Chọn đối tượng</option>
                    {AUDIENCE_OPTIONS.map(a => (
                      <option key={a.value} value={a.value} className="bg-[#111118]">{a.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-zinc-600 pointer-events-none" />
                </div>
              </div>

              {/* Draft file upload */}
              <div>
                <label className={labelCls}>
                  Bản thảo sơ bộ <span className="text-red-400">*</span>
                  <span className="text-zinc-700 normal-case tracking-normal font-normal ml-1">(sketch / rough pages)</span>
                </label>
                <label className={`flex items-center gap-4 w-full border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
                  draftFile ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/8 hover:border-violet-500/25 hover:bg-white/3'
                }`}>
                  <input type="file" accept="image/*,.pdf" onChange={handleDraftChange} className="hidden" />
                  {draftPreview ? (
                    <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-violet-500/20">
                      <img src={draftPreview} alt="draft" className="w-full h-full object-cover" />
                    </div>
                  ) : draftFile ? (
                    <div className="w-16 h-20 rounded-lg bg-violet-500/10 border border-violet-500/20 flex flex-col items-center justify-center gap-1 flex-shrink-0">
                      <FileText className="w-6 h-6 text-violet-400" />
                      <span className="text-[9px] text-violet-400">PDF</span>
                    </div>
                  ) : (
                    <div className="w-16 h-20 rounded-lg bg-white/4 border border-white/8 flex items-center justify-center flex-shrink-0">
                      <Upload className="w-5 h-5 text-zinc-700" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {draftFile ? (
                      <>
                        <p className="text-sm font-semibold text-white truncate">{draftFile.name}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{(draftFile.size / 1024).toFixed(0)} KB</p>
                        <p className="text-[10px] text-violet-400 mt-1">Click để đổi file</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-zinc-400">Click để chọn file</p>
                        <p className="text-[11px] text-zinc-600 mt-0.5">PNG · JPG · PDF</p>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Mô tả bản thảo</label>
                <textarea rows={2} placeholder="Mô tả ngắn về bản thảo này..."
                  value={msForm.description}
                  onChange={e => setMsForm(f => ({ ...f, description: e.target.value }))}
                  className={`${inputCls} resize-none`} />
              </div>

              {/* Character summary */}
              <div>
                <label className={labelCls}>Nhân vật chính</label>
                <textarea rows={2} placeholder="Giới thiệu ngắn về các nhân vật chính..."
                  value={msForm.characterSummary}
                  onChange={e => setMsForm(f => ({ ...f, characterSummary: e.target.value }))}
                  className={`${inputCls} resize-none`} />
              </div>

              {/* Cover letter */}
              <div>
                <label className={labelCls}>
                  Thư gửi Editor <Users className="w-3 h-3 inline ml-1 text-amber-400" />
                </label>
                <textarea rows={2} placeholder="Lý do series xứng đáng được xuất bản..."
                  value={msForm.coverLetter}
                  onChange={e => setMsForm(f => ({ ...f, coverLetter: e.target.value }))}
                  className={`${inputCls} resize-none`} />
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-500/6 border border-amber-500/15 rounded-xl">
                <Users className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-500">
                  Bản thảo sẽ được gửi đến <span className="text-amber-400 font-semibold">Tantou Editor</span> để xem xét và quản lý.
                  Editor sẽ là người quyết định nộp lên Board hay không.
                </p>
              </div>

              {msError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {msError}
                </p>
              )}
            </form>
          )}

          {/* ════ SUCCESS ════ */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Đã nộp thành công!</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Series <span className="text-white font-semibold">"{seriesForm.title}"</span>{' '}
                  {existingSeriesId ? 'đã được cập nhật và' : 'đã được tạo,'} bản thảo đã gửi đến{' '}
                  {assignedEditor
                    ? <><span className="text-violet-300 font-semibold">{assignedEditor}</span> (Tantou Editor được hệ thống chỉ định).</>
                    : <>Tantou Editor phụ trách (hệ thống đang xử lý chỉ định).</>
                  }{' '}
                  Editor sẽ xem xét trước khi nộp lên Hội đồng biên tập.
                </p>
              </div>
              <button onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-lg transition-all">
                Đóng
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {step !== 'success' && (
          <div className="px-6 py-4 border-t border-white/5 flex-shrink-0">
            {step === 'series' && (
              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 text-sm rounded-xl border border-white/8 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
                  Huỷ
                </button>
                <button type="submit" form="form-series" disabled={createSeriesMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-600/30 disabled:opacity-50 transition-all">
                  {createSeriesMutation.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang tạo...</>
                    : <>Tiếp theo <ArrowRight className="w-3.5 h-3.5" /></>}
                </button>
              </div>
            )}
            {step === 'manuscript' && (
              <div className="flex justify-between items-center">
                <button type="button" onClick={handleSkipMs}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                  Bỏ qua, tạo series thôi
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep('series')}
                    className="px-4 py-2 text-sm rounded-xl border border-white/8 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
                    ← Quay lại
                  </button>
                  <button type="submit" form="form-ms" disabled={submitMsMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-600/30 disabled:opacity-50 transition-all">
                    {submitMsMutation.isPending
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang nộp...</>
                      : <><Users className="w-3.5 h-3.5" />Gửi cho Editor</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
