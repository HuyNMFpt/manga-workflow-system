import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Plus, Search, MoreHorizontal, Check, X, Loader2,
  AlertCircle, RefreshCw, Shield, Mail, UserCog, ToggleLeft,
  ToggleRight, KeyRound, Eye, EyeOff
} from 'lucide-react'
import api from '@/lib/axios'

// ─── Types ──────────────────────────────────────────────────────
const ROLES = [
  { value:'mangaka',      label:'Mangaka',      color:'bg-violet-500/10 text-violet-300 border-violet-500/20'  },
  { value:'assistant',    label:'Assistant',    color:'bg-blue-500/10 text-blue-300 border-blue-500/20'        },
  { value:'editor',       label:'Editor',       color:'bg-amber-500/10 text-amber-300 border-amber-500/20'     },
  { value:'board_member', label:'Board Member', color:'bg-teal-500/10 text-teal-300 border-teal-500/20'        },
]
const roleColor = (r: string) => ROLES.find(x => x.value === r)?.color
  ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
const roleLabel = (r: string) => ROLES.find(x => x.value === r)?.label ?? r

const inputCls = 'w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all'
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5'

// ─── Main ────────────────────────────────────────────────────────
export default function AdminPortal() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser]     = useState<any>(null)
  const [menuId,   setMenuId]       = useState<string|null>(null)

  // Create form state
  const [form, setForm] = useState({ name:'', email:'', role:'mangaka' })
  const [formErr, setFormErr] = useState('')

  // Edit form state
  const [editForm, setEditForm] = useState({ name:'', role:'' })
  const [editErr, setEditErr]   = useState('')

  // ── GET /api/admin/users → plain list ───────────────────────
  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const r = await api.get('/admin/users')
      return r.data.data ?? []
    },
  })

  // ── POST /api/admin/users ────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () => api.post('/admin/users', form).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin','users'] })
      setShowCreate(false)
      setForm({ name:'', email:'', role:'mangaka' })
      setFormErr('')
    },
    onError: (e:any) => setFormErr(e.response?.data?.message ?? 'Tạo tài khoản thất bại'),
  })

  // ── PUT /api/admin/users/{id} ────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (id: string) => api.put(`/admin/users/${id}`, editForm).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin','users'] })
      setEditUser(null); setEditErr('')
    },
    onError: (e:any) => setEditErr(e.response?.data?.message ?? 'Cập nhật thất bại'),
  })

  // ── PUT /api/admin/users/{id}/toggle-active ──────────────────
  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.put(`/admin/users/${id}/toggle-active`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','users'] }),
  })

  // ── POST /api/admin/users/{id}/reset-password ────────────────
  const resetPwMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/reset-password`).then(r => r.data),
    onSuccess: (_,id) => { setMenuId(null); alert('Đã gửi mật khẩu tạm qua email.') },
    onError: (e:any) => alert(e.response?.data?.message ?? 'Lỗi reset mật khẩu'),
  })

  const handleCreate = () => {
    setFormErr('')
    if (!form.name.trim())  { setFormErr('Nhập tên người dùng'); return }
    if (!form.email.trim()) { setFormErr('Nhập email'); return }
    if (!form.role)         { setFormErr('Chọn role'); return }
    createMutation.mutate()
  }

  const openEdit = (u: any) => {
    setEditUser(u)
    setEditForm({ name: u.name, role: u.role })
    setEditErr('')
    setMenuId(null)
  }

  // Filtered list
  const filtered = (users as any[]).filter((u:any) => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">

      {/* Header */}
      <div className="relative border-b border-violet-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-64 h-64 rounded-full bg-violet-600/6 blur-3xl" />
        <div className="relative px-8 pt-8 pb-6 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-violet-400" />
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-violet-500">Admin · Quản lý</p>
            </div>
            <h1 className="text-2xl font-black font-['Syne']">Quản lý tài khoản</h1>
            <p className="text-sm text-zinc-600 mt-1">
              {(users as any[]).length} tài khoản trong hệ thống
            </p>
          </div>
          <button onClick={() => { setShowCreate(true); setFormErr('') }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 transition-all">
            <Plus className="w-4 h-4" />Tạo tài khoản
          </button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">

        {/* Search + filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all"
            />
          </div>
          <div className="flex items-center gap-1">
            {[{ v:'all', l:'Tất cả' }, ...ROLES].map(r => (
              <button key={r.v} onClick={() => setRoleFilter(r.v)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  roleFilter === r.v
                    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                    : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
                }`}>{r.l}</button>
            ))}
          </div>
          <button onClick={() => refetch()}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-zinc-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-700">
            <AlertCircle className="w-8 h-8 opacity-30" />
            <p className="text-sm">Không thể tải dữ liệu</p>
            <button onClick={() => refetch()}
              className="text-[12px] text-violet-400 hover:text-violet-300">Thử lại</button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_2rem] gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-700">
              <span>Người dùng</span>
              <span>Email</span>
              <span>Role</span>
              <span>Trạng thái</span>
              <span></span>
            </div>

            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-zinc-700 text-sm">
                Không tìm thấy tài khoản nào
              </div>
            ) : filtered.map((u: any) => (
              <div key={u.id} className="grid grid-cols-[2fr_2fr_1fr_1fr_2rem] gap-4 px-6 py-4 items-center border-b border-white/4 last:border-0 hover:bg-white/[0.02] transition-colors">

                {/* Name + avatar */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600/40 to-fuchsia-600/40 border border-violet-500/20 flex items-center justify-center text-[11px] font-bold text-violet-300 flex-shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <p className="text-[13px] font-semibold text-white truncate">{u.name}</p>
                </div>

                {/* Email */}
                <p className="text-[12px] text-zinc-500 truncate">{u.email}</p>

                {/* Role badge */}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit ${roleColor(u.role)}`}>
                  {roleLabel(u.role)}
                </span>

                {/* Active toggle */}
                <button
                  onClick={() => toggleMutation.mutate(u.id)}
                  disabled={toggleMutation.isPending}
                  className="flex items-center gap-1.5 text-[11px] transition-colors disabled:opacity-50">
                  {u.isActive !== false ? (
                    <><ToggleRight className="w-5 h-5 text-emerald-400" /><span className="text-emerald-400">Hoạt động</span></>
                  ) : (
                    <><ToggleLeft className="w-5 h-5 text-zinc-600" /><span className="text-zinc-600">Đã khoá</span></>
                  )}
                </button>

                {/* Menu */}
                <div className="relative">
                  <button onClick={() => setMenuId(menuId === u.id ? null : u.id)}
                    className="w-7 h-7 rounded-lg hover:bg-white/8 flex items-center justify-center text-zinc-600 hover:text-white transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {menuId === u.id && (
                    <div className="absolute right-0 top-8 w-44 bg-[#18181f] border border-white/10 rounded-xl shadow-2xl z-10 overflow-hidden">
                      <button onClick={() => openEdit(u)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-zinc-300 hover:bg-white/5 transition-colors">
                        <UserCog className="w-3.5 h-3.5" />Chỉnh sửa
                      </button>
                      <button onClick={() => { resetPwMutation.mutate(u.id) }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-zinc-300 hover:bg-white/5 transition-colors">
                        <KeyRound className="w-3.5 h-3.5" />Reset mật khẩu
                      </button>
                      <button onClick={() => { toggleMutation.mutate(u.id); setMenuId(null) }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-zinc-300 hover:bg-white/5 transition-colors">
                        {u.isActive !== false
                          ? <><ToggleLeft className="w-3.5 h-3.5" />Khoá tài khoản</>
                          : <><ToggleRight className="w-3.5 h-3.5" />Mở khoá</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#111118] border border-violet-900/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
              <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-violet-400" />Tạo tài khoản mới
              </h2>
              <button onClick={() => setShowCreate(false)}
                className="w-6 h-6 rounded text-zinc-600 hover:text-white flex items-center justify-center transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className={labelCls}>Tên <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  placeholder="Nguyễn Văn A" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email <span className="text-red-400">*</span></label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  placeholder="user@example.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Role <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button key={r.value} onClick={() => setForm(f => ({...f, role: r.value}))}
                      className={`py-2 rounded-xl border text-[12px] font-semibold transition-all ${
                        form.role === r.value ? r.color : 'bg-white/3 border-white/6 text-zinc-500 hover:text-zinc-300'
                      }`}>{r.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-500/6 border border-blue-500/15 rounded-xl">
                <Mail className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Hệ thống sẽ tự gửi mật khẩu tạm vào email người dùng.
                </p>
              </div>
              {formErr && (
                <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">{formErr}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">
                  Huỷ
                </button>
                <button onClick={handleCreate} disabled={createMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {createMutation.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang tạo...</>
                    : <><Check className="w-3.5 h-3.5" />Tạo tài khoản</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#111118] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
              <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
                <UserCog className="w-4 h-4 text-amber-400" />Chỉnh sửa — {editUser.name}
              </h2>
              <button onClick={() => setEditUser(null)}
                className="w-6 h-6 rounded text-zinc-600 hover:text-white flex items-center justify-center transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className={labelCls}>Tên</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button key={r.value} onClick={() => setEditForm(f => ({...f, role: r.value}))}
                      className={`py-2 rounded-xl border text-[12px] font-semibold transition-all ${
                        editForm.role === r.value ? r.color : 'bg-white/3 border-white/6 text-zinc-500 hover:text-zinc-300'
                      }`}>{r.label}</button>
                  ))}
                </div>
              </div>
              {editErr && (
                <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">{editErr}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">
                  Huỷ
                </button>
                <button onClick={() => updateMutation.mutate(editUser.id)} disabled={updateMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {updateMutation.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang lưu...</>
                    : <><Check className="w-3.5 h-3.5" />Lưu thay đổi</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close dropdown on outside click */}
      {menuId && (
        <div className="fixed inset-0 z-[5]" onClick={() => setMenuId(null)} />
      )}
    </div>
  )
}
