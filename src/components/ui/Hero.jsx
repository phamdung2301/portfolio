import { memo } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { PROFILE } from '../../data/portfolio.js'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
}

/** Section mở đầu: tên, vai trò và lời giới thiệu ngắn. */
function Hero() {
  // S1: hero scrub-out — khi hero cuộn đi, tiêu đề trôi lên + mờ dần
  // (cinematic exit, scrub theo scroll thật, không phải once:true).
  // Lớp ngoài này chỉ cầm opacity/y scrub; lớp trong giữ variants
  // entrance, để 2 driver không tranh cùng 1 property trên cùng 1 element.
  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 420], [1, 0.15])
  const heroY = useTransform(scrollY, [0, 420], [0, -70])

  return (
    <section id="hero" className="flex min-h-[80vh] flex-col justify-center scroll-mt-24">
      <motion.div style={{ opacity: heroOpacity, y: heroY }}>
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.p
          variants={item}
          className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-brand-400"
        >
          Portfolio · 2026
        </motion.p>

        <motion.h1
          variants={item}
          className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl"
        >
          <span className="text-gradient">{PROFILE.name}</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-6 max-w-xl text-lg text-white/60 md:text-xl"
        >
          {PROFILE.role}
        </motion.p>

        <motion.p
          variants={item}
          className="mt-4 max-w-xl text-base leading-relaxed text-white/45"
        >
          {PROFILE.tagline}
        </motion.p>

        <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#projects"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-ink-950 transition-transform hover:scale-[1.03] active:scale-95"
          >
            Xem dự án
          </a>
          <a
            href="#contact"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
          >
            Liên hệ
          </a>
          <span className="ml-2 hidden font-mono text-xs text-white/30 sm:inline">
            ↓ Cuộn để khám phá
          </span>
        </motion.div>
      </motion.div>
      </motion.div>
    </section>
  )
}

export default memo(Hero)
