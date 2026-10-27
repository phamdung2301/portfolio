import { PROFILE, SKILLS } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'

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
  if (spotId === 'monitor') {
    s.setTerminalOpen(true)
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
      `Đã thu thập: ${skill ? skill.name : skillId} (${total}/7)`,
    )
    return
  }
  if (spotId.startsWith('project:')) {
    s.setProjectDetailId(spotId.slice('project:'.length))
  }
}
