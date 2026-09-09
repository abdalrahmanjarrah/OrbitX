import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getDiscussionVotes } from '../lib/database'
import { MessagesSquare, Plus, ChevronUp, ChevronDown } from 'lucide-react'

export default function DiscussionsView() {
  const { user } = useAuth()
  const [discussions, setDiscussions] = useState([])
  const [votes, setVotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadDiscussions()
  }, [])

  async function loadDiscussions() {
    const { data } = await supabase
      .from('discussions')
      .select('*, profiles:user_id(name)')
      .order('created_at', { ascending: false })
    setDiscussions(data || [])
    const counts = await getDiscussionVotes()
    setVotes(counts)
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) return
    const { error: insertError } = await supabase.from('discussions').insert({
      user_id: user.id,
      title: title.trim(),
      body: body.trim(),
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setTitle('')
    setBody('')
    setShowForm(false)
    loadDiscussions()
  }

  async function vote(id, dir) {
    const { data: existing, error } = await supabase
      .from('discussion_votes')
      .select('*')
      .eq('discussion_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return

    if (existing) {
      if (existing.value === dir) {
        await supabase.from('discussion_votes').delete().eq('id', existing.id)
      } else {
        await supabase.from('discussion_votes').update({ value: dir }).eq('id', existing.id)
      }
    } else {
      await supabase.from('discussion_votes').insert({
        discussion_id: id,
        user_id: user.id,
        value: dir,
      })
    }
    loadDiscussions()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Discussions</h1>
          <p className="text-gray-400 mt-1">Share ideas with fellow cosmonauts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Thread
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Discussion title..."
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
          />
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-all">
              Post
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : discussions.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MessagesSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No discussions yet. Start one!</p>
          </div>
        ) : (
          discussions.map((d) => (
            <div key={d.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1">
                  <button onClick={() => vote(d.id, 1)} className="text-gray-500 hover:text-indigo-400 transition-colors">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-mono text-white">{votes[d.id] ?? 0}</span>
                  <button onClick={() => vote(d.id, -1)} className="text-gray-500 hover:text-red-400 transition-colors">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white mb-1">{d.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2">{d.body}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>{d.profiles?.name ?? 'Anonymous'}</span>
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
