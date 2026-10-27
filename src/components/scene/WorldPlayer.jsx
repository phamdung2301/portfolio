import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { allSpots } from '../world/interactables.js'
import { worldInput } from '../world/input.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'

/**
 * S2 — người chơi trong Thế giới tự do.
 *
 * Điều khiển:
 *  - WASD / phím mũi tên để di chuyển, Shift để chạy nhanh.
 *  - Kéo chuột trên canvas để nhìn (không dùng Pointer Lock: tránh xung
 *    đột với Esc thoát world, và hoạt động giống nhau trên mọi trình duyệt).
 *  - Cảm ứng: joystick ở HUD ghi vào worldInput, kéo nửa phải màn hình
 *    để nhìn (joystick + look đều qua pointer events của HUD/canvas).
 *  - E hoặc click trực tiếp lên vật thể để tương tác (E xử lý ở HUD để
 *    tránh xung đột khi đang gõ trong terminal; click xử lý ở mesh).
 *
 * Giới hạn:
 *  - Bán kính 9.5 quanh gốc; đẩy ra khỏi hộp bàn (x ±2.9, z ±1.6) theo
 *    trục xuyên ít nhất — va chạm AABB đơn giản, đủ cho một bàn duy nhất.
 *  - Mắt ở y = 1.6 cố định (không nhảy, không bay).
 *  - Khi terminal/panel đang mở thì đứng yên (không di chuyển khi gõ).
 * Proximity: tính mỗi frame từ vị trí camera tới các spot, chỉ ghi store
 * khi vật gần nhất thay đổi (tránh spam setState mỗi frame).
 */
const EYE_HEIGHT = 1.6
const BOUND_RADIUS = 9.5
const DESK_BOX = { x: 2.9, z: 1.6 }

export default function WorldPlayer() {
  const { camera, gl } = useThree()
  const pos = useRef(new THREE.Vector3(0, EYE_HEIGHT, 6.5))
  const yaw = useRef(0)
  const pitch = useRef(0)
  const keys = useRef(new Set())
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const nearbyRef = useRef(null)

  const setNearby = usePortfolioStore((s) => s.setNearby)

  // Đặt FOV chuẩn khi vào world (CameraRig có thể đã chỉnh FOV theo
  // tốc độ cuộn trước đó).
  useEffect(() => {
    camera.fov = 42
    camera.updateProjectionMatrix()
    camera.position.copy(pos.current)
    camera.lookAt(0, EYE_HEIGHT, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const isTypingTarget = (e) =>
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement

    const onKeyDown = (e) => {
      if (isTypingTarget(e)) return
      keys.current.add(e.key.toLowerCase())
    }
    const onKeyUp = (e) => keys.current.delete(e.key.toLowerCase())
    const onBlur = () => keys.current.clear()

    const el = gl.domElement
    const onPointerDown = (e) => {
      dragging.current = true
      lastPointer.current = { x: e.clientX, y: e.clientY }
    }
    const onPointerMove = (e) => {
      if (!dragging.current) return
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      yaw.current -= dx * 0.0035
      pitch.current = Math.max(
        -1.2,
        Math.min(1.2, pitch.current - dy * 0.0035),
      )
    }
    const onPointerUp = () => {
      dragging.current = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [gl])

  useFrame((_, delta) => {
    const st = usePortfolioStore.getState()
    // Đứng yên khi panel đang mở (tránh di chuyển khi đang gõ terminal).
    const frozen = st.terminalOpen || st.projectDetailId !== null
    const k = keys.current
    const run = k.has('shift') ? 5.5 : 3.2

    let forward = 0
    let strafe = 0
    if (!frozen) {
      if (k.has('w') || k.has('arrowup')) forward += 1
      if (k.has('s') || k.has('arrowdown')) forward -= 1
      if (k.has('d') || k.has('arrowright')) strafe += 1
      if (k.has('a') || k.has('arrowleft')) strafe -= 1
      // Joystick: đẩy lên = tiến (joyY âm), phải = strafe dương.
      forward += -worldInput.joyY
      strafe += worldInput.joyX
      const len = Math.hypot(forward, strafe)
      if (len > 1) {
        forward /= len
        strafe /= len
      }
    }

    if (forward !== 0 || strafe !== 0) {
      const sin = Math.sin(yaw.current)
      const cos = Math.cos(yaw.current)
      // forward (yaw=0) = -z; right = +x.
      const dx = -sin * forward + cos * strafe
      const dz = -cos * forward - sin * strafe
      pos.current.x += dx * run * delta
      pos.current.z += dz * run * delta
    }

    // Giới hạn bán kính.
    const r = Math.hypot(pos.current.x, pos.current.z)
    if (r > BOUND_RADIUS) {
      pos.current.x *= BOUND_RADIUS / r
      pos.current.z *= BOUND_RADIUS / r
    }
    // Đẩy ra khỏi hộp bàn theo trục xuyên ít nhất.
    if (
      Math.abs(pos.current.x) < DESK_BOX.x &&
      Math.abs(pos.current.z) < DESK_BOX.z
    ) {
      const px = DESK_BOX.x - Math.abs(pos.current.x)
      const pz = DESK_BOX.z - Math.abs(pos.current.z)
      if (px < pz) {
        pos.current.x =
          Math.sign(pos.current.x || 1) * DESK_BOX.x
      } else {
        pos.current.z =
          Math.sign(pos.current.z || 1) * DESK_BOX.z
      }
    }

    // Đặt camera theo yaw/pitch.
    const cp = Math.cos(pitch.current)
    const dir = new THREE.Vector3(
      -Math.sin(yaw.current) * cp,
      Math.sin(pitch.current),
      -Math.cos(yaw.current) * cp,
    )
    camera.position.set(pos.current.x, EYE_HEIGHT, pos.current.z)
    camera.lookAt(
      pos.current.x + dir.x,
      EYE_HEIGHT + dir.y,
      pos.current.z + dir.z,
    )

    // Proximity: vật gần nhất trong bán kính, bỏ qua skill đã thu thập.
    const collected = st.collectedSkills
    let best = null
    let bestDist = Infinity
    for (const spot of allSpots()) {
      if (
        spot.id.startsWith('skill:') &&
        collected.includes(spot.id.slice('skill:'.length))
      ) {
        continue
      }
      const d = Math.hypot(
        pos.current.x - spot.position[0],
        EYE_HEIGHT - spot.position[1],
        pos.current.z - spot.position[2],
      )
      if (d < spot.radius && d < bestDist) {
        best = spot.id
        bestDist = d
      }
    }
    if (best !== nearbyRef.current) {
      nearbyRef.current = best
      setNearby(best)
    }
  })

  return null
}
