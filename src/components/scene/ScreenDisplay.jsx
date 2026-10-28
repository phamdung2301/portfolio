import { useEffect, useMemo, useState } from 'react'
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
 *  - cozy (chế độ cuộn): cảnh đêm ấm vẽ tay — bầu trời chàm → cam,
 *    trăng, sao nhấp nháy, skyline với cửa sổ sáng đèn chớp tắt chậm.
 *    Vẽ lại mỗi ~300ms, đủ sống động mà không tốn frame. Đây là "màn
 *    hình chờ" mang vibe góc làm việc ấm cúng; KHÔNG dùng ảnh có bản
 *    quyền (Minecraft/anime) — toàn bộ vẽ bằng canvas, cũng tránh
 *    luôn vụ push file nhị phân.
 *  - intellij (đứng trong world + ngồi ở tab Code): giao diện IntelliJ
 *    Darcula vẽ bằng canvas — thanh menu, cây project (tên file thật),
 *    3 tab file, editor chi chít code THẬT trích từ repo này (rgb.js,
 *    WorldPlayer.jsx, Workspace.jsx), thanh trạng thái có giờ thật.
 *    Tab đang mở là state nội bộ của component (C5: bấm lên tab hoặc
 *    hàng cây project trên màn sẽ đổi tab ngay trên màn 3D).
 *  - terminal: prompt + con trỏ nhấp nháy (C6 nối gõ phím vào đây).
 *  - game: tên game + điểm Flappy hiện tại (đọc từ gameScoreRef).
 *  - projects/contact: tiêu đề + thông tin chung (không vẽ số điện thoại
 *    lên màn hình nền — số chỉ xuất hiện trên card visit khi mở).
 */
/**
 * Nội dung editor IntelliJ: code THẬT trích từ repo này (không bịa).
 * Mỗi file ≤ 20 dòng để vừa khung editor (dòng cao 24px, cao 482px).
 * Tab hiển thị theo IJ_TABS; tọa độ tab dùng chung với vùng bấm C5.
 */
const INTELLIJ_FILES = {
  rgb: {
    label: 'rgb.js',
    lines: [
      'export function rgbColor(mode, t, x, out) {',
      "  if (mode === 'off') return out.setRGB(0.05, 0.05, 0.07)",
      "  if (mode === 'breath') {",
      '    const b = 0.55 + 0.45 * Math.sin(t * 1.6)',
      '    return out.setRGB(0.1 * b, 0.5 * b, 0.9 * b)',
      '  }',
      '  const hue = (x * 0.35 + t * 0.08) % 1',
      '  return out.setHSL(hue, 0.85, 0.55)',
      '}',
      'export function rgbFanSpeed(mode) {',
      "  if (mode === 'off') return 0",
      "  if (mode === 'breath') return 0.6",
      '  return 1.6',
      '}',
      "export const RGB_MODES = ['wave', 'breath', 'off']",
      'export const RGB_LABELS = {',
      "  wave: 'Sóng cầu vồng',",
      "  breath: 'Thở',",
      "  off: 'Tắt',",
      '}',
    ],
  },
  worldplayer: {
    label: 'WorldPlayer.jsx',
    lines: [
      'const SEAT_POS = new THREE.Vector3(0, 1.42, 1.9)',
      'if (seated !== prevSeated.current) {',
      '  prevSeated.current = seated',
      '  const to = seated ? SEAT_POS : STAND_POS',
      '  anim.current = {',
      '    active: true,',
      '    t: 0,',
      '    fromPos: pos.current.clone(),',
      '    fromYaw: yaw.current,',
      '    fromPitch: pitch.current,',
      '    fromY: camera.position.y,',
      '    toPos: to,',
      '    toYaw: 0,',
      '    toPitch: seated ? 0.19 : 0,',
      '    toY: to.y,',
      '  }',
      '}',
    ],
  },
  workspace: {
    label: 'Workspace.jsx',
    lines: [
      '<group position={[-1.0, 0.82, 0]} rotation={[0.08, 0.26, 0]}>',
      '  <RoundedBox',
      '    args={[1.9, 1.07, 0.08]}',
      '    radius={0.05}',
      '    smoothness={3}',
      '    material={materials.panel}',
      '    position={[0, 0, 0]}',
      '    castShadow',
      '  />',
      '  <mesh material={materials.screen} position={[0, 0, 0.05]}>',
      '    <planeGeometry args={[1.78, 1.0]} />',
      '  </mesh>',
      '  <ScreenDisplay position={[0, 0, 0.062]} width={1.78} height={1.0} />',
      '</group>',
    ],
  },
}

// Tab editor: x/w trên canvas 1024 (dùng chung cho vẽ và vùng bấm C5).
const IJ_TABS = [
  { id: 'rgb', x: 220, w: 150 },
  { id: 'worldplayer', x: 370, w: 190 },
  { id: 'workspace', x: 560, w: 170 },
]

// Hàng cây project tương ứng với từng file (để tô sáng khi mở tab).
const IJ_TREE_ROW = { workspace: 4, worldplayer: 5, rgb: 7 }

const IJ_KEYWORDS = new Set([
  'export',
  'function',
  'return',
  'const',
  'if',
  'import',
  'from',
  'default',
])

/** Tô màu kiểu Darcula: từ khóa cam, chuỗi xanh lá, số xanh dương. */
function ijColor(word) {
  const clean = word.replace(/[^A-Za-z0-9_]/g, '')
  if (IJ_KEYWORDS.has(clean)) return '#cc7832'
  if (word.includes("'") || word.includes('"') || word.includes('`'))
    return '#6a8759'
  if (/^\d/.test(clean)) return '#6897bb'
  if (/^[A-Z]/.test(clean)) return '#ffc66d'
  return '#a9b7c6'
}

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



export default function ScreenDisplay({
  position = [0, 1.28, 0.062],
  width = 2.34,
  height = 1.3,
}) {
  const seated = usePortfolioStore((s) => s.seated)
  const seatedTab = usePortfolioStore((s) => s.seatedTab)
  const terminalOpen = usePortfolioStore((s) => s.terminalOpen)
  const worldMode = usePortfolioStore((s) => s.worldMode)
  // Tab IntelliJ đang mở (state nội bộ; C5 nối click trên màn vào đây).
  const [activeFile, setActiveFile] = useState('rgb')

  const mode =
    terminalOpen && !seated
      ? 'terminal'
      : seated
        ? seatedTab === 'code'
          ? 'intellij'
          : seatedTab
        : worldMode
          ? 'intellij'
          : 'cozy'

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 576
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return { canvas: c, texture: tex }
  }, [])

  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    // Vẽ một dòng code IntelliJ: tách theo khoảng trắng, tô từng từ.
    const drawCodeLine = (text, y) => {
      const parts = text.split(/(\s+)/)
      let x = 272
      ctx.font = '20px ui-monospace, Menlo, Consolas, monospace'
      ctx.textBaseline = 'top'
      for (const part of parts) {
        if (!part) continue
        ctx.fillStyle = part.trim() ? ijColor(part) : '#a9b7c6'
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
      } else if (mode === 'intellij') {
        const now = new Date()
        const hh = String(now.getHours()).padStart(2, '0')
        const mm = String(now.getMinutes()).padStart(2, '0')
        const file = INTELLIJ_FILES[activeFile]
        ctx.textBaseline = 'top'
        // Thanh menu.
        ctx.fillStyle = '#2b2d30'
        ctx.fillRect(0, 0, W, 30)
        ctx.fillStyle = '#bcbec4'
        ctx.font = '17px ui-monospace, Menlo, monospace'
        ctx.fillText(
          'File   Edit   View   Navigate   Code   Refactor   Run   Tools   VCS   Window   Help',
          12,
          6,
        )
        ctx.textAlign = 'right'
        ctx.fillText(`portfolio · main · ${hh}:${mm}`, W - 12, 6)
        ctx.textAlign = 'left'
        // Hàng tab (tọa độ khớp IJ_TABS — C5 dùng cùng bảng này).
        ctx.fillStyle = '#2b2d30'
        ctx.fillRect(0, 30, W, 28)
        ctx.font = '17px ui-monospace, Menlo, monospace'
        for (const tab of IJ_TABS) {
          const active = tab.id === activeFile
          ctx.fillStyle = active ? '#1e1f22' : '#2b2d30'
          ctx.fillRect(tab.x, 30, tab.w, 28)
          if (active) {
            ctx.fillStyle = '#4a9eff'
            ctx.fillRect(tab.x, 30, tab.w, 2)
          }
          ctx.fillStyle = active ? '#a9b7c6' : '#7a7e85'
          ctx.fillText(INTELLIJ_FILES[tab.id].label, tab.x + 12, 36)
        }
        // Sidebar cây project.
        ctx.fillStyle = '#2b2d30'
        ctx.fillRect(0, 58, 220, 482)
        ctx.fillStyle = '#bcbec4'
        ctx.font = 'bold 17px ui-monospace, Menlo, monospace'
        ctx.fillText('Project', 12, 66)
        const tree = [
          '▼ portfolio',
          '  ▼ src',
          '    ▼ components',
          '      ▼ scene',
          '        Workspace.jsx',
          '        WorldPlayer.jsx',
          '        ScreenDisplay.jsx',
          '        rgb.js',
          '    ▼ data',
          '      portfolio.js',
        ]
        ctx.font = '17px ui-monospace, Menlo, monospace'
        tree.forEach((row, i) => {
          const y = 92 + i * 24
          if (IJ_TREE_ROW[activeFile] === i) {
            ctx.fillStyle = '#3a3d42'
            ctx.fillRect(0, y - 2, 220, 22)
          }
          ctx.fillStyle = '#a9b7c6'
          ctx.fillText(row, 12, y)
        })
        // Editor: nền + số dòng + code chi chít.
        ctx.fillStyle = '#1e1f22'
        ctx.fillRect(220, 58, W - 220, 482)
        ctx.font = '20px ui-monospace, Menlo, Consolas, monospace'
        file.lines.forEach((lineText, i) => {
          const y = 62 + i * 24
          ctx.fillStyle = '#606366'
          ctx.textAlign = 'right'
          ctx.fillText(String(i + 1), 262, y)
          ctx.textAlign = 'left'
          drawCodeLine(lineText, y)
        })
        // Con trỏ nhấp nháy cuối dòng cuối.
        if (blink) {
          const last = file.lines[file.lines.length - 1]
          ctx.font = '20px ui-monospace, Menlo, Consolas, monospace'
          const w = ctx.measureText(last).width
          ctx.fillStyle = '#a9b7c6'
          ctx.fillRect(
            272 + w + 3,
            62 + (file.lines.length - 1) * 24,
            10,
            22,
          )
        }
        // Thanh trạng thái.
        ctx.fillStyle = '#2b2d30'
        ctx.fillRect(0, 540, W, 36)
        ctx.fillStyle = '#bcbec4'
        ctx.font = '16px ui-monospace, Menlo, monospace'
        ctx.fillText('main*    UTF-8    JavaScript    Ln 12, Col 8', 12, 548)
        ctx.textAlign = 'right'
        ctx.fillText(`${hh}:${mm}`, W - 12, 548)
        ctx.textAlign = 'left'
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

    // IntelliJ: tick 530ms cho con trỏ nhấp nháy + đồng hồ phút;
    // các mode khác chỉ cần vẽ lại theo nhịp nhấp nháy/điểm số.
    const interval = mode === 'intellij' ? 530 : 300
    const id = setInterval(draw, interval)
    draw()
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, canvas, texture, activeFile])

  // C5: bấm trực tiếp lên màn IntelliJ.
  // uv: (0,0) góc dưới-trái → canvas (x = u*1024, y = (1-v)*576).
  // Vùng bấm: hàng tab (y 30..58, x theo IJ_TABS) + hàng cây project
  // (x 0..220, y 92..332, hàng khớp IJ_TREE_ROW).
  const zoneFile = (e) => {
    if (mode !== 'intellij' || !e.uv) return null
    const cx = e.uv.x * 1024
    const cy = (1 - e.uv.y) * 576
    if (cy >= 30 && cy < 58) {
      const tab = IJ_TABS.find((t) => cx >= t.x && cx < t.x + t.w)
      if (tab) return tab.id
    }
    if (cx < 220 && cy >= 92 && cy < 92 + 10 * 24) {
      const row = Math.floor((cy - 92) / 24)
      const entry = Object.entries(IJ_TREE_ROW).find(([, r]) => r === row)
      if (entry) return entry[0]
    }
    return null
  }
  const handleClick = (e) => {
    const file = zoneFile(e)
    if (file) {
      e.stopPropagation()
      setActiveFile(file)
      return
    }
    // Đang ngồi: giữ thao tác trên màn 3D, không để click rơi xuống
    // nhóm mở lớp phủ máy tính; đang đứng/cuộn: để click nổi bọt lên
    // nhóm (mở terminal / vào world) như cũ.
    if (seated) e.stopPropagation()
  }
  const handleMove = (e) => {
    document.body.style.cursor = zoneFile(e) ? 'pointer' : ''
  }
  const handleOut = () => {
    document.body.style.cursor = ''
  }

  return (
    <mesh
      position={position}
      onClick={handleClick}
      onPointerMove={handleMove}
      onPointerOut={handleOut}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  )
}
