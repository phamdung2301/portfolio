import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PROFILE, PROJECTS } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'
import { gameScoreRef } from '../world/shared.js'

/**
 * S2 (màn hình code gõ) — texture vẽ bằng canvas 2D dán lên mặt màn hình.
 *
 * Nền canvas TRONG SUỐT: màu nền phát sáng của mặt màn hình (đổi mood
 * theo section, xanh lá khi terminal mở) vẫn lộ ra phía sau, chữ chỉ
 * nổi lên trên. Nhờ vậy không cần vẽ nền, không tranh với emissive.
 *
 * Chế độ vẽ theo trạng thái (đọc từ store, không giữ state riêng):
 *  - code (mặc định, cả chế độ cuộn): gõ từng ký tự đoạn snippet demo
 *    (cấu trúc thật của trang, không phải nội dung file nguyên văn),
 *    hết đoạn giữ 2s rồi gõ lại. Chỉ cập nhật texture khi có ký tự mới.
 *  - terminal: prompt + con trỏ nhấp nháy.
 *  - game: tên game + điểm Flappy hiện tại (đọc từ gameScoreRef).
 *  - projects/contact: tiêu đề + thông tin chung (không vẽ số điện thoại
 *    lên màn hình nền — số chỉ xuất hiện trên card visit khi mở).
 */
const SNIPPET = [
  'function Scene() {',
  '  return (',
  '    <Canvas shadows>',
  '      <Workspace />',
  '      <SkillCluster />',
  '    </Canvas>',
  '  )',
  '}',
]

const KEYWORDS = new Set([
  'function',
  'return',
  'const',
  'import',
  'from',
  'export',
  'default',
])

function wordColor(word) {
  const clean = word.replace(/[^A-Za-z0-9_<>/$]/g, '')
  if (KEYWORDS.has(clean)) return '#67e8f9'
  if (word.includes('"') || word.includes("'") || word.includes('`'))
    return '#86efac'
  if (
    word.startsWith('<') ||
    word.startsWith('/') ||
    /^[A-Z]/.test(clean)
  )
    return '#c4b5fd'
  return 'rgba(255,255,255,0.88)'
}

export default function ScreenDisplay() {
  const seated = usePortfolioStore((s) => s.seated)
  const seatedTab = usePortfolioStore((s) => s.seatedTab)
  const terminalOpen = usePortfolioStore((s) => s.terminalOpen)

  const mode =
    terminalOpen && !seated ? 'terminal' : seated ? seatedTab : 'code'

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 576
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return { canvas: c, texture: tex }
  }, [])

  const typeRef = useRef({ line: 0, char: 0, holdUntil: 0 })

  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    const drawLine = (text, y, visibleChars) => {
      const shown = text.slice(0, visibleChars)
      const parts = shown.split(/(\s+)/)
      let x = 48
      ctx.font = '27px ui-monospace, Menlo, Consolas, monospace'
      ctx.textBaseline = 'top'
      for (const part of parts) {
        if (!part) continue
        ctx.fillStyle = part.trim()
          ? wordColor(part)
          : 'rgba(255,255,255,0.88)'
        ctx.fillText(part, x, y)
        x += ctx.measureText(part).width
      }
      return x
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const blink = Math.floor(Date.now() / 530) % 2 === 0

      if (mode === 'code') {
        const t = typeRef.current
        const now = Date.now()
        if (t.line >= SNIPPET.length) {
          if (!t.holdUntil) t.holdUntil = now + 2000
          if (now >= t.holdUntil) {
            t.line = 0
            t.char = 0
            t.holdUntil = 0
          }
        }
        // Thanh cửa sổ giả: 3 chấm + tên file demo.
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.beginPath()
        ctx.arc(36, 30, 8, 0, Math.PI * 2)
        ctx.arc(62, 30, 8, 0, Math.PI * 2)
        ctx.arc(88, 30, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.font = '22px ui-monospace, Menlo, monospace'
        ctx.fillText('Scene.jsx — demo', 118, 20)

        SNIPPET.forEach((lineText, i) => {
          if (i > t.line) return
          const y = 76 + i * 52
          ctx.fillStyle = 'rgba(255,255,255,0.30)'
          ctx.font = '22px ui-monospace, Menlo, monospace'
          ctx.fillText(String(i + 1), 48, y + 3)
          const visible = i < t.line ? lineText.length : t.char
          const endX = drawLine(lineText, y, visible)
          if (i === t.line && blink && t.line < SNIPPET.length) {
            ctx.fillStyle = '#67e8f9'
            ctx.fillRect(endX + 6, y + 2, 14, 30)
          }
        })
      } else if (mode === 'terminal') {
        ctx.font = '30px ui-monospace, Menlo, monospace'
        ctx.fillStyle = '#4ade80'
        ctx.fillText('dung@portfolio:~$', 48, 60)
        if (blink) ctx.fillRect(48, 110, 18, 34)
      } else if (mode === 'game') {
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = 'bold 64px ui-monospace, Menlo, monospace'
        ctx.fillText('FLAPPY', W / 2, 180)
        ctx.font = '40px ui-monospace, Menlo, monospace'
        ctx.fillStyle = '#fcd34d'
        ctx.fillText(`ĐIỂM: ${gameScoreRef.score}`, W / 2, 280)
        ctx.textAlign = 'left'
      } else if (mode === 'projects') {
        ctx.font = 'bold 44px ui-monospace, Menlo, monospace'
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.fillText('DỰ ÁN', 48, 60)
        ctx.font = '28px ui-monospace, Menlo, monospace'
        PROJECTS.forEach((p, i) => {
          ctx.fillStyle = p.accent
          ctx.fillText(`• ${p.title} (${p.year})`, 48, 140 + i * 52)
        })
      } else if (mode === 'contact') {
        ctx.font = 'bold 44px ui-monospace, Menlo, monospace'
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.fillText('LIÊN HỆ', 48, 60)
        ctx.font = '30px ui-monospace, Menlo, monospace'
        ctx.fillStyle = '#67e8f9'
        ctx.fillText(PROFILE.email, 48, 140)
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.fillText(PROFILE.location, 48, 200)
      }
      texture.needsUpdate = true
    }

    // Gõ code: tick nhanh; các mode khác chỉ cần vẽ lại theo nhịp
    // nhấp nháy/điểm số nên tick chậm hơn nhiều.
    const interval = mode === 'code' ? 35 : 300
    const id = setInterval(() => {
      if (mode === 'code') {
        const t = typeRef.current
        if (t.line < SNIPPET.length) {
          const lineText = SNIPPET[t.line]
          if (t.char < lineText.length) {
            t.char += 1
          } else {
            t.line += 1
            t.char = 0
          }
        }
      }
      draw()
    }, interval)
    draw()
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, canvas, texture])

  return (
    <mesh position={[0, 1.28, 0.062]}>
      <planeGeometry args={[2.34, 1.3]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  )
}
