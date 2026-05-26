import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { ROLE_HOME } from "@/lib/constants"

export default function UnauthorizedPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-4xl font-semibold text-muted-foreground mb-3">403</p>
        <h1 className="text-lg font-medium mb-1">Không có quyền truy cập</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Bạn không có quyền xem trang này.
        </p>
        <button
          onClick={() => navigate(user ? ROLE_HOME[user.role] : "/login")}
          className="text-sm text-primary hover:underline"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  )
}
