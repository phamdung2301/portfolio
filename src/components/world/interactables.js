import { PROJECTS, SKILLS } from '../../data/portfolio.js'

/**
 * S2 — định nghĩa vật thể tương tác trong Thế giới tự do.
 * Một file duy nhất làm source of truth cho cả WorldPlayer (tính khoảng
 * cách) và WorldLevel (vẽ vật thể), để vị trí không lệch nhau.
 *
 * Lưu ý về tư thế: khi vào world mode, Workspace và SkillCluster được
 * đưa về tư thế trung tính (không xoay theo scroll nữa), nên tọa độ
 * dưới đây khớp với vị trí thật trong cảnh. Bán kính hào phóng để bù
 * độ lơ lửng ±0.12 của orb và sai số khi di chuyển.
 */
export const MONITOR_SPOT = {
  id: 'monitor',
  label: 'Màn hình — Mở terminal',
  position: [0, 2.0, -0.5],
  radius: 3.4,
}

export const CONTACT_SPOT = {
  id: 'contact',
  label: 'Hộp thư — Sao chép email',
  position: [5.8, 1.0, 1.5],
  radius: 2.6,
}

/**
 * S2 (ghế): ghế ở [0, 0, 1.9] — ngoài hộp va chạm bàn (z ±1.6) nên
 * người chơi đi tới được. Tâm proximity lấy ở mặt ngồi (y 0.9).
 */
export const CHAIR_SPOT = {
  id: 'chair',
  label: 'Ghế — Ngồi xuống',
  position: [0, 0.9, 1.9],
  radius: 2.2,
}

export const PROJECT_SPOTS = [
  { id: 'project:atlas', projectId: 'atlas', position: [-5.5, 1.2, -2.5], radius: 2.6 },
  { id: 'project:nebula', projectId: 'nebula', position: [0, 1.2, -4.8], radius: 2.6 },
  { id: 'project:atlas-ui', projectId: 'atlas-ui', position: [5.5, 1.2, -2.5], radius: 2.6 },
]

export function skillSpot(skill) {
  return {
    id: `skill:${skill.id}`,
    skillId: skill.id,
    label: `Kỹ năng: ${skill.name}`,
    // Orb lơ lửng quanh y gốc; lấy y gốc làm tâm, bán kính bù dao động.
    position: skill.position,
    radius: 2.6,
  }
}

export function allSpots() {
  return [
    MONITOR_SPOT,
    CONTACT_SPOT,
    CHAIR_SPOT,
    ...PROJECT_SPOTS,
    ...SKILLS.map(skillSpot),
  ]
}

export function spotLabel(spotId) {
  if (!spotId) return null
  if (spotId === 'monitor') return MONITOR_SPOT.label
  if (spotId === 'contact') return CONTACT_SPOT.label
  if (spotId === 'chair') return CHAIR_SPOT.label
  if (spotId.startsWith('project:')) {
    const project = PROJECTS.find((p) => `project:${p.id}` === spotId)
    return project ? `Dự án: ${project.title} (${project.year})` : spotId
  }
  if (spotId.startsWith('skill:')) {
    const skill = SKILLS.find((s) => `skill:${s.id}` === spotId)
    return skill ? `Kỹ năng: ${skill.name}` : spotId
  }
  return spotId
}
