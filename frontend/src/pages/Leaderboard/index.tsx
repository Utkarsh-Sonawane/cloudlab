import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Spinner } from '@/components/common/Spinner'
import { authService } from '@/services/authApi'
import { Trophy, Flame, Star, CheckCircle, ArrowRight, Award, Medal } from 'lucide-react'
import { motion } from 'framer-motion'

interface LeaderboardUser {
  id: number
  username: string
  full_name: string
  avatar_url: string | null
  total_points: number
  total_labs_completed: number
  streak_days: number
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService.leaderboard()
      .then(res => {
        setUsers(res.data.data || res.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <PageWrapper>
        <Spinner size="lg" fullscreen />
      </PageWrapper>
    )
  }

  // Top 3 Podium
  const top1 = users[0]
  const top2 = users[1]
  const top3 = users[2]
  const restUsers = users.slice(3)

  const getInitials = (user: LeaderboardUser) => {
    return (user.full_name || user.username || 'U')[0].toUpperCase()
  }

  return (
    <PageWrapper>
      <div className="space-y-10 animate-fade-in pb-12">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2"
          >
            <Trophy size={32} className="animate-pulse" />
          </motion.div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
            Global <span className="text-gradient">Leaderboard</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            See how you stack up against the top cloud engineers and developers globally.
          </p>
        </div>

        {/* Podium for Top 3 */}
        {users.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto pt-6 px-4">
            
            {/* Rank 2 (Silver) */}
            {top2 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="order-2 md:order-1"
              >
                <Link to={`/profile/${top2.username}`} className="block group">
                  <div className="glass-card p-6 flex flex-col items-center relative overflow-hidden transition-all duration-300 group-hover:border-slate-400/40 group-hover:-translate-y-1">
                    <div className="absolute top-3 right-3 text-slate-400 flex items-center gap-1 bg-slate-500/10 border border-slate-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      <Medal size={12} /> #2
                    </div>
                    
                    {top2.avatar_url ? (
                      <img 
                        src={top2.avatar_url} 
                        alt={top2.username} 
                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-400 shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-xl font-bold text-white shadow-lg border-2 border-slate-400">
                        {getInitials(top2)}
                      </div>
                    )}

                    <h3 className="mt-4 font-bold text-white text-base truncate max-w-full text-center group-hover:text-slate-300">
                      {top2.full_name || top2.username}
                    </h3>
                    <p className="text-xs text-gray-500">@{top2.username}</p>

                    <div className="grid grid-cols-2 gap-4 mt-5 w-full pt-4 border-t border-dark-border text-center">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Points</p>
                        <p className="text-base font-black text-slate-300">{top2.total_points}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Labs Done</p>
                        <p className="text-base font-black text-slate-300">{top2.total_labs_completed}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Rank 1 (Gold) */}
            {top1 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="order-1 md:order-2 z-10"
              >
                <Link to={`/profile/${top1.username}`} className="block group">
                  <div className="glass-card p-8 flex flex-col items-center relative overflow-hidden transition-all duration-300 border-amber-500/40 bg-amber-500/5 group-hover:border-amber-400 group-hover:-translate-y-2 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                    <div className="absolute top-4 right-4 text-amber-400 flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-full text-sm font-black">
                      <Award size={14} className="animate-bounce" /> #1
                    </div>
                    
                    {top1.avatar_url ? (
                      <img 
                        src={top1.avatar_url} 
                        alt={top1.username} 
                        className="w-20 h-20 rounded-full object-cover border-4 border-amber-400 shadow-glow shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl font-black text-white shadow-glow border-4 border-amber-400 shrink-0">
                        {getInitials(top1)}
                      </div>
                    )}

                    <h3 className="mt-4 font-black text-white text-lg truncate max-w-full text-center group-hover:text-amber-300">
                      {top1.full_name || top1.username}
                    </h3>
                    <p className="text-xs text-amber-500/80 font-semibold">@{top1.username}</p>

                    <div className="grid grid-cols-3 gap-2 mt-6 w-full pt-4 border-t border-dark-border text-center">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Points</p>
                        <p className="text-lg font-black text-amber-400">{top1.total_points}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Labs Done</p>
                        <p className="text-lg font-black text-white">{top1.total_labs_completed}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Streak</p>
                        <p className="text-lg font-black text-orange-400 flex items-center justify-center gap-0.5">
                          <Flame size={14} className="fill-orange-400/20" /> {top1.streak_days}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Rank 3 (Bronze) */}
            {top3 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="order-3"
              >
                <Link to={`/profile/${top3.username}`} className="block group">
                  <div className="glass-card p-6 flex flex-col items-center relative overflow-hidden transition-all duration-300 group-hover:border-amber-700/40 group-hover:-translate-y-1">
                    <div className="absolute top-3 right-3 text-amber-600 flex items-center gap-1 bg-amber-700/10 border border-amber-700/20 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      <Medal size={12} /> #3
                    </div>
                    
                    {top3.avatar_url ? (
                      <img 
                        src={top3.avatar_url} 
                        alt={top3.username} 
                        className="w-16 h-16 rounded-full object-cover border-2 border-amber-700 shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-xl font-bold text-white shadow-lg border-2 border-amber-700">
                        {getInitials(top3)}
                      </div>
                    )}

                    <h3 className="mt-4 font-bold text-white text-base truncate max-w-full text-center group-hover:text-amber-600">
                      {top3.full_name || top3.username}
                    </h3>
                    <p className="text-xs text-gray-500">@{top3.username}</p>

                    <div className="grid grid-cols-2 gap-4 mt-5 w-full pt-4 border-t border-dark-border text-center">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Points</p>
                        <p className="text-base font-black text-amber-600">{top3.total_points}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Labs Done</p>
                        <p className="text-base font-black text-white">{top3.total_labs_completed}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

          </div>
        )}

        {/* Table for remaining ranks */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-dark-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Award size={18} className="text-brand-400" /> Rankings
              </h2>
              <span className="text-xs text-gray-500 font-medium">{users.length} cloud specialists</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-border/40 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white/2 cursor-default">
                    <th className="py-4 px-6 text-center w-16">Rank</th>
                    <th className="py-4 px-6">User</th>
                    <th className="py-4 px-6 text-center w-28">Streak</th>
                    <th className="py-4 px-6 text-center w-36">Labs Completed</th>
                    <th className="py-4 px-6 text-right w-32">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {restUsers.map((user, index) => {
                    const rank = index + 4
                    return (
                      <tr 
                        key={user.id} 
                        className="group hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-4 px-6 text-center font-bold text-gray-400 group-hover:text-white">
                          #{rank}
                        </td>
                        <td className="py-4 px-6">
                          <Link to={`/profile/${user.username}`} className="flex items-center gap-3 w-fit">
                            {user.avatar_url ? (
                              <img 
                                src={user.avatar_url} 
                                alt={user.username} 
                                className="w-9 h-9 rounded-full object-cover border border-dark-border"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-xs font-bold text-white border border-brand-500/10">
                                {getInitials(user)}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
                                {user.full_name || user.username}
                              </p>
                              <p className="text-xs text-gray-500">@{user.username}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {user.streak_days > 0 ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
                              <Flame size={12} className="fill-orange-400/10" />
                              <span>{user.streak_days}d</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center font-semibold text-gray-300">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <CheckCircle size={14} className="text-emerald-500/60" />
                            <span>{user.total_labs_completed}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-white pr-8">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <Star size={14} className="text-amber-400 fill-amber-400/20" />
                            <span>{user.total_points.toLocaleString()}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500 text-sm">
                        No players ranked yet. Complete labs to claim your spot!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
