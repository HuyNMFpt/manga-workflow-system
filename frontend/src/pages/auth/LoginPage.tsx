import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { BookOpen, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const { login, isLoggingIn, loginError } = useAuth()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ email: formData.email, password: formData.password })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleRoleSelect = (role: string, email: string) => {
    setSelectedRole(role)
    setFormData((prev) => ({
      ...prev,
      email: email,
      password: "password123",
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background mesh */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/5"
          style={{
            width: `${Math.random() * 4 + 1}px`,
            height: `${Math.random() * 4 + 1}px`,
            left: `${Math.random() * 100}%`,
            animation: `float ${Math.random() * 10 + 15}s linear infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}

      <div className="relative z-10 w-full max-w-6xl mx-4 grid md:grid-cols-[1fr_1.3fr] gap-0 bg-slate-50 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Left side - Branding */}
        <div className="relative bg-gradient-to-br from-purple-600 to-purple-800 p-12 flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Manga CW&PM
                </h1>
                <p className="text-xs text-white/70 uppercase tracking-widest">
                  Collaborative Workspace
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-5">
            {[
              {
                icon: "✨",
                title: "Streamlined Workflow",
                desc: "Manage your manga projects from concept to publication",
              },
              {
                icon: "🎨",
                title: "Creative Collaboration",
                desc: "Work seamlessly with assistants and editors in real-time",
              },
              {
                icon: "📊",
                title: "Smart Analytics",
                desc: "Track performance with detailed insights and rankings",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex gap-3 animate-in slide-in-from-left duration-700"
                style={{ animationDelay: `${400 + i * 100}ms` }}
              >
                <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center text-lg flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Form */}
        <div className="p-12 flex flex-col justify-center animate-in fade-in slide-in-from-right duration-700 delay-300">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-sm text-slate-600">
              Sign in to continue to your workspace
            </p>
          </div>

          {loginError && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 animate-in fade-in slide-in-from-top-2 duration-300">
              Email hoặc mật khẩu không đúng. Vui lòng thử lại.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                disabled={isLoggingIn}
                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  disabled={isLoggingIn}
                  className="w-full px-4 py-3 pr-12 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoggingIn}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-60"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  disabled={isLoggingIn}
                  className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 disabled:opacity-60"
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <a
                href="/forgot-password"
                className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
              >
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <span className="relative z-10">
                {isLoggingIn ? "Signing In..." : "Sign In"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-500">or select your role</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { role: "mangaka", icon: "✏️", name: "Mangaka", email: "mangaka@demo.com" },
              { role: "assistant", icon: "🎨", name: "Assistant", email: "assistant@demo.com" },
              { role: "editor", icon: "📝", name: "Tantou Editor", email: "editor@demo.com" },
              { role: "board", icon: "👔", name: "Editorial Board", email: "board@demo.com" },
            ].map(({ role, icon, name, email }) => (
              <button
                key={role}
                type="button"
                onClick={() => !isLoggingIn && handleRoleSelect(role, email)}
                disabled={isLoggingIn}
                className={`p-3 rounded-lg border-2 transition-all hover:border-purple-500 hover:bg-purple-50 disabled:opacity-60 disabled:cursor-not-allowed ${
                  selectedRole === role
                    ? "border-purple-600 bg-purple-600 text-white"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <span className="text-xs font-medium">{name}</span>
                </div>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
