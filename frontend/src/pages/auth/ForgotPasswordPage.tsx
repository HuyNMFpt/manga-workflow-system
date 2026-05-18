import { useState } from "react"
import { BookOpen, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      // TODO: Call API to send reset password email
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate API call
      
      setIsSuccess(true)
    } catch (err) {
      setError("Có lỗi xảy ra. Vui lòng thử lại sau.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

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
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {!isSuccess ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Forgot Password?
                </h2>
                <p className="text-sm text-slate-600">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
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
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <a
                  href="/login"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                >
                  ← Back to Login
                </a>
              </div>
            </>
          ) : (
            <div className="text-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Check Your Email
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                We've sent a password reset link to{" "}
                <span className="font-semibold">{email}</span>
              </p>
              <p className="text-xs text-slate-500 mb-6">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setIsSuccess(false)}
                  className="text-purple-600 hover:text-purple-700 font-medium underline"
                >
                  try again
                </button>
              </p>
              <a
                href="/login"
                className="inline-block py-2 px-6 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Back to Login
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
