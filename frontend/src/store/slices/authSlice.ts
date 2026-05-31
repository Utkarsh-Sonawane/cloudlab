import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { User, AuthState } from '@/types/user.types'
import { authService } from '@/services/authApi'

const initialState: AuthState = {
  user: null,
  access: localStorage.getItem('access_token'),
  refresh: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
}

export const login = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authService.login(payload)
      return res.data.data || res.data
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Login failed')
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (payload: any, { rejectWithValue }) => {
    try {
      const res = await authService.register(payload)
      return res.data.data || res.data
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed')
    }
  }
)

export const socialLogin = createAsyncThunk(
  'auth/socialLogin',
  async (payload: { provider: string; accessToken?: string; code?: string; redirectUri?: string }, { rejectWithValue }) => {
    try {
      const res = await authService.socialLogin(payload.provider, payload.accessToken, payload.code, payload.redirectUri)
      return res.data.data || res.data
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Social login failed')
    }
  }
)

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const res = await authService.me()
    return res.data.data || res.data
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch user')
  }
})

export const logout = createAsyncThunk('auth/logout', async (_, { getState }) => {
  const state = getState() as { auth: AuthState }
  if (state.auth.refresh) {
    try { await authService.logout(state.auth.refresh) } catch {}
  }
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens: (state, action: PayloadAction<{ access: string; refresh: string }>) => {
      state.access = action.payload.access
      state.refresh = action.payload.refresh
      state.isAuthenticated = true
      localStorage.setItem('access_token', action.payload.access)
      localStorage.setItem('refresh_token', action.payload.refresh)
    },
    clearAuth: (state) => {
      state.user = null; state.access = null; state.refresh = null
      state.isAuthenticated = false
      localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token')
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (s) => { s.isLoading = true })
    builder.addCase(login.fulfilled, (s, a) => {
      s.isLoading = false; s.user = a.payload.user
      s.access = a.payload.access; s.refresh = a.payload.refresh; s.isAuthenticated = true
      localStorage.setItem('access_token', a.payload.access)
      localStorage.setItem('refresh_token', a.payload.refresh)
    })
    builder.addCase(login.rejected, (s) => { s.isLoading = false })
    // Register
    builder.addCase(register.pending, (s) => { s.isLoading = true })
    builder.addCase(register.fulfilled, (s, a) => {
      s.isLoading = false; s.user = a.payload.user
      s.access = a.payload.access; s.refresh = a.payload.refresh; s.isAuthenticated = true
      localStorage.setItem('access_token', a.payload.access)
      localStorage.setItem('refresh_token', a.payload.refresh)
    })
    builder.addCase(register.rejected, (s) => { s.isLoading = false })
    // Social Login
    builder.addCase(socialLogin.pending, (s) => { s.isLoading = true })
    builder.addCase(socialLogin.fulfilled, (s, a) => {
      s.isLoading = false; s.user = a.payload.user
      s.access = a.payload.access; s.refresh = a.payload.refresh; s.isAuthenticated = true
      localStorage.setItem('access_token', a.payload.access)
      localStorage.setItem('refresh_token', a.payload.refresh)
    })
    builder.addCase(socialLogin.rejected, (s) => { s.isLoading = false })
    // FetchMe
    builder.addCase(fetchMe.fulfilled, (s, a) => { s.user = a.payload })
    // Logout
    builder.addCase(logout.fulfilled, (s) => {
      s.user = null; s.access = null; s.refresh = null; s.isAuthenticated = false
    })
  },
})

export const { setTokens, clearAuth } = authSlice.actions
export default authSlice.reducer
