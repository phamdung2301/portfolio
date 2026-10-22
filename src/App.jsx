import { useEffect } from 'react'
import Scene from './components/Scene.jsx'
import Overlay from './components/ui/Overlay.jsx'
import { usePortfolioStore } from './store/usePortfolio.js'
import { useScrollListener } from './hooks/useScrollState.js'
import { SECTIONS } from './data/portfolio.js'

export default function App() {
  const activeSection = usePortfolioStore((s) => s.activeSection)
  const setActiveSection = usePortfolioStore((s) => s.setActiveSection)

  // Listener scroll toàn cục (dùng chung cho lớp 3D và lớp 2D)
  useScrollListener()

  // Đồng bộ section active khi người dùng cuộn trang
  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      const ratio = total > 0 ? window.scrollY / total : 0
      const index = Math.min(
        SECTIONS.length - 1,
        Math.floor(ratio * SECTIONS.length * 0.999),
      )
      setActiveSection(SECTIONS[index].id)
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
