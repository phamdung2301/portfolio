import { memo } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import SectionHeading from './SectionHeading.jsx'
import { PROJECTS } from '../../data/portfolio.js'

/** Section danh sách dự án, mỗi thẻ có gradient theo màu nhấn riêng. */
function Projects() {
  return (
    <section id="projects" className="scroll-mt-24">
      <SectionHeading index="03" title="Dự án tiêu biểu" />

      <div className="mt-10 space-y-5">
        {PROJECTS.map((project, i) => (
          <motion.article
            key={project.id}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="group glass-panel relative overflow-hidden rounded-3xl p-7 md:p-9"
          >
            {/* Quầng sáng gradient khi rê chuột */}
            <span
              className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
              style={{ background: project.accent }}
            />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="font-mono text-xs text-white/30">{project.year}</span>
                <h3 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">
                  {project.title}
                </h3>
              </div>
              <span
                className="rounded-full px-3 py-1 font-mono text-xs"
                style={{
                  color: project.accent,
                  background: `${project.accent}1a`,
                }}
              >
                {project.stack[0]}
              </span>
            </div>

            <p className="relative mt-4 max-w-2xl text-sm leading-relaxed text-white/50 md:text-base">
              {project.description}
            </p>

            <ul className="relative mt-6 flex flex-wrap gap-2">
              {project.stack.map((tech) => (
                <li
                  key={tech}
                  className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-white/50"
                >
                  {tech}
                </li>
              ))}
            </ul>

            {/* Nút demo live (Vercel) kèm biểu tượng live web */}
            {project.demoLink && (
              <a
                href={project.demoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition-all hover:border-white/40 hover:bg-white/10 hover:text-white"
              >
                Xem website
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </motion.article>
        ))}
      </div>
    </section>
  )
}

export default memo(Projects)
