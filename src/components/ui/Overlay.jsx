import { memo } from 'react'
import Nav from './Nav.jsx'
import Hero from './Hero.jsx'
import About from './About.jsx'
import Manifesto from './Manifesto.jsx'
import MarqueeBand from './MarqueeBand.jsx'
import Skills from './Skills.jsx'
import Projects from './Projects.jsx'
import Contact from './Contact.jsx'
import { useScrollOffset } from '../../hooks/useScrollState.js'

/**
 * Lớp nội dung 2D nằm trên Canvas 3D.
 * Canvas cố định ở z-0, nội dung cuộn ở z-10 với `pointer-events: none`
 * ở container để người dùng vẫn tương tác (hover/click) với vật thể 3D.
 */
function Overlay() {
  const offset = useScrollOffset()

  return (
    <div className="pointer-events-none relative z-10 w-full">
      <Nav progress={offset} />

      {/* S2: main để pointer-events-none, từng section tự bật lại auto
          (xem từng file section) — vùng trống giữa các section lộ ra
          cho Canvas, nên click/hover mesh 3D mới chạy được. Trước đây
          main auto chặn hết raycast ở vùng trống. */}
      <main className="pointer-events-none mx-auto flex w-full max-w-6xl flex-col gap-28 px-6 pb-32 pt-32 md:px-10 md:pt-40">
        <Hero />
        <About />
        <Manifesto />
        <MarqueeBand />
        <Skills />
        <Projects />
        <Contact />
      </main>
    </div>
  )
}

export default memo(Overlay)
