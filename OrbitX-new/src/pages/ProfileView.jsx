import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { calculateLevel, getRankTitle, XP_TO_NEXT_LEVEL } from '../lib/xpSystem'
import { Mail, Zap, TrendingUp, Edit2, Save, X } from 'lucide-react'

export default function ProfileView() {
  const { user, profile, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setBio(profile.bio ?? '')
    }
  }, [profile])

  if (!profile) return null

  const xp = profile.xp ?? 0
  const level = calculateLevel(xp)
  const rankTitle = getRankTitle(level)
  const xpInLevel = xp % XP_TO_NEXT_LEVEL
  const progress = (xpInLevel / XP_TO_NEXT_LEVEL) * 100

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const { error: updateError } = await supabase.from('profiles').update({ name, bio }).eq('id', user.id)
      if (updateError) throw updateError
      refreshProfile()
      setEditing(false)
    } catch (err) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl font-bold text-white">Profile</h1>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mb-4">
            {profile.name?.[0] ?? 'U'}
          </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-center text-xl font-bold text-white bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500/50"
            />
          ) : (
            <h2 className="text-xl font-bold text-white">{profile.name ?? 'Cosmonaut'}</h2>
          )}

          <p className="text-sm text-gray-400 mt-1">{rankTitle}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {user?.email}
          </p>
        </div>

        {editing ? (
          <div className="mt-6 space-y-4">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
            />
            <div className="flex gap-3 justify-center">
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-all">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setName(profile.name ?? ''); setBio(profile.bio ?? '') }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-all">
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="mt-4 mx-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white hover:bg-white/10 transition-all"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="font-display font-bold text-white mb-4">Level Progress</h3>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-400">Level {level}</span>
          <span className="text-gray-400">{xpInLevel} / {XP_TO_NEXT_LEVEL} XP</span>
          <span className="text-gray-400">Level {level + 1}</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <Zap className="w-5 h-5 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-white">{xp.toLocaleString()}</p>
          <p className="text-sm text-gray-400">Total XP</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <TrendingUp className="w-5 h-5 text-indigo-400 mb-2" />
          <p className="text-2xl font-bold text-white">{level}</p>
          <p className="text-sm text-gray-400">Current Level</p>
        </div>
      </div>
    </div>
  )
}
