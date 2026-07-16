import { useState, useRef, useEffect } from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { useNotificationStore } from "@/stores/notificationStore"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/axios"
import { ROLE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  BookOpen, LayoutDashboard, ListTodo, FileText,
  BarChart2, Users, Bell, LogOut, Layers, X, CheckCheck, Clock,
  PenTool, Feather, Film, Trophy, Star, KeyRound, Eye, EyeOff, CheckCircle2
} from "lucide-react"

const NAV_ITEMS = {
  mangaka: [
    { to: "/mangaka",              label: "Studio",        icon: LayoutDashboard, end: true },
    { to: "/mangaka/series",       label: "Series",        icon: BookOpen                   },
    { to: "/mangaka/chapters",     label: "Chapter & Trang", icon: Layers                   },
    { to: "/mangaka/assign-tasks", label: "Giao việc",     icon: PenTool                    },
    { to: "/mangaka/review-pages", label: "Duyệt trang",   icon: Film                       },
    { to: "/mangaka/rankings",     label: "Xếp hạng",      icon: Trophy                     },
  ],
  assistant: [
    { to: "/assistant",           label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/assistant/tasks",     label: "Công việc", icon: ListTodo                   },
    { to: "/assistant/earnings",  label: "Thu nhập",  icon: BarChart2                  },
  ],
  editor: [
    { to: "/editor",              label: "Dashboard",      icon: LayoutDashboard, end: true },
    { to: "/editor/manuscripts",  label: "Bản thảo",       icon: FileText                   },
    { to: "/editor/progress",     label: "Tiến độ Studio", icon: BarChart2                  },
  ],
  board_member: [
    { to: "/board",               label: "Dashboard",       icon: LayoutDashboard, end: true },
    { to: "/board/voting",        label: "Bình duyệt",      icon: Users                      },
    { to: "/board/rankings",      label: "Bảng xếp hạng",  icon: BarChart2                  },
    { to: "/board/decisions",     label: "Quyết định",      icon: FileText                   },
  ],
  // legacy keys kept for safety
  tantou_editor:    [],
  editorial_board:  [],
}

// ── Per-role sidebar theming ───────────────────────────────────
const ROLE_THEME: Record<string, {
  bg: string; border: string; accent: string;
  accentText: string; activeGlow: string;
  logo: string; label: string;
}> = {
  mangaka: {
    bg:         "bg-[#0d0d14]",
    border:     "border-violet-900/40",
    accent:     "bg-gradient-to-r from-violet-600 to-fuchsia-600",
    accentText: "text-violet-400",
    activeGlow: "shadow-violet-600/40",
    logo:       "from-violet-500 to-fuchsia-500",
    label:      "TÁC GIẢ",
  },
  assistant: {
    bg:         "bg-[#0a0e1a]",
    border:     "border-blue-900/40",
    accent:     "bg-gradient-to-r from-blue-600 to-cyan-600",
    accentText: "text-blue-400",
    activeGlow: "shadow-blue-600/40",
    logo:       "from-blue-500 to-cyan-500",
    label:      "TRỢ LÝ",
  },
  editor: {
    bg:         "bg-[#110c05]",
    border:     "border-amber-900/40",
    accent:     "bg-gradient-to-r from-amber-600 to-orange-600",
    accentText: "text-amber-400",
    activeGlow: "shadow-amber-600/40",
    logo:       "from-amber-500 to-orange-500",
    label:      "BIÊN TẬP",
  },
  board_member: {
    bg:         "bg-[#030f0d]",
    border:     "border-teal-900/40",
    accent:     "bg-gradient-to-r from-teal-600 to-emerald-600",
    accentText: "text-teal-400",
    activeGlow: "shadow-teal-600/40",
    logo:       "from-teal-500 to-emerald-500",
    label:      "HỘI ĐỒNG",
  },
}

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const { setNotifications, markAsRead, markAllAsRead, notifications, unreadCount } = useNotificationStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showNotif,  setShowNotif]  = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwErr,  setPwErr]  = useState('')
  const [pwOk,   setPwOk]   = useState(false)
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // PUT /api/auth/change-password
  const changePwMutation = useMutation({
    mutationFn: () => api.put('/auth/change-password', {
      currentPassword: pwForm.current,
      newPassword:     pwForm.next,
    }).then(r => r.data),
    onSuccess: () => { setPwOk(true); setPwErr('') },
    onError: (e: any) => setPwErr(e.response?.data?.message ?? 'Đổi mật khẩu thất bại'),
  })

  const handleChangePw = () => {
    setPwErr('')
    if (!pwForm.current)          { setPwErr('Nhập mật khẩu hiện tại'); return }
    if (pwForm.next.length < 6)   { setPwErr('Mật khẩu mới cần ít nhất 6 ký tự'); return }
    if (pwForm.next !== pwForm.confirm) { setPwErr('Mật khẩu xác nhận không khớp'); return }
    changePwMutation.mutate()
  }

  const closePw = () => {
    setShowChangePw(false)
    setPwForm({ current:'', next:'', confirm:'' })
    setPwErr(''); setPwOk(false)
    setShowCur(false); setShowNew(false)
  }

  // Fetch notifications từ backend
  // GET /api/notifications → res.data.data = Notification[]
  const { isAuthenticated } = useAuthStore()
  useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const r = await api.get('/notifications')
      const list = r.data.data ?? []
      setNotifications(list)
      return list
    },
    enabled: isAuthenticated,          // chỉ fetch khi đã đăng nhập
    refetchInterval: 30_000,           // poll 30s
    refetchOnWindowFocus: true,        // refetch ngay khi quay lại tab
  })

  // Mark as read
  const readMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: (_, id) => { markAsRead(id); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  const readAllMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => { markAllAsRead(); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowNotif(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  const role   = user.role as keyof typeof NAV_ITEMS
  const nav    = NAV_ITEMS[role] ?? []
  const theme  = ROLE_THEME[role] ?? ROLE_THEME.mangaka

  const handleLogout = () => {
    // Clear toàn bộ React Query cache để tránh hiện data của user cũ
    qc.clear()
    logout()
    navigate('/login')
  }

  return (
    <>
    <div className={cn(
      "flex h-screen overflow-hidden font-['Instrument_Sans']",
      "bg-gradient-to-br from-[#080810] via-[#0d0d18] to-[#060612]"
    )}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={cn(
        "w-56 flex-shrink-0 flex flex-col border-r",
        theme.bg, theme.border,
        "relative overflow-hidden"
      )}>
        {/* subtle grid texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 24px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 24px)" }} />

        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-white/5 relative">
          <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-lg", theme.logo)}>
            <Feather className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-white text-[13px] font-bold tracking-tight font-['Syne']">Manga</span>
            <span className={cn("text-[13px] font-bold tracking-tight font-['Syne']", theme.accentText)}>&nbsp;CW</span>
          </div>
        </div>

        {/* Role label */}
        <div className="px-4 pt-5 pb-2">
          <span className={cn("text-[9px] font-black tracking-[0.2em] uppercase", theme.accentText)}>
            {theme.label}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          <ul className="space-y-0.5">
            {nav.map(item => (
              <li key={item.to}>
                <NavLink to={item.to} end={(item as any).end}
                  className={({ isActive }) => cn(
                    "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200",
                    isActive
                      ? cn("text-white font-semibold shadow-md", theme.accent, theme.activeGlow)
                      : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                  )}>
                  <item.icon className="w-[15px] h-[15px] flex-shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User footer */}
        <div className="border-t border-white/5 p-3 space-y-2">
          <div className="flex items-center gap-2.5 px-1">
            <div className={cn(
              "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0",
              theme.logo
            )}>
              {user.name.slice(0,2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate text-white leading-tight">{user.name}</p>
              <p className="text-[11px] text-gray-500 truncate leading-tight">{user.email}</p>
            </div>
          </div>
          <button onClick={() => setShowChangePw(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-gray-500 hover:bg-white/5 hover:text-white transition-colors">
            <KeyRound className="w-3 h-3" />Đổi mật khẩu
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut className="w-3 h-3" />Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex-shrink-0 border-b border-white/5 bg-black/20 backdrop-blur-xl flex items-center justify-end px-6 gap-3">
          {/* ── Notification Bell + Dropdown ── */}
          <div ref={bellRef} className="relative">
            <button onClick={() => setShowNotif(v => !v)}
              className="relative p-2 rounded-lg text-gray-500 hover:bg-white/5 hover:text-white transition-colors">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-10 w-80 bg-[#111118] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                  <p className="text-[13px] font-bold text-white">Thông báo</p>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={() => readAllMutation.mutate()}
                        className="text-[10px] text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                        <CheckCheck className="w-3 h-3" />Đọc tất cả
                      </button>
                    )}
                    <button onClick={() => setShowNotif(false)}
                      className="w-5 h-5 rounded flex items-center justify-center text-zinc-600 hover:text-white transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-700">
                      <Bell className="w-7 h-7 opacity-20" />
                      <p className="text-[12px]">Không có thông báo nào</p>
                    </div>
                  ) : notifications.map(n => {
                    const isRead = n.isRead === true;
                    // Icon + màu theo type
                    const typeStyle: Record<string, { dot: string; label: string }> = {
                      task_assigned:    { dot: 'bg-blue-400',    label: 'Giao việc'       },
                      task_approved:    { dot: 'bg-emerald-400', label: 'Duyệt task'      },
                      revision_requested:{ dot: 'bg-amber-400',  label: 'Cần sửa'         },
                      deadline_warning: { dot: 'bg-red-400',     label: 'Sắp deadline'    },
                      series_at_risk:   { dot: 'bg-red-500',     label: 'At-risk'         },
                      poll_updated:     { dot: 'bg-violet-400',  label: 'Kết quả poll'    },
                      series_cancelled: { dot: 'bg-red-600',     label: 'Series bị hủy'  },
                      submission_result:{ dot: 'bg-teal-400',    label: 'Kết quả nộp'    },
                    };
                    const style = typeStyle[n.type] ?? { dot: 'bg-zinc-500', label: n.type };
                    return (
                      <div key={n.id}
                        onClick={() => !isRead && readMutation.mutate(n.id)}
                        className={cn(
                          "px-4 py-3 border-b border-white/4 last:border-0 cursor-pointer transition-colors hover:bg-white/3",
                          !isRead && "bg-white/[0.03]"
                        )}>
                        <div className="flex items-start gap-2.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", isRead ? "bg-zinc-700" : style.dot)} />
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-0.5", isRead ? "text-zinc-700" : "text-zinc-500")}>
                              {style.label}
                            </p>
                            <p className={cn("text-[12px] leading-relaxed", isRead ? "text-zinc-500" : "text-zinc-200")}>
                              {n.message}
                            </p>
                            <p className="text-[10px] text-zinc-700 mt-1 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(n.createdAt).toLocaleString('vi-VN', { dateStyle:'short', timeStyle:'short' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>

    {/* ── Change Password Modal ── */}
    {showChangePw && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm bg-[#111118] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-violet-400" />
              <h2 className="text-[13px] font-bold text-white">Đổi mật khẩu</h2>
            </div>
            <button onClick={closePw}
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {pwOk ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-white">Đổi mật khẩu thành công!</p>
                <button onClick={closePw}
                  className="px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/25 text-emerald-300 text-sm">
                  Đóng
                </button>
              </div>
            ) : (
              <>
                {[
                  { key:'current', label:'Mật khẩu hiện tại', show: showCur, toggle: ()=>setShowCur(v=>!v) },
                  { key:'next',    label:'Mật khẩu mới',      show: showNew, toggle: ()=>setShowNew(v=>!v) },
                  { key:'confirm', label:'Xác nhận mật khẩu mới', show: showNew, toggle: ()=>setShowNew(v=>!v) },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                      {f.label}
                    </label>
                    <div className="relative">
                      <input
                        type={f.show ? 'text' : 'password'}
                        value={(pwForm as any)[f.key]}
                        onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-all"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={f.toggle}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors">
                        {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}

                {pwErr && (
                  <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">
                    {pwErr}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={closePw}
                    className="flex-1 py-2.5 rounded-xl border border-white/8 text-zinc-400 text-sm hover:bg-white/5 transition-colors">
                    Huỷ
                  </button>
                  <button onClick={handleChangePw} disabled={changePwMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {changePwMutation.isPending
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Đang đổi...</>
                      : 'Xác nhận'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
