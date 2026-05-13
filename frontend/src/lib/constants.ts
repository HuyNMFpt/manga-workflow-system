import { TaskType, UserRole } from "@/types"

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  background: "Vẽ nền",
  inking: "Tô mực",
  toning: "Tô bóng",
  effects: "Hiệu ứng",
  text_cleanup: "Dọn chữ",
}

export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  background: "bg-blue-100 text-blue-800",
  inking: "bg-gray-100 text-gray-800",
  toning: "bg-purple-100 text-purple-800",
  effects: "bg-yellow-100 text-yellow-800",
  text_cleanup: "bg-green-100 text-green-800",
}

export const ROLE_LABELS: Record<UserRole, string> = {
  mangaka: "Tác giả",
  assistant: "Trợ lý",
  tantou_editor: "Biên tập viên",
  editorial_board: "Hội đồng biên tập",
}

export const ROLE_HOME: Record<UserRole, string> = {
  mangaka: "/mangaka",
  assistant: "/assistant",
  tantou_editor: "/editor",
  editorial_board: "/board",
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
