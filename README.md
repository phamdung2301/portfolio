# Portfolio 3D — Phạm Hà Đắc Dũng

Portfolio cá nhân 2 chế độ trong một trang: **chế độ cuộn** (scroll storytelling kiểu editorial trên nền cảnh 3D) và **Thế giới tự do** (world mode — đi lại trong góc làm việc 3D, tương tác bằng ánh nhìn, ngồi vào máy tính, gõ terminal, thu thập 7 hành tinh kỹ năng, chơi minigame).

Truy cập: https://portfolio-one-rust-99.vercel.app/

## Công nghệ

- **React 19** + **Vite 7** — SPA, không router (một trang duy nhất)
- **React Three Fiber** + **drei** + **three.js** — cảnh 3D, camera, ánh sáng
- **Zustand** — store dùng chung giữa lớp 2D và lớp 3D
- **Framer Motion** — animation UI
- **Tailwind CSS v4** — token thiết kế trong `src/index.css` (`@theme`)
- Không TypeScript, không backend, không CMS — toàn bộ là JSX + dữ liệu tĩnh

## Chạy dự án

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
npm run preview  # xem thử bản build
npm run lint     # ESLint (flat config)
npm run format   # Prettier (chỉ format file vi phạm, xem .prettierignore)
```

Yêu cầu trình duyệt hỗ trợ WebGL2. Canvas 3D dùng `PerformanceMonitor` + `AdaptiveDpr` để tự hạ DPR khi FPS thấp.

## Cấu trúc chính

```
src/
├── App.jsx                  # root: ErrorBoundary → Canvas (z-0) + Overlay/WorldHUD
├── data/
│   ├── portfolio.js         # ⭐ NGUỒN DỮ LIỆU DUY NHẤT — sửa nội dung ở đây
│   └── assets.js            # ảnh chân dung + QR Zalo (base64, chunk riêng)
├── store/usePortfolio.js    # Zustand: worldMode, seated, gazeTarget, ...
├── hooks/                   # useScrollState (scroll ngoài React), useProfileAssets
└── components/
    ├── Scene.jsx            # Canvas: ánh sáng, fog, beam, dust, camera rig
    ├── scene/
    │   ├── Workspace.jsx    # diorama góc làm việc (~20 vật thể)
    │   ├── ScreenDisplay.jsx# màn hình chính vẽ bằng canvas 2D (cozy/IDE/terminal/game)
    │   ├── SkillCluster.jsx # 7 hành tinh kỹ năng
    │   ├── WorldLevel.jsx   # sàn + bệ dự án + trụ liên hệ (world mode)
    │   ├── WorldPlayer.jsx  # điều khiển người chơi: WASD + kéo chuột nhìn
    │   └── choreography.js  # mood ánh sáng theo từng section
    ├── world/               # interactables (toạ độ), actions (logic tương tác), input
    └── ui/                  # Overlay 2D + WorldHUD + dialog (terminal, máy tính, card)
```

## Sửa nội dung

Mọi nội dung (tên, mô tả, kỹ năng, dự án, kinh nghiệm, liên hệ, **toạ độ 3D của kỹ năng**) nằm trong `src/data/portfolio.js` — file này dùng chung cho UI 2D và cảnh 3D nên sửa một chỗ, cả hai lớp tự khớp. Copy UI ngắn ("Xem dự án", "Cuộn để khám phá"...) nằm trong từng component dưới `src/components/ui/`.

Ảnh chân dung + QR Zalo là base64 trong `src/data/assets.js` (giữ nguyên UTF-8 để deploy một bước). Muốn đổi thành file thật: đặt file vào `public/`, sửa `hooks/useProfileAssets.js` trả về đường dẫn thay vì import module.

## Điều khiển Thế giới tự do

- Vào world: nút **"Vào thế giới 3D"** ở Hero, hoặc bấm trực tiếp màn hình máy tính trong cảnh
- Di chuyển: **WASD / phím mũi tên**, **Shift** chạy nhanh; cảm ứng có joystick
- Nhìn: **kéo chuột** trên canvas (kéo nửa màn hình trên cảm ứng)
- Tương tác: nhìn vào vật rồi bấm **E** (hoặc chạm pill ở gần); **Esc** thoát từng lớp tới khi ra khỏi world
- Trong máy tính (ngồi ở ghế): 5 tab — Terminal, Code, Dự án, Liên hệ, Game (phím 1–5)

## Ghi chú kỹ thuật

- **Chunk 3D** (three/r3f) và **chunk world** (HUD + WorldPlayer + dialog) tách riêng — chỉ tải khi cần; ảnh + QR cũng là chunk riêng preload khi vào world
- Vòng lặp `useFrame` không cấp phát object mỗi frame (scratch `THREE.Color`/`Vector3` dùng lại) — giữ nhịp GC sạch
- `choreography.js` quy định mood ánh sáng mỗi section; hành tinh kỹ năng + toạ độ tương tác đọc từ `SKILLS`, tự đồng bộ khi đổi data
- LinkedIn / X trong `PROFILE.socials` hiện vẫn là link placeholder (trang chủ chung) — cần thay bằng URL profile thật khi có; ảnh dự án (`image: null`) chưa có screenshot thật, UI hiển thị cover gradient thay thế
