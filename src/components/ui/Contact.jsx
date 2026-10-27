import { memo, useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import SectionHeading from './SectionHeading.jsx'
import { PROFILE } from '../../data/portfolio.js'

/**
 * F6 — Contact that actually converts (no fake form: there is no endpoint
 * yet, so a form that posts nowhere would be worse than no form).
 *  - Copy-email button next to the mailto link, with a toast that
 *    auto-dismisses in 3s and PAUSES its timer while hovered/focused.
 *  - Magnetic mailto CTA on desktop with a fine pointer only: the link
 *    follows the cursor by at most 8px (spring lerp, never snapped),
 *    and returns to rest on leave. Touch/keyboard users get the plain
 *    link with no motion — the magnetic effect never carries information.
 *  - Button press is 0.97 scale over 150ms (motion-fast token).
 *  - No availability status is claimed here: the current status is not
 *    in the data, so no "open/closed" line is invented. Add one to
 *    PROFILE in data/portfolio.js when the status is known.
 */

function Magnetic({ children }) {
  const [finePointer, setFinePointer] = useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 })
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 })

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    setFinePointer(mq.matches)
    const onChange = (e) => setFinePointer(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const onMove = (e) => {
    if (!finePointer) return
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    // 0.3 of the offset, clamped to 8px — a nudge, not a chase.
    x.set(Math.max(-8, Math.min(8, dx * 0.3)))
    y.set(Math.max(-8, Math.min(8, dy * 0.3)))
  }

  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.span
      className="inline-block"
      style={{ x: springX, y: springY }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.span>
  )
}

function Contact() {
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState(false)
  const timerRef = useRef(null)
  const remainingRef = useRef(3000)
  const startedAtRef = useRef(0)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const startTimer = (ms) => {
    clearTimer()
    startedAtRef.current = Date.now()
    remainingRef.current = ms
    timerRef.current = setTimeout(() => {
      setToast(false)
      setCopied(false)
    }, ms)
  }

  useEffect(() => () => clearTimer(), [])

  const copyEmail = async () => {
    let ok = false
    try {
      await navigator.clipboard.writeText(PROFILE.email)
      ok = true
    } catch {
      // Fallback for non-secure contexts / denied clipboard permission.
      try {
        const ta = document.createElement('textarea')
        ta.value = PROFILE.email
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        ok = false
      }
    }
    if (!ok) return
    setCopied(true)
    setToast(true)
    startTimer(3000)
  }

  // Toast timer pauses while hovered/focused, resumes on leave/blur.
  const pauseToast = () => {
    if (!timerRef.current) return
    remainingRef.current = Math.max(
      0,
      remainingRef.current - (Date.now() - startedAtRef.current),
    )
    clearTimer()
  }
  const resumeToast = () => {
    if (toast && !timerRef.current && remainingRef.current > 0) {
      startTimer(remainingRef.current)
    }
  }

  return (
    <section id="contact" className="scroll-mt-24">
      <SectionHeading index="04" title="Liên hệ" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-70px' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-10"
      >
        <p className="max-w-2xl text-lg text-white/50 md:text-2xl">
          Bạn đang có ý tưởng cần trao đổi?{' '}
          <Magnetic>
            <a
              href={`mailto:${PROFILE.email}`}
              className="text-gradient font-medium underline-offset-8 hover:underline"
            >
              {PROFILE.email}
            </a>
          </Magnetic>{' '}
          <motion.button
            type="button"
            onClick={copyEmail}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
            aria-label={copied ? 'Đã sao chép email' : 'Sao chép email'}
            title="Sao chép email"
            className="inline-flex translate-y-[-2px] items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 align-middle text-sm text-white/70 transition-colors hover:border-white/40 hover:text-white"
          >
            {copied ? (
              <Check className="h-4 w-4 text-brand-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? 'Đã sao chép' : 'Sao chép'}
          </motion.button>
        </p>

        <ul className="mt-10 flex flex-wrap gap-3">
          {PROFILE.socials.map((social) => (
            <li key={social.label}>
              <a
                href={social.href}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-full border border-white/12 px-5 py-2.5 text-sm text-white/70 transition-all hover:border-white/40 hover:bg-white/5 hover:text-white"
              >
                {social.label} ↗
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-16 font-mono text-xs text-white/25">
          © {new Date().getFullYear()} {PROFILE.name} · {PROFILE.location}
        </p>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 z-50"
            style={{ x: '-50%' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            onMouseEnter={pauseToast}
            onMouseLeave={resumeToast}
            onFocus={pauseToast}
            onBlur={resumeToast}
          >
            <div className="glass-panel rounded-full px-5 py-2.5 text-sm text-white/90 shadow-2xl shadow-black/50">
              Đã sao chép email: {PROFILE.email}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export default memo(Contact)
