import { memo } from 'react'
import { SKILLS } from '../../data/portfolio.js'

/**
 * M4 — Editorial marquee band.
 * The skill names are already listed in the Skills section, so this band
 * is pure texture: aria-hidden so screen readers don't hear the list twice.
 * Two identical copies + translateX(-50%) = a seamless loop. The track
 * pauses on hover and stops entirely under prefers-reduced-motion
 * (see .marquee-track in index.css).
 */
function MarqueeBand() {
  const Row = () => (
    <div className="flex shrink-0 items-center">
      {SKILLS.map((skill) => (
        <span key={skill.id} className="flex items-center whitespace-nowrap">
          <span className="font-display mx-6 text-2xl font-semibold text-white/20 md:text-3xl">
            {skill.name}
          </span>
          <span className="text-lg text-brand-400/70">✦</span>
        </span>
      ))}
    </div>
  )

  return (
    <div
      aria-hidden="true"
      className="marquee -mx-6 overflow-hidden border-y border-white/10 py-5 md:-mx-10"
    >
      <div className="marquee-track">
        <Row />
        <Row />
      </div>
    </div>
  )
}

export default memo(MarqueeBand)
