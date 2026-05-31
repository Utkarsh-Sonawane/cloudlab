import api from './api'
import type { User } from '@/types/user.types'

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { email: string; username: string; full_name: string; password: string; password2: string }

export const authService = {
  login: (data: LoginPayload) => api.post('/auth/login/', data),
  register: (data: RegisterPayload) => api.post('/auth/register/', data),
  logout: (refresh: string) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  updateMe: (data: Partial<User>) => api.patch('/auth/me/', data),
  dashboard: () => api.get('/users/me/dashboard/'),
  history: (page = 1) => api.get(`/users/me/history/?page=${page}`),
  leaderboard: () => api.get('/users/leaderboard/'),
  publicProfile: (username: string) => api.get(`/users/${username}/profile/`),
  socialLogin: (provider: string, accessToken?: string, code?: string, redirectUri?: string) => 
    api.post(`/auth/social-login/${provider}/`, { provider, access_token: accessToken, code, redirect_uri: redirectUri }),
}
