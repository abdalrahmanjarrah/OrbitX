import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { BarChart3, TrendingUp, Clock, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const customTooltipStyle = {
  backgroundColor: 'rgba(13, 14, 26, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '12px',
  color: '#f3f4f6',
}

export default function AnalyticsView() {
  const { user, profile } = useAuth()
  const [weeklyData, setWeeklyData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadData() {
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('created_at, duration_minutes')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true })

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const weeklyMap = days.map((d) => ({ name: d, minutes: 0, sessions: 0 }))
      const monthlyMap = Array.from({ length: 4 }, (_, i) => ({ name: `Week ${i + 1}`, minutes: 0 }))

      sessions?.forEach((s) => {
        const date = new Date(s.created_at)
        const dayIdx = (date.getDay() + 6) % 7
        weeklyMap[dayIdx].minutes += s.duration_minutes || 0
        weeklyMap[dayIdx].sessions += 1

        const now = new Date()
        const sameMonth = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
        if (sameMonth) {
          const weekIdx = Math.min(Math.floor((date.getDate() - 1) / 7), 3)
          monthlyMap[weekIdx].minutes += s.duration_minutes || 0
        }
      })

      if (active) {
        setWeeklyData(weeklyMap)
        setMonthlyData(monthlyMap)
        setLoading(false)
      }
    }
    loadData().catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user])

  const totalMinutes = weeklyData.reduce((a, b) => a + b.minutes, 0)
  const totalSessions = weeklyData.reduce((a, b) => a + b.sessions, 0)
  const avgPerDay = Math.round(totalMinutes / 7)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 mt-1">Track your study performance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <Clock className="w-5 h-5 text-indigo-400 mb-2" />
          <p className="text-2xl font-bold text-white">{totalMinutes}</p>
          <p className="text-sm text-gray-400">Total Minutes</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <Zap className="w-5 h-5 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-white">{totalSessions}</p>
          <p className="text-sm text-gray-400">Sessions</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <TrendingUp className="w-5 h-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-white">{avgPerDay}</p>
          <p className="text-sm text-gray-400">Avg Min/Day</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <BarChart3 className="w-5 h-5 text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-white">{(profile?.xp ?? 0).toLocaleString()}</p>
          <p className="text-sm text-gray-400">Total XP</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="font-display font-bold text-white mb-4">Weekly Focus</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Bar dataKey="minutes" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="font-display font-bold text-white mb-4">Sessions Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Line type="monotone" dataKey="sessions" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="font-display font-bold text-white mb-4">Monthly Focus</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip contentStyle={customTooltipStyle} />
            <Bar dataKey="minutes" fill="#ec4899" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
