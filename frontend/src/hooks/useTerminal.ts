import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'

interface UseTerminalOptions {
  sessionId: string
  token: string
  /** WebSocket path segment, e.g. 'lab' or 'playground'. Defaults to 'lab'. */
  wsPath?: string
  onOutput?: (data: string) => void
  onTaskValidated?: (result: { task_id: string; passed: boolean }) => void
  onExpired?: () => void
  onConnected?: () => void
}

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement>,
  options: UseTerminalOptions
) {
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDestroyed = useRef(false)
  const inputBuffer = useRef<string[]>([])

  const connect = useCallback(() => {
    if (!options.sessionId || !options.token) return
    if (isDestroyed.current) return

    // Close any existing socket before opening a new one
    // (prevents duplicate connections from React StrictMode or stale timers)
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    const existing = wsRef.current
    if (existing && existing.readyState !== WebSocket.CLOSED) {
      existing.onclose = null // detach handler so it doesn't trigger reconnect
      existing.close(1000)
    }

    const path = options.wsPath ?? 'lab'
    const url = `${WS_BASE}/ws/${path}/${options.sessionId}/?token=${options.token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (ws !== wsRef.current) return // stale socket — ignore
      options.onConnected?.()
      termRef.current?.writeln('\r\n\x1b[32m✓ Connected to terminal\x1b[0m\r\n')
      termRef.current?.focus()
      
      // Flush buffered input
      while (inputBuffer.current.length > 0) {
        const data = inputBuffer.current.shift()
        if (data) ws.send(JSON.stringify({ type: 'input', data }))
      }
    }

    ws.onmessage = (event) => {
      if (ws !== wsRef.current) return
      try {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'output':
            termRef.current?.write(msg.data)
            options.onOutput?.(msg.data)
            break
          case 'session_expired':
            termRef.current?.writeln('\r\n\x1b[31m✗ Session expired. Please start a new lab.\x1b[0m')
            options.onExpired?.()
            break
          case 'task_validated':
            options.onTaskValidated?.(msg)
            break
          case 'error':
            termRef.current?.writeln(`\r\n\x1b[31m✗ Error: ${msg.message}\x1b[0m`)
            break
        }
      } catch {}
    }

    ws.onclose = (e) => {
      if (ws !== wsRef.current) return // stale socket — ignore
      if (isDestroyed.current) return
      // Only auto-reconnect on abnormal closure (not intentional or auth failure)
      if (e.code !== 1000 && e.code !== 4001 && e.code !== 4002) {
        termRef.current?.writeln('\r\n\x1b[33m⚠ Disconnected. Reconnecting in 3s...\x1b[0m')
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => {
      if (ws !== wsRef.current) return
      // onerror is always followed by onclose — don't print here to avoid spam
    }
  }, [options.sessionId, options.token, options.wsPath])

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return
    isDestroyed.current = false

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selectionBackground: 'rgba(99,102,241,0.3)',
        black: '#484f58', red: '#ff7b72', green: '#3fb950',
        yellow: '#d29922', blue: '#58a6ff', magenta: '#bc8cff',
        cyan: '#39c5cf', white: '#b1bac4',
        brightBlack: '#6e7681', brightRed: '#ffa198', brightGreen: '#56d364',
        brightYellow: '#e3b341', brightBlue: '#79c0ff', brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd', brightWhite: '#f0f6fc',
      },
      scrollback: 5000,
      allowTransparency: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(containerRef.current)
    
    // Initial fit with a small delay to ensure container is rendered
    setTimeout(() => {
      if (!isDestroyed.current) {
        fitAddon.fit()
        term.focus()
      }
    }, 100)

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Forward keystrokes to WebSocket
    term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }))
      } else {
        inputBuffer.current.push(data)
      }
    })

    // Resize handler
    term.onResize(({ cols, rows }) => {
      if (cols > 0 && rows > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }))
      }
    })

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit()
      } catch (err) {
        console.warn('Terminal fit failed:', err)
      }
    })
    resizeObserver.observe(containerRef.current)

    // Ensure focus when clicking the terminal container
    const handleContainerClick = () => term.focus()
    const container = containerRef.current
    container?.addEventListener('click', handleContainerClick)

    return () => {
      isDestroyed.current = true
      resizeObserver.disconnect()
      container?.removeEventListener('click', handleContainerClick)
      term.dispose()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close(1000)
    }
  }, [])

  // Connect WebSocket when session info is available
  useEffect(() => {
    if (options.sessionId && options.token) {
      connect()
    }
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      const ws = wsRef.current
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.onclose = null
        ws.close(1000)
      }
    }
  }, [options.sessionId, options.token])

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    wsRef.current?.close(1000)
  }, [])

  const clearTerminal = useCallback(() => termRef.current?.clear(), [])

  const writeToTerminal = useCallback((text: string) => {
    termRef.current?.writeln(text)
  }, [])

  return { disconnect, clearTerminal, writeToTerminal, term: termRef }
}
