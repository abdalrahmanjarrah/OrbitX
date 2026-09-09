import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Swords, Clock } from 'lucide-react'

export default function ChallengesHubView() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChallenges()
  }, [])

  async function loadChallenges() {
    const { data } = await supabase
      .from('challenges')
      .select('*, profiles:user_id(name), challenger:opponent_id(name)')
      .order('created_at', { ascending: false })
      .limit(20)
    setChallenges(data || [])
    setLoading(false)
  }

  async function handleCreate() {
    const title = prompt('Challenge title (e.g., "90min Focus Duel"):')
    if (!title) return
    await supabase.from('challenges').insert({
      user_id: user.id,
      title,
      duration_minutes: 90,
      status: 'pending',
    })
    loadChallenges()
  }

  const statusStyles = {
    pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    active: 'bg-green-500/15 text-green-400 border-green-500/20',
    completed: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
    expired: 'bg-red-500/15 text-red-400 border-red-500/20',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Challenges</h1>
          <p className="text-gray-400 mt-1">Duel fellow cosmonauts for focus supremacy</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-medium hover:from-orange-600 hover:to-red-700 transition-all"
        >
          <Swords className="w-4 h-4" />
          New Challenge
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Swords className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No challenges yet. Start a duel!</p>
          </div>
        ) : (
          challenges.map((c) => (
            <div key={c.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Swords className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{c.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {c.duration_minutes ?? 90}min
                      </span>
                      <span>{c.profiles?.name ?? 'Unknown'} vs {c.challenger?.name ?? 'TBD'}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[c.status] ?? statusStyles.pending}`}>
                  {c.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
