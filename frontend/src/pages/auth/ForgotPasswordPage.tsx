import { useState } from "react"
import { BookOpen, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"
import { authService } from "@/services/authService"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate email
    if (!email.trim()) {
      setError("Email is required")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)

    try {
      // ✅ CALL REAL API
      await authService.forgotPassword(email)

      setIsSuccess(true)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Something went wrong. Please try again."
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTryAgain = () => {
    setIsSuccess(false)
    setEmail("")
    setError("")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 relative overflow-hidden">
      {/* Animated background mesh */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Floating particles */}
      {Array.from({ length: 15 }).map((_, i) => (
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

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Manga CW&PM
            </h1>
            <p className="text-xs text-white/70 uppercase tracking-widest">
              Collaborative Workspace
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {!isSuccess ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Forgot Password?
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  No worries! Enter your email address and we'll send you a link
                  to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 animate-in fade-in slide-in-from-top-2 duration-300">
                  {error}
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
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError("")
                    }}
                    placeholder="your.email@example.com"
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      error
                        ? "border-red-300 focus:ring-red-500"
                        : "border-slate-300 focus:ring-purple-500"
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
                >
                  <span className="relative z-10">
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
              </form>

              <div className="mt-6">
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to Sign In
                </a>
              </div>
            </>
          ) : (
            <div className="text-center animate-in fade-in zoom-in duration-500">
              {/* Success Icon */}
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Check Your Email
              </h2>

              <p className="text-sm text-slate-600 mb-1 leading-relaxed">
                We've sent a password reset link to
              </p>
              <p className="text-sm font-semibold text-purple-600 mb-6">
                {email}
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-900">Didn't receive the email?</strong>
                  <br />
                  Check your spam folder or click the button below to try again.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleTryAgain}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all"
                >
                  Try Another Email
                </button>

                <a
                  href="/login"
                  className="block w-full py-3 px-4 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors text-center"
                >
                  Back to Sign In
                </a>
              </div>

              {/* Email Tips */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-3 font-medium">
                  Troubleshooting Tips:
                </p>
                <ul className="text-xs text-slate-600 space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <Mail className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                    <span>Check your spam or junk folder</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Mail className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                    <span>Make sure you entered the correct email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Mail className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                    <span>Wait a few minutes for the email to arrive</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        {!isSuccess && (
          <div className="mt-6 text-center">
            <p className="text-xs text-white/60">
              Need help?{" "}
              <a
                href="/support"
                className="text-white/90 hover:text-white font-medium underline transition-colors"
              >
                Contact Support
              </a>
            </p>
          </div>
        )}
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
