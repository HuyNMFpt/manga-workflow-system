import { useNavigate } from "react-router-dom"
import { Lock, Mail, ArrowLeft } from "lucide-react"

export default function SignupPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-violet-400" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white font-['Syne']">Đăng ký tài khoản</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Hệ thống không cho phép tự đăng ký.<br />
            Vui lòng liên hệ Admin để được cấp tài khoản.
          </p>
        </div>

        {/* Contact info */}
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 text-left space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-600">Liên hệ Admin</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-[12px] text-zinc-500">Email</p>
              <p className="text-[13px] font-semibold text-white">admin@manga-cwpm.local</p>
            </div>
          </div>
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            Sau khi liên hệ, Admin sẽ tạo tài khoản và gửi mật khẩu tạm vào email của bạn.
            Đăng nhập lần đầu bằng mật khẩu tạm, sau đó đổi lại theo ý muốn.
          </p>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 mx-auto text-sm text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />Quay lại đăng nhập
        </button>
      </div>
    </div>
  )
}
