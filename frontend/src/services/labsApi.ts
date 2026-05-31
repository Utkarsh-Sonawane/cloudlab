import api from './api'
import type { LabFilters } from '@/types/lab.types'

export const labsService = {
  listCategories: () => api.get('/labs/categories/'),
  list: (filters: LabFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.category) params.set('category__slug', filters.category)
    if (filters.difficulty) params.set('difficulty', filters.difficulty)
    if (filters.environment_type) params.set('environment_type', filters.environment_type)
    if (filters.is_free !== undefined) params.set('is_free', String(filters.is_free))
    if (filters.search) params.set('search', filters.search)
    if (filters.ordering) params.set('ordering', filters.ordering)
    return api.get(`/labs/?${params.toString()}`)
  },
  detail: (slug: string) => api.get(`/labs/${slug}/`),
  startSession: (slug: string) => api.post(`/labs/${slug}/start/`),
  getSession: (slug: string) => api.get(`/labs/${slug}/session/`),
  stopSession: (slug: string) => api.delete(`/labs/${slug}/session/`),
  validateTask: (sessionId: string) => api.post(`/labs/session/${sessionId}/validate/`),
  nextTask: (sessionId: string) => api.post(`/labs/session/${sessionId}/next/`),
  getHint: (sessionId: string) => api.get(`/labs/session/${sessionId}/hint/`),
  rateLab: (slug: string, rating: number, comment?: string) =>
    api.post(`/labs/${slug}/rate/`, { rating, comment }),
}
