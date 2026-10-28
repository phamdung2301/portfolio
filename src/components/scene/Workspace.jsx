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
    <>
      <group ref={root} position={[0, 0, 0]}>
      <DeskTop materials={materials} />
      <DeskLegs materials={materials} />
      <MonitorAssembly ref={monitor} materials={materials} />
      <Keyboard materials={materials} />
      <DeskLamp materials={materials} />
      <DeskMat />
      <Mug materials={materials} />
      <Plant materials={materials} />
      <PhoneClock />
      <FairyLights />
      <PCTower materials={materials} />
      <LaptopOnStand materials={materials} />
      <Notebook />
      <WaterGlass />
      {/* Tấm spill ánh màn hình trên mặt bàn (màu/độ mờ cập nhật ở useFrame). */}
      <mesh position={[0, 1.082, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 0.8]} />
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
      {/* Đồ nội thất đứng ngoài nhóm bàn: không xoay theo scroll, chỉ
          đứng yên như WorldLevel (nhóm bàn xoay tới ~99° khi cuộn). */}
      <Bookshelf materials={materials} />
      <NightWindow materials={materials} />
    </>
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
      {/* Màn đôi góc 150° (mỗi màn xoay 15° vào trong): chân đế đôi ở
          giữa bàn, hai tấm 1.9×1.07 đối xứng, tâm hạ từ 0.98 xuống 0.82
          để tâm màn (thế giới y = 1.90) gần tầm mắt ghế (y = 1.42) hơn;
          mỗi màn nghiêng nhẹ 0.08 rad cho mặt màn đón xuống tầm mắt.
          Màn chính (trái) giữ ScreenDisplay + click mở world/terminal/
          máy tính; màn hai (phải) chỉ hiển thị nội dung, click vào nó
          bị chặn để không kích hoạt nhóm. Mép trong hai màn lùi về
          sau 0.25 khi xoay, khe giữa nới 0.1 → ~0.16, không cấn nhau. */}
      <mesh position={[0, 0.03, -0.05]} material={materials.metal} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.4]} />
      </mesh>
      <mesh position={[0, 0.5, -0.12]} material={materials.metal} castShadow>
        <boxGeometry args={[0.14, 1.0, 0.14]} />
      </mesh>
      <mesh position={[-0.5, 0.82, -0.1]} material={materials.metal} castShadow>
        <boxGeometry args={[1.0, 0.08, 0.08]} />
      </mesh>
      <mesh position={[0.5, 0.82, -0.1]} material={materials.metal} castShadow>
        <boxGeometry args={[1.0, 0.08, 0.08]} />
      </mesh>
      <group position={[-1.0, 0.82, 0]} rotation={[0.08, 0.26, 0]}>
        <RoundedBox
          args={[1.9, 1.07, 0.08]}
          radius={0.05}
          smoothness={3}
          material={materials.panel}
          position={[0, 0, 0]}
          castShadow
        />
        <mesh material={materials.screen} position={[0, 0, 0.05]}>
          <planeGeometry args={[1.78, 1.0]} />
        </mesh>
        <ScreenDisplay position={[0, 0, 0.062]} width={1.78} height={1.0} />
        {/* Đèn LED nguồn góc dưới-phải viền + thanh đèn trên đỉnh màn chính
            (tọa độ tương đối trong nhóm màn, tâm nhóm = tâm màn). */}
        <mesh position={[0.85, -0.48, 0.06]}>
          <sphereGeometry args={[0.02, 10, 10]} />
          <meshBasicMaterial color="#22c55e" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.58, 0]}>
          <boxGeometry args={[0.9, 0.04, 0.04]} />
          <meshBasicMaterial color="#fef3c7" toneMapped={false} />
        </mesh>
      </group>
      <group position={[1.0, 0.82, 0]} rotation={[0.08, -0.26, 0]}>
        <RoundedBox
          args={[1.9, 1.07, 0.08]}
          radius={0.05}
          smoothness={3}
          material={materials.panel}
          position={[0, 0, 0]}
          castShadow
        />
        <SecondScreenDisplay />
      </group>
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
 * Đợt 2 (theo ảnh) — kệ sách đứng bên trái bàn, mặt trước hướng về
 * bàn (+x). Khung gỗ, 2 ngăn sách đứng, 2 dải LED ấm dưới ván, 2 tượng
 * trang trí trừu tượng trên nóc (không mô phỏng nhân vật cụ thể).
 * Đứng NGOÀI nhóm bàn (xem cuối Workspace) nên không xoay theo scroll.
 */
const SHELF_BOOK_COLORS = [
  '#7f1d1d',
  '#164e63',
  '#3f3f46',
  '#854d0e',
  '#14532d',
  '#1e3a8a',
  '#831843',
  '#713f12',
]
const SHELF_BOOKS_BOTTOM = [0.34, 0.42, 0.3, 0.38, 0.44, 0.32, 0.4, 0.36]
const SHELF_BOOKS_MIDDLE = [0.38, 0.3, 0.42, 0.34, 0.4, 0.32, 0.36]
function Bookshelf({ materials }) {
  return (
    <group position={[-3.4, 0, -0.3]}>
      <mesh position={[-0.2, 1.15, 0]} material={materials.desk} castShadow>
        <boxGeometry args={[0.04, 2.3, 1.8]} />
      </mesh>
      <mesh position={[0, 1.15, -0.86]} material={materials.desk} castShadow>
        <boxGeometry args={[0.45, 2.3, 0.08]} />
      </mesh>
      <mesh position={[0, 1.15, 0.86]} material={materials.desk} castShadow>
        <boxGeometry args={[0.45, 2.3, 0.08]} />
      </mesh>
      <mesh position={[0, 0.04, 0]} material={materials.desk} castShadow>
        <boxGeometry args={[0.45, 0.08, 1.8]} />
      </mesh>
      <mesh position={[0, 1.05, 0]} material={materials.desk} castShadow>
        <boxGeometry args={[0.45, 0.06, 1.72]} />
      </mesh>
      <mesh position={[0, 2.0, 0]} material={materials.desk} castShadow>
        <boxGeometry args={[0.45, 0.06, 1.72]} />
      </mesh>
      {SHELF_BOOKS_BOTTOM.map((h, i) => (
        <mesh
          key={i}
          position={[0, 0.08 + h / 2, -0.62 + i * 0.17]}
          castShadow
        >
          <boxGeometry args={[0.28, h, 0.05]} />
          <meshStandardMaterial
            color={SHELF_BOOK_COLORS[i % SHELF_BOOK_COLORS.length]}
            roughness={0.85}
          />
        </mesh>
      ))}
      {SHELF_BOOKS_MIDDLE.map((h, i) => (
        <mesh
          key={i}
          position={[0, 1.08 + h / 2, -0.55 + i * 0.17]}
          castShadow
        >
          <boxGeometry args={[0.28, h, 0.05]} />
          <meshStandardMaterial
            color={SHELF_BOOK_COLORS[(i + 3) % SHELF_BOOK_COLORS.length]}
            roughness={0.85}
          />
        </mesh>
      ))}
      <mesh position={[0.18, 1.01, 0]}>
        <boxGeometry args={[0.04, 0.02, 1.6]} />
        <meshBasicMaterial color="#fbbf24" toneMapped={false} />
      </mesh>
      <mesh position={[0.18, 1.96, 0]}>
        <boxGeometry args={[0.04, 0.02, 1.6]} />
        <meshBasicMaterial color="#fbbf24" toneMapped={false} />
      </mesh>
      <group position={[0, 2.03, -0.4]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.16, 12]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.4} />
        </mesh>
      </group>
      <group position={[0, 2.03, 0.35]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.16, 12]} />
          <meshStandardMaterial color="#16a34a" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#86efac" roughness={0.4} />
        </mesh>
      </group>
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
    <group position={[-1.15, 1.08, 0.85]}>
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
 * Phase 1 — laptop trên stand (ambient: không pill, không click,
 * không spot gaze). Đợt 3 dời từ phải-sau sang TRÁI-TRƯỚC theo ảnh
 * ([-1.78, 0.5]: vừa trong mép bàn -2.3, hở thảm 0.005, cách cốc 0.065).
 * Màn hình gõ 4 dòng code THẬT lấy từ rgb.js trong repo, gõ xong giữ
 * 2.5s rồi lặp lại (mẫu gõ như ScreenDisplay nhưng canvas riêng, nhỏ hơn).
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
    // Xoay nhẹ 0.35 rad (~20°) về phía ghế để màn laptop đón người ngồi;
    // chân đế xoay theo nhóm nên khe hở với cốc phải tính lại (cốc đã
    // dời ra trước z 0.72 → 0.85 để giữ ~0.17 khe hở).
    <group position={[-1.78, 1.08, 0.48]} rotation={[0, 0.35, 0]}>
      {/* Đế chữ Z nhìn nghiêng (giữ nguyên chiều cao 0.25 để màn laptop
          không đổi độ cao): tấm đáy nằm trên bàn, tấm chéo lên sau,
          tấm trên đỡ laptop — bên dưới thoáng như đế tản nhiệt thật. */}
      <mesh position={[0, 0.02, 0.02]} material={materials.metal} castShadow>
        <boxGeometry args={[0.9, 0.04, 0.6]} />
      </mesh>
      <mesh
        position={[0, 0.125, 0.05]}
        rotation={[0.387, 0, 0]}
        material={materials.metal}
        castShadow
      >
        <boxGeometry args={[0.9, 0.035, 0.45]} />
      </mesh>
      <mesh position={[0, 0.23, -0.02]} material={materials.metal} castShadow>
        <boxGeometry args={[0.9, 0.04, 0.6]} />
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
 * Màn hai: trình duyệt đang dev web + panel F12 (vẽ bằng canvas).
 * Bên trái là trang web thật đang làm — card dự án AURUM MOTORS lấy
 * từ repo phamdung2301/aurum_motors (README + src/data/cars.ts):
 * GT ÆON, Grand Tourer · Flagship, 640 HP, 0–100 3,1s, 330 km/h,
 * 12.800.000.000 ₫, blurb nguyên văn, skin đen #050505 + vàng #d8ae62.
 * Địa chỉ localhost:5173 là lệnh chạy thật trong README (npm run dev).
 * Bên phải là DevTools Elements/Styles của chính card đó.
 * Render BÊN TRONG nhóm MonitorAssembly nên click phải chặn lan truyền,
 * nếu không sẽ kích hoạt nhầm onClick mở world/terminal của màn chính.
 * (C5 nối click lên card → mở repo GitHub; C4 chỉ vẽ nội dung.)
 */
function SecondScreenDisplay() {
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
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      // --- Chrome trình duyệt (0..34) ---
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(0, 0, 640, 34)
      const dots = ['#ff5f57', '#febc2e', '#28c840']
      dots.forEach((d, i) => {
        ctx.fillStyle = d
        ctx.beginPath()
        ctx.arc(16 + i * 18, 17, 6, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.fillStyle = '#111827'
      ctx.fillRect(60, 6, 168, 24)
      ctx.fillStyle = '#e5e7eb'
      ctx.font = '13px ui-monospace, Menlo, monospace'
      ctx.fillText('AURUM MOTORS — Showroom', 68, 11)
      ctx.fillStyle = '#0b0f1a'
      ctx.fillRect(236, 6, 392, 24)
      ctx.fillStyle = '#9ca3af'
      ctx.fillText('localhost:5173', 246, 11)
      // --- Trang web bên trái (0..384) ---
      ctx.fillStyle = '#050505'
      ctx.fillRect(0, 34, 384, 326)
      ctx.fillStyle = '#d8ae62'
      ctx.font = 'bold 15px Georgia, serif'
      ctx.fillText('A U R U M', 24, 52)
      ctx.fillStyle = '#6b7280'
      ctx.font = '12px ui-monospace, Menlo, monospace'
      ctx.fillText('Bộ sưu tập    Trải nghiệm    Liên hệ', 120, 54)
      ctx.fillStyle = '#d8ae62'
      ctx.font = '13px ui-monospace, Menlo, monospace'
      ctx.fillText('SHOWROOM Ô TÔ SIÊU SANG', 24, 96)
      ctx.fillStyle = '#f5f0e6'
      ctx.font = 'bold 52px Georgia, serif'
      ctx.fillText('GT ÆON', 24, 116)
      ctx.fillStyle = '#9ca3af'
      ctx.font = '14px ui-monospace, Menlo, monospace'
      ctx.fillText('Grand Tourer · Flagship', 24, 176)
      ctx.fillStyle = '#d8ae62'
      ctx.font = 'bold 16px ui-monospace, Menlo, monospace'
      ctx.fillText('640 HP   ·   0–100: 3,1s   ·   330 km/h', 24, 204)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px ui-monospace, Menlo, monospace'
      ctx.fillText('12.800.000.000 ₫', 24, 232)
      ctx.fillStyle = '#9ca3af'
      ctx.font = '13px ui-monospace, Menlo, monospace'
      ctx.fillText('Kiệt tác đường dài — 12 xi-lanh, nội thất', 24, 262)
      ctx.fillText('da Nappa khâu tay 214 giờ.', 24, 280)
      ctx.fillStyle = '#d8ae62'
      ctx.fillRect(24, 306, 110, 30)
      ctx.fillStyle = '#050505'
      ctx.font = 'bold 14px ui-monospace, Menlo, monospace'
      ctx.fillText('Đặt lái thử', 38, 314)
      // --- Panel F12 bên phải (384..640) ---
      ctx.fillStyle = '#1e1f22'
      ctx.fillRect(384, 34, 256, 326)
      ctx.fillStyle = '#4a9eff'
      ctx.font = '13px ui-monospace, Menlo, monospace'
      ctx.fillText('Elements', 396, 42)
      ctx.fillStyle = '#7a7e85'
      ctx.fillText('Console   Styles', 468, 42)
      ctx.fillStyle = '#3a3d42'
      ctx.fillRect(384, 64, 256, 1)
      ctx.font = '13px ui-monospace, Menlo, monospace'
      const els = [
        ['▼ ', '#7a7e85', '<div', '#67e8f9', ' class="showroom">', '#fcd34d'],
        ['  ▼ ', '#7a7e85', '<div', '#67e8f9', ' class="car-card">', '#fcd34d'],
        ['    ', '#7a7e85', '<h1>', '#67e8f9', 'GT ÆON</h1>', '#a9b7c6'],
        ['    ', '#7a7e85', '<p', '#67e8f9', ' class="kind">…</p>', '#fcd34d'],
        ['    ', '#7a7e85', '<div', '#67e8f9', ' class="specs">…</div>', '#fcd34d'],
        ['    ', '#7a7e85', '<button>', '#67e8f9', 'Đặt lái thử</button>', '#a9b7c6'],
      ]
      els.forEach(([pad, padC, tag, tagC, rest, restC], i) => {
        const y = 76 + i * 20
        ctx.fillStyle = padC
        ctx.fillText(pad, 396, y)
        const w1 = ctx.measureText(pad).width
        ctx.fillStyle = tagC
        ctx.fillText(tag, 396 + w1, y)
        const w2 = ctx.measureText(tag).width
        ctx.fillStyle = restC
        ctx.fillText(rest, 396 + w1 + w2, y)
      })
      ctx.fillStyle = '#3a3d42'
      ctx.fillRect(384, 204, 256, 1)
      ctx.fillStyle = '#4a9eff'
      ctx.font = '13px ui-monospace, Menlo, monospace'
      ctx.fillText('Styles', 396, 212)
      const styles = [
        ['.car-card {', '#fcd34d'],
        ['  background: #050505;', '#a9b7c6'],
        ['  border: 1px solid #d8ae62;', '#a9b7c6'],
        ['  color: #f5f0e6;', '#a9b7c6'],
        ['}', '#fcd34d'],
      ]
      styles.forEach(([line, color], i) => {
        ctx.fillStyle = color
        ctx.fillText(line, 396, 236 + i * 20)
      })
      texture.needsUpdate = true
    }
    draw()
    const id = setInterval(draw, 30000)
    return () => clearInterval(id)
  }, [canvas, texture])
  return (
    <mesh
      position={[0, 0, 0.052]}
      onClick={(e) => e.stopPropagation()}
    >
      <planeGeometry args={[1.78, 1.0]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

/**
 * Đợt 3 (theo ảnh) — sổ tay mở bên phải bàn phím (trước bàn phím đã có
 * miếng kê cổ tay nên sổ đặt sang phải, xoay lệch nhẹ như đặt vội).
 * Bìa nâu, 2 trang mở hơi vểnh, vài dòng chữ + bút đặt chéo.
 */
function Notebook() {
  return (
    <group position={[1.15, 1.09, 0.35]} rotation={[0, -0.25, 0]}>
      <mesh position={[0, 0.005, 0]} castShadow>
        <boxGeometry args={[0.42, 0.012, 0.3]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>
      <mesh position={[-0.105, 0.014, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.2, 0.008, 0.28]} />
        <meshStandardMaterial color="#fefce8" roughness={0.9} />
      </mesh>
      <mesh position={[0.105, 0.014, 0]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[0.2, 0.008, 0.28]} />
        <meshStandardMaterial color="#fefce8" roughness={0.9} />
      </mesh>
      {[-0.06, 0, 0.06].map((z, i) => (
        <mesh key={i} position={[0.105, 0.02, z]} rotation={[0, 0, -0.12]}>
          <boxGeometry args={[0.14, 0.002, 0.012]} />
          <meshStandardMaterial color="#94a3b8" roughness={1} />
        </mesh>
      ))}
      <group position={[0.12, 0.025, -0.02]} rotation={[0, 0.5, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.16, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}

/** Đợt 3 (theo ảnh) — ly nước bên phải bàn, gần đèn bàn nhưng không chạm cột đèn. */
function WaterGlass() {
  return (
    <group position={[2.05, 1.08, 0.75]}>
      <mesh position={[0, 0.11, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.06, 0.22, 20]} />
        <meshStandardMaterial
          color="#bae6fd"
          transparent
          opacity={0.35}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[0, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.062, 20]} />
        <meshStandardMaterial color="#7dd3fc" roughness={0.2} />
      </mesh>
    </group>
  )
}

/**
 * Đợt 4 (theo ảnh) — cửa sổ đêm bên phải phòng, đứng ngoài nhóm bàn.
 * Bầu trời + nhà + cửa sổ sáng vẽ bằng MỘT canvas texture (1 draw call),
 * khung kim loại + rèm 2 bên. Chỉ phát sáng, không thêm đèn thật.
 */
function NightWindow({ materials }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 512
    const ctx = c.getContext('2d')
    const sky = ctx.createLinearGradient(0, 0, 0, 512)
    sky.addColorStop(0, '#070b1d')
    sky.addColorStop(0.7, '#1e1b4b')
    sky.addColorStop(1, '#431407')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 1024, 512)
    const glow = ctx.createRadialGradient(820, 90, 10, 820, 90, 110)
    glow.addColorStop(0, 'rgba(254,243,199,0.5)')
    glow.addColorStop(1, 'rgba(254,243,199,0)')
    ctx.fillStyle = glow
    ctx.fillRect(710, -20, 220, 220)
    ctx.fillStyle = '#fef3c7'
    ctx.beginPath()
    ctx.arc(820, 90, 34, 0, Math.PI * 2)
    ctx.fill()
    let seed = 20261028
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    let x = 0
    while (x < 1024) {
      const w = 60 + rand() * 90
      const h = 120 + rand() * 220
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(x, 512 - h, w, h)
      const cols = Math.floor(w / 22)
      const rows = Math.floor(h / 30)
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          if (rand() > 0.45) continue
          ctx.fillStyle =
            rand() > 0.5
              ? 'rgba(252,211,77,0.9)'
              : 'rgba(251,191,36,0.7)'
          ctx.fillRect(x + 6 + cx * 22, 512 - h + 10 + cy * 30, 9, 12)
        }
      }
      x += w + 8
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])
  return (
    <group position={[6.5, 0, -0.5]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 2.3, 0]}>
        <planeGeometry args={[5.2, 3.0]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.8, 0.02]} material={materials.metal}>
        <boxGeometry args={[5.2, 0.12, 0.08]} />
      </mesh>
      <mesh position={[0, 3.8, 0.02]} material={materials.metal}>
        <boxGeometry args={[5.2, 0.12, 0.08]} />
      </mesh>
      <mesh position={[-2.6, 2.3, 0.02]} material={materials.metal}>
        <boxGeometry args={[0.12, 3.0, 0.08]} />
      </mesh>
      <mesh position={[2.6, 2.3, 0.02]} material={materials.metal}>
        <boxGeometry args={[0.12, 3.0, 0.08]} />
      </mesh>
      <mesh position={[0, 2.3, 0.02]} material={materials.metal}>
        <boxGeometry args={[0.08, 3.0, 0.06]} />
      </mesh>
      <mesh position={[0, 2.3, 0.02]} material={materials.metal}>
        <boxGeometry args={[5.2, 0.08, 0.06]} />
      </mesh>
      <mesh position={[-2.85, 2.3, 0.15]}>
        <boxGeometry args={[0.5, 3.2, 0.12]} />
        <meshStandardMaterial color="#44403c" roughness={1} />
      </mesh>
      <mesh position={[2.85, 2.3, 0.15]}>
        <boxGeometry args={[0.5, 3.2, 0.12]} />
        <meshStandardMaterial color="#44403c" roughness={1} />
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

