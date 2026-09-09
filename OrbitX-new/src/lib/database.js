import { supabase } from './supabase'

// ─── Profile ──────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('xp', { ascending: false })
  if (error) throw error
  return data
}

// ─── Rooms ────────────────────────────────────────────────

export async function getRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, profiles:host_id(id, username, avatar_url)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createRoom(room) {
  const { data, error } = await supabase
    .from('rooms')
    .insert(room)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function joinRoom(roomId, userId) {
  const { data, error } = await supabase
    .from('room_members')
    .insert({ room_id: roomId, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function leaveRoom(roomId, userId) {
  const { error } = await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function updateRoomTimer(roomId, timerData) {
  const { data, error } = await supabase
    .from('rooms')
    .update({ timer_state: timerData })
    .eq('id', roomId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Fleets ───────────────────────────────────────────────

export async function getFleets() {
  const { data, error } = await supabase
    .from('fleets')
    .select('*, profiles:leader_id(id, username, avatar_url), fleet_members(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createFleet(fleet) {
  const { data, error } = await supabase
    .from('fleets')
    .insert(fleet)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function joinFleet(fleetId, userId) {
  const { data, error } = await supabase
    .from('fleet_members')
    .insert({ fleet_id: fleetId, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function leaveFleet(fleetId, userId) {
  const { error } = await supabase
    .from('fleet_members')
    .delete()
    .eq('fleet_id', fleetId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function inviteToFleet(fleetId, userId) {
  const { data, error } = await supabase
    .from('fleet_invites')
    .insert({ fleet_id: fleetId, invited_user: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Challenges ───────────────────────────────────────────

export async function getChallenges() {
  const { data, error } = await supabase
    .from('challenges')
    .select('*, profiles:creator_id(id, username, avatar_url), challenge_participants(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createChallenge(challenge) {
  const { data, error } = await supabase
    .from('challenges')
    .insert(challenge)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function acceptChallenge(challengeId, userId) {
  const { data, error } = await supabase
    .from('challenge_participants')
    .insert({ challenge_id: challengeId, user_id: userId, progress: 0 })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProgress(challengeId, userId, progress) {
  const { data, error } = await supabase
    .from('challenge_participants')
    .update({ progress })
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Discussions ──────────────────────────────────────────

export async function getDiscussions() {
  const { data, error } = await supabase
    .from('discussions')
    .select('*, profiles:user_id(id, username, avatar_url), discussion_replies(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createDiscussion(discussion) {
  const { data, error } = await supabase
    .from('discussions')
    .insert(discussion)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function likeDiscussion(discussionId, userId) {
  const { data: existing } = await supabase
    .from('discussion_likes')
    .select('id')
    .eq('discussion_id', discussionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('discussion_likes')
      .delete()
      .eq('id', existing.id)
    if (error) throw error
    return false
  }

  const { error } = await supabase
    .from('discussion_likes')
    .insert({ discussion_id: discussionId, user_id: userId })
  if (error) throw error
  return true
}

export async function addReply(discussionId, userId, content) {
  const { data, error } = await supabase
    .from('discussion_replies')
    .insert({ discussion_id: discussionId, user_id: userId, content })
    .select('*, profiles:user_id(id, username, avatar_url)')
    .single()
  if (error) throw error
  return data
}

// ─── Chat ─────────────────────────────────────────────────

export async function getMessages(roomId, limit = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles:user_id(id, username, avatar_url)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data
}

export async function sendMessage(roomId, userId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ room_id: roomId, user_id: userId, content })
    .select('*, profiles:user_id(id, username, avatar_url)')
    .single()
  if (error) throw error
  return data
}

// ─── Schedule ─────────────────────────────────────────────

export async function getSchedule(userId) {
  const { data, error } = await supabase
    .from('schedule_items')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addScheduleItem(item) {
  const { data, error } = await supabase
    .from('schedule_items')
    .insert(item)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateScheduleItem(itemId, updates) {
  const { data, error } = await supabase
    .from('schedule_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteScheduleItem(itemId) {
  const { error } = await supabase
    .from('schedule_items')
    .delete()
    .eq('id', itemId)
  if (error) throw error
}

// ─── Support ──────────────────────────────────────────────

export async function getTickets(userId) {
  const query = supabase
    .from('support_tickets')
    .select('*, ticket_messages(*)')
    .order('created_at', { ascending: false })

  if (userId) query.eq('user_id', userId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createTicket(ticket) {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert(ticket)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addTicketMessage(ticketId, userId, content) {
  const { data, error } = await supabase
    .from('ticket_messages')
    .insert({ ticket_id: ticketId, user_id: userId, content })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Admin ────────────────────────────────────────────────

export async function getUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateUserRole(userId, role) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function sendGlobalNotification(title, message, type = 'info') {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ title, message, type, is_global: true })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function sendEmergencyAlert(message) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      title: 'تنبيه طارئ',
      message,
      type: 'emergency',
      is_global: true,
      priority: 'critical',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Focus Sessions ───────────────────────────────────────

export async function logFocusSession(userId, durationMinutes) {
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({ user_id: userId, duration_minutes: durationMinutes })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Streak ───────────────────────────────────────────────

export async function getStreak(userId) {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('created_at')
    .eq('user_id', userId)
  if (error) throw error

  const days = new Set(data.map((s) => new Date(s.created_at).toDateString()))
  let streak = 0
  const cursor = new Date()
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (days.has(cursor.toDateString())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// ─── Notifications ────────────────────────────────────────

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(`user_id.eq.${userId},is_global.eq.true`)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

export async function markNotificationRead(id) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .or(`user_id.eq.${userId},is_global.eq.true`)
    .eq('read', false)
  if (error) throw error
}

// ─── Discussion votes ─────────────────────────────────────

export async function getDiscussionVotes() {
  const { data, error } = await supabase
    .from('discussion_votes')
    .select('discussion_id, value')
  if (error) throw error
  const counts = {}
  data?.forEach((v) => {
    counts[v.discussion_id] = (counts[v.discussion_id] ?? 0) + (v.value ?? 0)
  })
  return counts
}
