import api from '@/lib/axios';
import { Series } from '@/types';

// ── Helper: extract array từ bất kỳ response format nào ──────────
// Backend /series/my trả về PaginatedResponse { data: [...], total, page, limit, totalPages }
// Backend /series    trả về ApiResponse { data: [...] }
const extractList = (responseData: any): any[] => {
  if (Array.isArray(responseData)) return responseData;
  // PaginatedResponse: { data: [...] }
  if (responseData?.data && Array.isArray(responseData.data)) return responseData.data;
  // Fallback
  return responseData?.content ?? responseData?.items ?? [];
};

export const seriesService = {
  // GET /api/series/my → PaginatedResponse<SeriesDTO>
  async getMy(): Promise<Series[]> {
    const res = await api.get('/series/my');
    // res.data = PaginatedResponse { data: [...], total, page... }
    return extractList(res.data);
  },

  // GET /api/series → ApiResponse<List<SeriesDTO>>
  async getAll(params?: { status?: string }): Promise<{ data: Series[] }> {
    const res = await api.get('/series', { params });
    const list = extractList(res.data.data ?? res.data);
    return { data: list };
  },

  // GET /api/series/:id → ApiResponse<SeriesDTO>
  async getById(id: string): Promise<Series> {
    const res = await api.get(`/series/${id}`);
    return res.data.data ?? res.data;
  },

  // POST /api/series (multipart/form-data)
  async create(formData: FormData): Promise<Series> {
    const res = await api.post('/series', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data ?? res.data;
  },

  // PUT /api/series/:id/status
  async updateStatus(id: string, status: string): Promise<Series> {
    const res = await api.put(`/series/${id}/status`, null, { params: { status } });
    return res.data.data ?? res.data;
  },
};
