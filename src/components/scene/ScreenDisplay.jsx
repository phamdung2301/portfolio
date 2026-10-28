import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PROFILE, PROJECTS } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'
import { gameScoreRef } from '../world/shared.js'

/**
 * S2 (màn hình) — texture vẽ bằng canvas 2D dán lên mặt màn hình.
 *
 * Các mode chữ (code/terminal/game/projects/contact) vẽ trên nền TRONG
 * SUỐT: màu nền phát sáng của mặt màn hình (đổi mood theo section,
 * xanh lá khi terminal mở) vẫn lộ ra phía sau, chữ chỉ nổi lên trên.
 *
 * Chế độ vẽ theo trạng thái (đọc từ store, không giữ state riêng):
 *  - cozy (chế độ cuộn + đứng trong world): cảnh đêm ấm vẽ tay — bầu
 *    trời chàm → cam, trăng, sao nhấp nháy, skyline với cửa sổ sáng
 *    đèn chớp tắt chậm. Vẽ lại mỗi ~300ms, đủ sống động mà không tốn
 *    frame. Đây là "màn hình chờ" mang vibe góc làm việc ấm cúng;
 *    KHÔNG dùng ảnh có bản quyền (Minecraft/anime) — toàn bộ vẽ bằng
 *    canvas, cũng tránh luôn vụ push file nhị phân.
 *  - code (chỉ khi ngồi, tab Code): gõ từng ký tự đoạn snippet demo
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

// Seed cố định để sao/nhà không nhảy vị trí mỗi lần vẽ lại.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const STARS = (() => {
  const rand = mulberry32(20261027)
  return Array.from({ length: 90 }, () => ({
    x: rand() * 1024,
    y: rand() * 330,
    r: 0.8 + rand() * 1.4,
    phase: rand() * Math.PI * 2,
  }))
})()

const SKYLINE = (() => {
  const rand = mulberry32(20261028)
  const rows = []
  for (const back of [true, false]) {
    const buildings = []
    let x = -10
    while (x < 1034) {
      const w = 50 + rand() * 60
      const h = back
        ? 60 + rand() * 80
        : 110 + rand() * 130
      buildings.push({ x, w, h })
      x += w + 6 + rand() * 14
    }
    rows.push({ back, buildings })
  }
  return rows
})()

function hash01(n) {
  const s = Math.sin(n) * 43758.5453
  return s - Math.floor(s)
}

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

export default function ScreenDisplay({
  position = [0, 1.28, 0.062],
  width = 2.34,
  height = 1.3,
}) {
  const seated = usePortfolioStore((s) => s.seated)
  const seatedTab = usePortfolioStore((s) => s.seatedTab)
  const terminalOpen = usePortfolioStore((s) => s.terminalOpen)

  const mode =
    terminalOpen && !seated ? 'terminal' : seated ? seatedTab : 'cozy'

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

      if (mode === 'cozy') {
        const now = Date.now()
        // Bầu trời: chàm đậm → cam ấm ở chân trời.
        const sky = ctx.createLinearGradient(0, 0, 0, 470)
        sky.addColorStop(0, '#070b1d')
        sky.addColorStop(0.55, '#16213f')
        sky.addColorStop(0.85, '#7c3f21')
        sky.addColorStop(1, '#c2691e')
        ctx.fillStyle = sky
        ctx.fillRect(0, 0, W, 470)
        // Trăng + quầng sáng.
        const glow = ctx.createRadialGradient(820, 110, 10, 820, 110, 120)
        glow.addColorStop(0, 'rgba(254,243,199,0.55)')
        glow.addColorStop(1, 'rgba(254,243,199,0)')
        ctx.fillStyle = glow
        ctx.fillRect(700, -10, 240, 240)
        ctx.fillStyle = '#fef3c7'
        ctx.beginPath()
        ctx.arc(820, 110, 42, 0, Math.PI * 2)
        ctx.fill()
        // Sao nhấp nháy chậm.
        for (const s of STARS) {
          const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now / 1000 * 1.5 + s.phase))
          ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fill()
        }
        // Hai lớp skyline: sau (không cửa sổ) rồi trước (có cửa sổ).
        const bucket = Math.floor(now / 2000)
        for (const row of SKYLINE) {
          for (let bi = 0; bi < row.buildings.length; bi++) {
            const b = row.buildings[bi]
            ctx.fillStyle = row.back ? '#131b36' : '#0a0e1f'
            ctx.fillRect(b.x, 470 - b.h, b.w, b.h)
            if (row.back) continue
            const cols = Math.floor(b.w / 18)
            const rowsN = Math.floor(b.h / 26)
            for (let cx = 0; cx < cols; cx++) {
              for (let cy = 0; cy < rowsN; cy++) {
                const lit =
                  hash01(bi * 127.1 + cx * 311.7 + cy * 17.3 + bucket * 13.7) >
                  0.45
                if (!lit) continue
                ctx.fillStyle = 'rgba(252,211,77,0.85)'
                ctx.fillRect(b.x + 6 + cx * 18, 470 - b.h + 8 + cy * 26, 7, 9)
              }
            }
          }
        }
        // Mặt đất tối phía trước.
        ctx.fillStyle = '#05070f'
        ctx.fillRect(0, 470, W, H - 470)
      } else if (mode === 'code') {
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
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  )
}
