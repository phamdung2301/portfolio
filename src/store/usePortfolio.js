import { create } from 'zustand'

/**
 * Store dùng chung giữa lớp UI 2D và lớp Canvas 3D.
 *
 * Luồng dữ liệu được thiết kế một chiều để tránh re-render không cần thiết:
 *   Canvas 3D  ──(setActiveSection / setHoveredSkill)──▶  Store  ──▶  UI 2D
 * UI 2D       ──(setActiveSection)────────────────────▶  Store  ──▶  Canvas 3D đọc qua selector
 *
 * Thành phần trong Canvas chỉ subscribe vào các giá trị scalar cần thiết,
 * nhờ vậy đổi state không khiến cả cây 3D render lại.
 */
export const usePortfolioStore = create((set) => ({
  /** Section đang active, dùng để highlight trên nav & đồng bộ camera */
  activeSection: 'hero',

  /** id của skill đang được hover trong không gian 3D */
  hoveredSkill: null,

  setActiveSection: (activeSection) => set({ activeSection }),
  setHoveredSkill: (hoveredSkill) => set({ hoveredSkill }),
}))
