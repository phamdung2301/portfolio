import { Environment, Lightformer, ContactShadows } from '@react-three/drei'
import { Grid } from '@react-three/drei'

/**
 * Môi trường ánh sáng + sàn lưới.
 *
 * `Environment` dùng `children` + `Lightformer` nên KHÔNG tải file HDR qua mạng
 * (an toàn khi chạy offline) — ánh sáng được dựng bằng cube camera ở `frames={1}`.
 */
export default function SceneEnvironment() {
  return (
    <>
      <Environment resolution={128} frames={1}>
        {/* Key light dạng plane ở phía trên */}
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#ffffff"
          position={[0, 5, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[10, 10, 1]}
        />
        {/* Fill light xanh từ trái */}
        <Lightformer
          form="circle"
          intensity={1.6}
          color="#45d8f0"
          position={[-5, 1.5, -2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[6, 6, 1]}
        />
        {/* Rim light tím từ phải sau */}
        <Lightformer
          form="ring"
          intensity={2.2}
          color="#8a63ff"
          position={[5, 2.5, -3]}
          rotation={[0, -Math.PI / 3, 0]}
          scale={[5, 5, 1]}
        />
        {/* Ánh sáng phản chiếu nhẹ từ dưới */}
        <Lightformer
          form="rect"
          intensity={0.7}
          color="#1b1b27"
          position={[0, -3, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[8, 8, 1]}
        />
      </Environment>

      {/* Sàn lưới — dùng shader, rẻ hơn nhiều so với nhiều mesh */}
      <Grid
        position={[0, -0.02, 0]}
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2a2a3a"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#45d8f0"
        fadeDistance={22}
        fadeStrength={1.6}
        infiniteGrid
        followCamera={false}
      />

      {/* Bóng đổ mềm dưới vật thể — rẻ hơn shadow map toàn cảnh */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.55}
        scale={16}
        blur={2.6}
        far={7}
        resolution={512}
        frames={1}
        color="#000000"
      />
    </>
  )
}
