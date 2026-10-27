import { memo, useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { PROFILE } from '../../data/portfolio.js'

/**
 * M4 — Giant manifesto word scrub.
 * The text is PROFILE.tagline verbatim (already the site's own copy),
 * not new copywriting. Each word fades from 0.12 to full opacity as the
 * section scrolls through the viewport — one driver (opacity) per word,
 * driven by the user's own scroll, never by an auto-playing animation.
 * Under prefers-reduced-motion the scrub is skipped and the full text
 * renders statically, because a scroll-linked fade is still motion.
 */
function ScrubWord({ progress, range, children }) {
  const opacity = useTransform(progress, range, [0.12, 1])
  return (
    <motion.span style={{ opacity }} className="mr-[0.28em] inline-block">
      {children}
    </motion.span>
  )
}

function Manifesto() {
  const ref = useRef(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.5'],
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const words = PROFILE.tagline.split(' ')

  return (
    <section ref={ref} aria-label="Tuyên ngôn" className="py-4 md:py-8">
      {reducedMotion ? (
        <p className="font-display text-3xl font-semibold leading-[1.15] tracking-tight text-white/90 md:text-5xl">
          {PROFILE.tagline}
        </p>
      ) : (
        <p className="font-display text-3xl font-semibold leading-[1.15] tracking-tight text-white/90 md:text-5xl">
          {words.map((word, i) => {
            const start = i / words.length
            const end = start + 1 / words.length
            return (
              <ScrubWord key={i} progress={scrollYProgress} range={[start, end]}>
                {word}
              </ScrubWord>
            )
          })}
        </p>
      )}
    </section>
  )
}

export default memo(Manifesto)
