import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Terminal, Bell, ChevronDown, LogOut, User, Settings, Menu } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDispatch } from 'react-redux'
import { toggleSidebar } from '@/store/slices/uiSlice'
import type { AppDispatch } from '@/store'
import { Logo } from '@/components/common/Logo'

export function Navbar() {
  const { user, isAuthenticated, signOut } = useAuth()
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-16 border-b border-dark-border bg-dark-DEFAULT/80 backdrop-blur-md">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left: Logo + sidebar toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="btn-ghost p-2 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          <Link to="/" className="flex items-center">
            <Logo className="h-9" />
          </Link>
        </div>

        {/* Center: Nav links (desktop) */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { to: '/labs', label: 'Labs' },
            { to: '/courses', label: 'Courses' },
            { to: '/playground', label: 'Playground' },
          ].map(({ to, label }) => (
            <Link key={to} to={to} className="btn-ghost text-sm font-medium">{label}</Link>
          ))}
        </div>

        {/* Right: Auth */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <div className="relative">
                <button 
                  onClick={() => { setNotificationsOpen(!notificationsOpen); setDropdownOpen(false); }}
                  className="btn-ghost p-2 relative" 
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
                </button>

                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 top-full mt-2 w-72 bg-dark-card border border-dark-border shadow-card p-2 rounded-xl z-50"
                  >
                    <div className="px-3 py-2 mb-1 border-b border-dark-border">
                      <p className="text-sm font-semibold text-white">Notifications</p>
                    </div>
                    <div className="py-4 px-3 text-sm text-gray-400 text-center">
                      No new notifications
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => { setDropdownOpen(!dropdownOpen); setNotificationsOpen(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-sm font-bold text-white">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-300">{user?.username}</span>
                  <ChevronDown size={14} className="text-gray-500" />
                </button>

                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute right-0 top-full mt-2 w-52 bg-dark-card border border-dark-border shadow-card rounded-xl p-2 z-50"
                  >
                    <div className="px-3 py-2 mb-1 border-b border-dark-border">
                      <p className="text-sm font-semibold text-white">{user?.full_name || user?.username}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    {[
                      { to: '/dashboard', icon: <User size={14} />, label: 'Dashboard' },
                      { to: `/profile/${user?.username}`, icon: <User size={14} />, label: 'Profile' },
                    ].map(({ to, icon, label }) => (
                      <Link key={to} to={to} onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                        {icon}{label}
                      </Link>
                    ))}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-all mt-1"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </motion.div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
              <Link to="/register" className="btn-brand text-sm">Get started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
