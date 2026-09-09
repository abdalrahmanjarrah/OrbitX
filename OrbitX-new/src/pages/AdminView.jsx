import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Shield, Users, Settings, Database, RefreshCw } from 'lucide-react'

export default function AdminView() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalUsers: 0, totalXp: 0, activeToday: 0 })

  useEffect(() => {
    if (!isAdmin) return
    loadAdminData()
  }, [isAdmin])

  async function loadAdminData() {
    const { data: profiles } = await supabase.from('profiles').select('*')
    setUsers(profiles || [])

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data: activity } = await supabase
      .from('activity_logs')
      .select('user_id')
      .gte('created_at', today.toISOString())

    const activeSet = new Set(activity?.map((a) => a.user_id) ?? [])
    const { data: sessions } = await supabase
      .from('focus_sessions')
      .select('user_id')
      .gte('created_at', today.toISOString())
    sessions?.forEach((s) => activeSet.add(s.user_id))

    setStats({
      totalUsers: profiles?.length ?? 0,
      totalXp: profiles?.reduce((a, b) => a + (b.xp ?? 0), 0) ?? 0,
      activeToday: activeSet.size,
    })
    setLoading(false)
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Shield className="w-16 h-16 mb-4 opacity-30" />
        <h2 className="font-display text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm">You need admin privileges to view this page.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 mt-1">Manage your OrbitX instance</p>
        </div>
        <button
          onClick={loadAdminData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <Users className="w-5 h-5 text-indigo-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
          <p className="text-sm text-gray-400">Total Users</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <Database className="w-5 h-5 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.totalXp.toLocaleString()}</p>
          <p className="text-sm text-gray-400">Total XP Earned</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <Settings className="w-5 h-5 text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.activeToday}</p>
          <p className="text-sm text-gray-400">Active Today</p>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-display font-bold text-white">All Users</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left text-xs text-gray-500 font-medium">User</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 font-medium">Email</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 font-medium">Level</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 font-medium">XP</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                          {u.name?.[0] ?? '?'}
                        </div>
                        <span className="text-sm text-white">{u.name ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-400">{u.email ?? '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-300 font-mono">{u.level ?? 1}</td>
                    <td className="px-6 py-3 text-sm text-gray-300 font-mono">{(u.xp ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.role === 'admin' ? 'bg-red-500/15 text-red-400' : 'bg-white/10 text-gray-400'
                      }`}>
                        {u.role ?? 'user'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
