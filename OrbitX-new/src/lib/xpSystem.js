import { supabase } from './supabase'

export const XP_TO_NEXT_LEVEL = 1000

export const xpSources = {
  FOCUS_SESSION: 50,
  CHAT_MESSAGE: 5,
  CHALLENGE_COMPLETED: 100,
  DISCUSSION_POST: 15,
  DISCUSSION_REPLY: 10,
  SCHEDULE_TASK: 20,
  DAILY_LOGIN: 10,
  STREAK_BONUS: 25,
}

export function calculateLevel(xp) {
  return Math.floor(xp / XP_TO_NEXT_LEVEL) + 1
}

export function getRankTitle(level) {
  const ranks = [
    { min: 1, title: 'Cosmic Cadet' },
    { min: 3, title: 'Star Navigator' },
    { min: 5, title: 'Orbit Commander' },
    { min: 8, title: 'Galaxy Pilot' },
    { min: 12, title: 'Nebula Scholar' },
    { min: 16, title: 'Supernova Sage' },
    { min: 20, title: 'Quantum Voyager' },
    { min: 25, title: 'Void Architect' },
    { min: 30, title: 'Celestial Master' },
    { min: 40, title: 'Universal Legend' },
  ]

  let title = ranks[0].title
  for (const rank of ranks) {
    if (level >= rank.min) {
      title = rank.title
    }
  }
  return title
}

export async function grantXp(userId, amount) {
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('xp, level')
    .eq('id', userId)
    .single()

  if (fetchError) throw fetchError

  const newXp = profile.xp + amount
  const newLevel = calculateLevel(newXp)

  const { data, error } = await supabase
    .from('profiles')
    .update({ xp: newXp, level: newLevel })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}
