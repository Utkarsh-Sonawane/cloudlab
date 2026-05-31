import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FlaskConical, BookOpen, Terminal, Trophy,
  User, Settings, ChevronRight, Zap
} from 'lucide-react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/labs',        icon: FlaskConical,     label: 'Labs' },
  { to: '/courses',     icon: BookOpen,         label: 'Courses' },
  { to: '/playground',  icon: Terminal,         label: 'Playground' },
  { to: '/leaderboard', icon: Trophy,           label: 'Leaderboard' },
]

const BOTTOM_ITEMS = [
  { to: '/profile',  icon: User,     label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const location = useLocation()
  const sidebarOpen = useSelector((s: RootState) => s.ui.sidebarOpen)
  const user = useSelector((s: RootState) => s.auth.user)

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ x: -240, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -240, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed left-0 top-16 bottom-0 w-60 border-r border-dark-border bg-dark-DEFAULT/95 backdrop-blur-md z-30 flex flex-col py-4 px-3"
        >
          {/* Main nav */}
          <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const active = location.pathname === to || location.pathname.startsWith(`${to}/`)
              return (
                <Link key={to} to={to} className={clsx('nav-item', active && 'active')}>
                  <Icon size={18} />
                  <span>{label}</span>
                  {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
                </Link>
              )
            })}
          </nav>

          {/* Bottom nav */}
          <div className="border-t border-dark-border pt-3 space-y-1">
            {BOTTOM_ITEMS.map(({ to, icon: Icon, label }) => {
              const active = location.pathname === to
              return (
                <Link key={to} to={to} className={clsx('nav-item', active && 'active')}>
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              )
            })}

            {/* Plan badge — below Settings */}
            {user && (
              <div className="mt-3 px-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/20">
                  <Zap size={14} className="text-brand-400" />
                  <span className="text-xs font-semibold text-brand-300 capitalize">{user.plan} Plan</span>
                  {user.plan === 'free' && (
                    <Link to="/pricing" className="ml-auto text-xs text-brand-400 hover:text-brand-300 underline">
                      Upgrade
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
