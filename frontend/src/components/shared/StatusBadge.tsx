import { cn } from "@/lib/utils"
import { TaskStatus, SeriesStatus, ManuscriptStatus } from "@/types"

type AnyStatus = TaskStatus | SeriesStatus | ManuscriptStatus

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // ── Task statuses ──────────────────────────────────────────
  pending:          { label: "Chờ làm",     className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"     },
  in_progress:      { label: "Đang làm",    className: "bg-amber-500/10 text-amber-400 border-amber-500/20"  },
  submitted:        { label: "Đã nộp",      className: "bg-blue-500/10 text-blue-400 border-blue-500/20"     },
  revision_needed:  { label: "Cần sửa",     className: "bg-orange-500/10 text-orange-400 border-orange-500/20"},
  approved:         { label: "Đã duyệt",    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"},

  // ── Series statuses — khớp với backend SeriesStatus enum ──
  draft:                    { label: "Nháp",            className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"     },
  under_editorial_review:   { label: "Editor đang xét", className: "bg-blue-500/10 text-blue-400 border-blue-500/20"     },
  submitted:                { label: "Chờ Board duyệt", className: "bg-amber-500/10 text-amber-400 border-amber-500/20"  },
  publishing:               { label: "Đang xuất bản",  className: "bg-violet-500/10 text-violet-400 border-violet-500/20"},
  on_hiatus:                { label: "Tạm ngưng",       className: "bg-orange-500/10 text-orange-400 border-orange-500/20"},
  cancelled:                { label: "Đã huỷ",          className: "bg-red-500/10 text-red-400 border-red-500/20"        },

  // ── Manuscript statuses ────────────────────────────────────
  under_review:             { label: "Đang xét",        className: "bg-blue-500/10 text-blue-400 border-blue-500/20"     },
  revision_requested:       { label: "Cần sửa",         className: "bg-orange-500/10 text-orange-400 border-orange-500/20"},
  approved:                 { label: "Sẵn sàng",        className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"},
  rejected:                 { label: "Từ chối",         className: "bg-red-500/10 text-red-400 border-red-500/20"        },

  // ── Submission statuses ────────────────────────────────────
  pending:                  { label: "Chờ vote",        className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"     },
  voting:                   { label: "Đang vote",       className: "bg-amber-500/10 text-amber-400 border-amber-500/20"  },
}

interface StatusBadgeProps {
  status: AnyStatus | string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
  }

  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
      config.className,
      className
    )}>
      {config.label}
    </span>
  )
}
