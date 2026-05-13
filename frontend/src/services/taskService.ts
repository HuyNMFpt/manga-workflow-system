import api from "@/lib/axios"
import { ApiResponse, PaginatedResponse, Task, TaskStatus, TaskSubmission } from "@/types"

export const taskService = {
  getMyTasks: async (params?: { status?: TaskStatus; page?: number }) => {
    const res = await api.get<ApiResponse<PaginatedResponse<Task>>>("/tasks/my", { params })
    return res.data.data
  },

  getByPage: async (pageId: string): Promise<Task[]> => {
    const res = await api.get<ApiResponse<Task[]>>(`/pages/${pageId}/tasks`)
    return res.data.data
  },

  create: async (data: Omit<Task, "id" | "status" | "createdAt" | "updatedAt">): Promise<Task> => {
    const res = await api.post<ApiResponse<Task>>("/tasks", data)
    return res.data.data
  },

  submit: async (taskId: string, submission: TaskSubmission): Promise<Task> => {
    const formData = new FormData()
    // submission.fileUrl sẽ là file thực tế
    if (submission.note) formData.append("note", submission.note)
    const res = await api.post<ApiResponse<Task>>(`/tasks/${taskId}/submit`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data.data
  },

  approve: async (taskId: string): Promise<Task> => {
    const res = await api.put<ApiResponse<Task>>(`/tasks/${taskId}/approve`)
    return res.data.data
  },

  requestRevision: async (taskId: string, note: string): Promise<Task> => {
    const res = await api.put<ApiResponse<Task>>(`/tasks/${taskId}/revision`, { note })
    return res.data.data
  },
}
