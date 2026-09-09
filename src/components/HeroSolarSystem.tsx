import React from "react";

interface HeroSolarSystemProps {
  mousePos: { x: number; y: number };
}

export default function HeroSolarSystem({ mousePos }: HeroSolarSystemProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Dynamic Futuristic Nebula glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-tr from-indigo-500/15 via-purple-500/5 to-cyan-500/15 rounded-full blur-[180px] opacity-80 animate-[pulse_12s_ease-in-out_infinite]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-[140px] opacity-60 animate-[pulse_9s_ease-in-out_infinite_2s]" />

      {/* Embedded CSS for perfect 3D depth, sphere shading & orbital movement */}
      <style>{`
        @keyframes sun-pulsate {
          0%, 100% { transform: scale(1); filter: blur(40px) opacity(0.8); }
          50% { transform: scale(1.1); filter: blur(60px) opacity(0.95); }
        }
        @keyframes orbit-rotate-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-rotate-ccw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes planet-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-sun-corona {
          animation: sun-pulsate 6s ease-in-out infinite;
        }
        .orbit-stage-3d {
          transform-style: preserve-3d;
          perspective: 1200px;
        }
        .planet-sphere {
          box-shadow: inset -6px -6px 12px rgba(0,0,0,0.85), inset 4px 4px 10px rgba(255,255,255,0.4), 0 0 20px rgba(99,102,241,0.4);
        }
        .planet-ring {
          transform: rotateX(0deg) rotateY(0deg);
        }
      `}</style>

      {/* Main Solar System Stage with parallax mouse drift */}
      <div 
        className="absolute inset-0 flex items-center justify-center orbit-stage-3d transition-transform duration-1000 ease-out"
        style={{
          transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`,
        }}
      >
        {/* Tilted orbital map container to create deep 3D space effect */}
        <div 
          className="relative flex items-center justify-center w-[1300px] h-[1300px] origin-center scale-[0.32] sm:scale-[0.5] md:scale-[0.75] lg:scale-100 transition-transform duration-1000"
        >
          {/* Stellar Core / Burning Sun */}
          <div className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-amber-300 via-orange-400 to-indigo-600 shadow-[0_0_100px_rgba(249,115,22,0.8)] z-10 flex items-center justify-center">
            {/* Blazing Center Singularity */}
            <div className="w-16 h-16 rounded-full bg-white shadow-[0_0_40px_rgba(255,255,255,1)]" />
            {/* Pulsing Core Corona */}
            <div className="absolute inset-0 bg-orange-500 rounded-full animate-sun-corona" />
          </div>

          {/* Orbit 1: Inner Focus Ring (Quick, bright cyan theme) */}
          <div 
            className="absolute w-[360px] h-[360px] rounded-full border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] flex items-center justify-center"
            style={{ animation: "orbit-rotate-cw 18s linear infinite" }}
          >
            {/* Planet 1: Azure Core Station */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 group">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-900 planet-sphere relative">
                {/* Tiny fast moon */}
                <div className="absolute -top-3 -left-3 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-[planet-spin_3s_linear_infinite]" />
              </div>
            </div>
          </div>

          {/* Orbit 2: Medium Ring (Metallic Purple theme) */}
          <div 
            className="absolute w-[620px] h-[620px] rounded-full border border-dashed border-indigo-500/20"
            style={{ animation: "orbit-rotate-ccw 32s linear infinite" }}
          >
            {/* Planet 2: Chrono Gas Giant */}
            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-fuchsia-400 via-indigo-600 to-purple-950 planet-sphere relative flex items-center justify-center">
                {/* Translucent Planetary Ring */}
                <div className="absolute w-[220%] h-2 border border-indigo-300/30 rounded-full planet-ring bg-indigo-500/5 backdrop-blur-[1px]" />
              </div>
            </div>
          </div>

          {/* Orbit 3: Outermost Deep Focus Ring (Slow, epic Crimson & Gold theme) */}
          <div 
            className="absolute w-[920px] h-[920px] rounded-full border border-white/5 shadow-[inset_0_0_80px_rgba(99,102,241,0.03)]"
            style={{ animation: "orbit-rotate-cw 55s linear infinite" }}
          >
            {/* Planet 3: Crimson Keep Titan */}
            <div className="absolute bottom-1/4 left-0 -translate-x-1/2 translate-y-1/2 group">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 via-purple-700 to-zinc-950 planet-sphere relative">
                {/* Companion moon 1 */}
                <div className="absolute -top-4 -right-4 w-3.5 h-3.5 rounded-full bg-amber-400 font-mono shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
                {/* Companion moon 2 */}
                <div className="absolute -bottom-2 -left-4 w-2 h-2 rounded-full bg-slate-400" />
              </div>
            </div>
          </div>

          {/* Orbit 4: Border Void Ring (Ghostly translucent) */}
          <div 
            className="absolute w-[1180px] h-[1180px] rounded-full border border-fuchsia-500/5"
            style={{ animation: "orbit-rotate-ccw 85s linear infinite" }}
          >
            {/* Planet 4: Amber Explorer Station */}
            <div className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2 group">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 via-orange-600 to-rose-950 planet-sphere" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
