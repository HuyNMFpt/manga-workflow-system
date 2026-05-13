import api from "@/lib/axios"
import { ApiResponse, LoginRequest, LoginResponse, User } from "@/types"

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await api.post<ApiResponse<LoginResponse>>("/auth/login", data)
    return res.data.data
  },

  register: async (data: {
    email: string
    password: string
    name: string
    role: string
  }): Promise<LoginResponse> => {
    const res = await api.post<ApiResponse<LoginResponse>>("/auth/register", data)
    return res.data.data
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<ApiResponse<User>>("/auth/me")
    return res.data.data
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout")
  },
}
