import { PROFILE, SKILLS } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'
import { RGB_MODES, RGB_LABELS } from '../scene/rgb.js'

/**
 * S2 — hành động dùng chung cho tương tác trong world, để nút bấm HUD,
 * phím E và click trực tiếp lên mesh đều chạy cùng một logic.
 */
export async function copyWorldEmail() {
  const setWorldToast = usePortfolioStore.getState().setWorldToast
  try {
    await navigator.clipboard.writeText(PROFILE.email)
    setWorldToast(`Đã sao chép email: ${PROFILE.email}`)
  } catch {
    setWorldToast(`Không copy tự động được — email: ${PROFILE.email}`)
  }
}

export function interactWith(spotId) {
  const s = usePortfolioStore.getState()
  if (!spotId) return
  if (spotId === 'chair') {
    // S2 (trải nghiệm gaze): ngồi xuống CHỈ là ngồi xuống — không tự
    // mở máy tính nữa (máy mở lại đúng tab lần trước khi người dùng
    // nhìn màn hình + bấm E, như máy ngủ đông). Terminal standalone
    // đóng để khỏi chồng cửa sổ khi ngồi.
    s.setSeated(true)
    s.setTerminalOpen(false)
    return
  }
  if (spotId === 'monitor') {
    // Đang ngồi: mở máy tính ở đúng tab lần trước (không ép tab
    // Terminal); đang đứng: mở terminal standalone.
    if (s.seated) {
      s.setComputerOpen(true)
    } else {
      s.setTerminalOpen(true)
    }
    return
  }
  if (spotId === 'frame') {
    // Khung ảnh: chỉ mở khi người dùng nhìn + bấm (hoặc chạm) — không
    // còn rung, không còn dòng nhắc tự hiện khi ngồi.
    if (!s.worldMode) return
    s.setPhotoCardOpen(true)
    return
  }
  if (spotId === 'pc') {
    // Thùng PC: đổi chế độ RGB chung (sóng → thở → tắt), toast báo
    // tên chế độ. Logic cũ ở PCTower chuyển về đây để E, pill HUD và
    // click mesh dùng chung một đường.
    if (!s.worldMode) return
    const next = RGB_MODES[(RGB_MODES.indexOf(s.rgbMode) + 1) % RGB_MODES.length]
    s.setRgbMode(next)
    s.setWorldToast(`Chế độ RGB: ${RGB_LABELS[next]}`)
    return
  }
  if (spotId === 'mug') {
    // Cốc cà phê: niềm vui nhỏ, không mở cửa sổ nào — hơi nóng phụt
    // mạnh ~1.8s (Mug đọc mugSipAt) + toast phản hồi sau hành động.
    if (!s.worldMode) return
    s.setMugSipAt(Date.now())
    s.setWorldToast('Nhấp một ngụm cà phê — vẫn còn nóng.')
    return
  }
  if (spotId === 'contact') {
    copyWorldEmail()
    return
  }
  if (spotId.startsWith('skill:')) {
    const skillId = spotId.slice('skill:'.length)
    if (s.collectedSkills.includes(skillId)) return
    s.collectSkill(skillId)
    const total = usePortfolioStore.getState().collectedSkills.length
    const skill = SKILLS.find((k) => k.id === skillId)
    s.setWorldToast(
      `Đã thu thập: ${skill ? skill.name : skillId} (${total}/${SKILLS.length})`,
    )
    return
  }
  if (spotId.startsWith('project:')) {
    s.setProjectDetailId(spotId.slice('project:'.length))
  }
}
