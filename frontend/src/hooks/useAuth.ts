import { useSelector, useDispatch } from 'react-redux'
import { useCallback } from 'react'
import type { RootState, AppDispatch } from '@/store'
import { login, logout, register, fetchMe, socialLogin } from '@/store/slices/authSlice'

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>()
  const { user, isAuthenticated, isLoading, access } = useSelector((s: RootState) => s.auth)

  const signIn = useCallback(
    (email: string, password: string) => dispatch(login({ email, password })),
    [dispatch]
  )

  const signUp = useCallback(
    (payload: any) => dispatch(register(payload)),
    [dispatch]
  )

  const socialSignIn = useCallback(
    (provider: string, accessToken?: string, code?: string, redirectUri?: string) => 
      dispatch(socialLogin({ provider, accessToken, code, redirectUri })),
    [dispatch]
  )

  const signOut = useCallback(() => dispatch(logout()), [dispatch])

  const refreshUser = useCallback(() => dispatch(fetchMe()), [dispatch])

  return { user, isAuthenticated, isLoading, access, signIn, signUp, socialSignIn, signOut, refreshUser }
}
