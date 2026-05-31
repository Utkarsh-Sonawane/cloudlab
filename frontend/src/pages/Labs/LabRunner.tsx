import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Square, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { TaskPanel } from '@/components/labs/TaskPanel'
import { LabTerminal } from '@/components/labs/LabTerminal'
import { LabTimer } from '@/components/labs/LabTimer'
import { Button } from '@/components/common/Button'
import { Spinner } from '@/components/common/Spinner'
import { labsService } from '@/services/labsApi'
import { useLabSession } from '@/hooks/useLabSession'
import type { Lab } from '@/types/lab.types'
import toast from 'react-hot-toast'

export default function LabRunnerPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [lab, setLab] = useState<Lab | null>(null)
  const [labLoading, setLabLoading] = useState(true)
  const [validationResult, setValidationResult] = useState<{ passed: boolean; message: string } | null>(null)
  const {
    activeSession, isProvisioning, isValidating,
    startSession, stopSession, validateTask, getHint,
  } = useLabSession(slug!)

  // Load lab details
  useEffect(() => {
    if (!slug) return
    labsService.detail(slug)
      .then(r => setLab(r.data.data || r.data))
      .catch(() => toast.error('Lab not found'))
      .finally(() => setLabLoading(false))
  }, [slug])

  const handleValidate = async () => {
    const result = await validateTask()
    if (!result) return
    setValidationResult({ passed: result.passed, message: result.message })
    if (result.passed) {
      toast.success(result.message || 'Task passed! ✓')
      if (result.all_tasks_complete) {
        toast.success(`🎉 Lab complete! +${result.points_earned} points earned!`, { duration: 5000 })
      }
    } else {
      toast.error(result.message || 'Not quite right. Try again!', { duration: 4000 })
    }
    setTimeout(() => setValidationResult(null), 3000)
  }

  const handleStop = async () => {
    await stopSession()
    navigate('/labs')
  }

  const handleRestart = async () => {
    await stopSession()
    await startSession()
  }

  if (labLoading) return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  if (!lab) return (
    <div className="min-h-screen bg-dark flex items-center justify-center text-gray-400">
      Lab not found
    </div>
  )

  const sessionReady = activeSession?.status === 'active'
  const sessionToken = activeSession?.websocket_token || ''
  const sessionId    = activeSession?.id || ''

  return (
    <div className="h-screen bg-dark flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="h-14 shrink-0 border-b border-dark-border bg-dark-DEFAULT/90 backdrop-blur-md flex items-center gap-4 px-4 z-20">
        <button onClick={() => navigate('/labs')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">{lab.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {activeSession?.expires_at && sessionReady && (
            <LabTimer expiresAt={activeSession.expires_at} onExpired={() => toast.error('Session expired')} />
          )}

          {!activeSession && (
            <Button variant="brand" size="sm" onClick={startSession} loading={isProvisioning}>
              {isProvisioning ? 'Starting...' : '▶ Start Lab'}
            </Button>
          )}

          {activeSession && (
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={handleRestart} leftIcon={<RotateCcw size={12} />}>
                Restart Lab
              </Button>
              <Button variant="danger" size="sm" onClick={handleStop} leftIcon={<Square size={12} />}>
                Stop
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Validation flash */}
      <AnimatePresence>
        {validationResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`px-6 py-2.5 flex items-center gap-2 text-sm font-medium z-30 ${
              validationResult.passed
                ? 'bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/20 border-b border-rose-500/30 text-rose-400'
            }`}
          >
            {validationResult.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {validationResult.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Task panel */}
        <div className="w-[360px] shrink-0 border-r border-dark-border overflow-hidden flex flex-col bg-dark-card">
          <TaskPanel
            lab={lab}
            session={activeSession}
            isValidating={isValidating}
            onValidate={handleValidate}
            onGetHint={getHint}
          />
        </div>

        {/* RIGHT: Terminal */}
        <div className="flex-1 overflow-hidden flex flex-col bg-dark-100">
          {!activeSession ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                <span className="text-4xl">🖥️</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Ready to start?</h3>
                <p className="text-gray-400 text-sm max-w-xs">
                  Click "Start Lab" to provision your isolated environment. It takes a few seconds.
                </p>
              </div>
              <Button variant="brand" size="lg" onClick={startSession} loading={isProvisioning}>
                {isProvisioning ? 'Provisioning...' : '▶ Start Lab'}
              </Button>
            </div>
          ) : (
            <LabTerminal
              sessionId={sessionId}
              token={sessionToken}
              isProvisioning={isProvisioning || activeSession?.status === 'provisioning'}
              onExpired={() => toast.error('Session expired. Please start a new lab.')}
              onTaskValidated={(r) => {
                if (r.passed) toast.success('Task auto-validated! ✓')
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
