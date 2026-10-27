import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { SKILLS } from '../../data/portfolio.js'
import { scrollState } from '../../hooks/useScrollState.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'
import { getSceneState } from './choreography.js'

/**
 * Cụm vật thể đại diện cho các kỹ năng.
 *
 * Tương tác:
 *  - hover  -> phóng to (damp), đổi màu phát sáng, đổi con trỏ chuột,
 *              đồng bộ `hoveredSkill` vào store để UI 2D hiện tooltip
 *  - click  -> đưa section "skills" vào trạng thái active
 *  - F5: orb cũng sáng khi được CHỌN TỪ UI (thẻ kỹ năng focus/bấm/chạm
 *    ghi `hoveredSkill` vào store) — đường đi ngược lại cho bàn phím
 *    và cảm ứng, vì mesh 3D không bao giờ nhận được focus bàn phím.
 *
 * Mọi chuyển động đều dùng `MathUtils.damp` nên độc lập framerate,
 * không bị giật khi tỷ lệ khung hình thay đổi.
 */
export default function SkillCluster() {
  const group = useRef(null)

  useFrame((state, delta) => {
    if (!group.current) return
    const t = scrollState.smoothed
    // Cụm skill trôi lên nhẹ và xoay chậm theo scroll
    group.current.position.y = THREE.MathUtils.damp(
      group.current.position.y,
      Math.sin(t * Math.PI * 2) * 0.22,
      3,
      delta,
    )
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      t * Math.PI * 0.9 - 0.35,
      3,
      delta,
    )
  })

  return (
    <group ref={group} position={[0, 0, 0]}>
      {SKILLS.map((skill, i) => (
        <SkillOrb key={skill.id} skill={skill} index={i} />
      ))}
    </group>
  )
}

/** Chọn geometry theo `shape` trong dữ liệu. */
function SkillGeometry({ shape, size }) {
  switch (shape) {
    case 'sphere':
      return <sphereGeometry args={[size, 24, 24]} />
    case 'tetra':
      return <tetrahedronGeometry args={[size * 1.25, 0]} />
    case 'octa':
      return <octahedronGeometry args={[size * 1.25, 0]} />
    case 'icosa':
      return <icosahedronGeometry args={[size * 1.15, 0]} />
    case 'box':
    default:
      return <boxGeometry args={[size * 1.7, size * 1.7, size * 1.7]} />
  }
}

function SkillOrb({ skill, index }) {
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
      <SkillGeometry shape={skill.shape} size={skill.size} />
      <meshStandardMaterial
        color={dimColor}
        emissive={baseColor}
        emissiveIntensity={0.45}
        roughness={0.25}
        metalness={0.5}
        transparent
        opacity={0.95}
      />
    </mesh>
  )
}
