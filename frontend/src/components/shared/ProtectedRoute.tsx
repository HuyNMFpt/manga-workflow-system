import { useEffect, useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { UserRole } from "@/types"

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, initFromStorage } = useAuthStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Restore auth từ localStorage khi F5 — chạy 1 lần duy nhất
    if (!isAuthenticated) {
      initFromStorage()
    }
    setInitialized(true)
  }, [])

  // Chờ khởi tạo xong mới check auth — tránh redirect nhầm khi F5
  if (!initialized) return null

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
