import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AppLayout from "@/components/layout/AppLayout"
import ProtectedRoute from "@/components/shared/ProtectedRoute"
import LoginPage from "@/pages/auth/LoginPage"
import UnauthorizedPage from "@/pages/auth/UnauthorizedPage"
import SignupPage from "@/pages/auth/SignupPage"
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage"
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage"

// Mangaka Pages
import MangakaDashboard from "@/pages/mangaka/MangakaDashboard"
import SeriesList from "@/pages/mangaka/SeriesList"
import ChapterManager from "@/pages/mangaka/ChapterManager"
import SeriesSubmission from "@/pages/mangaka/SeriesSubmission"
import TaskAssignment from "@/pages/mangaka/TaskAssignment"
import PageReview from "@/pages/mangaka/PageReview"
import MyRankings from "@/pages/mangaka/MyRankings"

// Assistant Pages
import AssistantDashboard from "@/pages/assistant/AssistantDashboard"
import TaskList from "@/pages/assistant/TaskList"
import EarningsDashboard from "@/pages/assistant/EarningsDashboard"

// Editor Pages
import EditorDashboard from "@/pages/editor/EditorDashboard"
import ManuscriptReview from "@/pages/editor/ManuscriptReview"
import StudioProgress from "@/pages/editor/StudioProgress"

// Board Pages
import BoardDashboard from "@/pages/board/BoardDashboard"
import VotingQueue from "@/pages/board/VotingQueue"
import RankingBoard from "@/pages/board/RankingBoard"
import DecisionPanel from "@/pages/board/DecisionPanel"

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 2 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Mangaka Routes */}
          <Route element={<ProtectedRoute allowedRoles={["mangaka"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/mangaka" element={<MangakaDashboard />} />
              <Route path="/mangaka/series" element={<SeriesList />} />
              <Route path="/mangaka/chapters" element={<ChapterManager />} />
              <Route path="/mangaka/submit-series" element={<SeriesSubmission />} />
              <Route path="/mangaka/assign-tasks" element={<TaskAssignment />} />
              <Route path="/mangaka/review-pages" element={<PageReview />} />
              <Route path="/mangaka/rankings" element={<MyRankings />} />
            </Route>
          </Route>

          {/* Assistant Routes */}
          <Route element={<ProtectedRoute allowedRoles={["assistant"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/assistant" element={<AssistantDashboard />} />
              <Route path="/assistant/tasks" element={<TaskList />} />
              <Route path="/assistant/earnings" element={<EarningsDashboard />} />
            </Route>
          </Route>

          {/* ✅ Editor role: "editor" (không phải tantou_editor) */}
          <Route element={<ProtectedRoute allowedRoles={["editor"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/editor" element={<EditorDashboard />} />
              <Route path="/editor/manuscripts" element={<ManuscriptReview />} />
              <Route path="/editor/progress" element={<StudioProgress />} />
            </Route>
          </Route>

          {/* ✅ Board role: "board_member" (không phải editorial_board) */}
          <Route element={<ProtectedRoute allowedRoles={["board_member"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/board" element={<BoardDashboard />} />
              <Route path="/board/voting" element={<VotingQueue />} />
              <Route path="/board/rankings" element={<RankingBoard />} />
              <Route path="/board/decisions" element={<DecisionPanel />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
