import { useState, useEffect } from 'react'
import { Timer, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  expiresAt: string | null
  onExpired?: () => void
}

export function LabTimer({ expiresAt, onExpired }: Props) {
  const [remaining, setRemaining] = useState<number>(0)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!expiresAt) return
    const target = new Date(expiresAt).getTime()

    const tick = () => {
      const diff = Math.max(0, target - Date.now())
      setRemaining(diff)
      if (diff === 0 && !expired) {
        setExpired(true)
        onExpired?.()
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const totalMs = expiresAt ? new Date(expiresAt).getTime() - Date.now() + remaining : 0
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  const pct = expiresAt ? (remaining / (new Date(expiresAt).getTime() - Date.now() + remaining)) * 100 : 100

  const isWarning = minutes < 5
  const isDanger  = minutes < 2

  return (
    <div className={clsx(
      'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono font-semibold transition-all duration-300',
      expired    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' :
      isDanger   ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 animate-pulse' :
      isWarning  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                   'bg-dark-50 border-dark-border text-gray-300'
    )}>
      {isDanger ? <AlertTriangle size={14} /> : <Timer size={14} />}
      <span>
        {expired ? 'Expired' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
      </span>
    </div>
  )
}
