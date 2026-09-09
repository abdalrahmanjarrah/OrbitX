import React, { useEffect, useState, useMemo } from 'react';

interface Star {
  id: number;
  top: string;
  left: string;
  size: string;
  duration: string;
  delay: string;
  color: string;
}

export default function StarBackground() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const starColors = ['#ffffff', '#c7d2fe', '#fbcfe8', '#a78bfa'];
    const generatedStars: Star[] = Array.from({ length: 55 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 0.5}px`,
      duration: `${Math.random() * 4 + 2}s`,
      delay: `${Math.random() * 5}s`,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));
    setStars(generatedStars);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#05050A]">
      {/* Dynamic Nebulas (radial gradients — no blur filter, no blend mode,
          so they animate purely on the GPU compositor) */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-50 animate-[pulse_8s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0.12) 40%, rgba(139,92,246,0) 70%)"
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full opacity-50 animate-[pulse_10s_ease-in-out_infinite_reverse]"
        style={{
          background:
            "radial-gradient(circle, rgba(217,70,239,0.25) 0%, rgba(217,70,239,0.08) 45%, rgba(217,70,239,0) 70%)"
        }}
      />
      <div
        className="absolute top-[30%] left-[60%] w-[40vw] h-[40vw] rounded-full opacity-40 animate-[pulse_12s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0.08) 45%, rgba(59,130,246,0) 70%)"
        }}
      />

      {/* Twinkling Stars */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full animate-[twinkle_var(--duration)_ease-in-out_infinite] opacity-80"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              backgroundColor: star.color,
              // @ts-ignore
              '--duration': star.duration,
              animationDelay: star.delay,
              boxShadow: `0 0 ${parseFloat(star.size) * 2}px ${star.color}`
            }}
          />
        ))}
      </div>

      {/* Highly Realistic Thin Shooting Stars (no full-screen color-dodge flash
          layers — those forced a full-screen blend every second and hurt perf) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Meteor 1 */}
        <div className="meteor-container meteor-1">
          <div className="meteor-body">
            <div className="meteor-nucleus" />
            <div className="meteor-trail" />
          </div>
        </div>

        {/* Meteor 2 */}
        <div className="meteor-container meteor-2">
          <div className="meteor-body">
            <div className="meteor-nucleus" />
            <div className="meteor-trail" />
          </div>
        </div>

        {/* Meteor 3 */}
        <div className="meteor-container meteor-3">
          <div className="meteor-body">
            <div className="meteor-nucleus" />
            <div className="meteor-trail" />
          </div>
        </div>

        {/* Meteor 4 */}
        <div className="meteor-container meteor-4">
          <div className="meteor-body">
            <div className="meteor-nucleus" />
            <div className="meteor-trail" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .meteor-container {
          position: absolute;
          pointer-events: none;
          opacity: 0;
          z-index: 1;
        }

        .meteor-body {
          position: relative;
          display: flex;
          flex-direction: row;
          direction: ltr;
          align-items: center;
          transform: rotate(-25deg);
          transform-origin: center left;
        }

        /* Thicker nucleus with stronger, richer light diffusion aura */
        .meteor-nucleus {
          width: 6.8px;
          height: 6.8px;
          background-color: #ffffff;
          border-radius: 50%;
          box-shadow: 
            0 0 22px 10px rgba(255, 255, 255, 1),
            0 0 40px 18px rgba(199, 210, 254, 0.85),
            0 0 65px 28px rgba(147, 197, 253, 0.6);
          z-index: 2;
        }

        /* Thicker, longer, and more visible trail - properly oriented from brightest at head (left) to transparent at tail (right) */
        .meteor-trail {
          height: 3.2px;
          width: 280px;
          background: linear-gradient(to right, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.55) 45%, rgba(255, 255, 255, 0) 100%);
          margin-left: -1px;
        }

        /* Meteor 1 Configuration */
        .meteor-1 {
          top: 15%;
          left: 95%;
          animation: meteor-flow-1 24s linear infinite;
        }

        @keyframes meteor-flow-1 {
          0%, 0.5% { transform: translate(0, 0); opacity: 0; }
          1% { opacity: 1; }
          14% { transform: translate(-650px, 303px); opacity: 0; }
          100% { transform: translate(-650px, 303px); opacity: 0; }
        }

        /* Meteor 2 Configuration */
        .meteor-2 {
          top: 40%;
          left: 100%;
          animation: meteor-flow-2 28s linear infinite 8s;
        }

        @keyframes meteor-flow-2 {
          0%, 0.5% { transform: translate(0, 0); opacity: 0; }
          1% { opacity: 1; }
          13% { transform: translate(-700px, 326px); opacity: 0; }
          100% { transform: translate(-700px, 326px); opacity: 0; }
        }

        /* Meteor 3 Configuration */
        .meteor-3 {
          top: 25%;
          left: 90%;
          animation: meteor-flow-3 32s linear infinite 16s;
        }

        @keyframes meteor-flow-3 {
          0%, 0.4% { transform: translate(0, 0); opacity: 0; }
          1% { opacity: 1; }
          12% { transform: translate(-600px, 280px); opacity: 0; }
          100% { transform: translate(-600px, 280px); opacity: 0; }
        }

        /* Meteor 4 Configuration */
        .meteor-4 {
          top: 60%;
          left: 100%;
          animation: meteor-flow-4 36s linear infinite 24s;
        }

        @keyframes meteor-flow-4 {
          0%, 0.4% { transform: translate(0, 0); opacity: 0; }
          1% { opacity: 1; }
          12% { transform: translate(-680px, 317px); opacity: 0; }
          100% { transform: translate(-680px, 317px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
