import { api } from '../lib/axios';

// Mock series data for development
const MOCK_SERIES = [
  {
    id: '1',
    title: 'Moonlight Chronicles',
    genre: 'Fantasy, Romance',
    synopsis: 'A story about magic and love under the moonlight...',
    status: 'serializing',
    coverUrl: null,
    createdAt: '2024-01-15',
    updatedAt: '2024-05-18'
  },
  {
    id: '2',
    title: 'Shadow Warrior',
    genre: 'Action, Martial Arts',
    synopsis: 'A lone warrior fights against darkness...',
    status: 'serializing',
    coverUrl: null,
    createdAt: '2024-02-01',
    updatedAt: '2024-05-17'
  },
  {
    id: '3',
    title: 'Starlight Academy',
    genre: 'School, Romance',
    synopsis: 'Love stories in a prestigious art school...',
    status: 'in_review',
    coverUrl: null,
    createdAt: '2024-03-10',
    updatedAt: '2024-05-19'
  }
];

// Check if using mock mode
const USE_MOCK = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

export const seriesService = {
  async getAll(params?: any) {
    if (USE_MOCK) {
      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filtered = [...MOCK_SERIES];
      
      // Apply status filter
      if (params?.status && params.status !== 'all') {
        filtered = filtered.filter(s => s.status === params.status);
      }
      
      return {
        data: filtered,
        status: 200,
        message: 'Success'
      };
    }
    
    // Real API call
    const response = await api.get('/series', { params });
    return response.data;
  },

  async getById(id: string) {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const series = MOCK_SERIES.find(s => s.id === id);
      if (!series) throw new Error('Series not found');
      return { data: series };
    }
    
    const response = await api.get(`/series/${id}`);
    return response.data;
  },

  async create(formData: FormData) {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newSeries = {
        id: String(Date.now()),
        title: formData.get('title') as string,
        genre: formData.get('genre') as string,
        synopsis: formData.get('synopsis') as string,
        status: 'draft',
        coverUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      MOCK_SERIES.push(newSeries);
      return { data: newSeries, status: 201 };
    }
    
    const response = await api.post('/series', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async update(id: string, formData: FormData) {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const index = MOCK_SERIES.findIndex(s => s.id === id);
      if (index === -1) throw new Error('Series not found');
      
      MOCK_SERIES[index] = {
        ...MOCK_SERIES[index],
        title: formData.get('title') as string || MOCK_SERIES[index].title,
        genre: formData.get('genre') as string || MOCK_SERIES[index].genre,
        synopsis: formData.get('synopsis') as string || MOCK_SERIES[index].synopsis,
        updatedAt: new Date().toISOString()
      };
      
      return { data: MOCK_SERIES[index] };
    }
    
    const response = await api.put(`/series/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async delete(id: string) {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const index = MOCK_SERIES.findIndex(s => s.id === id);
      if (index > -1) {
        MOCK_SERIES.splice(index, 1);
      }
      return { status: 204 };
    }
    
    const response = await api.delete(`/series/${id}`);
    return response.data;
  },

  async getRankings() {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return [
        { seriesId: '1', seriesTitle: 'Moonlight Chronicles', rank: 3, previousRank: 4, currentVotes: 2431, trend: 'up', isAtRisk: false },
        { seriesId: '2', seriesTitle: 'Shadow Warrior', rank: 8, previousRank: 7, currentVotes: 1876, trend: 'down', isAtRisk: false },
        { seriesId: '3', seriesTitle: 'Starlight Academy', rank: 24, previousRank: 21, currentVotes: 543, trend: 'down', isAtRisk: true }
      ];
    }
    
    const response = await api.get('/series/rankings');
    return response.data;
  }
};
