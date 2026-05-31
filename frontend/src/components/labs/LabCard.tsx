import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Star, Users, Lock, ChevronRight, CheckCircle } from 'lucide-react'
import type { Lab } from '@/types/lab.types'
import { Badge } from '@/components/common/Badge'
import { clsx } from 'clsx'

// Category slug → icon mapping (emoji fallback)
const ENV_ICONS: Record<string, string> = {
  docker: '🐳', kubernetes: '☸️', linux: '🐧',
  git: '🔀', terraform: '🏗️', cicd: '⚡',
}

interface Props {
  lab: Lab
  completed?: boolean
}

export function LabCard({ lab, completed }: Props) {
  const difficultyColors = {
    beginner: 'badge-beginner',
    intermediate: 'badge-intermediate',
    advanced: 'badge-advanced',
  }

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group gradient-border hover:bg-dark-surface transition-colors"
    >
      <Link to={`/labs/${lab.slug}/run`} className="block p-5 h-full">
        <div className="flex flex-col h-full gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={lab.category.slug as any}
                icon={<span className="text-xs">{ENV_ICONS[lab.category.slug] || '🔧'}</span>}
              >
                {lab.category.name}
              </Badge>
              <Badge variant={lab.difficulty}>{lab.difficulty}</Badge>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!lab.is_free && <Lock size={12} className="text-amber-400" />}
              {completed && <CheckCircle size={16} className="text-emerald-400" />}
            </div>
          </div>

          {/* Title */}
          <div>
            <h3 className="font-semibold text-white text-base leading-snug group-hover:text-brand-300 transition-colors line-clamp-2">
              {lab.title}
            </h3>
            {lab.short_description && (
              <p className="mt-1.5 text-sm text-gray-400 line-clamp-2">{lab.short_description}</p>
            )}
          </div>

          {/* Stats */}
          <div className="mt-auto flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />{lab.duration_minutes}m
            </span>
            <span className="flex items-center gap-1">
              <Star size={12} className="text-amber-400" />
              {Number(lab.avg_rating).toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} />{lab.total_completions.toLocaleString()}
            </span>
            <span className="ml-auto text-brand-400 font-semibold">+{lab.points_reward} pts</span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-dark-border">
            <span className="text-xs text-gray-500">{lab.task_count ?? 0} tasks</span>
            <span className="flex items-center gap-1 text-xs font-medium text-brand-400 group-hover:text-brand-300 transition-colors">
              Start lab <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
