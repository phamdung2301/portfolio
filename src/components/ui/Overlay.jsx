import { memo } from 'react'
import { motion } from 'framer-motion'
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

      <main className="pointer-events-auto mx-auto flex w-full max-w-6xl flex-col gap-28 px-6 pb-32 pt-32 md:px-10 md:pt-40">
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
