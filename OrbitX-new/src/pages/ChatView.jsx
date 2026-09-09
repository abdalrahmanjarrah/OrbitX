import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Send } from 'lucide-react'

export default function ChatView() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    let active = true
    async function loadMessages() {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, profiles:user_id(name)')
        .order('created_at', { ascending: true })
        .limit(100)
      if (active) {
        setMessages(data || [])
        setLoading(false)
      }
    }
    loadMessages()

    const channel = supabase
      .channel('chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    const msg = newMessage.trim()
    setNewMessage('')
    setError('')
    const { error: insertError } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      content: msg,
    })
    if (insertError) {
      setError(insertError.message)
      setNewMessage(msg)
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-white">Chat</h1>
        <p className="text-gray-400 mt-1">Real-time communication with your crew</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {msg.profiles?.name?.[0] ?? '?'}
              </div>
              <div className={`max-w-xs md:max-w-md ${msg.user_id === user?.id ? 'text-right' : ''}`}>
                <p className="text-xs text-gray-500 mb-1">{msg.profiles?.name ?? 'Unknown'}</p>
                <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm ${
                  msg.user_id === user?.id
                    ? 'bg-indigo-500/20 text-indigo-100 rounded-tr-sm'
                    : 'bg-white/10 text-white rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}
