import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HomePage from './pages/HomePage'
import StudyRoomView from './pages/StudyRoomView'
import ChatView from './pages/ChatView'
import DiscussionsView from './pages/DiscussionsView'
import LeaderboardView from './pages/LeaderboardView'
import ProfileView from './pages/ProfileView'
import ScheduleView from './pages/ScheduleView'
import FleetsView from './pages/FleetsView'
import ChallengesHubView from './pages/ChallengesHubView'
import AnalyticsView from './pages/AnalyticsView'
import SupportView from './pages/SupportView'
import AdminView from './pages/AdminView'
import BlackHolesView from './pages/BlackHolesView'
import AwarenessView from './pages/AwarenessView'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0b16]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Entering orbit...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0b16]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Entering orbit...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/awareness" element={<AwarenessView />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/study-room" element={<StudyRoomView />} />
        <Route path="/chat" element={<ChatView />} />
        <Route path="/discussions" element={<DiscussionsView />} />
        <Route path="/leaderboard" element={<LeaderboardView />} />
        <Route path="/profile" element={<ProfileView />} />
        <Route path="/schedule" element={<ScheduleView />} />
        <Route path="/fleets" element={<FleetsView />} />
        <Route path="/challenges" element={<ChallengesHubView />} />
        <Route path="/analytics" element={<AnalyticsView />} />
        <Route path="/support" element={<SupportView />} />
        <Route path="/admin" element={<AdminView />} />
        <Route path="/black-holes" element={<BlackHolesView />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
