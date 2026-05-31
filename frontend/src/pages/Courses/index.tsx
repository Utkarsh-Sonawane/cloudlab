import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Spinner } from '@/components/common/Spinner'
import { Badge } from '@/components/common/Badge'
import { labsService } from '@/services/labsApi'
import type { Course } from '@/types/course.types'
import { Clock, Users, BookOpen, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '@/services/api'

function CourseCard({ course }: { course: Course }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="gradient-border">
      <div className="p-5 flex flex-col gap-3 h-full">
        <div className="flex items-center gap-2">
          <Badge variant={course.difficulty}>{course.difficulty}</Badge>
          {course.is_free && <Badge variant="default">Free</Badge>}
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-brand-300 line-clamp-2">
            {course.title}
          </h3>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{course.short_description}</p>
        </div>
        <div className="mt-auto flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Clock size={11} />{course.duration_hours}h</span>
          <span className="flex items-center gap-1"><Users size={11} />{course.total_enrollments?.toLocaleString()}</span>
          <span className="flex items-center gap-1"><BookOpen size={11} />{course.lesson_count ?? '?'} lessons</span>
        </div>
        <div className="pt-2 border-t border-dark-border flex items-center justify-between text-xs">
          <span className="text-gray-500">By {course.instructor_name || 'CloudLab'}</span>
          <span className="text-brand-400 flex items-center gap-1">View <ChevronRight size={11} /></span>
        </div>
      </div>
    </motion.div>
  )
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/courses/').then(r => {
      const d = r.data.data || r.data
      setCourses(d.results || d)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <PageWrapper>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Courses</h1>
          <p className="text-gray-400">Structured learning paths from beginner to advanced</p>
        </div>

        {loading ? <Spinner size="lg" fullscreen /> : courses.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No courses yet</p>
            <p className="text-sm mt-1">Check back soon — we're writing them!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course, i) => (
              <motion.div key={course.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}>
                <CourseCard course={course} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
