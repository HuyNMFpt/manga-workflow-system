import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Upload, Loader2, CheckCircle2, ChevronDown, FileText, Layers } from 'lucide-react';
import api from '@/lib/axios';
import { Chapter, Series } from '@/types';

// ✅ /series/my trả về PaginatedResponse { data: [...], total, page... }
const fetchMySeries  = async (): Promise<Series[]>  => {
  const r = await api.get('/series/my');
  const d = r.data; // PaginatedResponse
  return Array.isArray(d) ? d : (d?.data ?? d?.content ?? []);
};
const fetchChapters  = async (id: string): Promise<Chapter[]> => { const r = await api.get(`/chapters/series/${id}`); return r.data.data ?? []; };

const STATUS_MAP: Record<string,{label:string;pill:string}> = {
  not_started:    { label:'Chưa bắt đầu', pill:'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'          },
  in_progress:    { label:'Đang làm',      pill:'bg-blue-500/10 text-blue-300 border-blue-500/20'           },
  pending_review: { label:'Chờ duyệt',     pill:'bg-amber-500/10 text-amber-300 border-amber-500/20'        },
  editor_review:  { label:'Editor review', pill:'bg-violet-500/10 text-violet-300 border-violet-500/20'     },
  approved:       { label:'Đã duyệt',      pill:'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'  },
  published:      { label:'Đã xuất bản',   pill:'bg-teal-500/10 text-teal-300 border-teal-500/20'           },
};

type Tab = 'list' | 'create' | 'upload';

export default function ChapterManager() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('list');
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [createForm, setCreateForm] = useState({ chapterNumber:'', title:'', notes:'' });
  const [createErr, setCreateErr] = useState('');
  const [createOk, setCreateOk] = useState(false);
  const [uploadChapterId, setUploadChapterId] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [pageFile, setPageFile] = useState<File|null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadErr, setUploadErr] = useState('');
  const [uploadOk, setUploadOk] = useState(false);

  const { data: seriesList=[], isLoading:loadSeries } = useQuery({ queryKey:['series','my'], queryFn:fetchMySeries });
  const { data: chapters=[], isLoading:loadChapters, refetch } = useQuery({ queryKey:['chapters',selectedSeriesId], queryFn:()=>fetchChapters(selectedSeriesId), enabled:!!selectedSeriesId });

  const createMutation = useMutation({
    mutationFn: (d:{seriesId:string;chapterNumber:number;title:string;notes:string}) => api.post('/chapters',d).then(r=>r.data),
    onSuccess: () => { setCreateOk(true); setCreateForm({chapterNumber:'',title:'',notes:''}); qc.invalidateQueries({queryKey:['chapters',selectedSeriesId]}); setTimeout(()=>setCreateOk(false),3000); },
    onError: (e:any) => setCreateErr(e.response?.data?.message ?? 'Có lỗi xảy ra'),
  });

  const uploadMutation = useMutation({
    // ✅ Backend endpoint: POST /api/pages (không phải /pages/upload)
    mutationFn: (fd:FormData) => api.post('/pages',fd,{headers:{'Content-Type':'multipart/form-data'}}).then(r=>r.data),
    onSuccess: () => { setUploadOk(true); setPageNumber(''); setPageFile(null); setUploadNotes(''); setTimeout(()=>setUploadOk(false),3000); },
    onError: (e:any) => setUploadErr(e.response?.data?.message ?? 'Upload thất bại'),
  });

  const TABS: {key:Tab;label:string;icon:any}[] = [
    { key:'list',   label:'Danh sách',  icon:BookOpen  },
    { key:'create', label:'Tạo chapter',icon:Plus      },
    { key:'upload', label:'Upload trang',icon:Upload   },
  ];

  const SelectField = ({value,onChange,children,label}:any) => (
    <div>
      {label && <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">{label}</label>}
      <div className="relative">
        <select value={value} onChange={onChange}
          className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-violet-500/40 transition-all">
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-zinc-600 pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-[#0a0a12] text-white">

      {/* Header */}
      <div className="relative border-b border-violet-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-12 w-56 h-56 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="relative px-8 pt-8 pb-6">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-blue-500 mb-2">Mangaka · Chapters</p>
          <h1 className="text-2xl font-black font-['Syne']">Chapter & Trang</h1>
          <p className="text-sm text-zinc-600 mt-1">Quản lý chapters và upload trang truyện</p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-6">

        {/* Series selector */}
        <div className="max-w-sm">
          <SelectField label="Series" value={selectedSeriesId} onChange={(e:any)=>setSelectedSeriesId(e.target.value)}>
            <option value="" className="bg-[#111118]">-- Chọn series --</option>
            {(seriesList as any[]).map((s:any) => <option key={s.id} value={s.id} className="bg-[#111118]">{s.title}</option>)}
          </SelectField>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/4 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                tab===t.key ? 'bg-[#111118] text-white border border-violet-500/20 shadow-sm' : 'text-zinc-600 hover:text-zinc-300'
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: List ── */}
        {tab==='list' && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            {!selectedSeriesId ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-zinc-700">
                <Layers className="w-8 h-8 opacity-20" />
                <p className="text-sm">Chọn series để xem chapters</p>
              </div>
            ) : loadChapters ? (
              <div className="flex items-center justify-center py-10 gap-2 text-zinc-600">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Đang tải...</span>
              </div>
            ) : (chapters as Chapter[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-zinc-700">
                <FileText className="w-8 h-8 opacity-20" />
                <p className="text-sm">Chưa có chapter nào</p>
                <button onClick={()=>setTab('create')}
                  className="text-xs text-violet-400 border border-violet-500/20 px-3 py-1.5 rounded-lg hover:bg-violet-500/8 transition-colors">
                  + Tạo chapter đầu tiên
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_5rem_8rem_8rem] gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-700">
                  <span>Chapter</span><span className="text-center">Trang</span><span className="text-center">Deadline</span><span className="text-center">Trạng thái</span>
                </div>
                {(chapters as Chapter[]).map(c => {
                  const st = STATUS_MAP[c.status] ?? STATUS_MAP.not_started;
                  return (
                    <div key={c.id} className="grid grid-cols-[1fr_5rem_8rem_8rem] gap-4 px-6 py-4 items-center border-b border-white/4 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <div>
                        <p className="text-[13px] font-semibold text-white">Chapter {c.chapterNumber}{c.title ? `: ${c.title}` : ''}</p>
                      </div>
                      <div className="text-center text-sm text-zinc-500">{c.totalPages ?? '—'}</div>
                      <div className="text-center text-[11px] text-zinc-600">
                        {c.deadline ? new Date(c.deadline).toLocaleDateString('vi-VN') : '—'}
                      </div>
                      <div className="flex justify-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.pill}`}>{st.label}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ── Tab: Create ── */}
        {tab==='create' && (
          <div className="max-w-lg rounded-2xl border border-white/5 bg-white/[0.015] p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">Số chapter *</label>
              <input type="number" min="1" value={createForm.chapterNumber}
                onChange={e=>setCreateForm({...createForm,chapterNumber:e.target.value})}
                placeholder="VD: 1"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">Tên chapter</label>
              <input type="text" value={createForm.title}
                onChange={e=>setCreateForm({...createForm,title:e.target.value})}
                placeholder="VD: Khởi đầu mới"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">Ghi chú</label>
              <textarea rows={3} value={createForm.notes}
                onChange={e=>setCreateForm({...createForm,notes:e.target.value})}
                placeholder="Ghi chú cho chapter..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 resize-none transition-all" />
            </div>
            {createErr && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">{createErr}</p>}
            {createOk  && <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-xl px-3 py-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />Tạo chapter thành công!</div>}
            <button onClick={()=>{ setCreateErr(''); if(!selectedSeriesId){setCreateErr('Vui lòng chọn series');return;} if(!createForm.chapterNumber){setCreateErr('Nhập số chapter');return;} createMutation.mutate({seriesId:selectedSeriesId,chapterNumber:parseInt(createForm.chapterNumber),title:createForm.title,notes:createForm.notes}); }}
              disabled={createMutation.isPending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-600/25 disabled:opacity-60 transition-all">
              {createMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang tạo...</> : <><Plus className="w-4 h-4" />Tạo Chapter</>}
            </button>
          </div>
        )}

        {/* ── Tab: Upload ── */}
        {tab==='upload' && (
          <div className="max-w-lg rounded-2xl border border-white/5 bg-white/[0.015] p-6 space-y-4">
            <SelectField label="Chapter *" value={uploadChapterId} onChange={(e:any)=>setUploadChapterId(e.target.value)}>
              <option value="" className="bg-[#111118]">-- Chọn chapter --</option>
              {(chapters as Chapter[]).map(c=><option key={c.id} value={c.id} className="bg-[#111118]">Chapter {c.chapterNumber}{c.title?`: ${c.title}`:''}</option>)}
            </SelectField>
            <div>
              <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">Số trang *</label>
              <input type="number" min="1" value={pageNumber} onChange={e=>setPageNumber(e.target.value)} placeholder="VD: 1"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">File ảnh *</label>
              <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${pageFile ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/8 hover:border-violet-500/25 hover:bg-white/3'}`}>
                <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={e=>setPageFile(e.target.files?.[0]??null)} className="hidden" />
                {pageFile
                  ? <div className="text-center"><CheckCircle2 className="w-6 h-6 text-violet-400 mx-auto mb-1" /><p className="text-xs text-violet-300 font-medium">{pageFile.name}</p><p className="text-[10px] text-zinc-600">{(pageFile.size/1024).toFixed(0)} KB</p></div>
                  : <div className="text-center"><Upload className="w-6 h-6 text-zinc-700 mx-auto mb-1" /><p className="text-xs text-zinc-600">Click để chọn</p><p className="text-[10px] text-zinc-800 mt-0.5">PNG · JPG</p></div>}
              </label>
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600 mb-1.5">Ghi chú</label>
              <input type="text" value={uploadNotes} onChange={e=>setUploadNotes(e.target.value)} placeholder="Ghi chú cho trang..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all" />
            </div>
            {uploadErr && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">{uploadErr}</p>}
            {uploadOk  && <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-xl px-3 py-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />Upload thành công!</div>}
            <button
              onClick={()=>{ setUploadErr(''); if(!uploadChapterId){setUploadErr('Chọn chapter');return;} if(!pageNumber){setUploadErr('Nhập số trang');return;} if(!pageFile){setUploadErr('Chọn file');return;} const fd=new FormData(); fd.append('chapterId',uploadChapterId); fd.append('pageNumber',pageNumber); fd.append('file',pageFile); if(uploadNotes)fd.append('notes',uploadNotes); uploadMutation.mutate(fd); }}
              disabled={uploadMutation.isPending}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-violet-600/25 disabled:opacity-60 transition-all">
              {uploadMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang upload...</> : <><Upload className="w-4 h-4" />Upload Trang</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
