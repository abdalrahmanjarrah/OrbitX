import { useIntroStore } from './useIntroStore';
import type { IntroViewProps } from '../../views/IntroView';

const STATIONS = [
  { title: 'OrbitX', subtitle: 'حوّل الدراسة إلى مغامرة فضائية' },
  { title: 'محطات التركيز', subtitle: 'اختر محطتك وابدأ جلسة تركيز مع مؤقت ذكي' },
  { title: 'المجتمع الفضائي', subtitle: 'انضم لأسطول، تحدَ أصدقاءك، صعد بالمراتب' },
  { title: 'خزانة المعرفة', subtitle: 'قرآن، وعي، يوميات كونية — اقرأ وتأمل' },
  { title: 'نظام التقدم', subtitle: '9 مراتب، شارات، سلسلة يومية — كل يوم صعود' },
  { title: 'درع الحماية', subtitle: 'رادار الحضور يكشف الغش ويحمي تقدمك' },
];

export function IntroUI({ onLogin, onGuest, inviterName }: IntroViewProps) {
  const scrollProgress = useIntroStore((s) => s.scrollProgress);
  const isMuted = useIntroStore((s) => s.isMuted);
  const toggleMute = useIntroStore((s) => s.toggleMute);
  const activeScreen = useIntroStore((s) => s.activeScreen);

  const stationIndex = Math.min(Math.floor(scrollProgress * 6), 5);
  const station = STATIONS[stationIndex] || STATIONS[0];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Logo — always visible */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 40,
          opacity: scrollProgress < 0.05 ? 1 : 0.4,
          transition: 'opacity 0.3s',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 900, color: '#00f3ff', letterSpacing: -1 }}>
          OrbitX
        </div>
        <div style={{ fontSize: 10, color: '#556677', letterSpacing: 4, marginTop: 2 }}>
          DEEP SPACE ACADEMY
        </div>
      </div>

      {/* Station text — appears on screen activation */}
      {activeScreen >= 0 && activeScreen < STATIONS.length && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 60,
            transform: 'translateY(-50%)',
            maxWidth: 320,
            opacity: 1,
            transition: 'opacity 0.4s',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: '#00f3ff', marginBottom: 8 }}>
            {STATIONS[activeScreen].title}
          </div>
          <div style={{ fontSize: 13, color: '#88aabb', lineHeight: 1.6 }}>
            {STATIONS[activeScreen].subtitle}
          </div>
        </div>
      )}

      {/* Welcome text — first screen */}
      {scrollProgress < 0.1 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            opacity: 1 - scrollProgress * 10,
          }}
        >
          <div style={{ fontSize: 42, fontWeight: 900, color: '#ffffff', letterSpacing: -2 }}>
            OrbitX
          </div>
          <div style={{ fontSize: 16, color: '#6688aa', marginTop: 12, letterSpacing: 2 }}>
            اسحب للأسفل للاستكشاف
          </div>
          <div style={{ marginTop: 20, fontSize: 24, color: '#00f3ff', animation: 'bounce 1.5s infinite' }}>
            ↓
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: 40,
          right: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 2,
            background: '#1a2a3a',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${scrollProgress * 100}%`,
              background: 'linear-gradient(90deg, #00f3ff, #0088ff)',
              borderRadius: 1,
              transition: 'width 0.1s',
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: '#445566', minWidth: 32, textAlign: 'right' }}>
          {Math.round(scrollProgress * 100)}%
        </div>
      </div>

      {/* Mute button */}
      <button
        onClick={toggleMute}
        style={{
          position: 'absolute',
          top: 32,
          right: 40,
          pointerEvents: 'auto',
          background: 'rgba(0,243,255,0.08)',
          border: '1px solid rgba(0,243,255,0.2)',
          borderRadius: 8,
          padding: '8px 14px',
          color: '#00f3ff',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: 1,
        }}
      >
        {isMuted ? '🔇 MUTE' : '🔊 SOUND'}
      </button>

      {/* Login / Guest buttons */}
      {onLogin && onGuest && (
        <div
          style={{
            position: 'absolute',
            top: 32,
            right: 130,
            display: 'flex',
            gap: 10,
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={onLogin}
            style={{
              background: 'rgba(0,243,255,0.12)',
              border: '1px solid rgba(0,243,255,0.3)',
              borderRadius: 10,
              padding: '8px 20px',
              color: '#00f3ff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: 1,
              transition: 'all 0.2s',
            }}
          >
            🚀 دخول
          </button>
          <button
            onClick={onGuest}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '8px 16px',
              color: '#556677',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ضيف
          </button>
        </div>
      )}

      {/* Inviter notice */}
      {inviterName && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: 130,
            background: 'rgba(0,136,255,0.1)',
            border: '1px solid rgba(0,136,255,0.2)',
            borderRadius: 10,
            padding: '6px 16px',
            color: '#66aaff',
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          ⚡ دعوة من {inviterName}
        </div>
      )}

      {/* CSS for bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
      `}</style>
    </div>
  );
}
