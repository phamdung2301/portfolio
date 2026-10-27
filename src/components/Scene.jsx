import { Suspense, memo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { easing } from 'maath'
import * as THREE from 'three'

import CameraRig from './scene/CameraRig.jsx'
import Workspace from './scene/Workspace.jsx'
import SkillCluster from './scene/SkillCluster.jsx'
import SceneEnvironment from './scene/SceneEnvironment.jsx'
import { scrollState } from '../hooks/useScrollState.js'
import { getSceneState } from './scene/choreography.js'

/**
 * M5: giữ mượt khi FPS thấp — PerformanceMonitor + AdaptiveDpr tự hạ DPR.
 * Trước đây onChange còn đẩy `quality` ra store, nhưng không có UI nào
 * đọc giá trị đó (chỉ ghi, không đọc) nên store update là vô ích. Đã bỏ
 * coupling với store; cơ chế adaptive của drei vẫn hoạt động qua context
 * nội bộ của PerformanceMonitor, không cần onChange.
 */
function QualityGuard() {
  return (
    <PerformanceMonitor bounds={() => [45, 58]} flipflops={3}>
      <AdaptiveDpr />
    </PerformanceMonitor>
  )
}

/**
 * Làm mượt giá trị scroll bằng easing.damp trong vòng lặp render.
 * Nhờ vậy camera và vật thể chuyển động "đuôi" thay vì giật theo từng frame scroll.
 */
function ScrollSmoother() {
  useFrame((_, delta) => {
    const prev = scrollState.smoothed
    easing.damp(scrollState, 'smoothed', scrollState.raw, 0.22, delta)
    scrollState.velocity = scrollState.smoothed - prev
  })
  return null
}

/**
 * Ánh sáng toàn cảnh: key + fill + rim.
 * Bóng đổ thật chỉ dùng cho key light, phần còn lại dùng ContactShadows.
 */
function Lights() {
  const keyRef = useRef(null)
  const ambientRef = useRef(null)
  const rimRef = useRef(null)
  const cyanRef = useRef(null)

  useFrame((_, delta) => {
    // S1: cường độ ánh sáng đi theo trạng thái của section hiện tại,
    // damp để không nhảy khi chuyển section.
    const state = getSceneState(scrollState.smoothed)
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.damp(
        ambientRef.current.intensity,
        state.ambient,
        3,
        delta,
      )
    }
    if (rimRef.current) {
      rimRef.current.intensity = THREE.MathUtils.damp(
        rimRef.current.intensity,
        state.rim,
        3,
        delta,
      )
    }
    if (cyanRef.current) {
      cyanRef.current.intensity = THREE.MathUtils.damp(
        cyanRef.current.intensity,
        state.cyan,
        3,
        delta,
      )
    }
    if (!keyRef.current) return
    // Key light nhẹ theo camera để vật thể luôn có điểm sáng rõ
    keyRef.current.position.x = 4 + Math.sin(scrollState.smoothed * Math.PI * 2) * 1.5
    keyRef.current.intensity = THREE.MathUtils.damp(
      keyRef.current.intensity,
      state.key,
      3,
      delta,
    )
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.35} color="#8ea0c8" />
      <directionalLight
        ref={keyRef}
        position={[4, 6, 3]}
        intensity={1.6}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
      />
      {/* rim light tím từ phía sau, tạo viền sáng cho vật thể */}
      <pointLight ref={rimRef} position={[-5, 3, -5]} intensity={22} color="#8a63ff" distance={16} />
      <pointLight ref={cyanRef} position={[5, -2, -3]} intensity={12} color="#12b8d8" distance={14} />
    </>
  )
}

/**
 * Nội dung cảnh 3D. Được bọc trong <group> riêng để dễ bật/tắt theo section.
 */
/**
 * S1: sương mù + màu nền đi theo section (damp, không nhảy).
 * scene.background đã là THREE.Color từ onCreated nên lerp trực tiếp được.
 */
function SceneFog() {
  const { scene } = useThree()
  useFrame((_, delta) => {
    const state = getSceneState(scrollState.smoothed)
    const k = 1 - Math.exp(-3 * delta)
    if (scene.fog) scene.fog.color.lerp(state.fog, k)
    if (scene.background && scene.background.isColor) {
      scene.background.lerp(state.fog, k)
    }
  })
  return null
}

/**
 * S1: cột sáng spotlight — neo thị giác của từng section.
 * Vị trí x đi theo điểm nhìn của camera (hero 0, about -1.8, skills 0,
 * projects 1.6, contact 0), độ mờ + màu đổi theo section. Đây là vật thể
 * duy nhất mới thêm vào cảnh, rẻ: 1 cylinder additive, không shadow.
 */
function SectionBeam() {
  const meshRef = useRef(null)
  const matRef = useRef(null)

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return
    const state = getSceneState(scrollState.smoothed)
    meshRef.current.position.x = THREE.MathUtils.damp(
      meshRef.current.position.x,
      state.beamX,
      3,
      delta,
    )
    matRef.current.opacity = THREE.MathUtils.damp(
      matRef.current.opacity,
      state.beam,
      3,
      delta,
    )
    matRef.current.color.lerp(state.beamColor, 1 - Math.exp(-3 * delta))
  })

  return (
    <mesh ref={meshRef} position={[0, 2.4, 0]}>
      <cylinderGeometry args={[0.55, 0.9, 4.8, 32, 1, true]} />
      <meshBasicMaterial
        ref={matRef}
        color="#45d8f0"
        transparent
        opacity={0.1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function SceneContent() {
  return (
    <>
      <ScrollSmoother />
      <Lights />
      <SceneFog />
      <SectionBeam />
      <CameraRig />
      <SceneEnvironment />
      <Workspace />
      <SkillCluster />
    </>
  )
}

function SceneCanvas() {
  return (
    <Canvas
      className="!absolute !inset-0 !h-full !w-full"
      dpr={[1, 2]}
      shadows
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      }}
      camera={{ position: [0, 2.2, 8], fov: 42, near: 0.1, far: 100 }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        scene.background = new THREE.Color('#07070a')
        scene.fog = new THREE.Fog('#07070a', 9, 26)
      }}
    >
      <QualityGuard />
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  )
}

/**
 * Canvas được memo hoá: UI 2D re-render không khiến cảnh 3D render lại.
 */
const Scene = memo(function Scene() {
  return (
    <div className="pointer-events-auto absolute inset-0 z-0 h-full w-full">
      <SceneCanvas />
    </div>
  )
})

export default Scene
