import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { useNotificationStore } from "@/stores/notificationStore"
import { ROLE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  BookOpen, LayoutDashboard, ListTodo, FileText,
  BarChart2, Users, Bell, LogOut, Layers
} from "lucide-react"

// Nav items theo từng role
const NAV_ITEMS = {
  mangaka: [
    { to: "/mangaka", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/mangaka/series", label: "Series của tôi", icon: BookOpen },
    { to: "/mangaka/chapters", label: "Chapter & Trang", icon: Layers },
    { to: "/mangaka/ranking", label: "Xếp hạng", icon: BarChart2 },
  ],
  assistant: [
    { to: "/assistant", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/assistant/tasks", label: "Công việc", icon: ListTodo },
    { to: "/assistant/earnings", label: "Thu nhập", icon: BarChart2 },
  ],
  tantou_editor: [
    { to: "/editor", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/editor/manuscripts", label: "Bản thảo", icon: FileText },
    { to: "/editor/progress", label: "Tiến độ Studio", icon: BarChart2 },
  ],
  editorial_board: [
    { to: "/board", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/board/voting", label: "Bình duyệt", icon: Users },
    { to: "/board/rankings", label: "Bảng xếp hạng", icon: BarChart2 },
    { to: "/board/decisions", label: "Quyết định", icon: FileText },
  ],
}

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()

  if (!user) return null

  const navItems = NAV_ITEMS[user.role] ?? []

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 border-r border-border flex flex-col bg-card">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">MangaFlow</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
            {ROLE_LABELS[user.role]}
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border flex items-center justify-end gap-3 px-6 bg-card flex-shrink-0">
          <button className="relative p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
