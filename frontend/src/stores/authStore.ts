import { create } from "zustand"
import { persist } from "zustand/middleware"
import { User, UserRole } from "@/types"

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean

  // Actions
  setAuth: (user: User, token: string, refreshToken: string) => void
  logout: () => void
  updateUser: (partial: Partial<User>) => void

  // Helpers
  hasRole: (role: UserRole) => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken) => {
        localStorage.setItem("token", token)
        localStorage.setItem("refreshToken", refreshToken)
        set({ user, token, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem("token")
        localStorage.removeItem("refreshToken")
        set({ user: null, token: null, isAuthenticated: false })
      },

      updateUser: (partial) => {
        const current = get().user
        if (current) set({ user: { ...current, ...partial } })
      },

      hasRole: (role) => get().user?.role === role,
    }),
    {
      name: "manga-auth",
      // Chỉ persist user info, không persist token (đã lưu trong localStorage riêng)
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
