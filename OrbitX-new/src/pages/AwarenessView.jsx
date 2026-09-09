import { useEffect, useRef } from 'react'

export default function AwarenessView() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 1000,
      size: Math.random() * 2 + 0.5,
    }))

    function draw() {
      ctx.fillStyle = 'rgba(10, 11, 22, 0.15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const cx = canvas.width / 2
      const cy = canvas.height / 2

      particles.forEach((p) => {
        p.z -= 1.5
        if (p.z <= 0) {
          p.x = Math.random() * canvas.width
          p.y = Math.random() * canvas.height
          p.z = 1000
        }

        const sx = ((p.x - cx) * 400) / p.z + cx
        const sy = ((p.y - cy) * 400) / p.z + cy
        const size = (1 - p.z / 1000) * 3

        const opacity = 1 - p.z / 1000
        ctx.fillStyle = `rgba(168, 133, 247, ${opacity})`
        ctx.beginPath()
        ctx.arc(sx, sy, size, 0, Math.PI * 2)
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="relative min-h-screen bg-[#0a0b16]">
      <canvas ref={canvasRef} className="fixed inset-0" />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="font-display text-5xl md:text-7xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
          OrbitX
        </h1>
        <p className="text-gray-400 text-lg max-w-md">
          A cosmic productivity platform. Focus, compete, and grow together among the stars.
        </p>
        <div className="mt-8 flex gap-4">
          <a href="/login" className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all">
            Enter Orbit
          </a>
          <a href="/register" className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-all">
            Join Crew
          </a>
        </div>
      </div>
    </div>
  )
}
