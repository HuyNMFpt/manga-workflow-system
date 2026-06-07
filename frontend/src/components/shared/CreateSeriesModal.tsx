import { useState } from 'react'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { Feather, X, ChevronDown, Upload, Check, FileText, Users, Loader2, ArrowRight, UserCircle, AlertCircle } from 'lucide-react'
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
    editorId?: string
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
  const [seriesError,      setSeriesError]      = useState('')
  const [selectedEditorId, setSelectedEditorId] = useState(existingSeries?.editorId ?? '')

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

  // ── Query: Load editors ──────────────────────────────────────
  // GET /api/users/editors → res.data.data = [{ id, name, email, avatarUrl }] (plain list)
  const {
    data: editorsRaw = [],
    isLoading: editorsLoading,
    isError: editorsError,
  } = useQuery({
    queryKey: ['users', 'editors'],
    queryFn: async () => {
      const r = await api.get('/users/editors')
      return r.data.data ?? []
    },
  })
  const editors: any[] = Array.isArray(editorsRaw) ? editorsRaw : []
  const selectedEditor  = editors.find(e => e.id === selectedEditorId)

  // ── Mutation 1: Create/Update series ────────────────────────
  const createSeriesMutation = useMutation({
    mutationFn: async () => {
      if (existingSeriesId) {
        const fd = new FormData()
        fd.append('title',    seriesForm.title.trim())
        fd.append('genre',    seriesForm.genre)
        fd.append('synopsis', seriesForm.synopsis)
        if (selectedEditorId) fd.append('editorId', selectedEditorId)
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
      if (selectedEditorId) fd.append('editorId', selectedEditorId)
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
      const fileUrl = draftFile ? URL.createObjectURL(draftFile) : ''
      await api.post('/manuscripts/submit', {
        seriesId:            createdSeriesId,
        fileUrl,
        description:         msForm.description,
        targetAudience:      msForm.targetAudience,
        publicationSchedule: 'weekly',
        characterSummary:    msForm.characterSummary,
        plotSummary:         msForm.plotSummary,
        coverLetter:         msForm.coverLetter,
      })
    },
    onSuccess: () => {
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
    if (!selectedEditorId)               { setSeriesError('Vui lòng chọn Tantou Editor phụ trách'); return }
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

              {/* ── Tantou Editor picker ── */}
              <div>
                <label className={labelCls}>
                  Tantou Editor <span className="text-red-400">*</span>
                </label>

                {editorsLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/8 bg-white/3">
                    <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                    <span className="text-[12px] text-zinc-500">Đang tải danh sách Editor...</span>
                  </div>

                ) : editorsError || editors.length === 0 ? (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-500">
                      Không tải được danh sách Editor.
                      Thử lại sau hoặc liên hệ quản lý.
                    </p>
                  </div>

                ) : (
                  <div className="space-y-1.5">
                    {editors.map((editor: any) => {
                      const isSelected = selectedEditorId === editor.id
                      return (
                        <button
                          key={editor.id}
                          type="button"
                          onClick={() => setSelectedEditorId(isSelected ? '' : editor.id)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-violet-500/12 border-violet-500/35 ring-1 ring-violet-500/20'
                              : 'bg-white/[0.02] border-white/6 hover:bg-white/5 hover:border-white/12'
                          }`}>
                          {/* Avatar */}
                          {editor.avatarUrl ? (
                            <img
                              src={editor.avatarUrl}
                              alt={editor.name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                              isSelected ? 'bg-violet-500/25 text-violet-300' : 'bg-white/8 text-zinc-500'
                            }`}>
                              {editor.name?.charAt(0)?.toUpperCase() ?? <UserCircle className="w-4 h-4" />}
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-semibold truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                              {editor.name}
                            </p>
                            <p className="text-[10px] text-zinc-600 truncate">{editor.email}</p>
                          </div>

                          {/* Check indicator */}
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected
                              ? 'bg-violet-500 border-violet-500'
                              : 'border-white/15'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Selected summary */}
                {selectedEditor && (
                  <p className="text-[10px] text-violet-400 mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Đã chọn: <span className="font-semibold">{selectedEditor.name}</span> làm Tantou Editor
                  </p>
                )}
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

              {/* Selected editor reminder */}
              {selectedEditor && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-violet-500/8 border border-violet-500/20">
                  {selectedEditor.avatarUrl ? (
                    <img src={selectedEditor.avatarUrl} alt={selectedEditor.name}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-[11px] font-bold text-violet-300 flex-shrink-0">
                      {selectedEditor.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] text-zinc-400">Tantou Editor phụ trách</p>
                    <p className="text-[13px] font-semibold text-white truncate">{selectedEditor.name}</p>
                  </div>
                </div>
              )}

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
                  <span className="text-violet-300 font-semibold">{selectedEditor?.name ?? 'Editor'}</span>.
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
                <button type="submit" form="form-series" disabled={createSeriesMutation.isPending || !selectedEditorId}
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
