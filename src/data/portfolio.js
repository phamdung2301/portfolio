/**
 * Dữ liệu tĩnh của portfolio.
 * Dùng chung cho UI 2D (danh sách skill, project) và Canvas 3D (vị trí vật thể),
 * đảm bảo 2 lớp luôn hiển thị cùng nội dung.
 */

export const SECTIONS = [
  { id: 'hero', label: 'Trang chủ' },
  { id: 'about', label: 'Giới thiệu' },
  { id: 'skills', label: 'Kỹ năng' },
  { id: 'projects', label: 'Dự án' },
  { id: 'contact', label: 'Liên hệ' },
]

export const PROFILE = {
  name: 'Phạm Hà Đắc Dũng',
  role: 'Full Stack Web Developer',
  tagline:
    'Tôi xây dựng giao diện web 3D tương tác, nơi trải nghiệm người dùng và hiệu năng luôn đi cùng nhau.',
  location: 'Đà Nẵng, Việt Nam',
  email: 'phamhadacdung2301@gmail.com',
  // S2 (ghế + card visit): số điện thoại, trạng thái và ảnh chân dung do
  // chính user cung cấp ngày 2026-10-27 để công khai trên card visit.
  // QR Zalo mã hóa link zalo.me theo số điện thoại này.
  phone: '0366542301',
  statusLine: 'direct to work',
  // GĐ1: ảnh chân dung + QR Zalo (~288KB base64) không còn nhúng vào
  // PROFILE — tải trễ qua hooks/useProfileAssets.js để khỏi nằm trong
  // bundle chính. PhotoCard và SeatedComputer tự lấy qua hook đó.
  zaloUrl: 'https://zalo.me/0366542301',
  socials: [
    { label: 'GitHub', href: 'https://github.com/phamdung2301' },
    { label: 'LinkedIn', href: 'https://linkedin.com' },
    { label: 'Twitter / X', href: 'https://x.com' },
  ],
}

export const ABOUT = [
  'Tôi là một kỹ sư lập trình web full stack tập trung vào trải nghiệm 3D trên web. Công việc của tôi là đưa các ý tưởng thiết kế số thành trải nghiệm có thể chạm, xoay và cảm nhận được ngay trong trình duyệt.',
  'Tôi làm việc với React, Three.js và các thư viện animation hiện đại, luôn đặt trải nghiệm người dùng trên thiết bị di động lên hàng đầu — mọi cảnh đều được kiểm soát chất lượng hình ảnh theo FPS thực tế.',
  'Ngoài giờ làm việc, tôi viết blog về kỹ thuật render, đóng góp cho các thư viện mã nguồn mở và xây những mô hình 3D procedural cho portfolio của bản thân.',
]

/**
 * Mỗi skill có `position` (toạ độ trên vành cung hành tinh trong không
 * gian 3D), `accent` (màu nhấn — dùng cho cả hành tinh 3D và thẻ UI),
 * `level` (mức độ, quyết định kích thước tương đối) và `size` (bán kính
 * hành tinh). GĐ1: bỏ `shape` — cụm khối hình học cũ đã thay bằng hành
 * tinh, không còn ai đọc trường này.
 */
export const SKILLS = [
  {
    id: 'react',
    name: 'React',
    level: 95,
    accent: '#45d8f0',
    position: [-3.01, 3.6, -2.09],
    size: 0.42,
  },
  {
    id: 'three',
    name: 'Three.js',
    level: 90,
    accent: '#b39bff',
    position: [-2.33, 3.82, -3.2],
    size: 0.36,
  },
  {
    id: 'tailwind',
    name: 'Tailwind',
    level: 92,
    accent: '#5eead4',
    position: [-1.27, 3.38, -3.94],
    size: 0.34,
  },
  {
    id: 'motion',
    name: 'Framer Motion',
    level: 88,
    accent: '#f9a8d4',
    position: [0, 3.6, -4.2],
    size: 0.33,
  },
  {
    id: 'webgl',
    name: 'WebGL / GLSL',
    level: 86,
    accent: '#fcd34d',
    position: [1.27, 3.81, -3.94],
    size: 0.38,
  },
  {
    id: 'node',
    name: 'Node.js',
    level: 82,
    accent: '#86efac',
    position: [2.33, 3.38, -3.2],
    size: 0.3,
  },
  {
    id: 'figma',
    name: 'Figma',
    level: 80,
    accent: '#fb923c',
    position: [3.01, 3.61, -2.09],
    size: 0.31,
  },
]

export const PROJECTS = [
  {
    id: 'atlas',
    title: 'Atlas 3D Configurator',
    year: '2025',
    description:
      'Trình cấu hình sản phẩm 3D thời gian thực, dựng PBR mesh từ GLB, LOD tự động theo thiết bị và trì hoãn bóng đổ để giữ 60 FPS trên mobile.',
    stack: ['React', 'Three.js', 'Draco', 'KTX2'],
    accent: '#45d8f0',
    demoLink: 'https://atlas-3d-configurator.vercel.app',
    // F4: categories dùng cho filter. image = null nghĩa là chưa có
    // screenshot thật — UI sẽ vẽ cover gradient thay thế, KHÔNG giả
    // vờ đó là ảnh chụp màn hình. Khi có ảnh thật, đặt đường dẫn vào
    // đây (vd. '/projects/atlas.jpg' trong public/) là preview + sheet
    // tự dùng ảnh đó, không cần sửa component.
    categories: ['WebGL'],
    image: null,
    detail: {
      challenge:
        'Cần một trình cấu hình sản phẩm 3D chạy thời gian thực trong trình duyệt mà vẫn mượt trên mobile.',
      approach:
        'Dựng mesh PBR từ file GLB, LOD tự động theo thiết bị, trì hoãn bóng đổ để giữ khung hình ổn định.',
      outcomeNote:
        'Mục tiêu thiết kế (theo mô tả gốc): 60 FPS trên mobile. Đây chưa phải số đo benchmark thực tế — cần đo trước khi ghi thành kết quả.',
    },
  },
  {
    id: 'nebula',
    title: 'Nebula Scroll Story',
    year: '2024',
    description:
      'Landing page kể chuyện bằng scroll-driven animation: camera di chuyển theo trục cuộn, shader nền dạng nebula và chuyển cảnh mượt mà.',
    stack: ['R3F', 'GLSL', 'Framer Motion'],
    accent: '#b39bff',
    demoLink: 'https://nebula-scroll-story.vercel.app',
    categories: ['WebGL', 'Motion'],
    image: null,
    detail: {
      challenge:
        'Kể một câu chuyện bằng scroll: camera phải di chuyển theo trục cuộn, nền shader nebula, chuyển cảnh không bị giật.',
      approach:
        'Camera scrub theo scroll, shader nền dạng nebula, chuyển cảnh mượt bằng R3F/GLSL + Framer Motion.',
      outcomeNote:
        'Đây là mô tả kỹ thuật của dự án, không phải số đo hiệu năng đã benchmark.',
    },
  },
  {
    id: 'atlas-ui',
    title: 'Meridian Design System',
    year: '2024',
    description:
      'Design system dùng chung cho 6 sản phẩm nội bộ: token sắc màu, component a11y và tài liệu tương tác sinh tự động từ TypeScript.',
    stack: ['TypeScript', 'Tailwind', 'Radix'],
    accent: '#5eead4',
    demoLink: 'https://meridian-design-system.vercel.app',
    categories: ['Design System'],
    image: null,
    detail: {
      challenge:
        'Một design system dùng chung cho 6 sản phẩm nội bộ: token, component và tài liệu phải nhất quán với nhau.',
      approach:
        'Token màu dùng chung, component đạt chuẩn a11y, tài liệu tương tác sinh tự động từ TypeScript.',
      outcomeNote:
        'Phạm vi (theo mô tả gốc): 6 sản phẩm nội bộ dùng chung.',
    },
  },
]

export const EXPERIENCE = [
  {
    role: 'Full Stack Web Developer',
    company: 'Freelance',
    period: '2023 — hiện tại',
  },
  { role: 'Backend Engineer', company: 'Freelance', period: '2021 — 2023' },
  { role: 'Web Designer', company: 'Freelance', period: '2019 — 2021' },
]
