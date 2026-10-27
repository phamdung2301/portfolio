import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Grid, RoundedBox } from '@react-three/drei'
import { PROJECTS } from '../../data/portfolio.js'
import { CONTACT_SPOT, PROJECT_SPOTS } from '../world/interactables.js'
import { copyWorldEmail, interactWith } from '../world/actions.js'

/**
 * S2 — mặt bằng của Thế giới tự do. Chỉ mount khi worldMode bật
 * (xem SceneContent), nên không làm rối cảnh diorama ở chế độ cuộn.
 *  - Sàn tròn + lưới Grid mờ dần ở xa (drei Grid, không thêm dependency).
 *  - 3 bệ dự án đặt theo PROJECT_SPOTS (cùng tọa độ với proximity).
 *  - 1 trụ liên hệ (hộp thư phát sáng) tại CONTACT_SPOT.
 * Click trực tiếp lên bệ/trụ cũng chạy cùng logic với phím E (actions.js).
 */
export default function WorldLevel() {
  return (
    <group>
      {/* Sàn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[11, 48]} />
        <meshStandardMaterial color="#0a0a13" roughness={1} metalness={0} />
      </mesh>
      <Grid
        position={[0, 0.02, 0]}
        args={[22, 22]}
        cellSize={0.8}
        cellThickness={0.6}
        cellColor="#1e2a3a"
        sectionSize={4}
        sectionThickness={1.1}
        sectionColor="#2a3f5f"
        fadeDistance={20}
        fadeStrength={1}
      />

      {PROJECT_SPOTS.map((spot) => {
        const project = PROJECTS.find((p) => p.id === spot.projectId)
        return (
          <ProjectPedestal
            key={spot.id}
            position={spot.position}
            accent={project ? project.accent : '#45d8f0'}
            onInteract={() => interactWith(spot.id)}
          />
        )
      })}

      <ContactPillar
        position={CONTACT_SPOT.position}
        onInteract={() => copyWorldEmail()}
      />
    </group>
  )
}

function ProjectPedestal({ position, accent, onInteract }) {
  const diamond = useRef(null)
  useFrame((state) => {
    if (!diamond.current) return
    diamond.current.rotation.y = state.clock.elapsedTime * 0.8
    // Local y (group đã ở position[1]): 0.9 + dao động, không cộng
    // thêm position[1] lần nữa.
    diamond.current.position.y =
      0.9 + Math.sin(state.clock.elapsedTime * 1.4) * 0.08
  })
  return (
    <group position={position}>
      <RoundedBox
        args={[1.6, 1.0, 0.5]}
        radius={0.06}
        smoothness={3}
        position={[0, 0.5, 0]}
        castShadow
        onClick={(e) => {
          e.stopPropagation()
          onInteract()
        }}
      >
        <meshStandardMaterial color="#14141f" roughness={0.6} metalness={0.3} />
      </RoundedBox>
      {/* Tấm accent phía trước bệ */}
      <mesh position={[0, 0.5, 0.26]} onClick={(e) => {
        e.stopPropagation()
        onInteract()
      }}>
        <planeGeometry args={[1.4, 0.8]} />
        <meshBasicMaterial color={accent} transparent opacity={0.25} />
      </mesh>
      {/* Kim cương xoay phía trên bệ — dấu hiệu "bấm được" */}
      <mesh ref={diamond} position={[0, 0.9, 0]}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.2}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}

function ContactPillar({ position, onInteract }) {
  const orb = useRef(null)
  useFrame((state) => {
    if (!orb.current) return
    // Local y, cùng lý do như diamond ở trên.
    orb.current.position.y =
      0.9 + Math.sin(state.clock.elapsedTime * 1.8) * 0.1
  })
  return (
    <group position={position}>
      <RoundedBox
        args={[0.9, 1.0, 0.9]}
        radius={0.06}
        smoothness={3}
        position={[0, 0.5, 0]}
        castShadow
        onClick={(e) => {
          e.stopPropagation()
          onInteract()
        }}
      >
        <meshStandardMaterial color="#14141f" roughness={0.6} metalness={0.3} />
      </RoundedBox>
      <mesh
        ref={orb}
        position={[0, 0.9, 0]}
        onClick={(e) => {
          e.stopPropagation()
          onInteract()
        }}
      >
        <sphereGeometry args={[0.22, 20, 20]} />
        <meshStandardMaterial
          color="#45d8f0"
          emissive="#45d8f0"
          emissiveIntensity={1.4}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}
