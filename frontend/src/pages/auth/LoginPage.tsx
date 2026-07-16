import { useState, useEffect } from "react"
import { Eye, EyeOff, BookOpen, Feather, Users, BarChart2, Clock } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

export default function LoginPage() {
  const { login, isLoggingIn, loginError, retryAfter } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "", password: "", remember: false,
  })
  const [countdown, setCountdown] = useState<number | null>(null)

  // Khi bị rate limit → bắt đầu đếm ngược
  useEffect(() => {
    if (retryAfter != null) setCountdown(retryAfter)
  }, [retryAfter])

  useEffect(() => {
    if (countdown == null || countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => (c != null && c > 1 ? c - 1 : null)), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const isRateLimited = countdown != null && countdown > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isRateLimited) return
    login({ email: formData.email, password: formData.password })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }

  const features = [
    { icon: Feather,  title: "Streamlined Workflow",    desc: "Quản lý dự án manga từ ý tưởng đến xuất bản"           },
    { icon: Users,    title: "Creative Collaboration",  desc: "Phối hợp với trợ lý và editor theo thời gian thực"     },
    { icon: BarChart2,title: "Smart Analytics",         desc: "Theo dõi hiệu suất và bảng xếp hạng chi tiết"          },
  ]

  return (
    <div className="min-h-screen flex">

      {/* ── Left — Branding ── */}
      <div className="hidden md:flex md:w-[45%] relative bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-800 flex-col justify-between p-12 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">Manga CW&PM</h1>
            <p className="text-[10px] text-white/60 uppercase tracking-[0.2em] mt-0.5">Collaborative Workspace</p>
          </div>
        </div>

        {/* Center text */}
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Nơi<br />sáng tạo<br />bắt đầu.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Hệ thống quản lý nội bộ cho quy trình sản xuất manga chuyên nghiệp.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <f.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{f.title}</p>
                <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right — Form ── */}
      <div className="flex-1 flex items-center justify-center bg-[#0a0a12] px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 md:hidden">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-white font-bold">Manga CW&PM</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-white mb-1.5">Chào mừng trở lại</h2>
            <p className="text-sm text-zinc-500">Đăng nhập để tiếp tục vào workspace</p>
          </div>

          {/* Error / Rate limit */}
          {isRateLimited ? (
            <div className="mb-5 px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-300">Tài khoản tạm thời bị khoá</p>
                <p className="text-[11px] text-amber-500/80 mt-0.5">
                  Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau{" "}
                  <span className="font-bold tabular-nums">{countdown}s</span>
                </p>
              </div>
            </div>
          ) : loginError ? (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              Email hoặc mật khẩu không đúng. Vui lòng thử lại.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                Email
              </label>
              <input
                id="email" name="email" type="email"
                autoComplete="email" required
                value={formData.email} onChange={handleChange}
                placeholder="your@manga-cwpm.local"
                disabled={isLoggingIn}
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password" required
                  value={formData.password} onChange={handleChange}
                  placeholder="••••••••"
                  disabled={isLoggingIn}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all disabled:opacity-50"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  disabled={isLoggingIn}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="remember"
                  checked={formData.remember} onChange={handleChange}
                  disabled={isLoggingIn}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-violet-500 disabled:opacity-50" />
                <span className="text-sm text-zinc-500">Ghi nhớ đăng nhập</span>
              </label>
              <a href="/forgot-password"
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium">
                Quên mật khẩu?
              </a>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoggingIn || isRateLimited}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-violet-600/30 hover:scale-[1.01] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all mt-2 relative overflow-hidden group">
              <span className="relative z-10">
                {isLoggingIn
                  ? "Đang đăng nhập..."
                  : isRateLimited
                    ? `Thử lại sau ${countdown}s`
                    : "Đăng nhập"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </form>

          <p className="text-center text-xs text-zinc-700 mt-8">
            Cần tài khoản? Liên hệ{" "}
            <a href="mailto:admin@manga-cwpm.local"
              className="text-zinc-500 hover:text-zinc-300 transition-colors">
              admin@manga-cwpm.local
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
