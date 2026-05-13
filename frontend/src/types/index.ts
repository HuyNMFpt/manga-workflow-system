// ============================================================
// USER & AUTH
// ============================================================

export type UserRole = "mangaka" | "assistant" | "tantou_editor" | "editorial_board"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatarUrl?: string
  createdAt: string
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

export type SeriesStatus =
  | "draft"
  | "pending_review"
  | "in_review"
  | "approved"
  | "rejected"
  | "serializing"
  | "on_hold"
  | "cancelled"

export type PublicationSchedule = "weekly" | "monthly" | "one_shot"

export interface Series {
  id: string
  title: string
  genre: string
  synopsis: string
  coverUrl?: string
  mangakaId: string
  editorId?: string
  status: SeriesStatus
  schedule?: PublicationSchedule
  createdAt: string
  updatedAt: string
}

export interface SeriesRanking {
  seriesId: string
  seriesTitle: string
  rank: number
  currentVotes: number
  previousRank?: number
  trend: "up" | "down" | "stable"
  isAtRisk: boolean
  period: string
}

// ============================================================
// CHAPTER & PAGE
// ============================================================

export type ChapterStatus = "not_started" | "in_progress" | "review" | "approved" | "published"

export interface Chapter {
  id: string
  seriesId: string
  chapterNumber: number
  title?: string
  deadline: string
  status: ChapterStatus
  totalPages: number
  approvedPages: number
  createdAt: string
}

export type PageStatus = "not_started" | "in_progress" | "submitted" | "approved"

export interface Page {
  id: string
  chapterId: string
  pageNumber: number
  imageUrl: string
  status: PageStatus
  tasks: Task[]
}

// ============================================================
// TASK
// ============================================================

export type TaskType = "background" | "inking" | "toning" | "effects" | "text_cleanup"

export type TaskStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "revision_required"
  | "approved"

export interface TaskRegion {
  x: number
  y: number
  width: number
  height: number
  // For polygon regions
  points?: { x: number; y: number }[]
}

export interface Task {
  id: string
  pageId: string
  chapterId: string
  seriesId: string
  assignedTo: string        // assistant userId
  taskType: TaskType
  region: TaskRegion
  instructions?: string
  status: TaskStatus
  submissionUrl?: string
  revisionNote?: string
  createdAt: string
  updatedAt: string
  deadline: string
}

export interface TaskSubmission {
  taskId: string
  fileUrl: string
  note?: string
}

// ============================================================
// MANUSCRIPT
// ============================================================

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
  pageUrls: string[]
  storyOutline: string
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

export interface ReaderVoteEntry {
  seriesId: string
  votes: number
  period: string          // e.g. "2025-W20" or "2025-06"
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

export type NotificationType =
  | "task_assigned"
  | "task_submitted"
  | "task_approved"
  | "task_revision"
  | "ranking_changed"
  | "series_at_risk"
  | "manuscript_feedback"
  | "vote_required"

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedId?: string      // taskId / seriesId / manuscriptId
  isRead: boolean
  createdAt: string
}
