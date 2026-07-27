import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Feather, X, ChevronDown, Upload, Check, FileText, Users, Loader2, ArrowRight, Sparkles } from 'lucide-react'
import { GENRE_OPTIONS } from '@/lib/constants'
import api from '@/lib/axios'
import { convertImageIfNeeded, convertImageFilesIfNeeded } from '@/lib/imageConvert'

type DraftMode = 'image' | 'pdf'
interface DraftFileItem { id: string; file: File; preview: string }

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
  const [draftMode,     setDraftMode]     = useState<DraftMode>('image')
  const [draftItems,    setDraftItems]    = useState<DraftFileItem[]>([])
  const [draftPdfFile,  setDraftPdfFile]  = useState<File | null>(null)
  const [draftPdfPages, setDraftPdfPages] = useState<number | null>(null)
  const [draftDragIdx,  setDraftDragIdx]  = useState<number | null>(null)
  const [draftOverIdx,  setDraftOverIdx]  = useState<number | null>(null)
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

  // ── Mutation 2: Submit manuscript + upload trang bản thảo ───
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
      const res = await api.post('/manuscripts/submit', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const manuscriptId = res.data.data?.manuscriptId ?? null
      const editorName   = res.data.data?.assignedEditorName ?? null

      // Upload trang bản thảo sau khi có manuscriptId
      if (manuscriptId) {
        if (draftMode === 'image' && draftItems.length > 0) {
          const pfd = new FormData()
          draftItems.forEach(item => pfd.append('files', item.file))
          await api.post(`/manuscripts/${manuscriptId}/pages/batch`, pfd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } else if (draftMode === 'pdf' && draftPdfFile) {
          const pfd = new FormData()
          pfd.append('file', draftPdfFile)
          await api.post(`/manuscripts/${manuscriptId}/pages/upload-pdf`, pfd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
      }
      return editorName
    },
    onSuccess: (editorName) => {
      setAssignedEditor(editorName)
      qc.invalidateQueries({ queryKey: ['series'] })
      qc.invalidateQueries({ queryKey: ['editor', 'manuscripts'] })
      onSuccess?.()
      setStep('success')
    },
    onError: (e: any) => setMsError(e.response?.data?.message ?? 'Nộp bản thảo thất bại'),
  })

  // ── Handlers ────────────────────────────────────────────────
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0] ?? null
    if (!raw) { setCoverFile(null); setCoverPreview(null); return }
    try {
      const f = await convertImageIfNeeded(raw)
      setCoverFile(f)
      setCoverPreview(URL.createObjectURL(f))
    } catch (err: any) {
      alert(err.message ?? 'Lỗi xử lý ảnh bìa')
      e.target.value = ''
    }
  }
  const handleDraftChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0] ?? null
    if (!raw) { setDraftFile(null); setDraftPreview(null); return }
    // PDF giữ nguyên, chỉ convert ảnh
    if (!raw.type.startsWith('image/') && !/\.(webp|avif|heic|heif|jfif)$/i.test(raw.name)) {
      setDraftFile(raw)
      setDraftPreview(null)
      return
    }
    try {
      const f = await convertImageIfNeeded(raw)
      setDraftFile(f)
      setDraftPreview(URL.createObjectURL(f))
    } catch (err: any) {
      alert(err.message ?? 'Lỗi xử lý bản thảo')
      e.target.value = ''
    }
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
    if (!draftMode || (draftMode === 'image' && draftItems.length === 0)) { setMsError('Vui lòng chọn ít nhất 1 trang bản thảo'); return }
    if (draftMode === 'pdf' && !draftPdfFile) { setMsError('Vui lòng chọn file PDF bản thảo'); return }
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
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/avif" onChange={handleCoverChange} className="hidden" />
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

                {/* Mode toggle */}
                <div className="flex gap-2 mb-3">
                  {(['image', 'pdf'] as DraftMode[]).map(m => (
                    <button key={m} type="button" onClick={() => {
                      setDraftMode(m)
                      setDraftItems([]); setDraftPdfFile(null); setDraftPdfPages(null)
                    }}
                      className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
                        draftMode === m
                          ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                          : 'bg-white/3 border-white/8 text-zinc-500 hover:text-zinc-300'
                      }`}>
                      {m === 'image' ? '🖼 Nhiều ảnh' : '📄 PDF'}
                    </button>
                  ))}
                </div>

                {/* Image mode */}
                {draftMode === 'image' && (
                  <div className="space-y-2">
                    <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      draftItems.length > 0 ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/8 hover:border-violet-500/25'
                    }`}>
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={async e => {
                          if (!e.target.files) return
                          const accepted = Array.from(e.target.files)
                            .filter(f => f.type.startsWith('image/') || /\.(webp|avif|heic|heif|jfif)$/i.test(f.name))
                          if (accepted.length === 0) return
                          try {
                            const converted = await convertImageFilesIfNeeded(accepted)
                            const items: DraftFileItem[] = converted.map(f => ({
                              id: Math.random().toString(36).slice(2), file: f, preview: URL.createObjectURL(f)
                            }))
                            setDraftItems(prev => [...prev, ...items])
                          } catch (err: any) {
                            alert(err.message ?? 'Lỗi xử lý ảnh')
                          }
                          e.target.value = ''
                        }} />
                      <Upload className="w-5 h-5 text-zinc-700 mb-1" />
                      <p className="text-[11px] text-zinc-600">Click để chọn nhiều ảnh</p>
                    </label>
                    {draftItems.length > 0 && (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {draftItems.map((item, idx) => (
                          <div key={item.id}
                            draggable
                            onDragStart={() => setDraftDragIdx(idx)}
                            onDragOver={e => { e.preventDefault(); setDraftOverIdx(idx) }}
                            onDrop={() => {
                              if (draftDragIdx === null || draftDragIdx === idx) return
                              const next = [...draftItems]
                              const [moved] = next.splice(draftDragIdx, 1)
                              next.splice(idx, 0, moved)
                              setDraftItems(next)
                              setDraftDragIdx(null); setDraftOverIdx(null)
                            }}
                            onDragEnd={() => { setDraftDragIdx(null); setDraftOverIdx(null) }}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-grab transition-all ${
                              draftOverIdx === idx ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/6 bg-white/3'
                            } ${draftDragIdx === idx ? 'opacity-40' : ''}`}>
                            <span className="text-[10px] text-zinc-600 w-4 font-mono">{idx+1}</span>
                            <img src={item.preview} className="w-7 h-7 rounded object-cover border border-white/10" />
                            <p className="flex-1 text-[11px] text-zinc-400 truncate">{item.file.name}</p>
                            <button type="button" onClick={() => {
                              URL.revokeObjectURL(item.preview)
                              setDraftItems(prev => prev.filter(f => f.id !== item.id))
                            }} className="text-zinc-700 hover:text-red-400"><X className="w-3 h-3"/></button>
                          </div>
                        ))}
                      </div>
                    )}
                    {draftItems.length > 0 && (
                      <p className="text-[10px] text-zinc-700">
                        {draftItems.length} trang · Kéo thả để sắp xếp thứ tự
                      </p>
                    )}
                  </div>
                )}

                {/* PDF mode */}
                {draftMode === 'pdf' && (
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 w-full border-2 border-dashed rounded-xl p-3 cursor-pointer transition-all ${
                      draftPdfFile ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/8 hover:border-violet-500/25'
                    }`}>
                      <input type="file" accept=".pdf,application/pdf" className="hidden"
                        onChange={async e => {
                          const f = e.target.files?.[0] ?? null
                          setDraftPdfFile(f)
                          if (f) {
                            try {
                              const buf = await f.arrayBuffer()
                              const text = new TextDecoder('latin1').decode(buf)
                              const matches = text.match(/\/Type\s*\/Page[^s]/g)
                              setDraftPdfPages(matches ? matches.length : null)
                            } catch { setDraftPdfPages(null) }
                          } else { setDraftPdfPages(null) }
                        }} />
                      {draftPdfFile ? (
                        <>
                          <div className="w-10 h-12 rounded bg-violet-500/10 border border-violet-500/20 flex flex-col items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{draftPdfFile.name}</p>
                            <p className="text-[11px] text-zinc-500">
                              {(draftPdfFile.size/1024/1024).toFixed(1)} MB
                              {draftPdfPages != null && ` · ~${draftPdfPages} trang`}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-zinc-700" />
                          <div>
                            <p className="text-sm text-zinc-400">Click để chọn file PDF</p>
                            <p className="text-[11px] text-zinc-600">Tối đa 50MB</p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                )}
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
