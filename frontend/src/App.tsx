import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AppLayout from "@/components/layout/AppLayout"
import ProtectedRoute from "@/components/shared/ProtectedRoute"
import LoginPage from "@/pages/auth/LoginPage"
import UnauthorizedPage from "@/pages/auth/UnauthorizedPage"
import MangakaDashboard from "@/pages/mangaka/MangakaDashboard"
import SeriesList from "@/pages/mangaka/SeriesList"
import ChapterManager from "@/pages/mangaka/ChapterManager"
import RankingView from "@/pages/mangaka/RankingView"
import AssistantDashboard from "@/pages/assistant/AssistantDashboard"
import TaskList from "@/pages/assistant/TaskList"
import EarningsDashboard from "@/pages/assistant/EarningsDashboard"
import EditorDashboard from "@/pages/editor/EditorDashboard"
import ManuscriptReview from "@/pages/editor/ManuscriptReview"
import StudioProgress from "@/pages/editor/StudioProgress"
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
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route element={<ProtectedRoute allowedRoles={["mangaka"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/mangaka" element={<MangakaDashboard />} />
              <Route path="/mangaka/series" element={<SeriesList />} />
              <Route path="/mangaka/chapters" element={<ChapterManager />} />
              <Route path="/mangaka/ranking" element={<RankingView />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["assistant"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/assistant" element={<AssistantDashboard />} />
              <Route path="/assistant/tasks" element={<TaskList />} />
              <Route path="/assistant/earnings" element={<EarningsDashboard />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["tantou_editor"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/editor" element={<EditorDashboard />} />
              <Route path="/editor/manuscripts" element={<ManuscriptReview />} />
              <Route path="/editor/progress" element={<StudioProgress />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["editorial_board"]} />}>
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
