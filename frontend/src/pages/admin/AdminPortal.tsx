import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  Users, Plus, Search, MoreHorizontal, Check, X, Loader2,
  AlertCircle, RefreshCw, Shield, Mail, UserCog, ToggleLeft,
  ToggleRight, KeyRound, Trash2, LogOut, CheckCircle2, Eye, EyeOff,
  Building2, User
} from 'lucide-react'
import api from '@/lib/axios'

// ─── Constants ────────────────────────────────────────────────
const ROLES = [
  { value:'mangaka',      label:'Mangaka',      color:'bg-violet-500/10 text-violet-300 border-violet-500/20'  },
  { value:'assistant',    label:'Assistant',    color:'bg-blue-500/10 text-blue-300 border-blue-500/20'        },
  { value:'editor',       label:'Editor',       color:'bg-amber-500/10 text-amber-300 border-amber-500/20'     },
  { value:'board_member', label:'Board Member', color:'bg-teal-500/10 text-teal-300 border-teal-500/20'        },
]
const roleColor = (r: string) => ROLES.find(x => x.value === r)?.color ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
const roleLabel = (r: string) => ROLES.find(x => x.value === r)?.label ?? r

const inputCls = 'w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all'
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5'

// ─── Main ─────────────────────────────────────────────────────
export default function AdminPortal() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [menuId,     setMenuId]     = useState<string|null>(null)
  const [menuPos,    setMenuPos]    = useState<{ top:number; right:number } | null>(null)

  // Modals
  const [showCreate,   setShowCreate]   = useState(false)
  const [editUser,     setEditUser]     = useState<any>(null)
  const [deleteUser,   setDeleteUser]   = useState<any>(null)
  const [createdUser,  setCreatedUser]  = useState<{ name:string; email:string; companyEmail:string; tempPassword:string; personalEmail?:string } | null>(null)

  // Create form
  const [form, setForm] = useState({
    name:          '',
    companyEmail:  '',   // email công ty (dùng để login)
    tempPassword:  '',   // admin tự đặt mật khẩu tạm
    personalEmail: '',   // email cá nhân (nhận thông báo)
    role:          'mangaka',
  })
  const [formErr,   setFormErr]   = useState('')
  const [showPw,    setShowPw]    = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState({ name:'', email:'', role:'' })
  const [editErr,  setEditErr]  = useState('')

  const handleLogout = () => {
    qc.clear()
    logout()
    navigate('/login')
  }

  // ── GET /api/admin/users ──────────────────────────────────
  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin','users'],
    queryFn: async () => {
      const r = await api.get('/admin/users')
      return r.data.data ?? []
    },
  })

  // ── POST /api/admin/users ─────────────────────────────────
  // Backend: POST /api/admin/users — CreateUserRequest
  const createMutation = useMutation({
    mutationFn: () => api.post('/admin/users', {
      email:         form.companyEmail.trim(),
      name:          form.name.trim(),
      role:          form.role,
      tempPassword:  form.tempPassword.trim(),
      personalEmail: form.personalEmail.trim() || undefined,
    }).then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin','users'] })
      setShowCreate(false)
      setCreatedUser({
        name:          form.name.trim(),
        companyEmail:  form.companyEmail.trim(),
        tempPassword:  res.data?.tempPassword ?? form.tempPassword.trim(),
        email:         form.companyEmail.trim(),
        personalEmail: form.personalEmail.trim() || undefined,
      })
      setForm({ name:'', companyEmail:'', tempPassword:'', personalEmail:'', role:'mangaka' })
      setFormErr('')
    },
    onError: (e:any) => setFormErr(e.response?.data?.message ?? 'Tạo tài khoản thất bại'),
  })

  // ── PUT /api/admin/users/{id} ─────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (id: string) => api.put(`/admin/users/${id}`, {
      name:  editForm.name,
      email: editForm.email,
      role:  editForm.role,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin','users'] })
      setEditUser(null); setEditErr('')
    },
    onError: (e:any) => setEditErr(e.response?.data?.message ?? 'Cập nhật thất bại'),
  })

  // ── DELETE /api/admin/users/{id} ─────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin','users'] })
      setDeleteUser(null)
    },
    onError: (e:any) => alert(e.response?.data?.message ?? 'Xóa thất bại'),
  })

  // ── PUT /api/admin/users/{id}/toggle-active ───────────────
  // Backend trả về UserDTO với isActive đã đổi → optimistic update ngay
  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.put(`/admin/users/${id}/toggle-active`).then(r => r.data),
    onSuccess: (res) => {
      const updated = res.data
      if (updated?.id) {
        // Update cache ngay không cần refetch
        qc.setQueryData(['admin', 'users'], (old: any[]) =>
          old?.map(u => u.id === updated.id ? { ...u, isActive: updated.isActive } : u) ?? []
        )
      } else {
        qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      }
    },
  })

  // ── POST /api/admin/users/{id}/reset-password ─────────────
  const resetPwMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/reset-password`).then(r => r.data),
    onSuccess: () => { setMenuId(null); alert('Đã gửi mật khẩu tạm mới qua email.') },
    onError: (e:any) => alert(e.response?.data?.message ?? 'Lỗi reset mật khẩu'),
  })

  // Handlers
  const handleCreate = () => {
    setFormErr('')
    if (!form.name.trim())         { setFormErr('Nhập tên người dùng'); return }
    if (!form.companyEmail.trim()) { setFormErr('Nhập email công ty'); return }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(form.companyEmail.trim())) { setFormErr('Email công ty không hợp lệ'); return }
    if (form.personalEmail && !emailRe.test(form.personalEmail.trim())) {
      setFormErr('Email cá nhân không hợp lệ'); return
    }
    if (!form.tempPassword.trim()) { setFormErr('Nhập mật khẩu tạm thời'); return }
    if (form.tempPassword.length < 6) { setFormErr('Mật khẩu tạm cần ít nhất 6 ký tự'); return }
    createMutation.mutate()
  }

  const openEdit = (u: any) => {
    setEditUser(u)
    setEditForm({ name: u.name, email: u.email, role: u.role })
    setEditErr(''); setMenuId(null); setMenuPos(null)
  }

  // Filtered list
  const filtered = (users as any[]).filter((u:any) => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">

      {/* ── Header ── */}
      <div className="relative border-b border-violet-900/20 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-0 w-64 h-64 rounded-full bg-violet-600/6 blur-3xl" />
        <div className="relative px-8 pt-6 pb-5 flex items-center justify-between">
          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-violet-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-violet-500">Admin Portal</p>
              <h1 className="text-base font-black font-['Syne'] leading-tight">Quản lý tài khoản</h1>
            </div>
          </div>

          {/* Right: user info + logout */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[12px] font-semibold text-white">{user?.name ?? 'Admin'}</p>
              <p className="text-[10px] text-zinc-600">{user?.email}</p>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/8 text-zinc-400 text-[12px] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all">
              <LogOut className="w-3.5 h-3.5" />Đăng xuất
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label:'Tổng',       count:(users as any[]).length,                                                            color:'text-white'          },
            ...ROLES.map(r => ({
              label: r.label,
              count: (users as any[]).filter((u:any) => u.role === r.value).length,
              color: r.color.split(' ')[1],
            }))
          ].map((s,i) => (
            <div key={i} className="bg-white/[0.025] border border-white/5 rounded-xl px-4 py-3">
              <div className={`text-2xl font-black font-['Syne'] ${s.color}`}>{s.count}</div>
              <div className="text-[10px] text-zinc-600 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all" />
          </div>
          {/* Role filters */}
          <div className="flex items-center gap-1">
            {[{ v:'all',l:'Tất cả' }, ...ROLES.map(r => ({ v:r.value, l:r.label }))].map(f => (
              <button key={f.v} onClick={() => setRoleFilter(f.v)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  roleFilter === f.v
                    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                    : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/4'
                }`}>{f.l}</button>
            ))}
          </div>
          <button onClick={() => refetch()}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setShowCreate(true); setFormErr('') }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-lg shadow-violet-600/20 hover:shadow-violet-600/35 transition-all">
            <Plus className="w-4 h-4" />Tạo tài khoản
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-zinc-600">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Đang tải...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-red-400 opacity-60" />
            <button onClick={() => refetch()} className="text-[12px] text-violet-400 hover:text-violet-300">Thử lại</button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            <div className="grid grid-cols-[2fr_2.5fr_1fr_1fr_2.5rem] gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-700">
              <span>Người dùng</span><span>Email công ty</span><span>Role</span><span>Trạng thái</span><span></span>
            </div>

            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-zinc-700 text-sm">Không tìm thấy tài khoản nào</div>
            ) : filtered.map((u:any) => (
              <div key={u.id}
                className="grid grid-cols-[2fr_2.5fr_1fr_1fr_2.5rem] gap-4 px-6 py-4 items-center border-b border-white/4 last:border-0 hover:bg-white/[0.02] transition-colors">

                {/* Avatar + name */}
                <div className="flex items-center gap-3 min-w-0">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600/40 to-fuchsia-600/40 border border-violet-500/20 flex items-center justify-center text-[11px] font-bold text-violet-300 flex-shrink-0">
                      {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">{u.name}</p>
                    {u.createdAt && (
                      <p className="text-[10px] text-zinc-700">
                        {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <p className="text-[12px] text-zinc-500 truncate">{u.email}</p>

                {/* Role */}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit ${roleColor(u.role)}`}>
                  {roleLabel(u.role)}
                </span>

                {/* Toggle active */}
                <button onClick={() => toggleMutation.mutate(u.id)}
                  disabled={toggleMutation.isPending}
                  title={u.isActive !== false ? 'Đang hoạt động — click để vô hiệu hóa' : 'Đã khoá — click để mở'}
                  className="flex items-center gap-1.5 text-[11px] transition-colors disabled:opacity-50 w-fit">
                  {u.isActive !== false
                    ? <><ToggleRight className="w-5 h-5 text-emerald-400" /><span className="text-emerald-400">Hoạt động</span></>
                    : <><ToggleLeft  className="w-5 h-5 text-zinc-600"   /><span className="text-zinc-600">Đã khoá</span></>}
                </button>

                {/* Menu ··· */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      if (menuId === u.id) {
                        setMenuId(null); setMenuPos(null)
                      } else {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                        setMenuId(u.id)
                      }
                    }}
                    className="w-7 h-7 rounded-lg hover:bg-white/8 flex items-center justify-center text-zinc-600 hover:text-white transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════ CREATE MODAL ════ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#111118] border border-violet-900/30 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 flex-shrink-0">
              <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-violet-400" />Tạo tài khoản mới
              </h2>
              <button onClick={() => setShowCreate(false)}
                className="w-6 h-6 rounded text-zinc-600 hover:text-white flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {/* Tên */}
              <div>
                <label className={labelCls}>Họ và tên <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  placeholder="Nguyễn Văn A" className={inputCls} />
              </div>

              {/* Email công ty */}
              <div>
                <label className={labelCls}>
                  <Building2 className="w-3 h-3 inline mr-1 text-violet-400" />
                  Email công ty <span className="text-red-400">*</span>
                  <span className="text-zinc-700 normal-case tracking-normal font-normal ml-1">(dùng để đăng nhập)</span>
                </label>
                <input type="email" value={form.companyEmail}
                  onChange={e => setForm(f => ({...f, companyEmail: e.target.value}))}
                  placeholder="tenuser@manga-cwpm.local" className={inputCls} />
              </div>

              {/* Mật khẩu tạm */}
              <div>
                <label className={labelCls}>
                  Mật khẩu tạm thời <span className="text-red-400">*</span>
                  <span className="text-zinc-700 normal-case tracking-normal font-normal ml-1">(user đổi sau lần đầu đăng nhập)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.tempPassword}
                    onChange={e => setForm(f => ({...f, tempPassword: e.target.value}))}
                    placeholder="Ít nhất 6 ký tự"
                    className={`${inputCls} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Email cá nhân */}
              <div>
                <label className={labelCls}>
                  <User className="w-3 h-3 inline mr-1 text-zinc-500" />
                  Email cá nhân
                  <span className="text-zinc-700 normal-case tracking-normal font-normal ml-1">(tùy chọn — hệ thống sẽ gửi tài khoản + mật khẩu đến đây)</span>
                </label>
                <input type="email" value={form.personalEmail}
                  onChange={e => setForm(f => ({...f, personalEmail: e.target.value}))}
                  placeholder="user@gmail.com" className={inputCls} />
                {form.personalEmail && (
                  <p className="text-[10px] text-blue-400 mt-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Hệ thống sẽ tự gửi email thông tin đăng nhập đến địa chỉ này
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className={labelCls}>Role <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setForm(f => ({...f, role: r.value}))}
                      className={`py-2 rounded-xl border text-[12px] font-semibold transition-all ${
                        form.role === r.value ? r.color : 'bg-white/3 border-white/6 text-zinc-500 hover:text-zinc-300'
                      }`}>{r.label}</button>
                  ))}
                </div>
              </div>

              {formErr && (
                <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">{formErr}</p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-white/5 flex gap-2 flex-shrink-0">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">
                Huỷ
              </button>
              <button onClick={handleCreate} disabled={createMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                {createMutation.isPending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang tạo...</>
                  : <><Check className="w-3.5 h-3.5" />Tạo tài khoản</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ CREATED SUCCESS MODAL ════ */}
      {createdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#111118] border border-emerald-900/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/6 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-[13px] font-bold text-white">Tạo tài khoản thành công</h2>
            </div>
            <div className="px-5 py-4 space-y-2">
              <div className="bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">Tên</p>
                <p className="text-sm text-white">{createdUser.name}</p>
              </div>
              <div className="bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">Email đăng nhập</p>
                <p className="text-sm text-white font-mono">{createdUser.companyEmail}</p>
              </div>

              {/* Email cá nhân — hệ thống tự gửi */}
              {createdUser.personalEmail ? (
                <div className="flex items-start gap-2.5 bg-blue-500/6 border border-blue-500/15 rounded-xl px-4 py-3">
                  <Mail className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold text-blue-300 mb-0.5">Email đã được gửi</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Thông tin đăng nhập và mật khẩu tạm đã được gửi tới{' '}
                      <span className="text-white font-semibold">{createdUser.personalEmail}</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 bg-amber-500/6 border border-amber-500/15 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold text-amber-300 mb-0.5">Chưa có email cá nhân</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Không có địa chỉ để gửi tự động. Vui lòng tự thông báo thông tin đăng nhập cho{' '}
                      <span className="text-white font-semibold">{createdUser.name}</span> qua kênh khác (nhắn tin, gặp trực tiếp...).
                    </p>
                  </div>
                </div>
              )}

              <button onClick={() => setCreatedUser(null)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/80 to-teal-600/80 text-white text-sm font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all mt-2">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ EDIT MODAL ════ */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#111118] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
              <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
                <UserCog className="w-4 h-4 text-amber-400" />Cập nhật — {editUser.name}
              </h2>
              <button onClick={() => setEditUser(null)}
                className="w-6 h-6 rounded text-zinc-600 hover:text-white flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className={labelCls}>Họ và tên</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>
                  <Building2 className="w-3 h-3 inline mr-1 text-violet-400" />Email công ty
                </label>
                <input type="email" value={editForm.email}
                  onChange={e => setEditForm(f => ({...f, email: e.target.value}))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setEditForm(f => ({...f, role: r.value}))}
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
                  className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">Huỷ</button>
                <button onClick={() => updateMutation.mutate(editUser.id)} disabled={updateMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                  {updateMutation.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang lưu...</>
                    : <><Check className="w-3.5 h-3.5" />Lưu thay đổi</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ DELETE CONFIRM MODAL ════ */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#111118] border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/6 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              <h2 className="text-[13px] font-bold text-white">Xác nhận xóa tài khoản</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="bg-red-500/6 border border-red-500/15 rounded-xl px-4 py-3">
                <p className="text-[12px] text-red-300 leading-relaxed">
                  Bạn sắp xóa tài khoản của <span className="font-bold text-white">{deleteUser.name}</span> ({deleteUser.email}).
                  <br /><span className="text-zinc-500 mt-1 block">Hành động này không thể hoàn tác.</span>
                </p>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Chỉ xóa khi nhập sai thông tin hoặc tạo nhầm. Nếu muốn vô hiệu hóa tạm thời, dùng nút Toggle Active thay thế.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">
                  Huỷ
                </button>
                <button onClick={() => deleteMutation.mutate(deleteUser.id)} disabled={deleteMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                  {deleteMutation.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang xóa...</>
                    : <><Trash2 className="w-3.5 h-3.5" />Xóa tài khoản</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dropdown menu — fixed position để không bị clip bởi overflow-hidden ── */}
      {menuId && menuPos && (() => {
        const u = (users as any[]).find((x:any) => x.id === menuId)
        if (!u) return null
        return (
          <div
            style={{ position:'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="w-48 bg-[#18181f] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <button onClick={() => { openEdit(u) }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-zinc-300 hover:bg-white/5 transition-colors">
              <UserCog className="w-3.5 h-3.5" />Cập nhật tài khoản
            </button>
            <button onClick={() => { resetPwMutation.mutate(u.id) }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-zinc-300 hover:bg-white/5 transition-colors">
              <KeyRound className="w-3.5 h-3.5" />Reset mật khẩu
            </button>
            <div className="border-t border-white/5 my-0.5" />
            <button onClick={() => { setDeleteUser(u); setMenuId(null); setMenuPos(null) }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-red-400 hover:bg-red-500/8 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />Xóa tài khoản
            </button>
          </div>
        )
      })()}

      {/* Backdrop for dropdown */}
      {menuId && <div className="fixed inset-0 z-[9998]" onClick={() => { setMenuId(null); setMenuPos(null) }} />}
    </div>
  )
}
