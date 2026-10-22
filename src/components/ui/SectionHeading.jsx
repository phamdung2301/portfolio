import { memo } from 'react'

/**
 * Tiêu đề section dùng chung: số thứ tự + tiêu đề + đường kẻ gradient.
 */
function SectionHeading({ index, title, accent }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="font-mono text-xs text-white/30">{index}</span>
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
        {accent && <span className="text-brand-400"> {accent}</span>}
      </h2>
      <span className="hairline mt-2 h-px flex-1" />
    </div>
  )
}

export default memo(SectionHeading)
