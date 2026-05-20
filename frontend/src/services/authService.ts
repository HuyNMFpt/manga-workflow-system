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
      role: result.role as any, // Type assertion for role
      avatar_url: result.user.avatar_url
    },
    token: result.token,
    refreshToken: result.token // Mock uses same token
  }
}

const mockRegister = async (data: {
  email: string
  password: string
  name: string
  role: string
}): Promise<LoginResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Create mock user
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

  // Simulate API delay
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
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))
  localStorage.clear()
}

// ============================================
// REAL API FUNCTIONS (using axios)
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

// ============================================
// EXPORT (Auto-switch mock/real)
// ============================================

export const authService = {
  login: USE_MOCK_AUTH ? mockLoginWrapper : realLogin,
  register: USE_MOCK_AUTH ? mockRegister : realRegister,
  getMe: USE_MOCK_AUTH ? mockGetMe : realGetMe,
  logout: USE_MOCK_AUTH ? mockLogout : realLogout,
}
