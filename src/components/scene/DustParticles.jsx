import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * S3 — atmosphere, phiên bản rẻ và an toàn.
 *
 * KHÔNG dùng post-processing Bloom: Bloom cần thêm dependency
 * (@react-three/postprocessing), tăng bundle và tốn fill-rate trên
 * mobile — đổi lại chỉ là "sáng hơn". Một đám bụi hạt đã cho cảm giác
 * chiều sâu + không khí của cảnh với chi phí gần bằng 0: 350 điểm,
 * 1 draw call, không shadow, không texture.
 *
 * Vị trí sinh bằng PRNG có seed cố định (mulberry32) để mỗi lần render
 * ra cùng một đám bụi — không nhấp nháy khi component re-render.
 * Dưới prefers-reduced-motion: hạt đứng yên (vẫn có không khí, không
 * có chuyển động).
 */
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const COUNT = 350

export default function DustParticles() {
  const group = useRef(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const geometry = useMemo(() => {
    const rand = mulberry32(20261027)
    const positions = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (rand() - 0.5) * 14 // x: -7..7
      positions[i * 3 + 1] = -1 + rand() * 6 // y: -1..5
      positions[i * 3 + 2] = -4 + rand() * 6 // z: -4..2
    }
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geom
  }, [])

  useFrame((state) => {
    if (reducedMotion || !group.current) return
    // Một driver duy nhất: xoay chậm toàn đám, 0.02 rad/s.
    group.current.rotation.y = state.clock.elapsedTime * 0.02
  })

  return (
    <group ref={group}>
      <points geometry={geometry}>
        <pointsMaterial
          color="#45d8f0"
          size={0.04}
          sizeAttenuation
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
