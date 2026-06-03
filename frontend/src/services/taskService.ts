import api from '@/lib/axios';
import { Task, ApiResponse, PaginatedResponse, TaskStatus } from '@/types';

export const taskService = {
  getMyTasks: async (params?: { status?: TaskStatus; page?: number; limit?: number }) => {
    const res = await api.get<ApiResponse<PaginatedResponse<Task>>>('/tasks/my', { params });
    return res.data.data;
  },
  getPendingReview: async () => {
    const res = await api.get<ApiResponse<Task[]>>('/tasks/pending-review');
    return res.data.data;
  },
  getByPage: async (pageId: string) => {
    const res = await api.get<ApiResponse<Task[]>>(`/tasks/pages/${pageId}`);
    return res.data.data;
  },
  create: async (data: {
    pageId: string;
    assignedTo: string;
    title: string;
    description?: string;
    taskType: string;
    priority: string;
    dueDate?: string;
    panelRegion?: Record<string, any>;
  }) => {
    const res = await api.post<ApiResponse<Task>>('/tasks', data);
    return res.data.data;
  },
  submit: async (taskId: string, fileUrl: string, note?: string) => {
    const res = await api.post<ApiResponse<Task>>(`/tasks/${taskId}/submit`, null, { params: { fileUrl, note } });
    return res.data.data;
  },
  approve: async (taskId: string) => {
    const res = await api.put<ApiResponse<Task>>(`/tasks/${taskId}/approve`);
    return res.data.data;
  },
  requestRevision: async (taskId: string, note: string) => {
    const res = await api.put<ApiResponse<Task>>(`/tasks/${taskId}/revision`, { note });
    return res.data.data;
  },
};
