import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { grantXp, xpSources } from '../lib/xpSystem'
import { logFocusSession } from '../lib/database'
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react'

const MODES = [
  { label: 'Focus', duration: 25 * 60 },
  { label: 'Short Break', duration: 5 * 60 },
  { label: 'Long Break', duration: 15 * 60 },
]

export default function StudyRoomView() {
  const { user } = useAuth()
  const [mode, setMode] = useState(0)
  const [timeLeft, setTimeLeft] = useState(MODES[0].duration)
  const [running, setRunning] = useState(false)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const [muted, setMuted] = useState(false)
  const completedRef = useRef(false)

  useEffect(() => {
    let active = true
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    supabase
      .from('focus_sessions')
      .select('id')
      .eq('user_id', user?.id)
      .gte('created_at', today.toISOString())
      .then(({ data }) => {
        if (active) setSessionsCompleted(data?.length ?? 0)
      })
      .catch(() => {})
    return () => { active = false }
  }, [user])

  const total = MODES[mode].duration
  const progress = ((total - timeLeft) / total) * 100

  const tick = useCallback(() => {
    setTimeLeft((prev) => (prev > 0 ? prev - 1 : prev))
  }, [])

  useEffect(() => {
    if (!running) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [running, tick])

  useEffect(() => {
    if (timeLeft === 0 && running) {
      setRunning(false)
      if (mode === 0 && !completedRef.current) {
        completedRef.current = true
        const minutes = Math.round(MODES[mode].duration / 60)
        setSessionsCompleted((s) => s + 1)
        grantXp(user?.id, xpSources.FOCUS_SESSION).catch(() => {})
        logFocusSession(user?.id, minutes).catch(() => {})
      }
    }
  }, [timeLeft, running, mode, user])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const reset = () => {
    setRunning(false)
    completedRef.current = false
    setTimeLeft(MODES[mode].duration)
  }

  const switchMode = (i) => {
    setRunning(false)
    completedRef.current = false
    setMode(i)
    setTimeLeft(MODES[i].duration)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-white">Study Room</h1>
        <p className="text-gray-400 mt-2">Deep focus mode. Earn XP for every session.</p>
      </div>

      <div className="flex justify-center gap-2">
        {MODES.map((m, i) => (
          <button
            key={m.label}
            onClick={() => switchMode(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === i
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center">
        <div className="relative w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#timerGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-5xl font-bold text-white">{formatTime(timeLeft)}</span>
            <span className="text-sm text-gray-400 mt-2">{MODES[mode].label}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={reset}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={() => setRunning(!running)}
            className="p-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
          >
            {running ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
          </button>

          <button
            onClick={() => setMuted(!muted)}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
        <p className="text-gray-400 text-sm">Sessions completed today</p>
        <p className="text-3xl font-bold text-white mt-1">{sessionsCompleted}</p>
        <p className="text-xs text-indigo-400 mt-2">+{xpSources.FOCUS_SESSION} XP per session</p>
      </div>
    </div>
  )
}
