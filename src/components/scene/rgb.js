import * as THREE from 'three'

/**
 * S2 (workspace dressing) — màu đèn RGB chung cho bàn phím, viền bàn,
 * quạt PC. Một nguồn duy nhất để mọi dải đèn đổi chế độ cùng nhau.
 *  - wave: sóng cầu vồng theo vị trí x + thời gian.
 *  - breath: một màu cyan thở (sáng tối theo sin).
 *  - off: tối hẳn (chỉ còn màu phím tối, không phát sáng).
 * `out` là THREE.Color tái sử dụng (tránh cấp phát mỗi frame).
 */
const _c = new THREE.Color()

export function rgbColor(mode, t, x, out = _c) {
  if (mode === 'off') {
    return out.setRGB(0.1, 0.11, 0.13)
  }
  if (mode === 'breath') {
    const b = 0.5 + 0.5 * Math.sin(t * 1.5)
    return out.setHSL(0.52, 0.9, 0.25 + b * 0.35)
  }
  return out.setHSL(((x * 0.55 + t * 0.12) % 1 + 1) % 1, 0.9, 0.55)
}

/** Tốc độ quay quạt PC theo chế độ (off = đứng yên). */
export function rgbFanSpeed(mode) {
  if (mode === 'off') return 0
  if (mode === 'breath') return 1.2
  return 2.5
}

export const RGB_MODES = ['wave', 'breath', 'off']
export const RGB_LABELS = {
  wave: 'Sóng cầu vồng',
  breath: 'Thở một màu',
  off: 'Tắt đèn',
}
