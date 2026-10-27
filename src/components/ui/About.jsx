import { memo } from 'react'
import { motion } from 'framer-motion'
import SectionHeading from './SectionHeading.jsx'
import { ABOUT, EXPERIENCE } from '../../data/portfolio.js'

/** Section giới thiệu: mô tả + kinh nghiệm làm việc. */
function About() {
  return (
    <section id="about" className="pointer-events-auto scroll-mt-24">
      <SectionHeading index="01" title="Giới thiệu" />

      <div className="mt-10 grid gap-12 md:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          {ABOUT.map((paragraph, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-base leading-relaxed text-white/55 md:text-lg"
            >
              {paragraph}
            </motion.p>
          ))}
        </div>

        <motion.ul
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="glass-panel space-y-5 rounded-2xl p-7"
        >
          {EXPERIENCE.map((job) => (
            <li key={job.role} className="border-l border-white/10 pl-4">
              <p className="text-sm font-medium text-white/90">{job.role}</p>
              <p className="mt-0.5 text-sm text-brand-400/80">{job.company}</p>
              <p className="mt-1 font-mono text-xs text-white/30">{job.period}</p>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}

export default memo(About)
