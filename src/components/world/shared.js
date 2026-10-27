/**
 * S2 (ghế + game) — refs dùng chung ngoài React, đổi mỗi frame nhưng
 * không được gây re-render (đúng pattern scrollState / worldInput).
 *  - seatLookYaw: góc nhìn ngang khi ngồi, WorldPlayer ghi, ghế đọc để
 *    xoay theo (hệ số 0.6 áp ở phía ghế).
 *  - gameScore: điểm Flappy hiện tại, game ghi, texture màn hình đọc để
 *    vẽ điểm lên mặt màn hình 3D.
 */
export const seatRef = {
  lookYaw: 0,
}

export const gameScoreRef = {
  score: 0,
}
