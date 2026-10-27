import { useEffect, useState } from 'react'
import { SECTIONS } from '../data/portfolio.js'

/**
 * Trạng thái scroll dùng chung giữa lớp UI 2D và lớp Canvas 3D.
 *
 * - `raw`      : tiến độ cuộn chuẩn hoá 0..1, cập nhật tức thời khi scroll
 * - `smoothed` : giá trị đã "damp" (easing) — dùng cho camera để chuyển động mượt
 * - `velocity` : tốc độ cuộn đã chuẩn hoá, dùng cho hiệu ứng parallaxe
 *
 * Vì đây là object mutable nằm ngoài React, việc cuộn trang KHÔNG gây re-render.
 * Lớp 3D đọc trực tiếp trong `useFrame`, lớp 2D dùng `useScrollOffset`.
 */
export const scrollState = {
  raw: 0,
  smoothed: 0,
  velocity: 0,
  /** Section whose centre band contains the viewport middle (S1). */
  section: 'hero',
  /** Progress 0..1 of the viewport middle inside the current section. */
  sectionProgress: 0,
}

/** Đăng ký listener scroll/resize, trả về hàm dọn dẻ. */
export function attachScrollListener() {
  const update = () => {
    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    scrollState.raw = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0

    // S1: which section is actually on screen — by element position, not
    // by assuming five equal fifths of the page (the old App.jsx math).
    // The viewport-middle band is stable at boundaries and survives
    // font/image load shifts, because it reads live bounding rects.
    const middle = window.innerHeight * 0.5
    for (const { id } of SECTIONS) {
      const el = document.getElementById(id)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (rect.top <= middle && rect.bottom >= middle) {
        scrollState.section = id
        scrollState.sectionProgress = Math.min(
          1,
          Math.max(0, (middle - rect.top) / Math.max(1, rect.height)),
        )
        break
      }
    }
  }

  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update, { passive: true })

  return () => {
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
  }
}

/**
 * Hook cấu hình listener scroll toàn cục (gọi 1 lần ở App).
 */
export function useScrollListener() {
  useEffect(() => attachScrollListener(), [])
}

/**
 * Hook cho lớp UI 2D: trả về tiến độ cuộn 0..1.
 * Chỉ re-render khi giá trị thay đổi đáng kể (làm tròn 3 chữ số) để tiết kiệm CPU.
 */
export function useScrollOffset() {
  const [offset, setOffset] = useState(scrollState.raw)

  useEffect(() => {
    let frame = 0
    let last = Math.round(scrollState.raw * 1000) / 1000

    const tick = () => {
      frame = 0
      const next = Math.round(scrollState.raw * 1000) / 1000
      if (next !== last) {
        last = next
        setOffset(next)
      }
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return offset
}
