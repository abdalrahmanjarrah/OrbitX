import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { calculateLevel, getRankTitle } from '../lib/xpSystem'
import { getStreak } from '../lib/database'
import {
  Brain,
  MessageCircle,
  Trophy,
  Calendar,
  Rocket,
  Swords,
  TrendingUp,
  Zap,
  Target,
} from 'lucide-react'

const roomCards = [
  { to: '/study-room', title: 'Study Room', desc: 'Focus and earn XP', icon: Brain, color: 'from-indigo-500 to-blue-600' },
  { to: '/chat', title: 'Chat', desc: 'Connect with crew', icon: MessageCircle, color: 'from-purple-500 to-pink-600' },
  { to: '/challenges', title: 'Challenges', desc: 'Duel for glory', icon: Swords, color: 'from-orange-500 to-red-600' },
  { to: '/leaderboard', title: 'Leaderboard', desc: 'Top cosmonauts', icon: Trophy, color: 'from-yellow-500 to-amber-600' },
  { to: '/schedule', title: 'Schedule', desc: 'Plan your orbit', icon: Calendar, color: 'from-cyan-500 to-teal-600' },
  { to: '/fleets', title: 'Fleets', desc: 'Team missions', icon: Rocket, color: 'from-green-500 to-emerald-600' },
]

export default function HomePage() {
  const { user, profile } = useAuth()
  const [recentActivity, setRecentActivity] = useState([])
  const [streak, setStreak] = useState(0)

  const xp = profile?.xp ?? 0
  const level = calculateLevel(xp)
  const rankTitle = getRankTitle(level)

  useEffect(() => {
    async function loadData() {
      if (!profile) return
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentActivity(data || [])
    }
    loadData()
  }, [profile])

  useEffect(() => {
    if (!profile?.id) return
    let active = true
    getStreak(profile.id)
      .then((s) => { if (active) setStreak(s) })
      .catch(() => {})
    return () => { active = false }
  }, [profile])

  useEffect(() => {
    if (!user?.id) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    supabase
      .from('activity_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'daily_login')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .maybeSingle()
      .then(({ data: existing }) => {
        if (existing) return
        return supabase.from('activity_logs').insert({
          user_id: user.id,
          type: 'daily_login',
          description: 'Daily login bonus',
        })
      })
      .then(() => {})
      .catch(() => {})
  }, [user])

  const stats = [
    { label: 'Total XP', value: xp.toLocaleString(), icon: Zap, color: 'text-yellow-400' },
    { label: 'Level', value: level, icon: TrendingUp, color: 'text-indigo-400' },
    { label: 'Rank', value: rankTitle, icon: Target, color: 'text-purple-400' },
    { label: 'Streak', value: `${streak}d`, icon: Calendar, color: 'text-green-400' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
          Welcome back, <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{profile?.name ?? 'Cosmonaut'}</span>
        </h1>
        <p className="text-gray-400 mt-2">Your mission dashboard awaits. Keep pushing your limits.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-display text-xl font-bold text-white mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roomCards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-1">{card.title}</h3>
              <p className="text-sm text-gray-400">{card.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold text-white mb-4">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No recent activity. Start a study session to earn XP!</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{activity.description}</p>
                  <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
