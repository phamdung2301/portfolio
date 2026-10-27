import { memo } from 'react'
import { motion } from 'framer-motion'

/**
 * Tiêu đề section dùng chung: số thứ tự + tiêu đề + đường kẻ gradient.
 * M4: tiêu đề hiện từng từ một — mỗi từ nằm trong mask overflow-hidden
 * và trồi lên từ yPercent 115 (cùng easing/duration với hero F3), stagger
 * 0.08s. Mask có pb để không cắt dấu/chân chữ tiếng Việt (vd. "ệ" trong
 * "Giới thiệu"). Số thứ tự và đường kẻ giữ nguyên, không animate.
 */
function SectionHeading({ index, title, accent }) {
  const words = title.split(' ')

  return (
    <div className="flex items-baseline gap-4">
      <span className="font-mono text-xs text-white/30">{index}</span>
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {words.map((word, i) => (
          <span
            key={i}
            className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom"
          >
            <motion.span
              className="inline-block"
              initial={{ yPercent: 115 }}
              whileInView={{ yPercent: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{
                duration: 0.7,
                delay: 0.05 + i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {word}
              {i < words.length - 1 ? '\u00A0' : ''}
            </motion.span>
          </span>
        ))}
        {accent && <span className="text-brand-400"> {accent}</span>}
      </h2>
      <span className="hairline mt-2 h-px flex-1" />
    </div>
  )
}

export default memo(SectionHeading)
