import { memo, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { SECTIONS } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'

/**
 * Thanh điều hướng cố định + progress bar.
 * Cuộn tới section tương ứng khi bấm (dùng scrollIntoView mượt).
 *
 * M2 — Menu mobile (trước đây Nav ẩn hoàn toàn dưới md, tức trên điện
 * thoại không có cách nào điều hướng ngoài cuộn):
 *  - Nút hamburger chỉ hiện dưới md; desktop giữ nguyên menu pill cũ.
 *  - Overlay toàn màn hình, link stagger 80ms, vào 400ms ease-out.
 *  - Escape / bấm link đóng menu; đóng xong focus trả về nút hamburger.
 *  - Mở menu thì khóa scroll nền; resize lên desktop thì tự đóng menu.
 *  - Một driver (Motion) cho mọi chuyển động ở đây, giống Nav pill cũ.
 */
function Nav({ progress }) {
  const activeSection = usePortfolioStore((s) => s.activeSection)
  const setActiveSection = usePortfolioStore((s) => s.setActiveSection)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const firstLinkRef = useRef(null)

  const goTo = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(id)
  }

  const goToFromMenu = (id) => {
    setMenuOpen(false)
    goTo(id)
  }

  useEffect(() => {
    if (!menuOpen) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstLinkRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      menuButtonRef.current?.focus()
    }
  }, [menuOpen])

  useEffect(() => {
    // Lên desktop thì menu mobile không còn ý nghĩa — tự đóng để
    // không kẹt trạng thái khóa scroll khi overlay đã bị md:hidden giấu.
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e) => {
      if (e.matches) setMenuOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

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

        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          className="rounded-full border border-white/15 p-2.5 text-white/80 transition-colors hover:border-white/40 hover:text-white md:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 z-50 flex flex-col bg-ink-950/95 backdrop-blur-xl md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
          >
            <div className="flex items-center justify-between px-6 py-4">
              <span className="font-mono text-sm tracking-tight text-white/90">
                dune<span className="text-brand-400">.dev</span>
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Đóng menu"
                className="rounded-full border border-white/15 p-2.5 text-white/80 transition-colors hover:border-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <motion.ul
              className="flex flex-1 flex-col justify-center gap-2 px-8 pb-16"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08 } },
              }}
            >
              {SECTIONS.map((section, i) => {
                const isActive = activeSection === section.id
                return (
                  <motion.li
                    key={section.id}
                    variants={{
                      hidden: { opacity: 0, y: 24 },
                      show: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                      },
                    }}
                  >
                    <button
                      ref={i === 0 ? firstLinkRef : undefined}
                      type="button"
                      onClick={() => goToFromMenu(section.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className="flex w-full items-baseline gap-4 py-3 text-left"
                    >
                      <span className="font-mono text-xs text-white/30">
                        0{i + 1}
                      </span>
                      <span
                        className={`text-4xl font-semibold tracking-tight ${
                          isActive ? 'text-brand-400' : 'text-white/90'
                        }`}
                      >
                        {section.label}
                      </span>
                    </button>
                  </motion.li>
                )
              })}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default memo(Nav)
