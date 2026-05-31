import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Circle, Lightbulb, ChevronDown, ChevronRight,
  Loader2, Play, Trophy
} from 'lucide-react'
import type { Lab, LabSession, LabTask } from '@/types/lab.types'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { clsx } from 'clsx'

interface Props {
  lab: Lab
  session: LabSession | null
  isValidating: boolean
  onValidate: () => void
  onGetHint: () => Promise<string | null>
}

export function TaskPanel({ lab, session, isValidating, onValidate, onGetHint }: Props) {
  const [hint, setHint] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [loadingHint, setLoadingHint] = useState(false)
  const [descriptionOpen, setDescriptionOpen] = useState(true)

  const tasks = lab.tasks || []
  const currentIdx = session?.current_task_index ?? 0
  const currentTask = tasks[currentIdx]
  const sessionTasks = session?.session_tasks ?? []

  const handleGetHint = async () => {
    if (hint) { setShowHint(!showHint); return }
    setLoadingHint(true)
    const h = await onGetHint()
    setHint(h)
    setShowHint(true)
    setLoadingHint(false)
  }

  const getTaskStatus = (idx: number) => {
    if (idx < currentIdx) return 'complete'
    if (idx === currentIdx) return session?.status === 'completed' ? 'complete' : 'active'
    return 'pending'
  }

  const isAllDone = session?.status === 'completed'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Lab header */}
      <div className="p-5 border-b border-dark-border">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={lab.category.slug as any}>{lab.category.name}</Badge>
          <Badge variant={lab.difficulty}>{lab.difficulty}</Badge>
        </div>
        <h1 className="text-lg font-bold text-white leading-tight">{lab.title}</h1>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span>{lab.duration_minutes}m</span>
          <span>·</span>
          <span>{tasks.length} tasks</span>
          <span>·</span>
          <span className="text-brand-400">+{lab.points_reward} pts</span>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 hide-scrollbar">

        {/* Task list */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks</h3>
          {tasks.map((task, idx) => {
            const status = getTaskStatus(idx)
            return (
              <div key={task.id} className={clsx('task-step', status)}>
                <div className="mt-0.5 shrink-0">
                  {status === 'complete' ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : status === 'active' ? (
                    <div className="w-[18px] h-[18px] rounded-full border-2 border-brand-400 bg-brand-500/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                    </div>
                  ) : (
                    <Circle size={18} className="text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    'text-sm font-medium truncate',
                    status === 'complete' ? 'text-emerald-300 line-through opacity-60' :
                    status === 'active' ? 'text-white' : 'text-gray-500'
                  )}>
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{task.points} pts</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Current task instructions */}
        {currentTask && !isAllDone && (
          <div className="glass-card p-4">
            <button
              onClick={() => setDescriptionOpen(!descriptionOpen)}
              className="flex items-center justify-between w-full mb-3 text-left"
            >
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Play size={12} className="text-brand-400" />
                Task {currentIdx + 1}: {currentTask.title}
              </span>
              {descriptionOpen ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
            </button>
            <AnimatePresence>
              {descriptionOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="prose-lab">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                      {currentTask.description}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* All done */}
        {isAllDone && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-6 text-center border-emerald-500/30"
          >
            <Trophy size={32} className="text-amber-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Lab Complete! 🎉</h3>
            <p className="text-sm text-gray-400">You earned <span className="text-brand-400 font-bold">+{lab.points_reward} points</span></p>
          </motion.div>
        )}

        {/* Hint */}
        {currentTask && !isAllDone && (
          <div>
            <button
              onClick={handleGetHint}
              disabled={loadingHint}
              className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              {loadingHint ? <Loader2 size={12} className="animate-spin" /> : <Lightbulb size={12} />}
              {showHint ? 'Hide hint' : 'Show hint'}
            </button>
            <AnimatePresence>
              {showHint && hint && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{hint}</ReactMarkdown>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Validate button */}
      {session?.status === 'active' && currentTask && (
        <div className="p-4 border-t border-dark-border">
          <Button
            variant="brand"
            className="w-full justify-center"
            loading={isValidating}
            onClick={onValidate}
          >
            {isValidating ? 'Validating...' : '✓ Validate Task'}
          </Button>
          <p className="text-xs text-gray-600 text-center mt-2">
            Run your commands then click to validate
          </p>
        </div>
      )}
    </div>
  )
}
