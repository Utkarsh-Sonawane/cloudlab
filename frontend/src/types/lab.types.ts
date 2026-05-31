export interface LabCategory {
  id: number
  name: string
  slug: string
  icon: string
  description: string
  color: string
  lab_count: number
}

export interface LabTask {
  id: number
  order: number
  title: string
  description: string
  hint?: string
  validation_type: 'script' | 'command_output' | 'file_exists' | 'api_check'
  points: number
}

export interface Lab {
  id: string
  title: string
  slug: string
  description: string
  short_description: string
  thumbnail_url: string
  category: LabCategory
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration_minutes: number
  environment_type: 'docker' | 'kubernetes' | 'git' | 'linux' | 'terraform'
  docker_image: string
  points_reward: number
  is_free: boolean
  avg_rating: number
  total_completions: number
  task_count?: number
  tasks?: LabTask[]
  created_at: string
}

export interface LabSessionTask {
  id: number
  task: LabTask
  status: 'pending' | 'completed' | 'skipped'
  completed_at: string | null
  attempts: number
}

export interface LabSession {
  id: string
  lab: Lab
  status: 'pending' | 'provisioning' | 'active' | 'completed' | 'failed' | 'expired'
  container_id: string
  websocket_token: string
  current_task_index: number
  started_at: string
  expires_at: string | null
  completed_at: string | null
  session_tasks: LabSessionTask[]
  current_task: LabTask | null
}

export interface ValidationResult {
  passed: boolean
  message: string
  task_index: number
  all_tasks_complete: boolean
  points_earned: number
}

export type LabDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type LabEnvironment = 'docker' | 'kubernetes' | 'git' | 'linux' | 'terraform'

export interface LabFilters {
  category?: string
  difficulty?: LabDifficulty
  environment_type?: LabEnvironment
  is_free?: boolean
  search?: string
  ordering?: string
}
