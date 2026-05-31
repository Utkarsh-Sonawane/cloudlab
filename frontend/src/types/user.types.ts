/* Types for CloudLab domain objects */

export interface User {
  id: string
  email: string
  username: string
  full_name: string
  avatar_url: string
  role: 'student' | 'instructor' | 'admin'
  plan: 'free' | 'pro' | 'enterprise'
  is_verified: boolean
  github_username: string
  created_at: string
  profile?: UserProfile
  badges?: UserBadge[]
}

export interface UserProfile {
  bio: string
  linkedin_url: string
  github_url: string
  website_url: string
  total_labs_completed: number
  total_points: number
  streak_days: number
  last_active: string | null
}

export interface Badge {
  id: string
  name: string
  description: string
  icon_url: string
  category: 'labs' | 'courses' | 'streak' | 'special'
}

export interface UserBadge {
  badge: Badge
  earned_at: string
}

export interface AuthState {
  user: User | null
  access: string | null
  refresh: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
