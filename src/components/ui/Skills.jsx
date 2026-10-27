import { memo } from 'react'
import { motion } from 'framer-motion'
import SectionHeading from './SectionHeading.jsx'
import { SKILLS } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'

/**
 * Section kỹ năng.
 *
 * F5 — đường đi đầy đủ cho bàn phím/cảm ứng, không chỉ chuột trên Canvas:
 *  - Trước đây đồng bộ chỉ một chiều: hover khối 3D → thẻ sáng lên.
 *    Thẻ trong UI không phải control (không focus được, không bấm được),
 *    và hover/bấm thẻ cũng không làm khối 3D phản ứng lại.
 *  - Giờ mỗi thẻ là một control thật: tabIndex 0 + role="button" +
 *    aria-pressed + aria-label, Enter/Space để chọn, focus/hover/bấm
 *    đều ghi `hoveredSkill` vào store → khối 3D tương ứng sáng lên
 *    (xem SkillCluster: orb đọc store, không chỉ hover cục bộ).
 *  - Trên cảm ứng: chạm vào thẻ = chọn, khối 3D sáng lên — không cần
 *    hover (vốn không tồn tại trên cảm ứng).
 *  - Thẻ vẫn là <article> (giữ h3 ngữ nghĩa) thay vì <button> bọc h3
 *    (không hợp lệ: button chỉ chứa phrasing content).
 */
function Skills() {
  const hoveredSkill = usePortfolioStore((s) => s.hoveredSkill)
  const setHoveredSkill = usePortfolioStore((s) => s.setHoveredSkill)
  const setActiveSection = usePortfolioStore((s) => s.setActiveSection)

  const select = (skill) => {
    setHoveredSkill(skill.id)
    setActiveSection('skills')
  }

  return (
    <section id="skills" className="pointer-events-auto scroll-mt-24">
      <SectionHeading
        index="02"
        title="Kỹ năng"
        accent="(bấm khối 3D hoặc chọn thẻ bên dưới)"
      />

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SKILLS.map((skill, i) => {
          const isHot = hoveredSkill === skill.id
          return (
            <motion.article
              key={skill.id}
              id={`skill-${skill.id}`}
              tabIndex={0}
              role="button"
              aria-pressed={isHot}
              aria-label={`Kỹ năng ${skill.name}, mức độ ${skill.level}% — chọn để làm nổi bật khối 3D tương ứng`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.05 }}
              animate={isHot ? { scale: 1.03 } : { scale: 1 }}
              style={isHot ? { borderColor: skill.accent } : undefined}
              className="group glass-panel relative cursor-pointer overflow-hidden rounded-2xl border border-white/8 p-6 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              onFocus={() => select(skill)}
              onBlur={() => setHoveredSkill(null)}
              onMouseEnter={() => select(skill)}
              onMouseLeave={() => setHoveredSkill(null)}
              onClick={() => select(skill)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  select(skill)
                } else if (e.key === ' ') {
                  // Space trên phần tử tùy chỉnh không tự kích hoạt
                  // click, và mặc định sẽ cuộn trang — chặn cả hai.
                  e.preventDefault()
                  select(skill)
                }
              }}
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
