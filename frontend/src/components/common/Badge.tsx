import React from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'beginner' | 'intermediate' | 'advanced' | 'docker' | 'kubernetes' | 'linux' | 'git' | 'terraform' | 'cicd' | 'default'

const variantMap: Record<BadgeVariant, string> = {
  beginner:     'badge-beginner',
  intermediate: 'badge-intermediate',
  advanced:     'badge-advanced',
  docker:     'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  kubernetes: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  linux:      'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  git:        'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  terraform:  'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  cicd:       'bg-pink-500/15 text-pink-400 border border-pink-500/30',
  default:    'bg-gray-500/15 text-gray-400 border border-gray-500/30',
}

interface Props {
  children: React.ReactNode
  variant?: BadgeVariant
  icon?: React.ReactNode
  className?: string
}

export function Badge({ children, variant = 'default', icon, className }: Props) {
  return (
    <span className={clsx(
      'badge-category',
      variantMap[variant] || variantMap.default,
      className
    )}>
      {icon}
      {children}
    </span>
  )
}
