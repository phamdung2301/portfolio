import { memo } from 'react'
import { motion } from 'framer-motion'
import { SECTIONS } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'

/**
 * Thanh điều hướng cố định + progress bar.
 * Cuộn tới section tương ứng khi bấm (dùng scrollIntoView mượt).
 */
function Nav({ progress }) {
  const activeSection = usePortfolioStore((s) => s.activeSection)
  const setActiveSection = usePortfolioStore((s) => s.setActiveSection)

  const goTo = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(id)
  }

  return (
    <header className="pointer-events-auto fixed inset-x-0 top-0 z-30">
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-transparent">
        <motion.div
          className="h-full origin-left bg-gradient-to-r from-brand-400 to-accent-400"
          style={{ scaleX: progress }}
        />
      </div>

      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <button
          type="button"
          onClick={() => goTo('hero')}
          className="font-mono text-sm tracking-tight text-white/90 transition-colors hover:text-brand-300"
        >
          dune<span className="text-brand-400">.dev</span>
        </button>

        <ul className="hidden items-center gap-1 rounded-full border border-white/10 bg-ink-900/60 px-2 py-1 backdrop-blur md:flex">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => goTo(section.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative rounded-full px-4 py-1.5 text-sm transition-colors ${
                    isActive ? 'text-ink-950' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{section.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}

export default memo(Nav)
