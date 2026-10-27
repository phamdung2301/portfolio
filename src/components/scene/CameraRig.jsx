import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../hooks/useScrollState.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'

/**
 * Các "keyframe" camera tương ứng từng section của trang.
 * Mỗi section có vị trí camera + điểm nhìn (lookAt).
 */
const KEYFRAMES = [
  { position: [0, 2.2, 8.5], target: [0, 2.0, 0] }, // hero
  { position: [-3.8, 2.0, 6.4], target: [-1.8, 1.5, 0] }, // about
  { position: [0, 2.5, 5.6], target: [0, 2.05, 0] }, // skills
  { position: [3.6, 1.7, 6.2], target: [1.6, 1.4, 0] }, // projects
  { position: [0, 1.4, 7.4], target: [0, 1.2, 0] }, // contact
]

/**
 * CameraRig điều khiển camera theo tiến độ cuộn:
 *  - nội suy mượt giữa các keyframe (damp)
 *  - thêm parallax theo con trỏ chuột
 *  - thêm sway nhẹ theo thời gian để cảnh không bị "chết"
 */
export default function CameraRig() {
  const { camera, size } = useThree()
  const worldMode = usePortfolioStore((s) => s.worldMode)
  const pointer = useRef({ x: 0, y: 0 })
  const current = useRef({
    position: new THREE.Vector3(...KEYFRAMES[0].position),
    target: new THREE.Vector3(...KEYFRAMES[0].target),
  })

  // Vector tạm để không cấp phát trong vòng lặp render
  const scratch = useMemo(
    () => ({
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
      desired: new THREE.Vector3(),
      desiredTarget: new THREE.Vector3(),
    }),
    [],
  )

  useFrame((state, delta) => {
    // S2: ở world mode, WorldPlayer cầm camera — Rig không được ghi đè.
    if (worldMode) return
    const t = scrollState.smoothed
    // Vị trí giữa 2 keyframe
    const scaled = t * (KEYFRAMES.length - 1)
    const index = Math.min(KEYFRAMES.length - 2, Math.floor(scaled))
    const local = scaled - index
    // ease-in-out cho chuyển động tự nhiên
    const eased = local * local * (3 - 2 * local)

    const a = KEYFRAMES[index]
    const b = KEYFRAMES[index + 1]

    scratch.desired.set(
      a.position[0] + (b.position[0] - a.position[0]) * eased,
      a.position[1] + (b.position[1] - a.position[1]) * eased,
      a.position[2] + (b.position[2] - a.position[2]) * eased,
    )
    scratch.desiredTarget.set(
      a.target[0] + (b.target[0] - a.target[0]) * eased,
      a.target[1] + (b.target[1] - a.target[1]) * eased,
      a.target[2] + (b.target[2] - a.target[2]) * eased,
    )

    // Parallax theo con trỏ (giới hạn để không quá mức)
    pointer.current.x = state.pointer.x
    pointer.current.y = state.pointer.y
    scratch.desired.x += pointer.current.x * 0.45
    scratch.desired.y += pointer.current.y * 0.3

    // Sway nhẹ theo thời gian
    const time = state.clock.elapsedTime
    scratch.desired.x += Math.sin(time * 0.35) * 0.12
    scratch.desired.y += Math.cos(time * 0.28) * 0.08

    // Damp để chuyển động mượt, độc lập framerate
    const lambda = 4
    current.current.position.x = THREE.MathUtils.damp(
      current.current.position.x,
      scratch.desired.x,
      lambda,
      delta,
    )
    current.current.position.y = THREE.MathUtils.damp(
      current.current.position.y,
      scratch.desired.y,
      lambda,
      delta,
    )
    current.current.position.z = THREE.MathUtils.damp(
      current.current.position.z,
      scratch.desired.z,
      lambda,
      delta,
    )
    current.current.target.x = THREE.MathUtils.damp(
      current.current.target.x,
      scratch.desiredTarget.x,
      lambda,
      delta,
    )
    current.current.target.y = THREE.MathUtils.damp(
      current.current.target.y,
      scratch.desiredTarget.y,
      lambda,
      delta,
    )
    current.current.target.z = THREE.MathUtils.damp(
      current.current.target.z,
      scratch.desiredTarget.z,
      lambda,
      delta,
    )

    camera.position.copy(current.current.position)
    camera.lookAt(current.current.target)

    // Điều chỉnh FOV theo tốc độ cuộn → cảm giác "zoom" khi lướt nhanh
    const fov = 42 - Math.min(6, Math.abs(scrollState.velocity) * 90)
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, fov, 6, delta)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
