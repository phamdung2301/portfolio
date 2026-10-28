import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { SKILLS } from '../../data/portfolio.js'
import { scrollState } from '../../hooks/useScrollState.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'
import { getSceneState } from './choreography.js'

/**
 * Cụm HÀNH TINH đại diện cho các kỹ năng (thay cho khối hình học cũ).
 *
 * Ánh xạ theo cấp độ = kích thước, màu giữ nguyên accent của kỹ năng
 * để vẫn nhận ra theo màu cũ; `shape` trong data không còn dùng:
 *  - React (95) → Sao Mộc (sọc vân khí), Tailwind (92) → Sao Thổ (vành),
 *  - Three.js (90) → Sao Hải Vương, Framer Motion (88) → Sao Thiên Vương,
 *  - WebGL (86) → Trái Đất, Node.js (82) → Sao Kim, Figma (80) → Sao Thủy.
 *  Bốn hành tinh khí có texture sọc vẽ bằng canvas (không ảnh ngoài).
 *
 * Vị trí: vành cung cao sau bàn (tâm [0, 3.6, -1.0], bán kính 3.2,
 * y ≥ 3.38, z ≤ -2.09) lưu trong `SKILLS.position` nên spot thu thập
 * trong interactables.js tự khớp theo. Từ ghế (mắt y = 1.42), hành tinh
 * thấp nhất vẫn nằm trên mép trên màn hình (đã tính tia nhìn: điểm
 * thấp nhất của vành cắt mặt phẳng màn ở y = 2.56 > mép trên 2.435)
 * nên không che màn, bàn phím hay đồ trên bàn. Trong world mode nhóm
 * ở tư thế trung tính nên đảm bảo này đứng vững; ở chế độ cuộn nhóm
 * vẫn xoay theo scroll như cụm cũ (hành tinh là nền trang trí).
 *
 * Tương tác giữ nguyên như cũ:
 *  - hover  -> phóng to (damp), đổi màu phát sáng, đổi con trỏ chuột,
 *              đồng bộ `hoveredSkill` vào store để UI 2D hiện tooltip
 *  - click  -> đưa section "skills" vào trạng thái active (cuộn) hoặc
 *              thu thập (world)
 *  - F5: hành tinh cũng sáng khi được CHỌN TỪ UI (thẻ kỹ năng
 *    focus/bấm/chạm ghi `hoveredSkill` vào store) — đường đi ngược
 *    lại cho bàn phím và cảm ứng, vì mesh 3D không bao giờ nhận được
 *    focus bàn phím.
 *
 * Mọi chuyển động đều dùng `MathUtils.damp` nên độc lập framerate,
 * không bị giật khi tỷ lệ khung hình thay đổi.
 */
export default function SkillCluster() {
  const group = useRef(null)
  const worldMode = usePortfolioStore((s) => s.worldMode)
  // S2: orb đã thu thập thì biến mất khỏi cảnh.
  const collectedSkills = usePortfolioStore((s) => s.collectedSkills)

  useFrame((state, delta) => {
    if (!group.current) return
    const t = scrollState.smoothed
    // S2: ở world mode, cụm về tư thế trung tính để tọa độ orb khớp
    // với interactables.js (tính proximity theo data).
    const targetY = worldMode ? 0 : Math.sin(t * Math.PI * 2) * 0.22
    const targetRotY = worldMode ? 0 : t * Math.PI * 0.9 - 0.35
    group.current.position.y = THREE.MathUtils.damp(
      group.current.position.y,
      targetY,
      3,
      delta,
    )
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      targetRotY,
      3,
      delta,
    )
  })

  return (
    <group ref={group} position={[0, 0, 0]}>
      {SKILLS.filter((s) => !collectedSkills.includes(s.id)).map(
        (skill, i) => (
          <PlanetOrb key={skill.id} skill={skill} index={i} />
        ),
      )}
    </group>
  )
}

/** Hành tinh khí có sọc vân; hành tinh đá chỉ dùng màu đặc. */
const GAS_PLANETS = new Set(['react', 'three', 'tailwind', 'motion'])

/** Texture sọc ngang vẽ bằng canvas: nền accent + dải tối/sáng xen kẽ. */
function bandTexture(accent) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, 256, 128)
  const bands = [18, 10, 26, 12, 22, 14, 26]
  let y = 0
  bands.forEach((h, i) => {
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.12)'
    ctx.fillRect(0, y, 256, h)
    y += h
  })
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function PlanetOrb({ skill, index }) {
  const meshRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const setHoveredSkill = usePortfolioStore((s) => s.setHoveredSkill)
  const setActiveSection = usePortfolioStore((s) => s.setActiveSection)
  // F5: orb sáng khi ĐƯỢC CHỌN TỪ UI (focus/bấm/chạm thẻ kỹ năng) chứ
  // không chỉ khi chuột hover trực tiếp lên mesh. Selector trả boolean
  // nên chỉ orb tương ứng re-render khi hoveredSkill đổi.
  const selectedFromUI = usePortfolioStore((s) => s.hoveredSkill === skill.id)
  const active = hovered || selectedFromUI

  // Con trỏ chuột đổi sang pointer khi hover
  useCursor(hovered, 'pointer', 'auto')

  // Hành tinh khí có texture sọc; thu nhỏ 25% so với khối cũ (size × 0.75)
  // để vành cung không lấn không gian bàn.
  const planetSize = skill.size * 0.75
  const bands = useMemo(
    () => (GAS_PLANETS.has(skill.id) ? bandTexture(skill.accent) : null),
    [skill.id, skill.accent],
  )
  useEffect(
    () => () => {
      bands?.dispose()
    },
    [bands],
  )

  // Màu gốc và màu khi hover
  const baseColor = useMemo(() => new THREE.Color(skill.accent), [skill.accent])
  const dimColor = useMemo(
    () => new THREE.Color(skill.accent).multiplyScalar(0.45),
    [skill.accent],
  )
  const hotColor = useMemo(
    () => new THREE.Color(skill.accent).lerp(new THREE.Color('#ffffff'), 0.55),
    [skill.accent],
  )

  useFrame((state, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    const time = state.clock.elapsedTime
    // Lơ lửng + xoay riêng (phase lệch nhau để cụm không chuyển động đồng pha)
    mesh.position.y = skill.position[1] + Math.sin(time * 0.9 + index) * 0.12
    mesh.rotation.x = time * 0.35 + index
    mesh.rotation.y = time * 0.5 + index * 0.6

    // Scale mượt khi hover hoặc được chọn từ UI (F5: active)
    const targetScale = active ? 1.35 : 1
    const s = THREE.MathUtils.damp(mesh.scale.x, targetScale, 8, delta)
    mesh.scale.setScalar(s)

    // Màu phát sáng mượt
    const targetColor = active ? hotColor : dimColor
    mesh.material.color.lerp(targetColor, 1 - Math.exp(-8 * delta))
    mesh.material.emissive.lerp(baseColor, 1 - Math.exp(-6 * delta))
    // S1: ở section skills, toàn cụm sáng lên (0.45 -> 1.0); ở các
    // section khác cụm lùi về nền để không tranh spotlight với nội dung.
    const sceneState = getSceneState(scrollState.smoothed)
    mesh.material.emissiveIntensity = THREE.MathUtils.damp(
      mesh.material.emissiveIntensity,
      active ? 1.5 : 0.45 + sceneState.orbBoost * 0.55,
      8,
      delta,
    )
  })

  const handleOver = (e) => {
    e.stopPropagation()
    setHovered(true)
    setHoveredSkill(skill.id)
  }

  const handleOut = (e) => {
    e.stopPropagation()
    setHovered(false)
    setHoveredSkill(null)
  }

  const handleClick = (e) => {
    e.stopPropagation()
    // S2: trong world, bấm orb = thu thập, không cuộn trang.
    if (usePortfolioStore.getState().worldMode) {
      const st = usePortfolioStore.getState()
      if (!st.collectedSkills.includes(skill.id)) {
        st.collectSkill(skill.id)
        const total = usePortfolioStore.getState().collectedSkills.length
        st.setWorldToast(`Đã thu thập: ${skill.name} (${total}/7)`)
      }
      return
    }
    setActiveSection('skills')
    // S1 fix: trước đây click chỉ đổi state mà trang không cuộn,
    // nên nhìn như không có gì xảy ra. Giờ cuộn thật tới section.
    document
      .getElementById('skills')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // F5: cuộn xong thì focus rơi vào thẻ tương ứng (điểm đến có thật
    // cho bàn phím/trình đọc màn hình, thay vì focus kẹt ở Canvas).
    // preventScroll để focus không tranh cuộn với scrollIntoView.
    setTimeout(() => {
      document
        .getElementById(`skill-${skill.id}`)
        ?.focus({ preventScroll: true })
    }, 700)
  }

  return (
    <mesh
      ref={meshRef}
      position={[skill.position[0], skill.position[1], skill.position[2]]}
      castShadow
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[planetSize, 32, 32]} />
      <meshStandardMaterial
        map={bands}
        color={dimColor}
        emissive={baseColor}
        emissiveIntensity={0.45}
        roughness={0.25}
        metalness={0.5}
        transparent
        opacity={0.95}
      />
      {/* Vành Sao Thổ: con của mesh nên phóng to/thu nhỏ cùng hành tinh
          khi hover; nghiêng nhẹ cho giống nhìn góc chéo. */}
      {skill.id === 'tailwind' && (
        <mesh rotation={[-1.15, 0, 0.2]}>
          <ringGeometry args={[planetSize * 1.15, planetSize * 1.75, 40]} />
          <meshBasicMaterial
            color={skill.accent}
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
    </mesh>
  )
}
