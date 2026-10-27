import { useEffect } from 'react'
import Scene from './components/Scene.jsx'
import Overlay from './components/ui/Overlay.jsx'
import { usePortfolioStore } from './store/usePortfolio.js'
import { useScrollListener, scrollState } from './hooks/useScrollState.js'

export default function App() {
  const activeSection = usePortfolioStore((s) => s.activeSection)
  const setActiveSection = usePortfolioStore((s) => s.setActiveSection)

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
    <div className="relative min-h-screen w-full bg-ink-950">
      {/* Lớp 3D cố định phía sau */}
      <div className="fixed inset-0 z-0">
        <Scene />
      </div>

      {/* Lớp nội dung 2D cuộn theo trang */}
      <Overlay />

      {/* Vùng trợ giúp cho screen reader */}
      <span className="sr-only" aria-live="polite">
        Section hiện tại: {activeSection}
      </span>
    </div>
  )
}
