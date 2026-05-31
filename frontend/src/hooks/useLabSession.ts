import { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/store'
import { setActiveSession, setProvisioning, setValidating, advanceTask, updateSessionStatus } from '@/store/slices/labSlice'
import { labsService } from '@/services/labsApi'
import type { LabSession, ValidationResult } from '@/types/lab.types'
import toast from 'react-hot-toast'

export function useLabSession(labSlug: string) {
  const dispatch = useDispatch<AppDispatch>()
  const { activeSession: globalActiveSession, isProvisioning, isValidating } = useSelector((s: RootState) => s.lab)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeSession = globalActiveSession?.lab.slug === labSlug ? globalActiveSession : null

  const startSession = useCallback(async () => {
    dispatch(setProvisioning(true))
    try {
      const res = await labsService.startSession(labSlug)
      const session: LabSession = res.data.data || res.data
      dispatch(setActiveSession(session))

      // If still provisioning, poll for ACTIVE status
      if (session.status === 'provisioning') {
        pollTimer.current = setInterval(async () => {
          try {
            const pollRes = await labsService.getSession(labSlug)
            const polled: LabSession = pollRes.data.data || pollRes.data
            dispatch(setActiveSession(polled))
            if (polled.status === 'active') {
              clearInterval(pollTimer.current!)
              dispatch(setProvisioning(false))
              toast.success('Lab environment ready!', { icon: '🚀' })
            } else if (polled.status === 'failed') {
              clearInterval(pollTimer.current!)
              dispatch(setProvisioning(false))
              toast.error('Lab provisioning failed. Please try again.')
            }
          } catch {}
        }, 2000)
      } else {
        dispatch(setProvisioning(false))
      }
    } catch (err: any) {
      dispatch(setProvisioning(false))
      toast.error(err.response?.data?.message || 'Failed to start lab')
    }
  }, [labSlug])

  const stopSession = useCallback(async () => {
    try {
      await labsService.stopSession(labSlug)
      toast.success('Lab session ended.')
    } catch (err: any) {
      // Still clear local state even on error so UI doesn't get stuck
      console.warn('Stop session API error:', err.response?.data?.message)
    } finally {
      dispatch(setActiveSession(null))
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [labSlug])

  const validateTask = useCallback(async (): Promise<ValidationResult | null> => {
    if (!activeSession) return null
    dispatch(setValidating(true))
    try {
      const res = await labsService.validateTask(activeSession.id)
      const result: ValidationResult = res.data.data || res.data
      if (result.passed) {
        dispatch(advanceTask())
        if (result.all_tasks_complete) {
          dispatch(updateSessionStatus('completed'))
        }
      }
      return result
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Validation error')
      return null
    } finally {
      dispatch(setValidating(false))
    }
  }, [activeSession])

  const getHint = useCallback(async (): Promise<string | null> => {
    if (!activeSession) return null
    try {
      const res = await labsService.getHint(activeSession.id)
      return res.data.data?.hint || null
    } catch { return null }
  }, [activeSession])

  // Load existing session on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await labsService.getSession(labSlug)
        const session: LabSession = res.data.data || res.data
        if (session.status === 'active' || session.status === 'provisioning') {
          dispatch(setActiveSession(session))
        }
      } catch {}
    }
    load()
    return () => { if (pollTimer.current) clearInterval(pollTimer.current) }
  }, [labSlug])

  return { activeSession, isProvisioning, isValidating, startSession, stopSession, validateTask, getHint }
}
