import { useEffect, useMemo, useRef, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../hooks/useScrollState.js'
import { getSceneState } from './choreography.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'
import { seatRef } from '../world/shared.js'
import ScreenDisplay from './ScreenDisplay.jsx'
import { rgbColor, rgbFanSpeed } from './rgb.js'
import { SKILLS, PROJECTS } from '../../data/portfolio.js'
import { interactWith } from '../world/actions.js'

/** Màu màn hình khi terminal trong world đang mở. */
const TERMINAL_GREEN = new THREE.Color('#22c55e')

/**
 * Vật thể chính: góc làm việc low-poly.
 * Tất cả vật thể nằm trong group `root` được dịch chuyển/nghiêng theo scroll.
 */
export default function Workspace() {
  const root = useRef(null)
  const monitor = useRef(null)
  const spillRef = useRef(null)
  const spillColor = useRef(new THREE.Color('#22d3ee'))
  const worldMode = usePortfolioStore((s) => s.worldMode)
  const terminalOpen = usePortfolioStore((s) => s.terminalOpen)
  const seated = usePortfolioStore((s) => s.seated)
  const seatedTab = usePortfolioStore((s) => s.seatedTab)

  // Vật liệu dùng chung -> giảm số chương trình shader
  const materials = useMemo(() => {
    // S2 (vân gỗ): canvas vẽ tay — nền óc chó tối + sọc vân ngang +
    // vài sọc sáng mờ. Không file ảnh, không thêm draw call (map trên
    // chất liệu bàn có sẵn). Tông tối để khớp theme chung, không làm
    // bàn sáng chói như gỗ sáng trong ảnh tham khảo.
    const wood = document.createElement('canvas')
    wood.width = 512
    wood.height = 256
    const wctx = wood.getContext('2d')
    wctx.fillStyle = '#241a12'
    wctx.fillRect(0, 0, 512, 256)
    let seed = 20261028
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    for (let i = 0; i < 70; i++) {
      const y = rand() * 256
      wctx.strokeStyle =
        rand() > 0.5 ? 'rgba(0,0,0,0.35)' : 'rgba(214,164,110,0.12)'
      wctx.lineWidth = 0.6 + rand() * 2.2
      wctx.beginPath()
      wctx.moveTo(0, y)
      wctx.bezierCurveTo(170, y + (rand() - 0.5) * 10, 340, y + (rand() - 0.5) * 10, 512, y)
      wctx.stroke()
    }
    const woodTex = new THREE.CanvasTexture(wood)
    woodTex.colorSpace = THREE.SRGBColorSpace
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping
    woodTex.repeat.set(2, 1)
    return {
      desk: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.72, metalness: 0.15 }),
      panel: new THREE.MeshStandardMaterial({ color: '#12121b', roughness: 0.55, metalness: 0.4 }),
      metal: new THREE.MeshStandardMaterial({ color: '#2a2a3a', roughness: 0.35, metalness: 0.85 }),
      screen: new THREE.MeshStandardMaterial({
        color: '#0d1a24',
        emissive: new THREE.Color('#12b8d8'),
        emissiveIntensity: 0.85,
        roughness: 0.25,
        metalness: 0.1,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: '#45d8f0',
        emissive: new THREE.Color('#45d8f0'),
        emissiveIntensity: 0.5,
        roughness: 0.4,
      }),
    }
  }, [])

  useFrame((state, delta) => {
    if (!root.current) return
    const t = scrollState.smoothed

    // S2: ở world mode, bàn về tư thế trung tính (không xoay theo
    // scroll) để tọa độ vật thể khớp với interactables.js. Scroll bị
    // khóa trong world nên t đóng băng — nhưng damp về 0 vẫn cần để
    // triệt tiêu góc xoay còn lại từ lúc vào world.
    const targetY = worldMode ? 0 : Math.sin(t * Math.PI * 2) * 0.16
    const targetRotY = worldMode ? 0 : t * Math.PI * 0.55
    root.current.position.y = THREE.MathUtils.damp(
      root.current.position.y,
      targetY,
      3,
      delta,
    )
    root.current.rotation.y = THREE.MathUtils.damp(
      root.current.rotation.y,
      targetRotY,
      3,
      delta,
    )

    // S1: màn hình + đèn bàn đổi mood theo section. Pulse giữ nguyên
    // nhưng quanh mức nền của section (projects sáng nhất, about mờ nhất),
    // và màu phát sáng lerp theo màu của section đó.
    const sceneState = getSceneState(t)
    const pulse =
      sceneState.monitor + Math.sin(state.clock.elapsedTime * 2.1) * 0.12
    // S2: terminal mở (standalone hoặc tab Terminal khi ngồi) → màn
    // hình chuyển xanh lá; các tab khác giữ mood theo section.
    const terminalActive =
      terminalOpen || (seated && seatedTab === 'terminal')
    materials.screen.emissive.lerp(
      worldMode && terminalActive ? TERMINAL_GREEN : sceneState.monitorColor,
      1 - Math.exp(-3 * delta),
    )
    materials.accent.emissive.lerp(
      sceneState.monitorColor,
      1 - Math.exp(-3 * delta),
    )
    // S2 (spill màn hình): tấm mờ trên bàn dưới màn hình, màu theo
    // trạng thái màn hình (xanh lá khi terminal, cyan còn lại).
    if (spillRef.current) {
      spillColor.current.lerp(
        new THREE.Color(worldMode && terminalActive ? '#22c55e' : '#22d3ee'),
        1 - Math.exp(-3 * delta),
      )
      spillRef.current.color.copy(spillColor.current)
      spillRef.current.opacity = THREE.MathUtils.damp(
        spillRef.current.opacity,
        worldMode && terminalActive ? 0.2 : 0.12,
        3,
        delta,
      )
    }
    if (monitor.current) {
      materials.screen.emissiveIntensity = THREE.MathUtils.damp(
        materials.screen.emissiveIntensity,
        pulse,
        4,
        delta,
      )
      monitor.current.rotation.y = THREE.MathUtils.damp(
        monitor.current.rotation.y,
        worldMode ? -0.25 : -0.25 + t * 0.5,
        3,
        delta,
      )
    }
  })

  return (
    <group ref={root} position={[0, 0, 0]}>
      <DeskTop materials={materials} />
      <DeskLegs materials={materials} />
      <MonitorAssembly ref={monitor} materials={materials} />
      <Keyboard materials={materials} />
      <DeskLamp materials={materials} />
      <BooksStack materials={materials} />
      <DeskMat />
      <Mug materials={materials} />
      <Plant materials={materials} />
      <PhoneClock />
      <FairyLights />
      <PCTower materials={materials} />
      <LaptopOnStand materials={materials} />
      <SecondMonitor materials={materials} />
      {/* Tấm spill ánh màn hình trên mặt bàn (màu/độ mờ cập nhật ở useFrame). */}
      <mesh position={[0, 1.082, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 0.8]} />
        <meshBasicMaterial
          ref={spillRef}
          color="#22d3ee"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      <ChairAssembly materials={materials} />
      <PhotoFrame />
    </group>
  )
}

/**
 * S2 (ghế) — ghế văn phòng low-poly: chân đế 5 chấu đứng yên, phần
 * ngồi + lưng + tay vịn xoay quanh trục dọc. Chế độ cuộn/world đứng:
 * xoay qua lại sin ±0.4 rad. Khi ngồi: xoay theo hướng nhìn của người
 * chơi (seatRef.lookYaw × 0.6) — ghế và người thành một khối.
 */
function ChairAssembly({ materials }) {
  const swivel = useRef(null)
  const seated = usePortfolioStore((s) => s.seated)

  useFrame((state, delta) => {
    if (!swivel.current) return
    if (seated) {
      swivel.current.rotation.y = THREE.MathUtils.damp(
        swivel.current.rotation.y,
        seatRef.lookYaw * 0.6,
        8,
        delta,
      )
    } else {
      swivel.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.9) * 0.4
    }
  })

  const sit = (e) => {
    e.stopPropagation()
    const st = usePortfolioStore.getState()
    // S2 (trải nghiệm gaze): ngồi xuống CHỈ là ngồi xuống — không tự
    // mở máy tính (đường này dùng chung với actions.js chair branch).
    if (st.worldMode && !st.seated) {
      st.setSeated(true)
      st.setTerminalOpen(false)
    }
  }

  return (
    <group position={[0, 0, 1.9]} onClick={sit}>
      {/* Chân đế: trụ + 5 chấu */}
      <mesh position={[0, 0.3, 0]} material={materials.metal} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.55, 12]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i * Math.PI * 2) / 5
        return (
          <mesh
            key={i}
            position={[Math.sin(angle) * 0.24, 0.05, Math.cos(angle) * 0.24]}
            rotation={[0, angle, 0]}
            material={materials.metal}
            castShadow
          >
            <boxGeometry args={[0.08, 0.05, 0.42]} />
          </mesh>
        )
      })}
      {/* S2: bánh xe ở đầu 5 chấu (chấu dài tới bán kính 0.45) */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i * Math.PI * 2) / 5
        return (
          <mesh
            key={`caster-${i}`}
            position={[Math.sin(angle) * 0.45, 0.05, Math.cos(angle) * 0.45]}
            material={materials.metal}
          >
            <sphereGeometry args={[0.05, 12, 12]} />
          </mesh>
        )
      })}
      {/* Phần xoay: ngồi + lưng + tay vịn */}
      <group ref={swivel}>
        <RoundedBox
          args={[0.62, 0.09, 0.58]}
          radius={0.04}
          smoothness={3}
          material={materials.panel}
          position={[0, 0.58, 0]}
          castShadow
        />
        <RoundedBox
          args={[0.58, 0.72, 0.08]}
          radius={0.04}
          smoothness={3}
          material={materials.panel}
          position={[0, 1.0, 0.29]}
          castShadow
        />
        {[-0.33, 0.33].map((x) => (
          <group key={x}>
            <mesh position={[x, 0.72, 0]} material={materials.metal}>
              <boxGeometry args={[0.05, 0.24, 0.05]} />
            </mesh>
            <mesh position={[x, 0.85, 0]} material={materials.panel}>
              <boxGeometry args={[0.06, 0.04, 0.32]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

/**
 * S2 (khung ảnh) — khung GỖ NHỎ TRỐNG đặt trên bàn, bên phải màn hình.
 * User chốt 2026-10-27: khung luôn trống, ảnh chỉ nằm trong card visit
 * (không dán ảnh lên khung 3D nữa). Viền gỗ nâu ấm + mặt nền tối.
 * Chế độ cuộn: đứng yên. Khi ngồi: rung lắc nhẹ (xoay ±0.02 rad +
 * nhích y) như tín hiệu "muốn xem". Bấm vào khung trong world →
 * mở card visit.
 */
/**
 * S2 (trải nghiệm gaze): khung gỗ đứng yên hoàn toàn — KHÔNG còn rung
 * khi ngồi, KHÔNG còn dòng nhắc. Ai tò mò nhìn vào + bấm E (hoặc chạm)
 * mới mở card, qua interactWith('frame') chung với pill HUD.
 */
function PhotoFrame() {
  return (
    <group
      position={[1.45, 1.08, 0.45]}
      rotation={[-0.12, -0.25, 0]}
      onClick={(e) => {
        e.stopPropagation()
        interactWith('frame')
      }}
    >
      <RoundedBox
        args={[0.5, 0.65, 0.04]}
        radius={0.02}
        smoothness={3}
        position={[0, 0.325, 0]}
        castShadow
      >
        <meshStandardMaterial color="#6b4a2f" roughness={0.65} />
      </RoundedBox>
      {/* Mặt nền tối bên trong khung — trống, không ảnh, không chữ. */}
      <mesh position={[0, 0.325, 0.021]}>
        <planeGeometry args={[0.42, 0.57]} />
        <meshStandardMaterial color="#1a1512" roughness={0.9} />
      </mesh>
    </group>
  )
}

function DeskTop({ materials }) {
  return (
    <RoundedBox
      args={[4.6, 0.16, 2.2]}
      radius={0.06}
      smoothness={3}
      material={materials.desk}
      position={[0, 1.0, 0]}
      castShadow
      receiveShadow
    />
  )
}

function DeskLegs({ materials }) {
  return (
    <>
      {[-1.9, 1.9].map((x) => (
        <RoundedBox
          key={x}
          args={[0.14, 1.0, 1.7]}
          radius={0.04}
          smoothness={3}
          material={materials.metal}
          position={[x, 0.5, 0]}
          castShadow
        />
      ))}
    </>
  )
}

const MonitorAssembly = forwardRef(function MonitorAssembly({ materials }, ref) {
  const worldMode = usePortfolioStore((s) => s.worldMode)
  const setWorldMode = usePortfolioStore((s) => s.setWorldMode)
  const setTerminalOpen = usePortfolioStore((s) => s.setTerminalOpen)

  return (
    <group
      ref={ref}
      position={[0, 1.08, -0.55]}
      onClick={(e) => {
        e.stopPropagation()
        // S2: màn hình là cổng vào world (chế độ cuộn). Trong world:
        // đang ngồi → mở máy tính ở đúng tab lần trước (không ép tab
        // Terminal — trải nghiệm gaze); đang đứng → terminal standalone.
        // Đường này dùng chung với actions.js monitor branch.
        const st = usePortfolioStore.getState()
        if (!worldMode) setWorldMode(true)
        else if (st.seated) {
          st.setComputerOpen(true)
        } else setTerminalOpen(true)
      }}
    >
      <RoundedBox
        args={[0.12, 0.42, 0.12]}
        radius={0.03}
        smoothness={3}
        material={materials.metal}
        position={[0, 0.21, 0]}
        castShadow
      />
      <RoundedBox
        args={[2.5, 1.45, 0.08]}
        radius={0.05}
        smoothness={3}
        material={materials.panel}
        position={[0, 1.28, 0]}
        castShadow
      />
      <mesh material={materials.screen} position={[0, 1.28, 0.05]}>
        <planeGeometry args={[2.34, 1.3]} />
      </mesh>
      {/* S2 (ghế): mặt màn hình code gõ thật thay cho 4 vạch màu tĩnh. */}
      <ScreenDisplay />
      {/* S2: đèn LED nguồn góc dưới-phải viền + thanh đèn trên đỉnh màn hình */}
      <mesh position={[1.15, 0.58, 0.06]}>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshBasicMaterial color="#22c55e" toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.03, 0]}>
        <boxGeometry args={[1.2, 0.04, 0.04]} />
        <meshBasicMaterial color="#fef3c7" toneMapped={false} />
      </mesh>
    </group>
  )
})

/**
 * S2 (bàn phím RGB) — đế phẳng như cũ + lưới phím thật + underglow.
 *  - 5 hàng × 14 phím, phím cách là một hộp dài riêng (8 ô cuối hàng 4
 *    nhường chỗ cho phím cách). Phím vẽ bằng InstancedMesh: 62 instance
 *    = 1 draw call (pattern đã dùng cho 350 hạt bụi S3).
 *  - Sóng cầu vồng: hue theo vị trí phím + thời gian, cập nhật
 *    instanceColor mỗi frame; phím dùng meshBasicMaterial (phát sáng,
 *    không phụ thuộc đèn cảnh) nên nhìn là biết đèn nền RGB thật.
 *  - Dải underglow ở mép trước bàn phím chạy cùng sóng (màu tại x=0).
 *  - Tốc độ chậm, độ sáng vừa — nháy đèn nhưng không gắt khi cuộn.
 */
const KEY_COLS = 14
const KEY_ROWS = 5
const KEY_STEP_X = 0.13
const KEY_STEP_Z = 0.11
const KEY_X0 = -0.845
const KEY_Z0 = 0.2

function Keyboard({ materials }) {
  const keysRef = useRef(null)
  const spaceRef = useRef(null)
  const glowRef = useRef(null)
  const stripRef = useRef(null)

  // Vị trí từng phím (bỏ 8 ô phím cách ở hàng cuối), tính một lần.
  const keyPositions = useMemo(() => {
    const list = []
    for (let row = 0; row < KEY_ROWS; row++) {
      for (let col = 0; col < KEY_COLS; col++) {
        if (row === KEY_ROWS - 1 && col >= 3 && col <= 10) continue
        list.push([
          KEY_X0 + col * KEY_STEP_X,
          KEY_Z0 + row * KEY_STEP_Z,
        ])
      }
    }
    return list
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    // Đặt ma trận tĩnh cho mọi phím một lần (vị trí không đổi).
    const inst = keysRef.current
    if (!inst) return
    keyPositions.forEach(([x, z], i) => {
      dummy.position.set(x, 1.165, z)
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
    })
    inst.instanceMatrix.needsUpdate = true
  }, [keyPositions, dummy])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // S2: màu phím theo chế độ RGB chung (đổi bằng cách bấm thùng PC).
    const mode = usePortfolioStore.getState().rgbMode
    const inst = keysRef.current
    if (inst) {
      keyPositions.forEach(([x], i) => {
        inst.setColorAt(i, rgbColor(mode, t, x, color))
      })
      inst.instanceColor.needsUpdate = true
    }
    if (spaceRef.current) {
      spaceRef.current.color.copy(rgbColor(mode, t, 0, color))
    }
    if (glowRef.current) {
      glowRef.current.color.copy(rgbColor(mode, t, 0, color))
    }
    if (stripRef.current) {
      stripRef.current.color.copy(rgbColor(mode, t, 0, color))
    }
  })

  return (
    <group>
      <RoundedBox
        args={[1.9, 0.06, 0.6]}
        radius={0.03}
        smoothness={3}
        material={materials.panel}
        position={[0, 1.11, 0.42]}
        castShadow
      />
      <instancedMesh
        ref={keysRef}
        args={[undefined, undefined, keyPositions.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.11, 0.04, 0.09]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* Phím cách: dài 8 ô, cùng sóng tại x = 0 */}
      <mesh position={[0, 1.165, KEY_Z0 + 4 * KEY_STEP_Z]}>
        <boxGeometry args={[1.02, 0.04, 0.09]} />
        <meshBasicMaterial ref={spaceRef} toneMapped={false} />
      </mesh>
      {/* Dải underglow mép trước bàn phím */}
      <mesh position={[0, 1.1, 0.745]}>
        <boxGeometry args={[1.9, 0.02, 0.05]} />
        <meshBasicMaterial ref={glowRef} toneMapped={false} />
      </mesh>
      {/* S2: 2 phím điểm nhấn accent — Esc (hàng 0, cột 0) và Enter (hàng 2, cột 13) */}
      <mesh position={[-0.845, 1.167, 0.2]} material={materials.accent}>
        <boxGeometry args={[0.11, 0.045, 0.09]} />
      </mesh>
      <mesh position={[0.845, 1.167, 0.42]} material={materials.accent}>
        <boxGeometry args={[0.11, 0.045, 0.09]} />
      </mesh>
      {/* S2: miếng kê cổ tay trước bàn phím */}
      <RoundedBox
        args={[1.9, 0.03, 0.25]}
        radius={0.02}
        smoothness={3}
        material={materials.panel}
        position={[0, 1.095, 0.88]}
      />
      {/* S2: viền LED mép trước bàn, đồng bộ sóng RGB với bàn phím */}
      <mesh position={[0, 1.0, 1.11]}>
        <boxGeometry args={[4.6, 0.02, 0.02]} />
        <meshBasicMaterial ref={stripRef} toneMapped={false} />
      </mesh>
    </group>
  )
}

function DeskLamp({ materials }) {
  // Vũng sáng ấm dưới đèn (canvas radial, mờ dần ra mép).
  const poolTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 128
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64)
    g.addColorStop(0, 'rgba(251,191,36,0.6)')
    g.addColorStop(1, 'rgba(251,191,36,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <>
      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.4}>
        <mesh position={[1.85, 1.75, 0.4]} material={materials.accent} castShadow>
          <sphereGeometry args={[0.14, 20, 20]} />
        </mesh>
        <mesh position={[1.85, 1.28, 0.4]} material={materials.metal} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.8, 12]} />
        </mesh>
      </Float>
      {/* S2: chùm sáng nón từ orb xuống mặt bàn (đứng yên, đỉnh khớp vị trí
          trung bình của orb) + vũng sáng ấm trên mặt bàn. */}
      <mesh position={[1.85, 1.42, 0.4]}>
        <cylinderGeometry args={[0.06, 0.5, 0.65, 24, 1, true]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[1.85, 1.082, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial map={poolTex} transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </>
  )
}

/**
 * S2 (dressing) — chồng sách thay 3 khối tím bay lơ lửng: sách nằm
 * trên bàn, xoay lệch nhẹ như đặt vội. Bên trái bàn, trước thùng PC.
 */
function BooksStack() {
  const books = [
    { size: [0.62, 0.09, 0.45], y: 1.125, rot: 0.12, color: '#7f1d1d' },
    { size: [0.55, 0.08, 0.42], y: 1.21, rot: -0.08, color: '#164e63' },
    { size: [0.48, 0.07, 0.4], y: 1.285, rot: 0.2, color: '#3f3f46' },
  ]
  return (
    <group position={[-1.75, 0, 0.2]}>
      {books.map((b, i) => (
        <mesh key={i} position={[0, b.y, 0]} rotation={[0, b.rot, 0]} castShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

/** S2 — thảm lót bàn dưới bàn phím: nền tối + sọc chéo mờ + viền cyan. */
function DeskMat() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 216
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#0f1420'
    ctx.fillRect(0, 0, 512, 216)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let x = -216; x < 512; x += 24) {
      ctx.beginPath()
      ctx.moveTo(x, 216)
      ctx.lineTo(x + 216, 0)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(34,211,238,0.55)'
    ctx.lineWidth = 4
    ctx.strokeRect(6, 6, 500, 204)
    ctx.strokeStyle = 'rgba(34,211,238,0.2)'
    ctx.lineWidth = 1
    ctx.strokeRect(14, 14, 484, 188)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
  return (
    <mesh position={[0, 1.081, 0.42]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.6, 1.1]} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  )
}

/** S2 — cốc cà phê trái-trước bàn + 3 vệt hơi bay lên theo vòng lặp. */
function Mug({ materials }) {
  const steamRefs = useRef([])
  const steamTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 128
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(32, 64, 4, 32, 64, 30)
    g.addColorStop(0, 'rgba(255,255,255,0.8)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 128)
    return new THREE.CanvasTexture(c)
  }, [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    // S2 (trải nghiệm gaze): sau khi nhấp (mugSipAt) ~1.8s, hơi bay
    // nhanh + đậm hơn — phản hồi nhìn thấy được cho hành động nhấp.
    const burst = Date.now() - usePortfolioStore.getState().mugSipAt < 1800
    const speed = burst ? 0.9 : 0.25
    steamRefs.current.forEach((m, i) => {
      if (!m) return
      const p = (t * speed + i / 3) % 1
      m.position.y = 0.3 + p * 0.35
      m.position.x = Math.sin(t * 2 + i * 2.1) * 0.02
      m.material.opacity = Math.min(0.6, 0.35 * (1 - p) * (burst ? 1.6 : 1))
    })
  })
  return (
    <group position={[-1.15, 1.08, 0.72]}>
      <mesh position={[0, 0.08, 0]} material={materials.panel} castShadow>
        <cylinderGeometry args={[0.09, 0.075, 0.16, 20]} />
      </mesh>
      <mesh position={[0, 0.162, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 20]} />
        <meshStandardMaterial color="#3f2d20" roughness={0.6} />
      </mesh>
      <mesh position={[0.1, 0.08, 0]} rotation={[0, Math.PI / 2, 0]} material={materials.panel}>
        <torusGeometry args={[0.055, 0.014, 10, 20]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            steamRefs.current[i] = el
          }}
          position={[0, 0.3, 0]}
        >
          <planeGeometry args={[0.09, 0.24]} />
          <meshBasicMaterial map={steamTex} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** S2 — chậu cây phải-sau bàn, lá đung đưa nhẹ (1 driver sin). */
function Plant() {
  const leaves = useRef(null)
  useFrame((state) => {
    if (!leaves.current) return
    const t = state.clock.elapsedTime
    leaves.current.rotation.z = Math.sin(t * 1.2) * 0.05
    leaves.current.rotation.x = Math.sin(t * 0.9) * 0.03
  })
  const angles = [0, 1.26, 2.51, 3.77, 5.03]
  return (
    <group position={[2.15, 1.08, -0.8]}>
      <mesh position={[0, 0.11, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.11, 0.22, 16]} />
        <meshStandardMaterial color="#9a3412" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.225, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.13, 16]} />
        <meshStandardMaterial color="#3f2d20" roughness={1} />
      </mesh>
      <group ref={leaves} position={[0, 0.22, 0]}>
        {angles.map((a, i) => (
          <mesh
            key={i}
            position={[Math.sin(a) * 0.05, 0.14, Math.cos(a) * 0.05]}
            rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]}
            scale={[0.55, 1.6, 0.25]}
          >
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color={i % 2 ? '#16a34a' : '#22c55e'} roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** S2 — điện thoại nằm trước khung gỗ, màn hình hiện GIỜ THẬT (30s vẽ lại). */
function PhoneClock() {
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 288
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return { canvas: c, texture: tex }
  }, [])
  useEffect(() => {
    const draw = () => {
      const ctx = canvas.getContext('2d')
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`
      ctx.fillStyle = '#0b0f1a'
      ctx.fillRect(0, 0, 512, 288)
      ctx.fillStyle = '#22d3ee'
      ctx.beginPath()
      ctx.arc(452, 40, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 110px ui-monospace, Menlo, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${hh}:${mm}`, 256, 160)
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.font = '32px ui-monospace, Menlo, monospace'
      ctx.fillText(date, 256, 220)
      texture.needsUpdate = true
    }
    draw()
    const id = setInterval(draw, 30000)
    return () => clearInterval(id)
  }, [canvas, texture])
  return (
    <group position={[1.3, 1.09, 0.85]} rotation={[0, -0.3, 0]}>
      <mesh position={[0, 0.01, 0]} castShadow>
        <boxGeometry args={[0.3, 0.02, 0.16]} />
        <meshStandardMaterial color="#111118" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.021, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.28, 0.14]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * Phase 1 — laptop trên stand ở góc phải-sau bàn (ambient: không pill,
 * không click, không spot gaze). Màn hình gõ 4 dòng code THẬT lấy từ
 * rgb.js trong repo, gõ xong giữ 2.5s rồi lặp lại (mẫu gõ như
 * ScreenDisplay nhưng canvas riêng, nhỏ hơn).
 */
const LAPTOP_LINES = [
  'export function rgbColor(mode, t, x, out = _c) {',
  "  if (mode === 'off') {",
  '    return out.setRGB(0.1, 0.11, 0.13)',
  '  }',
]
function LaptopOnStand({ materials }) {
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 320
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
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
    const draw = () => {
      ctx.fillStyle = '#0a0f1a'
      ctx.fillRect(0, 0, 512, 320)
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.font = '20px ui-monospace, Menlo, monospace'
      ctx.fillText('rgb.js — code thật', 20, 30)
      const t = typeRef.current
      LAPTOP_LINES.forEach((lineText, i) => {
        if (i > t.line) return
        const visible = i < t.line ? lineText.length : t.char
        ctx.fillStyle = 'rgba(255,255,255,0.88)'
        ctx.font = '22px ui-monospace, Menlo, monospace'
        ctx.fillText(lineText.slice(0, visible), 20, 72 + i * 40)
      })
      const blink = Math.floor(Date.now() / 530) % 2 === 0
      if (blink && t.line < LAPTOP_LINES.length) {
        ctx.fillStyle = '#67e8f9'
        ctx.font = '22px ui-monospace, Menlo, monospace'
        const w = ctx.measureText(LAPTOP_LINES[t.line].slice(0, t.char)).width
        ctx.fillRect(20 + w + 4, 72 + t.line * 40 - 20, 10, 24)
      }
      texture.needsUpdate = true
    }
    const id = setInterval(() => {
      const t = typeRef.current
      const now = Date.now()
      if (t.line >= LAPTOP_LINES.length) {
        if (!t.holdUntil) t.holdUntil = now + 2500
        if (now >= t.holdUntil) {
          t.line = 0
          t.char = 0
          t.holdUntil = 0
        }
      } else {
        const lineText = LAPTOP_LINES[t.line]
        if (t.char < lineText.length) t.char += 1
        else {
          t.line += 1
          t.char = 0
        }
      }
      draw()
    }, 45)
    draw()
    return () => clearInterval(id)
  }, [canvas, texture])
  return (
    <group position={[1.5, 1.08, -0.6]}>
      {/* Kệ nâng 0.25 */}
      <mesh position={[0, 0.125, 0]} material={materials.metal} castShadow>
        <boxGeometry args={[0.95, 0.25, 0.65]} />
      </mesh>
      {/* Đế laptop */}
      <mesh position={[0, 0.26, 0.02]} material={materials.panel} castShadow>
        <boxGeometry args={[0.9, 0.02, 0.6]} />
      </mesh>
      {/* Màn hình ngả sau ~7°, mép trên lùi tới z ≈ -0.94, không chạm dây fairy (z = -1.0). */}
      <group position={[0, 0.27, -0.27]} rotation={[-0.12, 0, 0]}>
        <mesh position={[0, 0.28, 0]} material={materials.panel} castShadow>
          <boxGeometry args={[0.9, 0.56, 0.02]} />
        </mesh>
        <mesh position={[0, 0.28, 0.012]}>
          <planeGeometry args={[0.84, 0.5]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Phase 2 — màn hai xếp chồng trên màn chính (ambient: không pill,
 * không click). Cột đỡ sau lưng màn chính; tấm 1.8×1.0, tâm y = 3.7
 * (đáy 3.2, cách mép trên màn chính 3.085 một khe 0.115; từ ghế nhìn
 * lên tâm màn là 44.4° nên cần clamp pitch ±0.8 của Phase 0).
 * Dashboard vẽ từ dữ liệu THẬT (SKILLS level + PROJECTS trong
 * portfolio.js) và giờ thật, vẽ lại mỗi 30s như PhoneClock.
 */
function SecondMonitor({ materials }) {
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 640
    c.height = 360
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return { canvas: c, texture: tex }
  }, [])
  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])
  useEffect(() => {
    const draw = () => {
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#0b0f1a'
      ctx.fillRect(0, 0, 640, 360)
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px ui-monospace, Menlo, monospace'
      ctx.textAlign = 'left'
      ctx.fillText('TỔNG QUAN', 24, 36)
      ctx.textAlign = 'right'
      ctx.fillText(`${hh}:${mm}`, 616, 36)
      ctx.textAlign = 'left'
      SKILLS.forEach((s, i) => {
        const y = 76 + i * 30
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.font = '20px ui-monospace, Menlo, monospace'
        ctx.fillText(s.name, 24, y)
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fillRect(200, y - 14, 280, 12)
        ctx.fillStyle = s.accent
        ctx.fillRect(200, y - 14, (280 * s.level) / 100, 12)
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.fillText(`${s.level}%`, 492, y)
      })
      PROJECTS.forEach((p, i) => {
        ctx.fillStyle = p.accent
        ctx.font = '18px ui-monospace, Menlo, monospace'
        ctx.fillText(`• ${p.title} (${p.year})`, 24, 296 + i * 22)
      })
      texture.needsUpdate = true
    }
    draw()
    const id = setInterval(draw, 30000)
    return () => clearInterval(id)
  }, [canvas, texture])
  return (
    <group>
      {/* Cột đỡ từ mặt bàn lên sau lưng màn chính. */}
      <mesh position={[0, 2.39, -0.68]} material={materials.metal} castShadow>
        <boxGeometry args={[0.1, 2.62, 0.1]} />
      </mesh>
      <RoundedBox
        args={[1.8, 1.0, 0.06]}
        radius={0.03}
        smoothness={3}
        material={materials.panel}
        position={[0, 3.7, -0.55]}
        castShadow
      />
      <mesh position={[0, 3.7, -0.51]}>
        <planeGeometry args={[1.68, 0.88]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** S2 — dây đèn fairy vắt ngang mép sau bàn: 2 cột + dây võng + 14 bóng ấm. */
function FairyLights() {
  const bulbsRef = useRef(null)
  const glowRef = useRef(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const { curve, bulbPoints } = useMemo(() => {
    const cur = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.2, 1.48, -1.0),
      new THREE.Vector3(-1.1, 1.3, -1.0),
      new THREE.Vector3(0, 1.26, -1.0),
      new THREE.Vector3(1.1, 1.3, -1.0),
      new THREE.Vector3(2.2, 1.48, -1.0),
    ])
    const bp = []
    for (let i = 0; i < 14; i++) bp.push(cur.getPoint(i / 13))
    return { curve: cur, bulbPoints: bp }
  }, [])
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.008, 6), [curve])
  useEffect(() => {
    const inst = bulbsRef.current
    if (!inst) return
    bulbPoints.forEach((p, i) => {
      dummy.position.copy(p)
      dummy.position.y -= 0.045
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
    })
    inst.instanceMatrix.needsUpdate = true
  }, [bulbPoints, dummy])
  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.color.setHSL(0.11, 0.9, 0.55 + 0.1 * Math.sin(state.clock.elapsedTime * 2))
    }
  })
  return (
    <group>
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, 1.28, -1.0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
          <meshStandardMaterial color="#2a2a3a" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color="#1f2937" />
      </mesh>
      <instancedMesh ref={bulbsRef} args={[undefined, undefined, bulbPoints.length]} frustumCulled={false}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshBasicMaterial ref={glowRef} color="#fbbf24" toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

/**
 * S2 — thùng PC trái-sau bàn: 2 quạt RGB mặt trước (vòng + cánh xoay),
 * mặt kính bên hắt sáng đồng bộ. Bấm thùng trong world để đổi chế độ
 * RGB chung (sóng → thở → tắt); ở scroll mode bấm không có tác dụng
 * (Overlay chặn click vào canvas, trừ nút vào world ở hero).
 */
function PCTower({ materials }) {
  const fan1 = useRef(null)
  const fan2 = useRef(null)
  const ring1 = useRef(null)
  const ring2 = useRef(null)
  const sideGlow = useRef(null)
  const color = useMemo(() => new THREE.Color(), [])
  useFrame((state, delta) => {
    const mode = usePortfolioStore.getState().rgbMode
    const t = state.clock.elapsedTime
    const speed = rgbFanSpeed(mode)
    if (fan1.current) fan1.current.rotation.z += speed * delta
    if (fan2.current) fan2.current.rotation.z += speed * delta
    if (ring1.current) ring1.current.color.copy(rgbColor(mode, t, 0.2, color))
    if (ring2.current) ring2.current.color.copy(rgbColor(mode, t, 0.5, color))
    if (sideGlow.current) sideGlow.current.color.copy(rgbColor(mode, t, 0.8, color))
  })
  // S2 (trải nghiệm gaze): click thùng (cảm ứng) dùng chung đường với
  // pill gaze + phím E — logic đổi RGB nằm ở actions.js pc branch.
  const cycle = (e) => {
    e.stopPropagation()
    interactWith('pc')
  }
  const fan = (y, fanRef, ringRef) => (
    <group position={[0, y, 0.28]}>
      {/* CẢNH BÁO (bug 2026-10-28): ref vòng PHẢI gắn vào material, không
          phải mesh — mesh không có .color, gọi .color.copy() sẽ throw
          trong useFrame, frameloop chết lặng, canvas đen mà ErrorBoundary
          không bắt được (lỗi ngoài render phase). */}
      <mesh>
        <torusGeometry args={[0.13, 0.02, 10, 24]} />
        <meshBasicMaterial ref={ringRef} toneMapped={false} />
      </mesh>
      <group ref={fanRef}>
        <mesh material={materials.panel}>
          <boxGeometry args={[0.2, 0.04, 0.01]} />
        </mesh>
        <mesh material={materials.panel}>
          <boxGeometry args={[0.04, 0.2, 0.01]} />
        </mesh>
      </group>
    </group>
  )
  return (
    <group position={[-1.95, 1.08, -0.55]} onClick={cycle}>
      <mesh position={[0, 0.525, 0]} material={materials.panel} castShadow>
        <boxGeometry args={[0.55, 1.05, 0.55]} />
      </mesh>
      {fan(0.75, fan1, ring1)}
      {fan(0.35, fan2, ring2)}
      <mesh position={[0.28, 0.525, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.45, 0.9]} />
        <meshBasicMaterial ref={sideGlow} transparent opacity={0.25} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

