import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { BookOpen, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react"
import { authService } from "@/services/authService"

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})
  const [apiError, setApiError] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  // Password strength indicator
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "",
    color: "",
  })

  useEffect(() => {
    validateToken()
  }, [token])

  // Validate token from URL
  const validateToken = async () => {
    if (!token) {
      setTokenValid(false)
      setIsValidating(false)
      setApiError("Invalid reset link. Please request a new password reset.")
      return
    }

    try {
      // ✅ REAL API CALL
      const response = await authService.validateResetToken(token)

      if (response.valid) {
        setTokenValid(true)
      } else {
        setTokenValid(false)
        setApiError(response.message || "Invalid reset link")
      }
    } catch (error: any) {
      setTokenValid(false)
      setApiError(error.response?.data?.message || "Reset link expired or invalid. Please request a new one.")
    } finally {
      setIsValidating(false)
    }
  }

  // Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++

    const strengths = [
      { score: 0, label: "Very Weak", color: "bg-red-500" },
      { score: 1, label: "Weak", color: "bg-orange-500" },
      { score: 2, label: "Fair", color: "bg-yellow-500" },
      { score: 3, label: "Good", color: "bg-blue-500" },
      { score: 4, label: "Strong", color: "bg-green-500" },
      { score: 5, label: "Very Strong", color: "bg-green-600" },
    ]

    return strengths[score]
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Calculate password strength
    if (name === "password") {
      setPasswordStrength(calculatePasswordStrength(value))
    }

    // Clear error for this field
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
    setApiError("")
  }

  const validate = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {}

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one lowercase letter"
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase letter"
    } else if (!/\d/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)
    setApiError("")

    try {
      // ✅ REAL API CALL
      await authService.resetPassword(token!, formData.password)

      setIsSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login", {
          state: { message: "Password reset successfully! Please sign in with your new password." },
        })
      }, 3000)
    } catch (error: any) {
      setApiError(error.response?.data?.message || "Failed to reset password. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 relative overflow-hidden">
      {/* Same background as ForgotPasswordPage */}
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
          {/* Validating Token */}
          {isValidating && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-600">Validating reset link...</p>
            </div>
          )}

          {/* Invalid Token */}
          {!isValidating && !tokenValid && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <AlertCircle className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Invalid Link</h2>
              <p className="text-sm text-slate-600 mb-6">{apiError}</p>
              <a
                href="/forgot-password"
                className="inline-block w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all text-center"
              >
                Request New Reset Link
              </a>
            </div>
          )}

          {/* Success */}
          {!isValidating && tokenValid && isSuccess && (
            <div className="text-center py-6 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Reset!</h2>

              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Your password has been successfully reset. Redirecting to sign in...
              </p>

              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span>Redirecting in 3 seconds...</span>
              </div>
            </div>
          )}

          {/* Reset Form - Only render password fields if token is valid */}
          {!isValidating && tokenValid && !isSuccess && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Reset Your Password</h2>
                <p className="text-sm text-slate-600">
                  Enter your new password below. Make it strong and memorable!
                </p>
              </div>

              {apiError && (
                <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 animate-in fade-in slide-in-from-top-2 duration-300">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Password - Remaining form same as original */}
                {/* ... (keep existing password form fields) ... */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your new password"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 pr-12 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                        errors.password
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 focus:ring-purple-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-60"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600">
                          {passwordStrength.label}
                        </span>
                      </div>
                    </div>
                  )}

                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}

                  {/* Password Requirements */}
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-slate-700">Password must contain:</p>
                    <ul className="text-xs text-slate-600 space-y-0.5">
                      <li className="flex items-center gap-1.5">
                        <div
                          className={`w-1 h-1 rounded-full ${
                            formData.password.length >= 8 ? "bg-green-500" : "bg-slate-300"
                          }`}
                        />
                        At least 8 characters
                      </li>
                      <li className="flex items-center gap-1.5">
                        <div
                          className={`w-1 h-1 rounded-full ${
                            /[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password)
                              ? "bg-green-500"
                              : "bg-slate-300"
                          }`}
                        />
                        Uppercase and lowercase letters
                      </li>
                      <li className="flex items-center gap-1.5">
                        <div
                          className={`w-1 h-1 rounded-full ${
                            /\d/.test(formData.password) ? "bg-green-500" : "bg-slate-300"
                          }`}
                        />
                        At least one number
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your new password"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 pr-12 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                        errors.confirmPassword
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 focus:ring-purple-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isSubmitting}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-60"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
                >
                  <span className="relative z-10">
                    {isSubmitting ? "Resetting Password..." : "Reset Password"}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </button>
              </form>
            </>
          )}
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
