import { memo } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { PROFILE } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
}

// F3 — masked-line rise: mỗi dòng nằm trong một mặt nạ overflow-hidden,
// nội dung trồi lên từ yPercent 115 (không phải fade cả khối như trước).
// Duration 1.25s, ease power4.out. Mặt nạ của h1 có padding-bottom để
// không cắt chân chữ có dấu móc (chữ 'g' trong "Dũng").
const line = {
  hidden: { yPercent: 115 },
  show: {
    yPercent: 0,
    transition: { duration: 1.25, ease: [0.16, 1, 0.3, 1] },
  },
}

/** Section mở đầu: tên, vai trò và lời giới thiệu ngắn. */
function Hero() {
  // S2: nút vào Thế giới tự do — đường vào chắc chắn nhất (DOM thật),
  // vì click mesh 3D có thể bị lớp Overlay chặn ở chế độ cuộn.
  const setWorldMode = usePortfolioStore((s) => s.setWorldMode)
  // GĐ1 (code-split): HUD world là chunk riêng — tải trước trong lúc
  // người dùng rê chuột/focus nút để lần bấm không phải chờ mạng.
  const preloadWorld = () => import('./WorldHUD.jsx')

  // S1: hero scrub-out — khi hero cuộn đi, tiêu đề trôi lên + mờ dần
  // (cinematic exit, scrub theo scroll thật, không phải once:true).
  // Lớp ngoài này chỉ cầm opacity/y scrub; lớp trong giữ variants
  // entrance, để 2 driver không tranh cùng 1 property trên cùng 1 element.
  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 420], [1, 0.15])
  const heroY = useTransform(scrollY, [0, 420], [0, -70])

  return (
    <section id="hero" className="pointer-events-auto flex min-h-[80vh] flex-col justify-center scroll-mt-24">
      <motion.div style={{ opacity: heroOpacity, y: heroY }}>
      <motion.div variants={container} initial="hidden" animate="show">
        <div className="mb-5 overflow-hidden">
          <motion.p
            variants={line}
            className="font-mono text-xs uppercase tracking-[0.3em] text-brand-400"
          >
            Portfolio · 2026
          </motion.p>
        </div>

        <div className="overflow-hidden pb-[0.12em]">
          <motion.h1
            variants={line}
            className="max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl"
          >
            <span className="text-gradient">{PROFILE.name}</span>
          </motion.h1>
        </div>

        <div className="mt-6 overflow-hidden">
          <motion.p
            variants={line}
            className="max-w-xl text-lg text-white/60 md:text-xl"
          >
            {PROFILE.role}
          </motion.p>
        </div>

        <div className="mt-4 overflow-hidden">
          <motion.p
            variants={line}
            className="max-w-xl text-base leading-relaxed text-white/45"
          >
            {PROFILE.tagline}
          </motion.p>
        </div>

        <div className="mt-10 overflow-hidden">
        <motion.div variants={line} className="flex flex-wrap items-center gap-4">
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
          <button
            type="button"
            onClick={() => setWorldMode(true)}
            onPointerEnter={preloadWorld}
            onFocus={preloadWorld}
            className="rounded-full border border-brand-400/50 px-6 py-3 text-sm font-medium text-brand-300 transition-colors hover:bg-brand-400/10 hover:text-white"
          >
            Vào thế giới 3D →
          </button>
          <span className="ml-2 hidden font-mono text-xs text-white/30 sm:inline">
            ↓ Cuộn để khám phá
          </span>
        </motion.div>
        </div>
      </motion.div>
      </motion.div>
    </section>
  )
}

export default memo(Hero)
