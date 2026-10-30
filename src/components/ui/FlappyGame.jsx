import { useEffect, useRef, useState } from 'react'
import { gameScoreRef } from '../world/shared.js'

/**
 * S2 (tab Game khi ngồi) — game dạng Flappy Bird vẽ bằng canvas 2D thuần.
 * Không thêm thư viện, không asset có bản quyền: chim là hình tròn +
 * cánh vẽ tay, ống là hình chữ nhật. Một nút bấm duy nhất (Space /
 * click canvas / nút "Vỗ cánh") nên chơi được cả chuột, bàn phím và
 * cảm ứng.
 *  - Điểm: qua mỗi ống +1; tốc độ tăng nhẹ theo điểm.
 *  - Kỷ lục: chỉ lưu trên trình duyệt của người chơi (localStorage),
 *    không có bảng xếp hạng giả vờ có người khác.
 *  - Chuyển tab hoặc đứng dậy → component unmount, rAF hủy, ván đang
 *    chơi tính lại từ đầu khi quay lại (kỷ lục thì giữ).
 *  - Điểm hiện tại ghi vào gameScoreRef để texture màn hình 3D vẽ theo.
 */
const W = 360
const H = 480
const BIRD_X = 80
const BIRD_R = 14
const PIPE_W = 64
const GAP = 150

export default function FlappyGame() {
  const canvasRef = useRef(null)
  const [phase, setPhase] = useState('ready') // ready | playing | over
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => {
    try {
      return Number(localStorage.getItem('portfolio-flappy-best') || 0)
    } catch {
      return 0
    }
  })

  // Mở tab Game là ván mới: điểm trên màn hình 3D không giữ điểm cũ.
  useEffect(() => {
    gameScoreRef.score = 0
  }, [])
  const game = useRef({
    y: H / 2,
    v: 0,
    pipes: [],
    score: 0,
    spawnIn: 0,
  })

  const flap = () => {
    const g = game.current
    if (phase === 'over') {
      restart()
      return
    }
    if (phase === 'ready') {
      g.y = H / 2
      g.v = 0
      g.pipes = []
      g.score = 0
      g.spawnIn = 0
      setScore(0)
      setPhase('playing')
      g.v = -420
      return
    }
    if (phase === 'playing') {
      g.v = -420
    }
  }

  // Space / ArrowUp chỉ khi tab Game đang hiển thị (component mounted).
  // GĐ1: bỏ qua khi target là nút bấm — Space trên nút đang focus phải
  // kích hoạt nút (click) chứ không flap thêm lần nữa (trước đây Space
  // khi nút "Vỗ cánh"/"Chơi lại" đang focus bị bắn kép: click + global).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== ' ' && e.key !== 'ArrowUp') return
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement
      )
        return
      e.preventDefault()
      flap()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf = 0
    let last = performance.now()

    const draw = () => {
      const g = game.current
      // Nền
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#0b1020')
      grad.addColorStop(1, '#16233f')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
      // Ống
      for (const p of g.pipes) {
        ctx.fillStyle = '#22c55e'
        ctx.fillRect(p.x, 0, PIPE_W, p.top)
        ctx.fillRect(p.x, p.top + GAP, PIPE_W, H - p.top - GAP)
        ctx.fillStyle = '#16a34a'
        ctx.fillRect(p.x, p.top - 18, PIPE_W, 18)
        ctx.fillRect(p.x, p.top + GAP, PIPE_W, 18)
      }
      // Đất
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(0, H - 24, W, 24)
      // Chim
      ctx.fillStyle = '#fcd34d'
      ctx.beginPath()
      ctx.arc(BIRD_X, g.y, BIRD_R, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.ellipse(BIRD_X - 6, g.y + 2, 10, 6, -0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0b0b12'
      ctx.beginPath()
      ctx.arc(BIRD_X + 5, g.y - 4, 2.5, 0, Math.PI * 2)
      ctx.fill()
      // Điểm
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = 'bold 32px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(String(g.score), W / 2, 48)
      ctx.textAlign = 'left'
      if (phase === 'ready') {
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.font = '20px ui-monospace, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Nhấn Space để bắt đầu', W / 2, H / 2 - 60)
        ctx.textAlign = 'left'
      }
    }

    const step = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const g = game.current
      if (phase === 'playing') {
        g.v += 1500 * dt
        g.y += g.v * dt
        const speed = Math.min(220, 140 + g.score * 2)
        g.spawnIn -= dt
        if (g.spawnIn <= 0) {
          const top = 60 + Math.random() * (H - GAP - 140)
          g.pipes.push({ x: W, top, scored: false })
          g.spawnIn = 1.5
        }
        for (const p of g.pipes) p.x -= speed * dt
        g.pipes = g.pipes.filter((p) => p.x + PIPE_W > 0)
        for (const p of g.pipes) {
          if (!p.scored && p.x + PIPE_W < BIRD_X - BIRD_R) {
            p.scored = true
            g.score += 1
            gameScoreRef.score = g.score
            setScore(g.score)
          }
        }
        // Va chạm: đất/trần hoặc ống.
        const hitGround = g.y + BIRD_R >= H - 24 || g.y - BIRD_R <= 0
        const hitPipe = g.pipes.some((p) => {
          const inX =
            BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W
          if (!inX) return false
          return g.y - BIRD_R < p.top || g.y + BIRD_R > p.top + GAP
        })
        if (hitGround || hitPipe) {
          setPhase('over')
          setBest((prev) => {
            const next = Math.max(prev, g.score)
            try {
              localStorage.setItem('portfolio-flappy-best', String(next))
            } catch {
              // Bỏ qua khi storage bị chặn.
            }
            return next
          })
        }
      }
      draw()
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const restart = () => {
    game.current = {
      y: H / 2,
      v: 0,
      pipes: [],
      score: 0,
      spawnIn: 0,
    }
    gameScoreRef.score = 0
    setScore(0)
    setPhase('ready')
  }

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={flap}
        className="w-full max-w-[360px] cursor-pointer rounded-xl border border-white/15"
        aria-label="Trò chơi Flappy: nhấn Space hoặc bấm vào để bay lên"
      />
      <div className="flex flex-wrap items-center justify-center gap-3">
        {phase === 'playing' ? (
          <button
            type="button"
            onClick={flap}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-ink-950"
          >
            Vỗ cánh (Space)
          </button>
        ) : (
          <button
            type="button"
            onClick={phase === 'over' ? restart : flap}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-ink-950"
          >
            {phase === 'over' ? 'Chơi lại' : 'Bắt đầu'}
          </button>
        )}
        <span className="font-mono text-xs text-white/60">
          Điểm: {score} · Kỷ lục: {best}
        </span>
      </div>
      {phase === 'over' && (
        <p className="text-sm text-white/70">
          Thua rồi — bạn được {score} điểm.
          {score >= best && score > 0 ? ' Kỷ lục mới!' : ''}
        </p>
      )}
    </div>
  )
}
