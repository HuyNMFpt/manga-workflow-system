import { useState } from "react"
import { BookOpen, Eye, EyeOff } from "lucide-react"

interface SignupFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: string
  acceptTerms: boolean
}

export default function SignupPage() {
  const [formData, setFormData] = useState<SignupFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    acceptTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<SignupFormData>>({})

  const roles = [
    { value: "MANGAKA", label: "Mangaka", icon: "✏️", desc: "Create manga series" },
    { value: "ASSISTANT", label: "Assistant", icon: "🎨", desc: "Support mangaka" },
    { value: "EDITOR", label: "Editor", icon: "📝", desc: "Review manuscripts" },
  ]

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    // Clear error for this field
    if (errors[name as keyof SignupFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<SignupFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if (!formData.role) {
      newErrors.role = "Please select a role"
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "You must accept the terms and conditions"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)

    try {
      // TODO: Call API to register user
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate API call
      
      // Redirect to login or dashboard
      window.location.href = "/login"
    } catch (err) {
      console.error("Signup error:", err)
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

      <div className="relative z-10 w-full max-w-2xl">
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

        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Create Account
            </h2>
            <p className="text-sm text-slate-600">
              Join our manga collaborative workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                disabled={isSubmitting}
                className={`w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  errors.name
                    ? "border-red-300 focus:ring-red-500"
                    : "border-slate-300 focus:ring-purple-500"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email */}
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
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                disabled={isSubmitting}
                className={`w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  errors.email
                    ? "border-red-300 focus:ring-red-500"
                    : "border-slate-300 focus:ring-purple-500"
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="grid md:grid-cols-2 gap-4">
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
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Select Your Role
              </label>
              <div className="grid md:grid-cols-3 gap-3">
                {roles.map((role) => (
                  <label
                    key={role.value}
                    className={`relative flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.role === role.value
                        ? "border-purple-600 bg-purple-50"
                        : "border-slate-200 hover:border-purple-300"
                    } ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={formData.role === role.value}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="sr-only"
                    />
                    <span className="text-2xl mb-2">{role.icon}</span>
                    <span className="text-sm font-semibold text-slate-900 mb-1">
                      {role.label}
                    </span>
                    <span className="text-xs text-slate-500 text-center">
                      {role.desc}
                    </span>
                  </label>
                ))}
              </div>
              {errors.role && (
                <p className="mt-2 text-xs text-red-600">{errors.role}</p>
              )}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`mt-0.5 w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 disabled:opacity-60 ${
                    errors.acceptTerms ? "border-red-300" : ""
                  }`}
                />
                <span className="text-sm text-slate-600">
                  I agree to the{" "}
                  <a
                    href="/terms"
                    className="text-purple-600 hover:text-purple-700 font-medium underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    className="text-purple-600 hover:text-purple-700 font-medium underline"
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="mt-1 text-xs text-red-600">{errors.acceptTerms}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <span className="relative z-10">
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <a
              href="/login"
              className="font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
