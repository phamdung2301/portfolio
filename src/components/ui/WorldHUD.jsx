import { useEffect, useRef, useState } from 'react'
import { PROJECTS, SKILLS } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'
import { spotLabel } from '../world/interactables.js'
import { interactWith } from '../world/actions.js'
import { worldInput } from '../world/input.js'
import WorldTerminal from './WorldTerminal.jsx'
import SeatedComputer from './SeatedComputer.jsx'
import PhotoCard from './PhotoCard.jsx'

/**
 * S2 — HUD của Thế giới tự do (DOM, nằm trên Canvas khi worldMode bật).
 *
 * Trách nhiệm:
 *  - Khóa cuộn trang khi vào world, trả lại khi thoát (goto từ terminal
 *    thì cuộn tới section đích thay vì vị trí cũ).
 *  - Esc tập trung: terminal mở → đóng terminal; panel mở → đóng panel;
 *    còn không → thoát world. Terminal KHÔNG tự bắt Esc (tránh double).
 *  - Phím E + nút prompt dùng chung interactWith() với click trên mesh.
 *  - Joystick cảm ứng (chỉ hiện khi pointer thô) ghi vào worldInput.
 *  - Toast tự tắt sau 2.5s; màn hình hoàn thành khi thu đủ 7 kỹ năng.
 */
function Joystick() {
  const baseRef = useRef(null)
  const knobRef = useRef(null)
  const activeId = useRef(null)

  const setVector = (clientX, clientY) => {
    const base = baseRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = (clientX - cx) / 48
    let dy = (clientY - cy) / 48
    const len = Math.hypot(dx, dy)
    if (len > 1) {
      dx /= len
      dy /= len
    }
    worldInput.joyX = dx
    worldInput.joyY = dy
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`
    }
  }

  const reset = () => {
    worldInput.joyX = 0
    worldInput.joyY = 0
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)'
  }

  return (
    <div
      ref={baseRef}
      aria-label="Joystick di chuyển"
      className="relative h-28 w-28 touch-none rounded-full border border-white/20 bg-white/5"
      onPointerDown={(e) => {
        activeId.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        setVector(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (activeId.current !== e.pointerId) return
        setVector(e.clientX, e.clientY)
      }}
      onPointerUp={(e) => {
        if (activeId.current !== e.pointerId) return
        activeId.current = null
        reset()
      }}
      onPointerCancel={reset}
    >
      <div
        ref={knobRef}
        className="absolute left-1/2 top-1/2 -ml-7 -mt-7 h-14 w-14 rounded-full bg-white/25"
      />
    </div>
  )
}

export default function WorldHUD() {
  const collectedSkills = usePortfolioStore((s) => s.collectedSkills)
  const nearby = usePortfolioStore((s) => s.nearby)
  const terminalOpen = usePortfolioStore((s) => s.terminalOpen)
  const projectDetailId = usePortfolioStore((s) => s.projectDetailId)
  const worldToast = usePortfolioStore((s) => s.worldToast)
  const seated = usePortfolioStore((s) => s.seated)
  const computerOpen = usePortfolioStore((s) => s.computerOpen)
  const photoCardOpen = usePortfolioStore((s) => s.photoCardOpen)
  const setWorldMode = usePortfolioStore((s) => s.setWorldMode)
  const setTerminalOpen = usePortfolioStore((s) => s.setTerminalOpen)
  const setProjectDetailId = usePortfolioStore(
    (s) => s.setProjectDetailId,
  )
  const setWorldToast = usePortfolioStore((s) => s.setWorldToast)
  const setWorldExitTarget = usePortfolioStore((s) => s.setWorldExitTarget)
  const setActiveSection = usePortfolioStore((s) => s.setActiveSection)
  const setNearby = usePortfolioStore((s) => s.setNearby)
  const setSeated = usePortfolioStore((s) => s.setSeated)
  const setComputerOpen = usePortfolioStore((s) => s.setComputerOpen)
  const setPhotoCardOpen = usePortfolioStore((s) => s.setPhotoCardOpen)

  const savedScroll = useRef(0)
  const [fade, setFade] = useState(true)
  const [coarsePointer, setCoarsePointer] = useState(false)
  const [completionDismissed, setCompletionDismissed] = useState(false)
  const [showToast, setShowToast] = useState(false)

  // Vào world: lưu vị trí cuộn + khóa cuộn. Thoát: trả cuộn (hoặc tới
  // section đích nếu goto từ terminal đã đặt worldExitTarget).
  useEffect(() => {
    savedScroll.current = window.scrollY
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => setFade(false), 60)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = ''
      const target = usePortfolioStore.getState().worldExitTarget
      if (target) {
        usePortfolioStore.getState().setWorldExitTarget(null)
        setTimeout(() => {
          document
            .getElementById(target)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 80)
      } else {
        window.scrollTo(0, savedScroll.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    setCoarsePointer(mq.matches)
    const onChange = (e) => setCoarsePointer(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Toast tự tắt.
  useEffect(() => {
    if (!worldToast) return
    setShowToast(true)
    const t = setTimeout(() => {
      setShowToast(false)
      setWorldToast(null)
    }, 2500)
    return () => clearTimeout(t)
  }, [worldToast, setWorldToast])

  // Esc + E + F tập trung (bỏ qua khi đang gõ trong input/textarea).
  // Thứ tự Esc khi ngồi: card visit → máy tính → đứng dậy → thoát
  // world. Mỗi lần Esc chỉ làm đúng một việc, không nhảy cóc.
  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return
      }
      const st = usePortfolioStore.getState()
      if (e.key === 'Escape') {
        if (st.photoCardOpen) st.setPhotoCardOpen(false)
        else if (st.computerOpen) st.setComputerOpen(false)
        else if (st.seated) {
          st.setSeated(false)
          st.setComputerOpen(false)
        } else if (st.terminalOpen) st.setTerminalOpen(false)
        else if (st.projectDetailId) st.setProjectDetailId(null)
        else {
          st.setSeated(false)
          st.setComputerOpen(false)
          st.setPhotoCardOpen(false)
          st.setNearby(null)
          st.setWorldMode(false)
        }
        return
      }
      if (e.key.toLowerCase() === 'f' && st.seated) {
        st.setPhotoCardOpen(!st.photoCardOpen)
        return
      }
      if (
        e.key.toLowerCase() === 'e' &&
        !st.terminalOpen &&
        !st.projectDetailId &&
        !st.photoCardOpen
      ) {
        if (st.seated) {
          // Đang ngồi, máy tính đóng: E mở lại máy tính (đang gõ thì
          // handler đã return ở trên, nên 'e' không rơi vào terminal).
          if (!st.computerOpen) st.setComputerOpen(true)
        } else if (st.nearby) {
          interactWith(st.nearby)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const exitWorld = () => {
    setNearby(null)
    setSeated(false)
    setComputerOpen(false)
    setPhotoCardOpen(false)
    setWorldMode(false)
  }

  const project = PROJECTS.find((p) => p.id === projectDetailId)
  const allCollected = collectedSkills.length >= SKILLS.length

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {/* Fade đen che cú nhảy camera khi vào world */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-black transition-opacity duration-500 ${
          fade ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Thanh trên: tiến độ + thoát */}
      <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="rounded-2xl border border-white/15 bg-black/50 px-4 py-2.5 backdrop-blur-md">
          <p className="font-mono text-xs text-white/60">
            THẾ GIỚI 3D · ĐÃ THU THẬP
          </p>
          <p className="mt-0.5 text-sm font-medium text-white">
            {collectedSkills.length}/{SKILLS.length} kỹ năng
          </p>
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-400 transition-all duration-500"
              style={{
                width: `${(collectedSkills.length / SKILLS.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={exitWorld}
          className="rounded-full border border-white/20 bg-black/50 px-5 py-2.5 text-sm text-white/85 backdrop-blur-md hover:bg-white/10 hover:text-white"
        >
          Thoát thế giới (Esc)
        </button>
      </div>

      {/* Hướng dẫn điều khiển */}
      <p className="absolute left-1/2 top-20 hidden -translate-x-1/2 rounded-full bg-black/40 px-4 py-1.5 text-center font-mono text-xs text-white/60 backdrop-blur-sm md:block">
        WASD di chuyển · Shift chạy nhanh · Kéo chuột để nhìn · E tương tác
      </p>

      {/* Tâm ngắm */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70"
      />

      {/* Joystick cảm ứng — ẩn khi ngồi (không di chuyển) hoặc khi
          có cửa sổ mở, để tay không chạm nhầm. */}
      {coarsePointer && !terminalOpen && !project && !seated && !computerOpen && !photoCardOpen && (
        <div className="pointer-events-auto absolute bottom-6 left-6">
          <Joystick />
        </div>
      )}

      {/* Toast */}
      {showToast && worldToast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/70 px-5 py-2.5 text-sm text-white/90 backdrop-blur-md">
          {worldToast}
        </div>
      )}

      {/* Thanh điều khiển khi ngồi: mở máy tính / xem khung ảnh /
          đứng dậy. Prompt vật thể khác ẩn khi ngồi vì không với tới. */}
      {seated && !photoCardOpen && (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-wrap justify-center gap-2 px-4">
          {!computerOpen && (
            <button
              type="button"
              onClick={() => setComputerOpen(true)}
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-ink-950 shadow-xl hover:scale-[1.03] active:scale-95"
            >
              Mở máy tính
            </button>
          )}
          <button
            type="button"
            onClick={() => setPhotoCardOpen(true)}
            className="rounded-full border border-white/25 bg-black/60 px-5 py-3 text-sm text-white/90 backdrop-blur-md hover:bg-white/10"
          >
            Xem khung ảnh (F)
          </button>
          <button
            type="button"
            onClick={() => {
              setComputerOpen(false)
              setSeated(false)
            }}
            className="rounded-full border border-white/25 bg-black/60 px-5 py-3 text-sm text-white/90 backdrop-blur-md hover:bg-white/10"
          >
            Đứng dậy (Esc)
          </button>
        </div>
      )}

      {/* Gợi ý khung ảnh đang rung (chỉ khi ngồi, máy tính đóng) */}
      {seated && !computerOpen && !photoCardOpen && (
        <p className="absolute left-1/2 top-24 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-4 py-1.5 font-mono text-xs text-white/70 backdrop-blur-sm">
          Khung ảnh đang rung ở bên phải — nhấn F để xem
        </p>
      )}

      {/* Prompt tương tác */}
      {nearby && !terminalOpen && !project && !seated && (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={() => interactWith(nearby)}
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-ink-950 shadow-xl transition-transform hover:scale-[1.03] active:scale-95"
          >
            Nhấn E — {spotLabel(nearby)}
          </button>
        </div>
      )}

      {/* Terminal */}
      {terminalOpen && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center p-4">
          <WorldTerminal />
        </div>
      )}

      {/* Máy tính khi ngồi */}
      {seated && computerOpen && !photoCardOpen && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center p-4">
          <SeatedComputer />
        </div>
      )}

      {/* Card visit từ khung ảnh */}
      {photoCardOpen && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center p-4">
          <PhotoCard />
        </div>
      )}

      {/* Panel chi tiết dự án */}
      {project && (
        <div className="pointer-events-auto absolute inset-0 flex items-end justify-center p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-black/85 p-6 shadow-2xl backdrop-blur-xl">
            <p className="font-mono text-xs text-white/50">{project.year}</p>
            <h3 className="mt-1 text-2xl font-semibold text-white">
              {project.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              {project.description}
            </p>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              <p>
                <span className="text-white/90">Thử thách: </span>
                {project.detail.challenge}
              </p>
              <p>
                <span className="text-white/90">Cách làm: </span>
                {project.detail.approach}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setProjectDetailId(null)
                  setWorldExitTarget('projects')
                  setActiveSection('projects')
                  exitWorld()
                }}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink-950 hover:scale-[1.03]"
              >
                Xem trên trang chính
              </button>
              <button
                type="button"
                onClick={() => setProjectDetailId(null)}
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/85 hover:bg-white/10"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Màn hình hoàn thành */}
      {allCollected && !completionDismissed && !terminalOpen && !project && !computerOpen && !photoCardOpen && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-brand-400/40 bg-black/85 p-6 text-center shadow-2xl backdrop-blur-xl">
            <p className="font-mono text-xs tracking-[0.3em] text-brand-300">
              FULL STACK
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              Bạn đã thu thập đủ 7 kỹ năng!
            </h3>
            <p className="mt-2 text-sm text-white/70">
              Thế giới vẫn mở để bạn đi dạo tiếp, hoặc tới phần liên hệ để
              bắt đầu một dự án.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setWorldExitTarget('contact')
                  setActiveSection('contact')
                  exitWorld()
                }}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink-950"
              >
                Tới phần Liên hệ
              </button>
              <button
                type="button"
                onClick={() => setCompletionDismissed(true)}
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/85 hover:bg-white/10"
              >
                Tiếp tục đi dạo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
