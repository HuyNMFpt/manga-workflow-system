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
  PenTool, Feather, Film, Trophy, Star
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
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()


  const qc = useQueryClient()
  const { setNotifications, markAsRead, markAllAsRead, notifications, unreadCount } = useNotificationStore()
  const [showNotif, setShowNotif] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // Fetch notifications từ backend
  // GET /api/notifications → res.data.data = Notification[]
  useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const r = await api.get('/notifications')
      const list = r.data.data ?? []
      setNotifications(list)
      return list
    },
    refetchInterval: 30_000, // poll 30s
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

  const handleLogout = () => { logout(); navigate("/login") }

  return (
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
                  ) : notifications.map(n => (
                    <div key={n.id}
                      onClick={() => !n.isRead && readMutation.mutate(n.id)}
                      className={cn(
                        "px-4 py-3 border-b border-white/4 last:border-0 cursor-pointer transition-colors hover:bg-white/3",
                        !n.isRead && "bg-white/[0.03]"
                      )}>
                      <div className="flex items-start gap-2.5">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                          n.isRead ? "bg-zinc-700" : "bg-blue-400"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-[12px] leading-relaxed", n.isRead ? "text-zinc-500" : "text-zinc-200")}>
                            {n.message}
                          </p>
                          <p className="text-[10px] text-zinc-700 mt-1 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(n.createdAt).toLocaleString('vi-VN', { dateStyle:'short', timeStyle:'short' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
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
  )
}
