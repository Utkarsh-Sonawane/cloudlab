import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Flame, Trophy, Star, FlaskConical, ArrowRight, Clock, CheckCircle
} from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Spinner } from '@/components/common/Spinner'
import { LabCard } from '@/components/labs/LabCard'
import { authService } from '@/services/authApi'
import type { RootState } from '@/store'

export default function DashboardPage() {
  const user = useSelector((s: RootState) => s.auth.user)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService.dashboard()
      .then(res => setData(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <PageWrapper>
      <Spinner size="lg" fullscreen />
    </PageWrapper>
  )

  const stats = data?.stats || {}
  const recentSessions = data?.recent_sessions || []
  const recommendedLabs = data?.recommended_labs || []

  return (
    <PageWrapper>
      <div className="space-y-8 animate-fade-in">
        {/* Welcome header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome back, <span className="text-gradient">{user?.full_name || user?.username}</span> 👋
            </h1>
            <p className="text-gray-400 mt-1">Keep up the momentum — you're on a {stats.streak_days || 0}-day streak!</p>
          </div>
          <Link to="/labs">
            <button className="btn-brand hidden sm:flex items-center gap-2">
              <FlaskConical size={16} /> Browse labs
            </button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Labs Completed', value: stats.total_labs_completed ?? 0, icon: <CheckCircle size={20} className="text-emerald-400" />, color: 'text-emerald-400' },
            { label: 'Total Points', value: stats.total_points ?? 0, icon: <Star size={20} className="text-amber-400" />, color: 'text-amber-400' },
            { label: 'Day Streak', value: stats.streak_days ?? 0, icon: <Flame size={20} className="text-orange-400" />, color: 'text-orange-400' },
            { label: 'Rank', value: '#—', icon: <Trophy size={20} className="text-violet-400" />, color: 'text-violet-400' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }} className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{s.label}</span>
                {s.icon}
              </div>
              <span className={`text-3xl font-black mt-2 ${s.color}`}>{s.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Recent activity */}
        {recentSessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Labs</h2>
              <Link to="/profile" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {recentSessions.map((session: any) => (
                <div key={session.id} className="glass-card p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg
                    ${session.status === 'completed' ? 'bg-emerald-500/15' : 'bg-brand-500/15'}`}>
                    {session.status === 'completed' ? '✅' : '🔄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{session.lab?.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {new Date(session.started_at).toLocaleDateString()}
                      <span className="ml-2 capitalize">{session.status}</span>
                    </p>
                  </div>
                  {session.status === 'active' && (
                    <Link to={`/labs/${session.lab?.slug}/run`} className="btn-brand text-xs px-3 py-1.5">
                      Continue
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended labs */}
        {recommendedLabs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recommended for you</h2>
              <Link to="/labs" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
                All labs <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedLabs.map((lab: any) => (
                <LabCard key={lab.id} lab={lab} />
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
