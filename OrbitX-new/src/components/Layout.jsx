import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Home,
  Brain,
  MessageCircle,
  MessagesSquare,
  Trophy,
  User,
  Calendar,
  Rocket,
  Swords,
  BarChart3,
  HelpCircle,
  Shield,
  Orbit,
  LogOut,
  Menu,
  Zap,
  ChevronLeft,
  Bell,
  CheckCheck,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { calculateLevel, getRankTitle } from '../lib/xpSystem'
import { getNotifications, markAllNotificationsRead } from '../lib/database'

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/study-room', label: 'Study Room', icon: Brain },
  { to: '/chat', label: 'Chat', icon: MessageCircle },
  { to: '/discussions', label: 'Discussions', icon: MessagesSquare },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/schedule', label: 'Schedule', icon: Calendar },
  { to: '/fleets', label: 'Fleets', icon: Rocket },
  { to: '/challenges', label: 'Challenges', icon: Swords },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/support', label: 'Support', icon: HelpCircle },
  { to: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
  { to: '/black-holes', label: 'Black Holes', icon: Orbit },
]

function StarField() {
  const [stars] = useState(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    }))
  )

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            opacity: 0.3,
            animation: `pulse-glow ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl animate-drift" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-500/5 blur-3xl animate-drift" style={{ animationDelay: '3s' }} />
    </div>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef(null)
  const { profile, signOut, isAdmin, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => setSidebarOpen(false)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    let active = true

    getNotifications(user.id).then((data) => {
      if (active) setNotifications(data || [])
    }).catch(() => {})

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const notif = payload.new
          if (!notif) return
          const relevant = notif.is_global === true || notif.user_id === user.id
          if (relevant) setNotifications((prev) => [notif, ...prev].slice(0, 30))
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    function onClickOutside(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false)
      }
    }
    if (bellOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [bellOpen])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleOpenBell = () => {
    setBellOpen(!bellOpen)
    if (!bellOpen && unreadCount > 0) {
      markAllNotificationsRead(user.id).catch(() => {})
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
  }

  const xp = profile?.xp ?? 0
  const level = calculateLevel(xp)
  const rankTitle = getRankTitle(level)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const filteredItems = navItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="flex h-screen bg-[#0a0b16] overflow-hidden">
      <StarField />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex flex-col
          bg-[#0d0e1a]/95 backdrop-blur-xl border-r border-white/5
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-20' : 'w-64'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className={`flex items-center gap-3 px-5 h-16 border-b border-white/5 ${collapsed ? 'justify-center px-0' : ''}`}>
          {!collapsed && (
            <span className="font-display text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
              OrbitX
            </span>
          )}
          {collapsed && (
            <span className="font-display text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              O
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex ml-auto p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${collapsed ? 'justify-center px-0' : ''}
                ${isActive
                  ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={`p-3 border-t border-white/5 ${collapsed ? 'px-2' : ''}`}>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b border-white/5 bg-[#0d0e1a]/80 backdrop-blur-xl shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-4">
            <div ref={bellRef} className="relative">
              <button
                onClick={handleOpenBell}
                className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#0d0e1a]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          markAllNotificationsRead(user.id).catch(() => {})
                          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
                        }}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-10">No notifications yet</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${!n.read ? 'bg-indigo-500/5' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-white">{n.title}</p>
                            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full uppercase ${
                              n.type === 'emergency'
                                ? 'bg-red-500/15 text-red-400'
                                : n.type === 'success'
                                  ? 'bg-green-500/15 text-green-400'
                                  : 'bg-indigo-500/15 text-indigo-400'
                            }`}>
                              {n.type ?? 'info'}
                            </span>
                          </div>
                          {n.message && <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-mono font-medium text-indigo-300">{xp.toLocaleString()} XP</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
              <span className="text-xs font-medium text-purple-300">Lv.{level}</span>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                {profile?.name?.[0] ?? profile?.email?.[0] ?? 'U'}
              </div>
              <div className="hidden xl:block">
                <p className="text-sm font-medium text-white leading-tight">{profile?.name ?? 'Cosmonaut'}</p>
                <p className="text-xs text-gray-500">{rankTitle}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
