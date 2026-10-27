import { useMemo, useRef, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../hooks/useScrollState.js'
import { getSceneState } from './choreography.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'

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
    // S2: terminal mở → màn hình chuyển xanh lá, vạch code giả ẩn đi
    // (ẩn ở MonitorAssembly theo terminalOpen).
    materials.screen.emissive.lerp(
      worldMode && terminalOpen ? TERMINAL_GREEN : sceneState.monitorColor,
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
  const terminalOpen = usePortfolioStore((s) => s.terminalOpen)
  const setWorldMode = usePortfolioStore((s) => s.setWorldMode)
  const setTerminalOpen = usePortfolioStore((s) => s.setTerminalOpen)

  // Vạch "code" giả lập trên màn hình
  const codeLines = useMemo(
    () => [
      [0.55, 0.42, 0.7, '#8ef0ff'],
      [-0.35, 0.2, 1.0, '#b39bff'],
      [0.2, 0.0, 0.55, '#8ef0ff'],
      [-0.5, -0.22, 0.85, '#5eead4'],
    ],
    [],
  )

  return (
    <group
      ref={ref}
      position={[0, 1.08, -0.55]}
      onClick={(e) => {
        e.stopPropagation()
        // S2: màn hình là cổng vào world (chế độ cuộn) và mở terminal
        // (khi đã ở trong world). Nút Hero vẫn là đường vào chắc chắn
        // nhất, vì click mesh có thể bị lớp Overlay chặn ở chế độ cuộn.
        if (worldMode) setTerminalOpen(true)
        else setWorldMode(true)
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
      {/* S2: terminal mở thì vạch code giả ẩn đi, màn hình thuộc về terminal */}
      <group visible={!terminalOpen}>
        {codeLines.map(([x, y, w, color], i) => (
          <mesh key={i} position={[x, 1.28 + y, 0.06]}>
            <planeGeometry args={[w, 0.045]} />
            <meshBasicMaterial color={color} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  )
})

function Keyboard({ materials }) {
  return (
    <RoundedBox
      args={[1.9, 0.06, 0.6]}
      radius={0.03}
      smoothness={3}
      material={materials.panel}
      position={[0, 1.11, 0.42]}
      castShadow
    />
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

