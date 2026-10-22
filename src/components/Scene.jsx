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
import { usePortfolioStore } from '../store/usePortfolio.js'

/**
 * Ghi nhận chất lượng render: khi FPS thấp, hạ DPR để giữ mượt.
 * `quality` được đưa vào store để lớp UI 2D có thể hiển thị chỉ báo.
 */
function QualityGuard() {
  const setQuality = usePortfolioStore((s) => s.setQuality)

  return (
    <PerformanceMonitor
      bounds={() => [45, 58]}
      flipflops={3}
      onChange={({ factor }) => setQuality(Math.round(factor * 100) / 100)}
    >
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

  useFrame(() => {
    if (!keyRef.current) return
    // Key light nhẹ theo camera để vật thể luôn có điểm sáng rõ
    keyRef.current.position.x = 4 + Math.sin(scrollState.smoothed * Math.PI * 2) * 1.5
  })

  return (
    <>
      <ambientLight intensity={0.35} color="#8ea0c8" />
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
      <pointLight position={[-5, 3, -5]} intensity={22} color="#8a63ff" distance={16} />
      <pointLight position={[5, -2, -3]} intensity={12} color="#12b8d8" distance={14} />
    </>
  )
}

/**
 * Nội dung cảnh 3D. Được bọc trong <group> riêng để dễ bật/tắt theo section.
 */
function SceneContent() {
  return (
    <>
      <ScrollSmoother />
      <Lights />
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
