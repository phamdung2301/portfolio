import { useMemo, useRef, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../hooks/useScrollState.js'
import { getSceneState } from './choreography.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'
import { seatRef } from '../world/shared.js'
import ScreenDisplay from './ScreenDisplay.jsx'

/** Màu màn hình khi terminal trong world đang mở. */
const TERMINAL_GREEN = new THREE.Color('#22c55e')

/**
 * Vật thể chính: góc làm việc low-poly.
 * Tất cả vật thể nằm trong group `root` được dịch chuyển/nghiêng theo scroll.
 */
export default function Workspace() {
  const root = useRef(null)
  const monitor = useRef(null)
  const worldMode = usePortfolioStore((s) => s.worldMode)
  const terminalOpen = usePortfolioStore((s) => s.terminalOpen)
  const seated = usePortfolioStore((s) => s.seated)
  const seatedTab = usePortfolioStore((s) => s.seatedTab)

  // Vật liệu dùng chung -> giảm số chương trình shader
  const materials = useMemo(
    () => ({
      desk: new THREE.MeshStandardMaterial({ color: '#1b1b27', roughness: 0.72, metalness: 0.15 }),
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
    }),
    [],
  )

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
      <DecorativeBoxes />
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
    if (st.worldMode && !st.seated) {
      st.setSeated(true)
      st.setSeatedTab('terminal')
      st.setComputerOpen(true)
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
function PhotoFrame() {
  const frame = useRef(null)
  const seated = usePortfolioStore((s) => s.seated)

  useFrame((state) => {
    if (!frame.current) return
    if (seated) {
      const t = state.clock.elapsedTime
      frame.current.rotation.z = Math.sin(t * 10) * 0.02
      frame.current.position.y = 1.08 + Math.sin(t * 10) * 0.008
    } else {
      frame.current.rotation.z = 0
      frame.current.position.y = 1.08
    }
  })

  return (
    <group
      ref={frame}
      position={[1.45, 1.08, 0.45]}
      rotation={[-0.12, -0.25, 0]}
      onClick={(e) => {
        e.stopPropagation()
        const st = usePortfolioStore.getState()
        if (st.worldMode) st.setPhotoCardOpen(true)
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
        // đang ngồi → mở máy tính (tab Terminal), tránh chồng cửa sổ
        // với terminal standalone; đang đứng → mở terminal standalone.
        const st = usePortfolioStore.getState()
        if (!worldMode) setWorldMode(true)
        else if (st.seated) {
          st.setSeatedTab('terminal')
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
    const inst = keysRef.current
    if (inst) {
      keyPositions.forEach(([x], i) => {
        color.setHSL(((x * 0.55 + t * 0.12) % 1 + 1) % 1, 0.9, 0.55)
        inst.setColorAt(i, color)
      })
      inst.instanceColor.needsUpdate = true
    }
    if (spaceRef.current) {
      spaceRef.current.color.setHSL((t * 0.12) % 1, 0.9, 0.55)
    }
    if (glowRef.current) {
      glowRef.current.color.setHSL((t * 0.12) % 1, 0.9, 0.55)
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
    </group>
  )
}

function DeskLamp({ materials }) {
  return (
    <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.4}>
      <mesh position={[1.85, 1.75, 0.4]} material={materials.accent} castShadow>
        <sphereGeometry args={[0.14, 20, 20]} />
      </mesh>
      <mesh position={[1.85, 1.28, 0.4]} material={materials.metal} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 12]} />
      </mesh>
    </Float>
  )
}

/**
 * Ba hộp trang trí dùng InstancedMesh để chỉ tốn 1 draw call.
 */
function DecorativeBoxes() {
  const ref = useRef(null)

  const transforms = useMemo(
    () => [
      { position: [-1.85, 1.22, 0.55], scale: [0.42, 0.42, 0.42], rot: 0.3 },
      { position: [-1.5, 1.5, 0.3], scale: [0.3, 0.3, 0.3], rot: -0.6 },
      { position: [-2.05, 1.44, 0.2], scale: [0.26, 0.26, 0.26], rot: 0.9 },
    ],
    [],
  )

  useFrame((state) => {
    if (!ref.current) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const v = new THREE.Vector3()
    const s = new THREE.Vector3()
    const time = state.clock.elapsedTime

    transforms.forEach((t, i) => {
      e.set(time * 0.3 + t.rot, time * 0.45 + t.rot, time * 0.2)
      q.setFromEuler(e)
      v.set(t.position[0], t.position[1] + Math.sin(time * 1.2 + i) * 0.05, t.position[2])
      s.set(t.scale[0], t.scale[1], t.scale[2])
      m.compose(v, q, s)
      ref.current.setMatrixAt(i, m)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, transforms.length]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#b39bff"
        roughness={0.4}
        metalness={0.3}
        emissive="#3a2a66"
        emissiveIntensity={0.35}
      />
    </instancedMesh>
  )
}

