import api from '@/lib/axios';
import { Series } from '@/types';

// ── Helper xử lý response format của backend ─────────────────────
// Backend /series/my → ApiResponse<PaginatedResponse<SeriesDTO>>
// → r.data = { data: { data: [...], total, page }, success: true }
// Backend /series    → ApiResponse<List<SeriesDTO>>
// → r.data = { data: [...], success: true }
const extractList = (axiosResponseData: any): any[] => {
  if (!axiosResponseData) return [];

  // Trường hợp 1: r.data là array thẳng (không có wrapper)
  if (Array.isArray(axiosResponseData)) return axiosResponseData;

  // Trường hợp 2: ApiResponse { data: [...], success }
  const inner = axiosResponseData?.data;
  if (!inner) return [];
  if (Array.isArray(inner)) return inner;

  // Trường hợp 3: ApiResponse<PaginatedResponse> { data: { data: [...] } }
  if (inner?.data && Array.isArray(inner.data)) return inner.data;

  // Fallback Spring Page format
  return inner?.content ?? inner?.items ?? [];
};

export const seriesService = {
  // GET /api/series/my → ApiResponse<PaginatedResponse<SeriesDTO>>
  async getMy(): Promise<Series[]> {
    const res = await api.get('/series/my');
    return extractList(res.data);
  },

  // GET /api/series → ApiResponse<List<SeriesDTO>>
  async getAll(params?: { status?: string }): Promise<{ data: Series[] }> {
    const res = await api.get('/series', { params });
    return { data: extractList(res.data) };
  },

  // GET /api/series/:id → ApiResponse<SeriesDTO>
  async getById(id: string): Promise<Series> {
    const res = await api.get(`/series/${id}`);
    return res.data?.data ?? res.data;
  },

  // POST /api/series (multipart/form-data)
  async create(formData: FormData): Promise<Series> {
    const res = await api.post('/series', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.data ?? res.data;
  },

  // PUT /api/series/:id/status
  async updateStatus(id: string, status: string): Promise<Series> {
    const res = await api.put(`/series/${id}/status`, null, { params: { status } });
    return res.data?.data ?? res.data;
  },
};

// Export helper để dùng ở các file khác
export const extractSeriesList = extractList;
