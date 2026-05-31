import { RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { store } from '@/store'
import { router } from '@/router'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { fetchMe } from '@/store/slices/authSlice'
import type { AppDispatch } from '@/store'

function AppInit({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()
  useEffect(() => {
    // Rehydrate current user on app mount
    if (localStorage.getItem('access_token')) {
      dispatch(fetchMe())
    }
  }, [dispatch])
  return <>{children}</>
}

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  return (
    <Provider store={store}>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AppInit>
          <RouterProvider router={router} />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#111827',
                color: '#f9fafb',
                border: '1px solid #1f2937',
                borderRadius: '12px',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#111827' } },
              error: { iconTheme: { primary: '#f43f5e', secondary: '#111827' } },
            }}
          />
        </AppInit>
      </GoogleOAuthProvider>
    </Provider>
  )
}

