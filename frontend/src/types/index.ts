// ============================================================
// USER & AUTH
// ============================================================

// ✅ Backend roles: mangaka | assistant | editor | board_member
export type UserRole = "mangaka" | "assistant" | "editor" | "board_member" | "admin" | "admin"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatarUrl?: string
  avatar_url?: string | null
  createdAt?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
  refreshToken: string
}

// ============================================================
// SERIES
// ============================================================

// ✅ Backend enum: draft | under_editorial_review | submitted | approved | publishing | on_hiatus | rejected | cancelled
export type SeriesStatus =
  | "draft"
  | "under_editorial_review"
  | "submitted"
  | "approved"
  | "publishing"
  | "on_hiatus"
  | "rejected"    // Board reject manuscript lần đầu — Mangaka được nộp lại
  | "cancelled"   // Board cancel series đang publishing — vĩnh viễn

export type PublicationSchedule = "weekly" | "biweekly" | "monthly" | "one_shot"

export interface Series {
  id: string
  title: string
  genre: string
  synopsis: string
  coverUrl?: string        // ✅ Backend: coverUrl (maps to cover_image_url)
  mangakaId: string
  editorId?: string
  status: SeriesStatus
  schedule?: string        // Backend: weekly | monthly (từ publish_schedule)
  createdAt: string
  updatedAt?: string
}

export interface SeriesRanking {
  seriesId: string
  seriesTitle: string
  currentRank: number
  previousRank?: number
  trend: "up" | "down" | "stable"
  currentVotes: number
  isAtRisk: boolean
}

// ============================================================
// CHAPTER & PAGE
// ============================================================

export type ChapterStatus =
  | "in_progress"
  | "pending_review"
  | "editor_review"
  | "approved"
  | "published"

export interface Chapter {
  id: string
  seriesId: string
  chapterNumber: number
  title?: string
  notes?: string
  deadline?: string
  status: ChapterStatus
  totalPages?: number
  approvedPages?: number
  createdAt: string
}

export type PageStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "reviewing"
  | "approved"
  | "revision_needed"

export interface Page {
  id: string
  chapterId: string
  pageNumber: number
  fileUrl?: string
  notes?: string
  status: PageStatus
  tasks?: Task[]
}

// ============================================================
// TASK
// ============================================================

// ✅ Backend valid types: background | shading | effect | screentone | dialog | touch_up | other
export type TaskType =
  | "background"
  | "shading"
  | "effect"
  | "screentone"
  | "dialog"
  | "touch_up"
  | "other"

// ✅ Backend valid priorities: low | normal | high | urgent
export type TaskPriority = "low" | "normal" | "high" | "urgent"

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "revision_needed"
  | "approved"

export interface Task {
  id: string
  pageId: string
  assignedTo: string
  title: string
  description?: string
  taskType: TaskType
  priority: TaskPriority
  dueDate?: string
  panelRegion?: Record<string, any>
  status: TaskStatus
  fileUrl?: string
  note?: string
  createdAt?: string
  updatedAt?: string
}

export interface TaskSubmission {
  taskId: string
  fileUrl: string
  note?: string
}

// ============================================================
// MANUSCRIPT & SUBMISSION
// ============================================================

export interface ManuscriptSubmitRequest {
  seriesId: string
  fileUrl: string
  description?: string
  targetAudience?: string
  publicationSchedule?: PublicationSchedule
  characterSummary?: string
  plotSummary?: string
  coverLetter?: string
}

export type ManuscriptStatus =
  | "pending"
  | "in_review"
  | "needs_major_revision"
  | "needs_minor_revision"
  | "approved_for_board"
  | "board_approved"
  | "board_rejected"

export interface Manuscript {
  id: string
  seriesId: string
  mangakaId: string
  editorId?: string
  status: ManuscriptStatus
  submittedAt: string
  updatedAt: string
}

// ============================================================
// ANNOTATION
// ============================================================

export type AnnotationTag = "story" | "dialogue" | "art" | "pacing"
export type AnnotationType = "circle" | "arrow" | "text" | "highlight"

export interface Annotation {
  id: string
  manuscriptId: string
  pageId: string
  editorId: string
  type: AnnotationType
  tag: AnnotationTag
  position: { x: number; y: number; width?: number; height?: number }
  comment: string
  createdAt: string
}

// ============================================================
// VOTE & RANKING
// ============================================================

export type VoteDecision = "approve" | "reject" | "needs_revision"

export interface BoardVote {
  id: string
  manuscriptId: string
  boardMemberId: string
  decision: VoteDecision
  justification: string
  schedulePreference?: PublicationSchedule
  createdAt: string
}

// ============================================================
// API RESPONSE WRAPPER
// ============================================================

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================================
// NOTIFICATION
// ============================================================

// ✅ Khớp với backend Notification.NotificationType enum
export type NotificationType =
  | "task_assigned"
  | "task_approved"
  | "revision_requested"
  | "deadline_warning"
  | "series_at_risk"
  | "poll_updated"
  | "series_cancelled"
  | "submission_result"
  | "board_approved"        // Board duyệt series → Mangaka + Editor
  | "board_rejected"        // Board từ chối series → Mangaka
  | "manuscript_submitted"  // Mangaka nộp bản thảo → Editor

// ✅ Khớp với backend NotificationDTO
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  message: string
  referenceId?: string    // backend: referenceId (không phải relatedId)
  referenceType?: string  // backend: referenceType
  isRead: boolean
  createdAt: string
  // title không có trong backend — derive từ type nếu cần hiển thị
}
