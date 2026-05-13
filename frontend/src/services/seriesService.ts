import api from "@/lib/axios"
import { ApiResponse, PaginatedResponse, Series, SeriesRanking } from "@/types"

export const seriesService = {
  getAll: async (params?: { page?: number; limit?: number; status?: string }) => {
    const res = await api.get<ApiResponse<PaginatedResponse<Series>>>("/series", { params })
    return res.data.data
  },

  getById: async (id: string): Promise<Series> => {
    const res = await api.get<ApiResponse<Series>>(`/series/${id}`)
    return res.data.data
  },

  create: async (data: FormData): Promise<Series> => {
    const res = await api.post<ApiResponse<Series>>("/series", data, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data.data
  },

  update: async (id: string, data: Partial<Series>): Promise<Series> => {
    const res = await api.put<ApiResponse<Series>>(`/series/${id}`, data)
    return res.data.data
  },

  getRankings: async (period?: string): Promise<SeriesRanking[]> => {
    const res = await api.get<ApiResponse<SeriesRanking[]>>("/rankings", {
      params: { period },
    })
    return res.data.data
  },
}
