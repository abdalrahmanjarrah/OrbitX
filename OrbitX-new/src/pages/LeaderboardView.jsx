import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Trophy, Medal } from 'lucide-react'

export default function LeaderboardView() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, xp, level')
        .order('xp', { ascending: false })
        .limit(50)
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const getMedalColor = (i) => {
    if (i === 0) return 'text-yellow-400'
    if (i === 1) return 'text-gray-300'
    if (i === 2) return 'text-amber-600'
    return 'text-gray-600'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Leaderboard</h1>
        <p className="text-gray-400 mt-1">Top cosmonauts in the galaxy</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          {users.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No rankings yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {users.map((u, i) => (
                <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors">
                  <div className="w-8 text-center">
                    {i < 3 ? (
                      <Medal className={`w-5 h-5 mx-auto ${getMedalColor(i)}`} />
                    ) : (
                      <span className="text-sm font-mono text-gray-500">{i + 1}</span>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                    {u.name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{u.name ?? 'Anonymous'}</p>
                    <p className="text-xs text-gray-500">Level {u.level}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium text-indigo-300">{(u.xp ?? 0).toLocaleString()} XP</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
