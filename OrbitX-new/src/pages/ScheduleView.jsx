import { useCallback, useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Clock } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6)

export default function ScheduleView() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(0)
  const [hour, setHour] = useState(9)
  const [error, setError] = useState('')

  const loadTasks = useCallback(async () => {
    const { data } = await supabase
      .from('schedule_tasks')
      .select('*')
      .eq('user_id', user?.id)
      .order('day')
    setTasks(data || [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    if (!title.trim()) return
    const { error: insertError } = await supabase.from('schedule_tasks').insert({
      user_id: user.id,
      title: title.trim(),
      day,
      hour,
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setTitle('')
    setShowForm(false)
    loadTasks()
  }

  async function handleDelete(id) {
    setError('')
    const { error: deleteError } = await supabase.from('schedule_tasks').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    loadTasks()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Schedule</h1>
          <p className="text-gray-400 mt-1">Plan your weekly orbit</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task name..."
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Day</label>
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i} className="bg-[#0a0b16]">{d}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Time</label>
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h} className="bg-[#0a0b16]">
                    {h.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-all">
              Add
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="p-3 text-left text-xs text-gray-500 font-medium w-16" />
                {DAYS.map((d) => (
                  <th key={d} className="p-3 text-center text-xs text-gray-500 font-medium">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.filter((h) => h % 2 === 0).map((h) => (
                <tr key={h} className="border-b border-white/5 last:border-0">
                  <td className="p-3 text-xs text-gray-500 font-mono">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {h.toString().padStart(2, '0')}:00
                  </td>
                  {DAYS.map((_, di) => {
                    const cellTasks = tasks.filter((t) => t.day === di && t.hour === h)
                    return (
                      <td key={di} className="p-2 text-center align-top min-h-[48px]">
                        {cellTasks.map((t) => (
                          <div key={t.id} className="group flex items-center gap-1 bg-indigo-500/15 rounded-lg px-2 py-1 text-xs text-indigo-300 mb-1">
                            <span className="truncate">{t.title}</span>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="opacity-0 group-hover:opacity-100 ml-auto text-red-400 hover:text-red-300 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
