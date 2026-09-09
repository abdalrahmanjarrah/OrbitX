import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Rocket, Plus, Users, Crown, Check } from 'lucide-react'

export default function FleetsView() {
  const { user } = useAuth()
  const [fleets, setFleets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadFleets()
  }, [])

  async function loadFleets() {
    const { data } = await supabase
      .from('fleets')
      .select('*, profiles:created_by(id, name), fleet_members(user_id)')
      .order('created_at', { ascending: false })
    setFleets(data || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return
    const { error: insertError } = await supabase.from('fleets').insert({
      name: name.trim(),
      description: description.trim(),
      created_by: user.id,
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setName('')
    setDescription('')
    setShowForm(false)
    loadFleets()
  }

  async function handleJoin(fleetId) {
    setError('')
    const { data: existing } = await supabase
      .from('fleet_members')
      .select('id')
      .eq('fleet_id', fleetId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) return

    const { error: joinError } = await supabase.from('fleet_members').insert({
      fleet_id: fleetId,
      user_id: user.id,
    })
    if (joinError) {
      setError(joinError.message)
      return
    }
    loadFleets()
  }

  function isMember(fleet) {
    return fleet.fleet_members?.some((m) => m.user_id === user.id) ?? false
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Fleets</h1>
          <p className="text-gray-400 mt-1">Create or join study fleets</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Fleet
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fleet name..."
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Fleet description..."
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
          />
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-all">
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          <div className="col-span-full flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : fleets.length === 0 ? (
          <div className="col-span-full text-center py-16 text-gray-500">
            <Rocket className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No fleets yet. Create one to start!</p>
          </div>
        ) : (
          fleets.map((fleet) => (
            <div key={fleet.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{fleet.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-yellow-400" />
                      Created by {fleet.profiles?.name ?? 'Unknown'}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-xs text-gray-400">
                  <Users className="w-3 h-3" />
                  {fleet.fleet_members?.length ?? 0}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-4">{fleet.description || 'No description'}</p>
              <button
                onClick={() => handleJoin(fleet.id)}
                disabled={isMember(fleet)}
                className={`w-full py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                  isMember(fleet)
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400 cursor-default'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {isMember(fleet) ? <Check className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                {isMember(fleet) ? 'Joined' : 'Join Fleet'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
