import { memo } from 'react'
import { motion } from 'framer-motion'
import SectionHeading from './SectionHeading.jsx'
import { PROFILE } from '../../data/portfolio.js'

/** Section liên hệ: email + mạng xã hội. */
function Contact() {
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
          <a
            href={`mailto:${PROFILE.email}`}
            className="text-gradient font-medium underline-offset-8 hover:underline"
          >
            {PROFILE.email}
          </a>
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
    </section>
  )
}

export default memo(Contact)
