import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { allSpots } from '../world/interactables.js'
import { worldInput } from '../world/input.js'
import { seatRef } from '../world/shared.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'

/**
 * S2 — người chơi trong Thế giới tự do (+ ngồi ghế).
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
 * Ngồi ghế:
 *  - Khi `seated` đổi trạng thái, camera bay mềm 0.8s (smoothstep) từ vị
 *    trí hiện tại tới ghế ([0, 1.3, 1.9], nhìn về -z) hoặc ngược lại tới
 *    vị trí đứng trước ghế ([0, 1.6, 2.7]). Trong lúc bay thì khóa input.
 *  - Đang ngồi: không di chuyển, chỉ nhìn trong khoảng yaw ±1.0 rad và
 *    pitch ±0.8 rad (đủ với tới khung ảnh, cốc, PC và màn hai xếp chồng);
 *    góc nhìn ghi vào seatRef.lookYaw để ghế xoay theo.
 *  - Proximity tạm dừng khi ngồi (prompt vật thể khác sẽ là lừa, vì
 *    đang ngồi thì không với tới chúng).
 *
 * Giới hạn khi đứng:
 *  - Bán kính 9.5 quanh gốc; đẩy ra khỏi hộp bàn (x ±2.9, z ±1.6) theo
 *    trục xuyên ít nhất — va chạm AABB đơn giản, đủ cho một bàn duy nhất.
 *  - Mắt ở y = 1.6 cố định (không nhảy, không bay).
 *  - Khi terminal/panel đang mở thì đứng yên (không di chuyển khi gõ).
 */
const EYE_HEIGHT = 1.6
const SEAT_POS = new THREE.Vector3(0, 1.42, 1.9)
const STAND_POS = new THREE.Vector3(0, 1.6, 2.7)
const BOUND_RADIUS = 9.5
const DESK_BOX = { x: 2.9, z: 1.6 }

// S2 (trải nghiệm gaze) — vật đang nhìn: góc lệch giữa hướng nhìn và
// hướng tới tâm vật < 12° và trong bán kính của vật. Không raycast:
// chỉ tính góc + khoảng cách với tâm vật (rẻ, đủ cho pill gợi ý).
// Khi ngồi chỉ với tới vật trên bàn; khi đứng với tới mọi vật.
const GAZE_COS = Math.cos(THREE.MathUtils.degToRad(12))
const SEATED_GAZE_IDS = ['monitor', 'frame', 'pc', 'mug']
const _gazeDir = new THREE.Vector3()
function updateGaze(camera, seated, gazeRef, setGazeTarget) {
  const st = usePortfolioStore.getState()
  camera.getWorldDirection(_gazeDir)
  let best = null
  let bestScore = Infinity
  for (const spot of allSpots()) {
    if (seated && !SEATED_GAZE_IDS.includes(spot.id)) continue
    if (
      spot.id.startsWith('skill:') &&
      st.collectedSkills.includes(spot.id.slice('skill:'.length))
    ) {
      continue
    }
    const dx = spot.position[0] - camera.position.x
    const dy = spot.position[1] - camera.position.y
    const dz = spot.position[2] - camera.position.z
    const dist = Math.hypot(dx, dy, dz)
    if (dist > spot.radius) continue
    const cos = (_gazeDir.x * dx + _gazeDir.y * dy + _gazeDir.z * dz) / dist
    if (cos < GAZE_COS) continue
    const score = (1 - cos) * 10 + dist * 0.01
    if (score < bestScore) {
      bestScore = score
      best = spot.id
    }
  }
  if (best !== gazeRef.current) {
    gazeRef.current = best
    setGazeTarget(best)
  }
}

export default function WorldPlayer() {
  const { camera, gl } = useThree()
  const pos = useRef(new THREE.Vector3(0, EYE_HEIGHT, 6.5))
  const yaw = useRef(0)
  const pitch = useRef(0)
  const keys = useRef(new Set())
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const nearbyRef = useRef(null)
  const gazeRef = useRef(null)
  const prevSeated = useRef(false)
  const anim = useRef({ active: false, t: 0 })

  const setNearby = usePortfolioStore((s) => s.setNearby)
  const setGazeTarget = usePortfolioStore((s) => s.setGazeTarget)

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
      const seated = usePortfolioStore.getState().seated
      yaw.current -= dx * 0.0035
      pitch.current -= dy * 0.0035
      if (seated) {
        // Khi ngồi: nhìn quanh trong khoảng đủ với tới vật trên bàn
        // (khung ảnh 45°, cốc 44°, PC 38.5°) và màn hai xếp chồng
        // (tâm màn 44.4° ngửa lên) — đo từ ghế [0, 1.3, 1.9].
        yaw.current = Math.max(-1.0, Math.min(1.0, yaw.current))
        pitch.current = Math.max(-0.8, Math.min(0.8, pitch.current))
      } else {
        pitch.current = Math.max(-1.2, Math.min(1.2, pitch.current))
      }
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
    const seated = st.seated

    // --- Chuyển cảnh ngồi/đứng (0.8s, smoothstep) ---
    if (seated !== prevSeated.current) {
      prevSeated.current = seated
      const to = seated ? SEAT_POS : STAND_POS
      anim.current = {
        active: true,
        t: 0,
        fromPos: pos.current.clone(),
        fromYaw: yaw.current,
        fromPitch: pitch.current,
        fromY: camera.position.y,
        toPos: to,
        toYaw: 0,
        // Ngồi xuống đáp ở pitch 0.19 (~11°) = góc tới độ cao tâm màn
        // (tâm màn y = 1.90, mắt ghế y = 1.42) thay vì pitch 0 nhìn xuống
        // dưới mép màn; đứng dậy vẫn đáp pitch 0 như cũ.
        toPitch: seated ? 0.19 : 0,
        toY: to.y,
      }
    }
    if (anim.current.active) {
      const a = anim.current
      a.t += delta / 0.8
      const e =
        a.t >= 1 ? 1 : a.t * a.t * (3 - 2 * a.t)
      let yawDiff = (a.toYaw - a.fromYaw) % (Math.PI * 2)
      if (yawDiff > Math.PI) yawDiff -= Math.PI * 2
      if (yawDiff < -Math.PI) yawDiff += Math.PI * 2
      const cyaw = a.fromYaw + yawDiff * e
      const cpitch = THREE.MathUtils.lerp(a.fromPitch, a.toPitch, e)
      const cx = THREE.MathUtils.lerp(a.fromPos.x, a.toPos.x, e)
      const cz = THREE.MathUtils.lerp(a.fromPos.z, a.toPos.z, e)
      const cy = THREE.MathUtils.lerp(a.fromY, a.toY, e)
      const cp = Math.cos(cpitch)
      camera.position.set(cx, cy, cz)
      camera.lookAt(
        cx - Math.sin(cyaw) * cp,
        cy + Math.sin(cpitch),
        cz - Math.cos(cyaw) * cp,
      )
      if (a.t >= 1) {
        a.active = false
        pos.current.set(a.toPos.x, EYE_HEIGHT, a.toPos.z)
        yaw.current = a.toYaw
        pitch.current = a.toPitch
      }
      // Đang bay camera thì xóa pill gaze (tránh gợi ý cũ dí theo).
      if (gazeRef.current !== null) {
        gazeRef.current = null
        setGazeTarget(null)
      }
      return
    }

    // --- Đang ngồi: đứng yên, chỉ nhìn trong khoảng hẹp ---
    if (seated) {
      seatRef.lookYaw = yaw.current
      const cp = Math.cos(pitch.current)
      camera.position.set(SEAT_POS.x, SEAT_POS.y, SEAT_POS.z)
      camera.lookAt(
        SEAT_POS.x - Math.sin(yaw.current) * cp,
        SEAT_POS.y + Math.sin(pitch.current),
        SEAT_POS.z - Math.cos(yaw.current) * cp,
      )
      updateGaze(camera, true, gazeRef, setGazeTarget)
      return
    }

    // --- Đang đứng: di chuyển như trước ---
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
    // Đợt 2/4: kệ sách trái + cửa sổ phải — cùng luật đẩy theo trục
    // xuyên ít nhất. Hai hộp này rời hộp bàn (khe hở 0.25 và xa hẳn)
    // nên không gây giằng co khi đứng ở mép bàn.
    const EXTRA_BOXES = [
      { x: [-3.65, -3.15], z: [-1.2, 0.6] },
      { x: [6.35, 6.65], z: [-3.2, 2.2] },
    ]
    for (const box of EXTRA_BOXES) {
      if (
        pos.current.x > box.x[0] &&
        pos.current.x < box.x[1] &&
        pos.current.z > box.z[0] &&
        pos.current.z < box.z[1]
      ) {
        const nearLeft = pos.current.x - box.x[0] < box.x[1] - pos.current.x
        const nearBack = pos.current.z - box.z[0] < box.z[1] - pos.current.z
        const px = Math.min(
          pos.current.x - box.x[0],
          box.x[1] - pos.current.x,
        )
        const pz = Math.min(
          pos.current.z - box.z[0],
          box.z[1] - pos.current.z,
        )
        if (px < pz) {
          pos.current.x = nearLeft ? box.x[0] : box.x[1]
        } else {
          pos.current.z = nearBack ? box.z[0] : box.z[1]
        }
      }
    }

    // Đặt camera theo yaw/pitch. GĐ1: tính lookAt trực tiếp từ lượng
    // giác, thay vì cấp phát THREE.Vector3 mới mỗi frame.
    const cp = Math.cos(pitch.current)
    camera.position.set(pos.current.x, EYE_HEIGHT, pos.current.z)
    camera.lookAt(
      pos.current.x - Math.sin(yaw.current) * cp,
      EYE_HEIGHT + Math.sin(pitch.current),
      pos.current.z - Math.cos(yaw.current) * cp,
    )

    // Gaze: vật đang nhìn (chỉ tính khi không bay camera).
    updateGaze(camera, false, gazeRef, setGazeTarget)

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
