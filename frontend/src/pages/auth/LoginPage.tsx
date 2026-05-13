import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { BookOpen } from "lucide-react"

export default function LoginPage() {
  const { login, isLoggingIn, loginError } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ email, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">MangaFlow</span>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-base font-semibold mb-1">Đăng nhập</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Hệ thống quản lý quy trình sáng tác Manga
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="password">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full"
              />
            </div>

            {loginError && (
              <p className="text-sm text-destructive">
                Email hoặc mật khẩu không đúng. Vui lòng thử lại.
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoggingIn ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </div>

        {/* Dev shortcuts - xóa trước khi production */}
        <div className="mt-4 rounded-lg border border-dashed border-border p-3">
          <p className="text-[11px] text-muted-foreground text-center mb-2">
            Demo accounts (dev only)
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "Mangaka", email: "mangaka@demo.com" },
              { label: "Assistant", email: "assistant@demo.com" },
              { label: "Editor", email: "editor@demo.com" },
              { label: "Board", email: "board@demo.com" },
            ].map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setEmail(acc.email)
                  setPassword("password123")
                }}
                className="text-[11px] text-muted-foreground border border-border rounded px-2 py-1 hover:bg-accent transition-colors"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
