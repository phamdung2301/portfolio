/**
 * S2 — input dùng chung giữa HUD (joystick cảm ứng) và WorldPlayer.
 * Mutable ref ngoài React: joystick ghi vào đây mỗi frame chạm, rig đọc
 * trong useFrame mà không gây re-render. Bàn phím và kéo-chuột nhìn
 * được xử lý trực tiếp trong WorldPlayer, không qua đây.
 */
export const worldInput = {
  /** -1..1: trái/phải (strafe) từ joystick */
  joyX: 0,
  /** -1..1: lùi/tiến từ joystick (âm = tiến) */
  joyY: 0,
}
