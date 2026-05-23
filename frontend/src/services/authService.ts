import api from "@/lib/axios"
import { ApiResponse, LoginRequest, LoginResponse, User } from "@/types"
import { mockLogin } from "./mockAuthService"

// Auto-switch mock/real based on environment
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true'

console.log('🔐 Auth Mode:', USE_MOCK_AUTH ? 'MOCK' : 'REAL')

// ============================================
// MOCK WRAPPER FUNCTIONS
// ============================================

const mockLoginWrapper = async (data: LoginRequest): Promise<LoginResponse> => {
  // Call mock login
  const result = await mockLogin(data.email, data.password)
  
  // Convert mock result to match LoginResponse type
  return {
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.role as any,
      avatar_url: result.user.avatar_url
    },
    token: result.token,
    refreshToken: result.token
  }
}

const mockRegister = async (data: {
  email: string
  password: string
  name: string
  role: string
}): Promise<LoginResponse> => {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  return {
    user: {
      id: Date.now(),
      name: data.name,
      email: data.email,
      role: data.role as any,
      avatar_url: null
    },
    token: `mock-token-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`
  }
}

const mockGetMe = async (): Promise<User> => {
  const token = localStorage.getItem('token')
  const userRole = localStorage.getItem('userRole')
  const userName = localStorage.getItem('userName')
  const userEmail = localStorage.getItem('userEmail')
  
  if (!token) {
    throw new Error('No token found')
  }

  await new Promise(resolve => setTimeout(resolve, 300))

  return {
    id: 1,
    name: userName || 'Mock User',
    email: userEmail || 'mock@demo.com',
    role: userRole as any,
    avatar_url: null
  }
}

const mockLogout = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300))
  localStorage.clear()
}

const mockForgotPassword = async (email: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  console.log('Mock: Forgot password email sent to', email)
}

const mockValidateResetToken = async (token: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 800))
  
  if (!token || token.length < 10) {
    throw new Error('Invalid token')
  }
}

const mockResetPassword = async (token: string, newPassword: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  if (!token) throw new Error('Token required')
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters')
  }
  
  console.log('Mock: Password reset successfully')
}

// ============================================
// REAL API FUNCTIONS
// ============================================

const realLogin = async (data: LoginRequest): Promise<LoginResponse> => {
  const res = await api.post<ApiResponse<LoginResponse>>("/auth/login", data)
  return res.data.data
}

const realRegister = async (data: {
  email: string
  password: string
  name: string
  role: string
}): Promise<LoginResponse> => {
  const res = await api.post<ApiResponse<LoginResponse>>("/auth/register", data)
  return res.data.data
}

const realGetMe = async (): Promise<User> => {
  const res = await api.get<ApiResponse<User>>("/auth/me")
  return res.data.data
}

const realLogout = async (): Promise<void> => {
  await api.post("/auth/logout")
}

const realForgotPassword = async (email: string): Promise<void> => {
  await api.post("/auth/forgot-password", { email })
}

const realValidateResetToken = async (token: string): Promise<void> => {
  await api.post("/auth/validate-reset-token", { token })
}

const realResetPassword = async (token: string, newPassword: string): Promise<void> => {
  await api.post("/auth/reset-password", { token, newPassword })
}

// ============================================
// EXPORT (Auto-switch mock/real)
// ============================================

export const authService = {
  login: USE_MOCK_AUTH ? mockLoginWrapper : realLogin,
  register: USE_MOCK_AUTH ? mockRegister : realRegister,
  getMe: USE_MOCK_AUTH ? mockGetMe : realGetMe,
  logout: USE_MOCK_AUTH ? mockLogout : realLogout,
  forgotPassword: USE_MOCK_AUTH ? mockForgotPassword : realForgotPassword,
  validateResetToken: USE_MOCK_AUTH ? mockValidateResetToken : realValidateResetToken,
  resetPassword: USE_MOCK_AUTH ? mockResetPassword : realResetPassword,
}
