import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Orbit, Zap } from 'lucide-react'

export default function BlackHolesView() {
  const { user, refreshProfile } = useAuth()
  const [blackHoles, setBlackHoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadBlackHoles()
  }, [])

  async function loadBlackHoles() {
    const { data } = await supabase
      .from('black_holes')
      .select('*')
      .order('created_at', { ascending: false })
    setBlackHoles(data || [])
    setLoading(false)
  }

  async function contributeXp(blackHoleId, amount) {
    setError('')
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .single()

    if (fetchError || !profile) {
      setError('Could not load your XP balance.')
      return
    }

    if (profile.xp < amount) {
      setError(`You need at least ${amount} XP to contribute.`)
      return
    }

    const { error: insertError } = await supabase.from('black_hole_contributions').insert({
      black_hole_id: blackHoleId,
      user_id: user.id,
      amount,
    })
    if (insertError) {
      setError(insertError.message)
      return
    }

    await supabase
      .from('black_holes')
      .update({ current_xp: (blackHoles.find((b) => b.id === blackHoleId)?.current_xp ?? 0) + amount })
      .eq('id', blackHoleId)

    await supabase
      .from('profiles')
      .update({ xp: profile.xp - amount })
      .eq('id', user.id)

    refreshProfile()
    loadBlackHoles()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Black Holes</h1>
        <p className="text-gray-400 mt-1">Community goals. Contribute XP to clear the void.</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : blackHoles.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Orbit className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No active Black Holes. Check back later.</p>
          </div>
        ) : (
          blackHoles.map((bh) => {
            const progress = bh.target_xp > 0 ? Math.min((bh.current_xp / bh.target_xp) * 100, 100) : 0
            const completed = progress >= 100

            return (
              <div key={bh.id} className={`bg-white/5 backdrop-blur-xl border rounded-2xl p-6 transition-all ${completed ? 'border-green-500/20' : 'border-white/10 hover:bg-white/8'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${completed ? 'bg-green-500/20' : 'bg-indigo-500/20'}`}>
                      <Orbit className={`w-6 h-6 ${completed ? 'text-green-400' : 'text-indigo-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{bh.title}</h3>
                      <p className="text-xs text-gray-500">{bh.description ?? 'Community challenge'}</p>
                    </div>
                  </div>
                  {completed && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/20">
                      Cleared
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {(bh.current_xp ?? 0).toLocaleString()} XP
                    </span>
                    <span className="text-gray-500">
                      Target: {(bh.target_xp ?? 0).toLocaleString()} XP
                    </span>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${completed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {!completed && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => contributeXp(bh.id, 50)}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      +50 XP
                    </button>
                    <button
                      onClick={() => contributeXp(bh.id, 100)}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      +100 XP
                    </button>
                    <button
                      onClick={() => contributeXp(bh.id, 250)}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      +250 XP
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
