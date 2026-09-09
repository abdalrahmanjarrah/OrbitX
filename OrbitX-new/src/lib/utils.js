export function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}س ${mins}د ${secs}ث`
  }
  if (mins > 0) {
    return `${mins}د ${secs}ث`
  }
  return `${secs}ث`
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'صباح الخير'
  if (hour >= 12 && hour < 17) return 'مساء الخير'
  if (hour >= 17 && hour < 21) return 'مساء النور'
  return 'مساء الخير'
}

export function generateId() {
  return crypto.randomUUID()
}
