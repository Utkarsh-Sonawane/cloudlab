import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Spinner } from '@/components/common/Spinner'
import { Badge } from '@/components/common/Badge'
import { authService } from '@/services/authApi'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { User, Trophy, Flame, CheckCircle, Star } from 'lucide-react'

export default function ProfilePage() {
  const { username } = useParams<{ username?: string }>()
  const currentUser = useSelector((s: RootState) => s.auth.user)
  const target = username || currentUser?.username
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!target) return
    authService.publicProfile(target)
      .then(r => setProfile(r.data.data || r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [target])

  if (loading) return <PageWrapper><Spinner size="lg" fullscreen /></PageWrapper>
  if (!profile) return <PageWrapper><div className="text-center text-gray-400 py-24">User not found</div></PageWrapper>

  const p = profile.profile || {}

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        {/* Profile header */}
        <div className="glass-card p-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-brand-gradient flex items-center justify-center text-3xl font-black text-white shadow-glow shrink-0">
              {profile.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{profile.full_name || profile.username}</h1>
              <p className="text-gray-400 text-sm mt-0.5">@{profile.username}</p>
              {p.bio && <p className="text-gray-300 text-sm mt-3 leading-relaxed">{p.bio}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-dark-border">
            {[
              { icon: <CheckCircle size={16} className="text-emerald-400" />, label: 'Labs Done', value: p.total_labs_completed ?? 0 },
              { icon: <Star size={16} className="text-amber-400" />, label: 'Points', value: p.total_points ?? 0 },
              { icon: <Flame size={16} className="text-orange-400" />, label: 'Day Streak', value: p.streak_days ?? 0 },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="flex justify-center mb-1">{s.icon}</div>
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        {profile.badges?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-amber-400" /> Badges
            </h2>
            <div className="flex flex-wrap gap-3">
              {profile.badges.map((ub: any) => (
                <div key={ub.badge.id} className="glass-card px-4 py-3 flex items-center gap-2">
                  <span className="text-lg">{ub.badge.icon_url || '🏆'}</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{ub.badge.name}</p>
                    <p className="text-xs text-gray-500">{ub.badge.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
