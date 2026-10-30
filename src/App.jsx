import { Suspense, lazy, useEffect } from 'react'
import Scene from './components/Scene.jsx'
import Overlay from './components/ui/Overlay.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import { usePortfolioStore } from './store/usePortfolio.js'
import { useScrollListener, scrollState } from './hooks/useScrollState.js'

// GĐ1 (code-split): toàn bộ HUD + logic world (~1.400 dòng: HUD,
// terminal, máy tính ngồi, card visit, Flappy) thành chunk riêng, chỉ
// tải khi bấm "Vào thế giới 3D". Fallback là nền đen — khớp với hiệu
// ứng fade đen 500ms của WorldHUD nên bước chuyển không lộ khuyết.
const WorldHUD = lazy(() => import('./components/ui/WorldHUD.jsx'))

export default function App() {
  const activeSection = usePortfolioStore((s) => s.activeSection)
  const setActiveSection = usePortfolioStore((s) => s.setActiveSection)
  // S2: world mode thay toàn bộ Overlay cuộn bằng HUD — Canvas (z-0)
  // lúc này không còn lớp DOM nào đè lên, nên raycast/click 3D chạy.
  const worldMode = usePortfolioStore((s) => s.worldMode)

  // Listener scroll toàn cục (dùng chung cho lớp 3D và lớp 2D)
  useScrollListener()

  // Đồng bộ section active khi người dùng cuộn trang.
  // S1: đọc section đã tính từ vị trí thật của từng section trong
  // useScrollState (không còn chia trang thành 5 phần bằng nhau).
  // Guard so sánh để tránh re-render Nav mỗi frame scroll.
  useEffect(() => {
    const onScroll = () => {
      const next = scrollState.section || 'hero'
      if (usePortfolioStore.getState().activeSection !== next) {
        setActiveSection(next)
      }
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [setActiveSection])

  return (
    <ErrorBoundary>
    <div className="relative min-h-screen w-full bg-ink-950">
      {/* Lớp 3D cố định phía sau */}
      <div className="fixed inset-0 z-0">
        <Scene />
      </div>

      {/* Lớp nội dung 2D cuộn theo trang, hoặc HUD khi ở trong world */}
      {worldMode ? (
        <Suspense fallback={<div className="fixed inset-0 z-30 bg-black" />}>
          <WorldHUD />
        </Suspense>
      ) : (
        <Overlay />
      )}

      {/* M4: grain phim tĩnh phủ toàn viewport — không bắt sự kiện,
          không animate, chỉ là texture 5% nên không ảnh hưởng đọc chữ. */}
      <div aria-hidden="true" className="grain-overlay" />

      {/* Vùng trợ giúp cho screen reader */}
      <span className="sr-only" aria-live="polite">
        Section hiện tại: {activeSection}
      </span>
    </div>
    </ErrorBoundary>
  )
}
