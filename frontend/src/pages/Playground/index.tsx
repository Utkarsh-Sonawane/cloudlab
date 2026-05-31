import { useState, useEffect, useRef, useCallback } from 'react'
import { Terminal, Cpu, Play, Square, Zap, Minimize2, Maximize2 } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/common/Button'
import { LabTerminal } from '@/components/labs/LabTerminal'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const SESSION_DURATION_SECS = 60 * 60

const ENVIRONMENTS = [
  { type: 'linux',  label: 'Linux Shell',      image: 'ubuntu:22.04', icon: <Terminal size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', desc: 'Ubuntu 22.04 LTS bash terminal' },
  { type: 'docker', label: 'Docker in Docker', image: 'docker:dind',  icon: <Cpu size={20} />,     color: 'text-sky-400',     bg: 'bg-sky-500/10 border-sky-500/20',         desc: 'Full Docker CLI inside a container' },
]

// ── Countdown ─────────────────────────────────────────────────────────────────

function useCountdown(expiresAt: string | null | undefined) {
  const [secs, setSecs] = useState<number | null>(null)
  useEffect(() => {
    if (!expiresAt) { setSecs(null); return }
    const tick = () => setSecs(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return secs
}

function fmt(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`
}

// ── Ring SVG ──────────────────────────────────────────────────────────────────

function Ring({ secs, total, size = 56 }: { secs: number; total: number; size?: number }) {
  const r = size / 2 - 5
  const circ = 2 * Math.PI * r
  const dash = circ * Math.max(0, secs / total)
  const urgent = secs < 120; const warn = secs < 600
  const c = urgent ? '#f87171' : warn ? '#fbbf24' : '#34d399'
  return (
    <svg width={size} height={size} className={clsx('shrink-0', urgent && 'animate-pulse')}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1f2937" strokeWidth={4}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={4}
        strokeLinecap="round" strokeDashoffset={circ*0.25}
        strokeDasharray={`${dash} ${circ}`}
        style={{transition:'stroke-dasharray 1s linear,stroke 1s ease'}}/>
      <text x={size/2} y={size/2+5} textAnchor="middle" fill={c}
        fontSize={size<48?9:13} fontFamily="monospace" fontWeight="bold">
        {urgent ? '!' : '⏱'}
      </text>
    </svg>
  )
}

// ── Timer bar (normal view) ───────────────────────────────────────────────────

function TimerBar({ expiresAt }: { expiresAt: string }) {
  const secs = useCountdown(expiresAt) ?? SESSION_DURATION_SECS
  const pct  = Math.max(0, (secs / SESSION_DURATION_SECS) * 100)
  const urgent = secs < 120; const warn = secs < 600
  const bar  = urgent ? 'bg-red-500'   : warn ? 'bg-amber-400'   : 'bg-emerald-400'
  const txt  = urgent ? 'text-red-400' : warn ? 'text-amber-400' : 'text-emerald-400'
  const bdr  = urgent ? 'border-red-500/30' : warn ? 'border-amber-500/30' : 'border-emerald-500/20'
  const lbl  = urgent ? 'Session ending soon!' : warn ? 'Less than 10 min remaining' : 'Session active'
  return (
    <div className={clsx('flex items-center gap-4 px-4 py-3 rounded-xl border bg-dark-50', bdr)}>
      <Ring secs={secs} total={SESSION_DURATION_SECS}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className={clsx('text-xs font-medium', txt)}>{lbl}</span>
          <span className={clsx('font-mono text-lg font-bold tabular-nums', txt)}>{fmt(secs)}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-dark-border overflow-hidden">
          <div className={clsx('h-full rounded-full transition-all duration-1000 ease-linear', bar)} style={{width:`${pct}%`}}/>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-600">Session started</span>
          <span className="text-[10px] text-gray-600">1 hour limit</span>
        </div>
      </div>
    </div>
  )
}

// ── Compact timer (fullscreen bar) ────────────────────────────────────────────

function CompactTimer({ expiresAt }: { expiresAt: string }) {
  const secs = useCountdown(expiresAt) ?? SESSION_DURATION_SECS
  const pct  = Math.max(0, (secs / SESSION_DURATION_SECS) * 100)
  const urgent = secs < 120; const warn = secs < 600
  const txt  = urgent ? 'text-red-400' : warn ? 'text-amber-400' : 'text-emerald-400'
  const fill = urgent ? 'bg-red-500'   : warn ? 'bg-amber-400'   : 'bg-emerald-400'
  const bdr  = urgent ? 'border-red-500/30' : warn ? 'border-amber-500/30' : 'border-emerald-500/20'
  return (
    <div className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-dark-50', bdr)}>
      <Ring secs={secs} total={SESSION_DURATION_SECS} size={32}/>
      <div>
        <div className={clsx('font-mono text-sm font-bold tabular-nums', txt, urgent && 'animate-pulse')}>{fmt(secs)}</div>
        <div className="mt-1 h-1 w-20 rounded-full bg-dark-border overflow-hidden">
          <div className={clsx('h-full rounded-full transition-all duration-1000 ease-linear', fill)} style={{width:`${pct}%`}}/>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [selectedEnv, setSelectedEnv]   = useState(ENVIRONMENTS[0])
  const [session, setSession]           = useState<any>(null)
  const [loading, setLoading]           = useState(false)
  const [stopping, setStopping]         = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ESC key exits fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/playground/${id}/status/`)
        const d   = res.data.data || res.data
        if (d.status === 'active' && d.websocket_token) {
          setSession(d); setIsFullscreen(true)
          clearInterval(pollRef.current!); pollRef.current = null
        } else if (d.status === 'expired' || d.status === 'stopped') {
          setSession(null); setIsFullscreen(false)
          clearInterval(pollRef.current!); pollRef.current = null
          toast.error('Playground session ended.')
        }
      } catch {}
    }, 2000)
  }, [])

  useEffect(() => {
    api.get('/playground/status/').then(res => {
      const d = res.data.data || res.data
      if (d?.id) {
        if (d.status === 'active' && d.websocket_token) { setSession(d); setIsFullscreen(true) }
        else if (d.status === 'provisioning')           { setSession(d); startPolling(d.id) }
      }
    }).catch(() => {})
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const start = async () => {
    setLoading(true)
    try {
      const res = await api.post('/playground/start/', { environment_type: selectedEnv.type, docker_image: selectedEnv.image })
      const d   = res.data.data || res.data
      setSession(d)
      if (d.status === 'provisioning') { toast.success('Provisioning...'); startPolling(d.id) }
      else                             { setIsFullscreen(true); toast.success('Playground ready!') }
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to start playground') }
    finally { setLoading(false) }
  }

  const stop = async () => {
    if (!session) return
    setStopping(true)
    if (pollRef.current) clearInterval(pollRef.current)
    try {
      await api.delete(`/playground/${session.id}/stop/`)
      setSession(null); setIsFullscreen(false)
      toast.success('Playground stopped.')
    } catch { toast.error('Failed to stop session') }
    finally { setStopping(false) }
  }

  const handleExpired = () => { setSession(null); setIsFullscreen(false); toast.error('1-hour session ended.', { duration: 6000 }) }

  const isActive = !!(session?.websocket_token && session?.status === 'active')

  return (
    <>
      {/* ── Fullscreen overlay top-bar (shown only in fullscreen mode) ── */}
      {isFullscreen && isActive && (
        <div
          className="fixed inset-x-0 top-0 z-[100] flex items-center justify-between px-4 py-2 border-b border-dark-border bg-dark-100"
          style={{ animation: 'fadeIn .18s ease both' }}
        >
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-brand-400" />
            <span className="text-sm font-semibold text-white">Playground</span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
            </div>
          </div>
          {session.expires_at && <CompactTimer expiresAt={session.expires_at} />}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-dark-50 hover:bg-dark-border border border-dark-border px-3 py-1.5 rounded-lg transition-all duration-150"
            >
              <Minimize2 size={13} />
              <span>Exit Fullscreen</span>
              <kbd className="ml-1 text-[10px] bg-dark-border px-1 py-0.5 rounded font-mono text-gray-500">Esc</kbd>
            </button>
            <Button variant="danger" size="sm" onClick={stop} loading={stopping} leftIcon={<Square size={12} />}>Stop</Button>
          </div>
        </div>
      )}



      {/* ── Normal page view ── */}
      <PageWrapper fullWidth>
        <div className="h-[calc(100vh-4rem)] flex flex-col p-4 gap-3">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Terminal size={24} className="text-brand-400" /> Playground
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Spin up a sandboxed container and explore freely.
                <span className="inline-flex items-center gap-1 ml-1.5 text-brand-400">
                  <Zap size={11} className="inline" /> Sessions are limited to 1 hour.
                </span>
              </p>
            </div>

            {session ? (
              <div className="flex items-center gap-2">
                {isActive && (
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-dark-50 hover:bg-dark-border border border-dark-border px-3 py-1.5 rounded-lg transition-all duration-150"
                  >
                    <Maximize2 size={13} /> <span>Fullscreen</span>
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active
                </div>
                <Button variant="danger" size="sm" onClick={stop} loading={stopping} leftIcon={<Square size={12} />}>Stop</Button>
              </div>
            ) : (
              <Button variant="brand" onClick={start} loading={loading} leftIcon={<Play size={14} />}>
                Start Playground
              </Button>
            )}
          </div>

          {/* Timer bar */}
          {session?.expires_at && isActive && <TimerBar expiresAt={session.expires_at} />}

          {/* Environment selector */}
          {!session && (
            <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
              {ENVIRONMENTS.map(env => (
                <button key={env.type} onClick={() => setSelectedEnv(env)}
                  className={clsx('p-4 rounded-xl border text-left transition-all duration-200',
                    selectedEnv.type === env.type ? `${env.bg} shadow-glow` : 'bg-dark-50 border-dark-border hover:border-gray-600'
                  )}>
                  <div className={clsx('mb-2', env.color)}>{env.icon}</div>
                  <div className="font-semibold text-white text-sm">{env.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{env.desc}</div>
                </button>
              ))}
            </div>
          )}

          <div
            className={
              isActive && isFullscreen
                ? 'fixed inset-0 z-[90] pt-[56px] bg-[#0d1117]'
                : 'flex-1 min-h-0'
            }
          >
            {isActive ? (
              <LabTerminal
                sessionId={session.id}
                token={session.websocket_token}
                wsPath="playground"
                isProvisioning={false}
                onExpired={handleExpired}
              />
            ) : session ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm font-medium">Provisioning environment...</p>
                  <p className="text-xs text-gray-600 mt-1">Pulling Docker image and starting container</p>
                </div>
              </div>
            ) : (
              <div className="h-full terminal-container flex items-center justify-center text-gray-600 font-mono text-sm">
                Select an environment and click &quot;Start Playground&quot;
              </div>
            )}
          </div>

        </div>
      </PageWrapper>
    </>
  )
}
