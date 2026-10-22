import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { SKILLS } from '../../data/portfolio.js'
import { scrollState } from '../../hooks/useScrollState.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'

/**
 * Cụm vật thể đại diện cho các kỹ năng.
 *
 * Tương tác:
 *  - hover  -> phóng to (damp), đổi màu phát sáng, đổi con trỏ chuột,
 *              đồng bộ `hoveredSkill` vào store để UI 2D hiện tooltip
 *  - click  -> đưa section "skills" vào trạng thái active
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

    // Scale mượt khi hover
    const targetScale = hovered ? 1.35 : 1
    const s = THREE.MathUtils.damp(mesh.scale.x, targetScale, 8, delta)
    mesh.scale.setScalar(s)

    // Màu phát sáng mượt
    const targetColor = hovered ? hotColor : dimColor
    mesh.material.color.lerp(targetColor, 1 - Math.exp(-8 * delta))
    mesh.material.emissive.lerp(baseColor, 1 - Math.exp(-6 * delta))
    mesh.material.emissiveIntensity = THREE.MathUtils.damp(
      mesh.material.emissiveIntensity,
      hovered ? 1.5 : 0.45,
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
