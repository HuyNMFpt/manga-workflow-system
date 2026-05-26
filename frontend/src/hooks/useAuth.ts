import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { authService } from "@/services/authService"
import { useAuthStore } from "@/stores/authStore"
import { ROLE_HOME } from "@/lib/constants"
import { LoginRequest } from "@/types"

export function useAuth() {
  const { user, isAuthenticated, logout: clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { setAuth } = useAuthStore()
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: (res) => {
      setAuth(res.user, res.token, res.refreshToken)
      navigate(ROLE_HOME[res.user.role])
    },
  })

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearAuth()
      queryClient.clear()
      navigate("/login")
    },
  })

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
  }
}

// Hook để fetch current user data (dùng trong app startup)
export function useCurrentUser() {
  const { isAuthenticated } = useAuthStore()
  return useQuery({
    queryKey: ["me"],
    queryFn: authService.getMe,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 phút
  })
}
