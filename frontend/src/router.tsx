import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

// Pages (lazy-loadable for production)
import HomePage from '@/pages/Home'
import AuthPage from '@/pages/Auth'
import DashboardPage from '@/pages/Dashboard'
import LabsPage from '@/pages/Labs'
import LabRunnerPage from '@/pages/Labs/LabRunner'
import CoursesPage from '@/pages/Courses'
import PlaygroundPage from '@/pages/Playground'
import ProfilePage from '@/pages/Profile'
import LeaderboardPage from '@/pages/Leaderboard'

// Auth guard wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)
  if (!isAuthenticated) {
    // Preserve query parameters (like ?code=...) during redirect
    return <Navigate to={`/login${window.location.search}`} replace />
  }
  return <>{children}</>
}

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <AuthPage /> },
  { path: '/register', element: <AuthPage /> },
  {
    path: '/dashboard',
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
  },
  { path: '/labs', element: <LabsPage /> },
  {
    path: '/labs/:slug/run',
    element: <ProtectedRoute><LabRunnerPage /></ProtectedRoute>,
  },
  { path: '/labs/:slug', element: <LabsPage /> }, // Detail → redirect to run
  { path: '/courses', element: <CoursesPage /> },
  {
    path: '/playground',
    element: <ProtectedRoute><PlaygroundPage /></ProtectedRoute>,
  },
  {
    path: '/leaderboard',
    element: <ProtectedRoute><LeaderboardPage /></ProtectedRoute>,
  },
  {
    path: '/profile/:username?',
    element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export { ProtectedRoute }
