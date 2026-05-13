import { cn } from "@/lib/utils"
import { TaskStatus, SeriesStatus, ManuscriptStatus } from "@/types"

type AnyStatus = TaskStatus | SeriesStatus | ManuscriptStatus

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // Task statuses
  assigned: { label: "Chờ làm", className: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "Đang làm", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  submitted: { label: "Đã nộp", className: "bg-purple-50 text-purple-700 border-purple-200" },
  revision_required: { label: "Cần sửa", className: "bg-orange-50 text-orange-700 border-orange-200" },
  approved: { label: "Đã duyệt", className: "bg-green-50 text-green-700 border-green-200" },
  // Series statuses
  draft: { label: "Nháp", className: "bg-gray-50 text-gray-600 border-gray-200" },
  pending_review: { label: "Chờ duyệt", className: "bg-blue-50 text-blue-700 border-blue-200" },
  in_review: { label: "Đang xét", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  rejected: { label: "Từ chối", className: "bg-red-50 text-red-700 border-red-200" },
  serializing: { label: "Đang đăng", className: "bg-green-50 text-green-700 border-green-200" },
  on_hold: { label: "Tạm dừng", className: "bg-orange-50 text-orange-700 border-orange-200" },
  cancelled: { label: "Đã huỷ", className: "bg-red-50 text-red-700 border-red-200" },
  // Manuscript
  needs_major_revision: { label: "Sửa lớn", className: "bg-red-50 text-red-700 border-red-200" },
  needs_minor_revision: { label: "Sửa nhỏ", className: "bg-orange-50 text-orange-700 border-orange-200" },
  approved_for_board: { label: "Lên hội đồng", className: "bg-purple-50 text-purple-700 border-purple-200" },
  board_approved: { label: "HĐ duyệt", className: "bg-green-50 text-green-700 border-green-200" },
  board_rejected: { label: "HĐ từ chối", className: "bg-red-50 text-red-700 border-red-200" },
}

interface StatusBadgeProps {
  status: AnyStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-50 text-gray-600 border-gray-200" }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
