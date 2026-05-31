import { useRef } from 'react'
import { TerminalIcon, RotateCcw } from 'lucide-react'
import { useTerminal } from '@/hooks/useTerminal'
import { Spinner } from '@/components/common/Spinner'
import '@xterm/xterm/css/xterm.css'

interface Props {
  sessionId: string
  token: string
  /** WebSocket path: 'lab' (default) or 'playground' */
  wsPath?: string
  isProvisioning?: boolean
  onExpired?: () => void
  onTaskValidated?: (result: { task_id: string; passed: boolean }) => void
}

/**
 * Provisioning overlay — shown while container is being created.
 */
function ProvisioningOverlay() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-dark-100">
      <Spinner size="lg" />
      <div className="text-center">
        <p className="text-sm font-medium text-white">Provisioning environment...</p>
        <p className="text-xs text-gray-500 mt-1">Pulling Docker image and starting container</p>
      </div>
      <div className="flex gap-1 mt-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-brand-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

/**
 * Active terminal — only mounts when the session is truly ready.
 * This is a separate component so that React mounts/unmounts cleanly,
 * ensuring the useTerminal hook initializes xterm AFTER the <div> exists.
 */
function ActiveTerminal({ sessionId, token, wsPath, onExpired, onTaskValidated }: {
  sessionId: string
  token: string
  wsPath?: string
  onExpired?: () => void
  onTaskValidated?: (result: { task_id: string; passed: boolean }) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null!)
  const { clearTerminal } = useTerminal(containerRef, {
    sessionId,
    token,
    wsPath,
    onExpired,
    onTaskValidated,
    onConnected: () => {},
  })

  return (
    <>
      {/* Terminal title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-dark-border bg-dark-100">
        <div className="flex items-center gap-2">
          {/* macOS-style dots */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="ml-2 text-xs font-mono text-gray-500 flex items-center gap-1.5">
            <TerminalIcon size={12} /> bash — cloudlab-terminal
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearTerminal}
            className="btn-ghost p-1.5 text-gray-500 hover:text-gray-300"
            title="Clear terminal"
          >
            <RotateCcw size={13} />
          </button>

        </div>
      </div>

      {/* Terminal body */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={containerRef} className="h-full w-full" id="lab-terminal" />
      </div>
    </>
  )
}

export function LabTerminal({ sessionId, token, wsPath, isProvisioning, onExpired, onTaskValidated }: Props) {
  return (
    <div className="flex flex-col h-full terminal-container">
      {isProvisioning ? (
        <ProvisioningOverlay />
      ) : (
        <ActiveTerminal
          sessionId={sessionId}
          token={token}
          wsPath={wsPath}
          onExpired={onExpired}
          onTaskValidated={onTaskValidated}
        />
      )}
    </div>
  )
}
