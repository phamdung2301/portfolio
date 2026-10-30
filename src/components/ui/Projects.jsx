import { memo, useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from 'framer-motion'
import { ArrowUpRight, ExternalLink, X } from 'lucide-react'
import SectionHeading from './SectionHeading.jsx'
import { PROJECTS } from '../../data/portfolio.js'

/**
 * F4 — Projects as an index list + cursor preview + case-study sheet.
 *
 * Award pattern, adapted honestly to what this repo actually has:
 *  - Index rows (year / title / stack / arrow) instead of identical cards.
 *  - One floating preview that follows the cursor on desktop (pointer:fine
 *    only, lerped with a spring — never snapped). It swaps on row
 *    mouseenter: 220ms fade-out, swap, 500ms power4.out fade-in.
 *  - No real screenshots exist yet (project.image = null), so the preview
 *    is a gradient COVER with the project title — never a fake screenshot.
 *    Drop a real image path into data and the preview + sheet use it.
 *  - On touch / small screens there is no cursor preview: each row shows
 *    its cover inline, and tapping a row opens the same sheet.
 *  - Clicking a row opens a TOP-DROP sheet (blurred backdrop, drops from
 *    the top, not a centred modal). Escape / backdrop closes it and focus
 *    returns to the row that opened it. Body scroll locks while open.
 *  - Filter pills animate with Motion layout (FLIP) — no reload, no
 *    width/height animation. One driver (Motion) for all 2D motion here.
 */

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'WebGL', label: 'WebGL' },
  { id: 'Motion', label: 'Motion' },
  { id: 'Design System', label: 'Design System' },
]

function ProjectCover({ project, className = '' }) {
  if (project.image) {
    return (
      <img
        src={project.image}
        alt={`Ảnh dự án ${project.title}`}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    )
  }
  return (
    <div
      aria-hidden
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden p-5 ${className}`}
      style={{
        background: `linear-gradient(135deg, ${project.accent}33 0%, #12121b 55%, #07070a 100%)`,
      }}
    >
      <span
        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full blur-3xl"
        style={{ background: project.accent, opacity: 0.5 }}
      />
      <span className="relative font-mono text-xs text-white/50">
        {project.year}
      </span>
      <span className="relative text-xl font-semibold tracking-tight text-white">
        {project.title}
      </span>
    </div>
  )
}

function CaseStudySheet({ project, onClose, triggerRef }) {
  const panelRef = useRef(null)

  useEffect(() => {
    // Focus vào sheet khi mở; khóa scroll nền; Escape đóng + trả focus.
    // GĐ1: chốt phần tử trigger tại thời điểm mở (xem Nav.jsx cùng lỗi).
    const trigger = triggerRef.current
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      trigger?.focus()
    }
  }, [onClose, triggerRef])

  if (!project) return null

  return (
    <motion.div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-study-title"
    >
      <motion.button
        type="button"
        aria-label="Đóng case study"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        className="glass-panel absolute inset-x-0 top-0 max-h-[92vh] overflow-y-auto rounded-b-3xl outline-none"
        initial={{ y: '-100%' }}
        animate={{ y: 0 }}
        exit={{ y: '-100%' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto w-full max-w-4xl px-6 py-8 md:px-10 md:py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-xs text-white/40">
                {project.year}
              </span>
              <h3
                id="case-study-title"
                className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl"
              >
                {project.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="rounded-full border border-white/15 p-2.5 text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 h-56 overflow-hidden rounded-2xl md:h-72">
            <ProjectCover project={project} />
          </div>

          <p className="mt-8 max-w-2xl text-base leading-relaxed text-white/60">
            {project.description}
          </p>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                Vấn đề
              </h4>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {project.detail.challenge}
              </p>
            </div>
            <div>
              <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                Cách làm
              </h4>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {project.detail.approach}
              </p>
            </div>
          </div>

          <p className="mt-8 border-l border-white/15 pl-4 text-sm leading-relaxed text-white/45">
            {project.detail.outcomeNote}
          </p>

          <ul className="mt-8 flex flex-wrap gap-2">
            {project.stack.map((tech) => (
              <li
                key={tech}
                className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-white/50"
              >
                {tech}
              </li>
            ))}
          </ul>

          {project.demoLink && (
            <a
              href={project.demoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition-all hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              Xem website
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function Projects() {
  const [filter, setFilter] = useState('all')
  const [activeId, setActiveId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [finePointer, setFinePointer] = useState(false)
  const triggerRef = useRef(null)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    setFinePointer(mq.matches)
    const onChange = (e) => setFinePointer(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Preview theo chuột: motion value thô -> spring (lerp mượt, không snap).
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const springX = useSpring(px, { stiffness: 150, damping: 20, mass: 0.5 })
  const springY = useSpring(py, { stiffness: 150, damping: 20, mass: 0.5 })

  const filtered =
    filter === 'all'
      ? PROJECTS
      : PROJECTS.filter((p) => p.categories.includes(filter))

  const activeProject = PROJECTS.find((p) => p.id === activeId) || null

  const onListMouseMove = (e) => {
    if (!finePointer) return
    const w = window.innerWidth
    px.set(e.clientX > w - 380 ? e.clientX - 350 : e.clientX + 28)
    py.set(e.clientY - 110)
  }

  const openSheet = (project, e) => {
    triggerRef.current = e.currentTarget
    setSelected(project)
  }

  return (
    <section id="projects" className="pointer-events-auto scroll-mt-24">
      <SectionHeading index="03" title="Dự án tiêu biểu" />

      <div className="mt-10 flex flex-wrap gap-2" role="group" aria-label="Lọc dự án">
        {FILTERS.map((f) => {
          const isActive = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={isActive}
              className={`relative rounded-full px-4 py-1.5 text-sm transition-colors ${
                isActive ? 'text-ink-950' : 'text-white/60 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="project-filter-pill"
                  className="absolute inset-0 rounded-full bg-white"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">{f.label}</span>
            </button>
          )
        })}
      </div>

      <div
        className="relative mt-6"
        onMouseMove={onListMouseMove}
        onMouseLeave={() => setActiveId(null)}
      >
        <motion.ul layout className="border-t border-white/10">
          <AnimatePresence mode="popLayout">
            {filtered.map((project) => (
              <motion.li
                layout
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="border-b border-white/10"
              >
                <button
                  type="button"
                  onClick={(e) => openSheet(project, e)}
                  onMouseEnter={() => setActiveId(project.id)}
                  onFocus={() => setActiveId(project.id)}
                  onBlur={() => setActiveId(null)}
                  className="group flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-2 py-6 text-left transition-colors hover:bg-white/[0.03] md:px-4"
                  aria-label={`Mở case study ${project.title}`}
                >
                  <span className="w-12 shrink-0 font-mono text-xs text-white/30">
                    {project.year}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-2xl font-medium tracking-tight text-white/90 transition-transform duration-300 group-hover:translate-x-1 md:text-3xl">
                      {project.title}
                    </span>
                    <span className="mt-1 block font-mono text-xs text-white/40">
                      {project.stack.join(' · ')}
                    </span>
                  </span>
                  <span
                    className="rounded-full px-3 py-1 font-mono text-xs"
                    style={{
                      color: project.accent,
                      background: `${project.accent}1a`,
                    }}
                  >
                    {project.categories[0]}
                  </span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-white/30 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white" />
                </button>

                {/* Cover inline cho cảm ứng / màn hình nhỏ (không có cursor preview). */}
                <div className="mx-2 mb-6 h-40 overflow-hidden rounded-2xl lg:hidden">
                  <ProjectCover project={project} />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        {filtered.length === 0 && (
          <p className="py-10 text-sm text-white/40">
            Không có dự án nào thuộc bộ lọc này.
          </p>
        )}

        {/* Preview nổi theo chuột — chỉ desktop có con trỏ chính xác.
            Đổi dự án = fade-out 220ms, đổi nội dung, fade-in 500ms. */}
        <AnimatePresence mode="wait">
          {finePointer && activeProject && !selected && (
            <motion.div
              key={activeProject.id}
              aria-hidden
              className="pointer-events-none fixed left-0 top-0 z-40 hidden h-52 w-80 overflow-hidden rounded-2xl shadow-2xl shadow-black/50 lg:block"
              style={{ x: springX, y: springY }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.22 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProjectCover project={activeProject} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-6 text-sm text-white/35">
        Bấm vào một dự án để xem case study. Ảnh xem trước hiện là cover
        gradient theo màu của dự án — chưa phải screenshot thật.
      </p>

      <AnimatePresence>
        {selected && (
          <CaseStudySheet
            project={selected}
            onClose={() => setSelected(null)}
            triggerRef={triggerRef}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

export default memo(Projects)
