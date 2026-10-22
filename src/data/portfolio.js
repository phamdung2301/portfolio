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
  email: 'phamhadacdung2301@gmai.com',
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
 * Mỗi skill có `position` (toạ độ trong không gian 3D) và `accent` (màu nhấn).
 * `size` quyết định bán kính khối hình học.
 */
export const SKILLS = [
  {
    id: 'react',
    name: 'React',
    level: 95,
    accent: '#45d8f0',
    position: [-2.35, 1.55, 0.2],
    size: 0.42,
    shape: 'box',
  },
  {
    id: 'three',
    name: 'Three.js',
    level: 90,
    accent: '#b39bff',
    position: [-1.1, 2.25, -0.35],
    size: 0.36,
    shape: 'sphere',
  },
  {
    id: 'tailwind',
    name: 'Tailwind',
    level: 92,
    accent: '#5eead4',
    position: [0.35, 1.75, 0.45],
    size: 0.34,
    shape: 'tetra',
  },
  {
    id: 'motion',
    name: 'Framer Motion',
    level: 88,
    accent: '#f9a8d4',
    position: [1.7, 2.45, -0.2],
    size: 0.33,
    shape: 'octa',
  },
  {
    id: 'webgl',
    name: 'WebGL / GLSL',
    level: 86,
    accent: '#fcd34d',
    position: [2.45, 1.35, 0.3],
    size: 0.38,
    shape: 'icosa',
  },
  {
    id: 'node',
    name: 'Node.js',
    level: 82,
    accent: '#86efac',
    position: [0.15, 2.75, -0.6],
    size: 0.3,
    shape: 'box',
  },
  {
    id: 'figma',
    name: 'Figma',
    level: 80,
    accent: '#fb923c',
    position: [-1.85, 2.9, -0.15],
    size: 0.31,
    shape: 'octa',
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
