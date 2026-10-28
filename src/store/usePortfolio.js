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

  // ---- S2: Thế giới tự do (chỉ đổi khi vào/ra world, không đổi mỗi frame)
  /** true khi đang ở chế độ đi lại trong cảnh 3D */
  worldMode: false,
  /** id skill đã thu thập trong world (theo phiên, không lưu localStorage) */
  collectedSkills: [],
  /** id vật thể đang ở gần nhất trong world, hoặc null */
  nearby: null,
  /** terminal trong world đang mở hay không */
  terminalOpen: false,
  /** id project đang mở panel chi tiết trong world, hoặc null */
  projectDetailId: null,
  /** thông báo ngắn trong world (vd. "Đã sao chép email") */
  worldToast: null,
  /** section cần cuộn tới khi thoát world (goto từ terminal), hoặc null */
  worldExitTarget: null,

  // ---- S2 (ghế + máy tính khi ngồi)
  /** true khi đang ngồi trên ghế trong world */
  seated: false,
  /** tab đang mở trên máy tính khi ngồi */
  seatedTab: 'terminal',
  /** cửa sổ máy tính khi ngồi đang mở hay không */
  computerOpen: false,
  /** true khi terminal trên màn 3D đang nhận phím (ngồi + tab
      Terminal + lớp phủ máy tính đóng) — HUD dùng để chặn phím E
      tương tác khi người dùng đang gõ lệnh, tránh gõ "help" mà
      vô tình kích hoạt vật đang nhìn. */
  screenTermActive: false,
  /** card visit (khung ảnh) đang mở hay không */
  photoCardOpen: false,

  // ---- S2 (workspace dressing) — chế độ đèn RGB chung cho bàn phím,
  // viền bàn, quạt PC: 'wave' (sóng cầu vồng) | 'breath' (thở một màu)
  // | 'off' (tắt đèn). Đổi bằng cách bấm thùng PC trong world.
  rgbMode: 'wave',

  // ---- S2 (trải nghiệm gaze) — vật đang nhìn (tâm màn hình) trong
  // world, để HUD chỉ hiện pill tương tác cho đúng vật đó. null = không
  // nhìn vật nào. Khác `nearby` (chỉ cần đứng gần, không cần nhìn).
  gazeTarget: null,
  // Thời điểm nhấp cà phê gần nhất (ms, Date.now) — Mug đọc để phụt
  // hơi mạnh trong ~1.8s sau khi nhấp.
  mugSipAt: 0,

  setWorldMode: (worldMode) => set({ worldMode }),
  collectSkill: (skillId) =>
    set((s) =>
      s.collectedSkills.includes(skillId)
        ? s
        : { collectedSkills: [...s.collectedSkills, skillId] },
    ),
  setNearby: (nearby) => set({ nearby }),
  setTerminalOpen: (terminalOpen) => set({ terminalOpen }),
  setProjectDetailId: (projectDetailId) => set({ projectDetailId }),
  setWorldToast: (worldToast) => set({ worldToast }),
  setWorldExitTarget: (worldExitTarget) => set({ worldExitTarget }),
  setSeated: (seated) => set({ seated }),
  setSeatedTab: (seatedTab) => set({ seatedTab }),
  setComputerOpen: (computerOpen) => set({ computerOpen }),
  setScreenTermActive: (screenTermActive) => set({ screenTermActive }),
  setPhotoCardOpen: (photoCardOpen) => set({ photoCardOpen }),
  setRgbMode: (rgbMode) => set({ rgbMode }),
  setGazeTarget: (gazeTarget) => set({ gazeTarget }),
  setMugSipAt: (mugSipAt) => set({ mugSipAt }),
}))
