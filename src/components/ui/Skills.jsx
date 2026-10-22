import { memo } from 'react'
import { motion } from 'framer-motion'
import SectionHeading from './SectionHeading.jsx'
import { SKILLS } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'

/**
 * Section kỹ năng.
 * Thẻ trong UI và khối 3D dùng chung `SKILLS`, nên `hoveredSkill` từ Canvas
 * sẽ làm thẻ tương ứng sáng lên (đồng bộ hai chiều).
 */
function Skills() {
  const hoveredSkill = usePortfolioStore((s) => s.hoveredSkill)

  return (
    <section id="skills" className="scroll-mt-24">
      <SectionHeading index="02" title="Kỹ năng" accent="(hover vào khối 3D)" />

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SKILLS.map((skill, i) => {
          const isHot = hoveredSkill === skill.id
          return (
            <motion.article
              key={skill.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.05 }}
              animate={isHot ? { scale: 1.03 } : { scale: 1 }}
              style={isHot ? { borderColor: skill.accent } : undefined}
              className="group glass-panel relative overflow-hidden rounded-2xl border border-white/8 p-6 transition-colors duration-300"
            >
              {/* Vệt sáng khi hover từ phía Canvas */}
              <span
                className="absolute inset-x-0 -top-px h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `linear-gradient(90deg, transparent, ${skill.accent}, transparent)`,
                  opacity: isHot ? 1 : undefined,
                }}
              />

              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-medium text-white/90">{skill.name}</h3>
                <span
                  className="font-mono text-xs"
                  style={{ color: skill.accent }}
                >
                  {skill.level}%
                </span>
              </div>

              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: skill.accent }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${skill.level}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.15 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}

export default memo(Skills)
