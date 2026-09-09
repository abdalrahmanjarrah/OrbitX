import { useState } from 'react'
import { Mail, MessageSquare, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'

const faqItems = [
  {
    q: 'How do I earn XP?',
    a: 'Earn XP by completing focus sessions, participating in discussions, chatting, and completing challenges. Each activity awards different amounts of XP.',
  },
  {
    q: 'What are Black Holes?',
    a: 'Black Holes are community-wide goals. When enough XP is contributed by the community, the Black Hole is "cleared" and everyone who participated earns bonus rewards.',
  },
  {
    q: 'How do Fleets work?',
    a: 'Fleets are study groups. Create or join a fleet to collaborate with other cosmonauts, share goals, and track group progress.',
  },
  {
    q: 'What are Challenges?',
    a: 'Challenges are timed focus duels between two users. Both participants focus for a set duration, and the one with more focus time wins bonus XP.',
  },
  {
    q: 'How do I level up?',
    a: 'You level up by accumulating XP. Each level requires 1,000 XP. Higher levels unlock better rank titles and visibility on the leaderboard.',
  },
]

export default function SupportView() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Support</h1>
        <p className="text-gray-400 mt-1">Get help with OrbitX</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center hover:bg-white/8 transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="font-medium text-white mb-1">Email Us</h3>
          <p className="text-xs text-gray-500">support@orbitx.app</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center hover:bg-white/8 transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="font-medium text-white mb-1">Community</h3>
          <p className="text-xs text-gray-500">Join our Discord</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center hover:bg-white/8 transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-3">
            <ExternalLink className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="font-medium text-white mb-1">Documentation</h3>
          <p className="text-xs text-gray-500">Read the docs</p>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold text-white mb-4">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqItems.map((item, i) => (
            <div key={i} className="border border-white/5 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
              >
                {openFaq === i ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                )}
                <span className="text-sm font-medium text-white">{item.q}</span>
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 pl-11">
                  <p className="text-sm text-gray-400">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
