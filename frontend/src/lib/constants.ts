import { TaskType, UserRole } from "@/types"

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  background: "Vẽ nền",
  shading: "Tô bóng",
  effect: "Hiệu ứng",
  screentone: "Screentone",
  dialog: "Hộp thoại",
  touch_up: "Chỉnh sửa",
  other: "Khác",
}

export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  background: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  shading: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  effect: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  screentone: "bg-green-500/20 text-green-300 border-green-500/30",
  dialog: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  touch_up: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  other: "bg-gray-500/20 text-gray-300 border-gray-500/30",
}

// ✅ Backend roles: mangaka | assistant | editor | board_member
export const ROLE_LABELS: Record<UserRole, string> = {
  mangaka: "Tác giả",
  assistant: "Trợ lý",
  editor: "Biên tập viên",
  board_member: "Hội đồng biên tập",
}

export const ROLE_HOME: Record<UserRole, string> = {
  mangaka: "/mangaka",
  assistant: "/assistant",
  editor: "/editor",
  board_member: "/board",
}

export const GENRE_OPTIONS = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
]

export const PUBLICATION_SCHEDULE_LABELS = {
  weekly: "Hàng tuần",
  monthly: "Hàng tháng",
  one_shot: "One-shot",
}

export const CHAPTER_STATUS_LABELS: Record<string, string> = {
  not_started: "Chưa bắt đầu",
  in_progress: "Đang làm",
  pending_review: "Chờ duyệt",
  editor_review: "Editor đang review",
  approved: "Đã duyệt",
  published: "Đã xuất bản",
}

export const PAGE_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  in_progress: "Đang làm",
  completed: "Hoàn thành",
  reviewing: "Đang review",
  approved: "Đã duyệt",
  revision_needed: "Cần sửa lại",
}

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn cấp",
}
