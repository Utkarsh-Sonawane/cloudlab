export interface Course {
  id: string
  title: string
  slug: string
  description: string
  short_description: string
  thumbnail_url: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration_hours: number
  is_free: boolean
  instructor_name: string
  total_enrollments: number
  lesson_count?: number
  modules?: CourseModule[]
  created_at: string
}

export interface CourseModule {
  id: number
  order: number
  title: string
  lessons: Lesson[]
}

export interface Lesson {
  id: number
  order: number
  title: string
  content_type: 'video' | 'article' | 'lab' | 'quiz'
  content_url: string
  content_md: string
  duration_minutes: number
  is_free_preview: boolean
}

export interface CourseProgress {
  progress_percent: number
  completed_lessons: number
  total_lessons: number
  completed_at: string | null
}
