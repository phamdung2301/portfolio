import { useState } from 'react'
import { PROFILE, SKILLS } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'
import useProfileAssets from '../../hooks/useProfileAssets.js'

/**
 * S2 (card visit từ khung ảnh) — thông tin do chính user cung cấp
 * ngày 2026-10-27: ảnh chân dung, số điện thoại, trạng thái
 * "direct to work" và QR Zalo. Không đưa LinkedIn/X lên card vì hai
 * link trong data hiện chỉ là trang chủ chung, chưa phải profile thật.
 * Top 3 kỹ năng lấy theo mức độ trong data (React, Tailwind, Three.js).
 */
export default function PhotoCard() {
  const setPhotoCardOpen = usePortfolioStore((s) => s.setPhotoCardOpen)
  const [copied, setCopied] = useState(null)
  // GĐ1: ảnh + QR tải trễ từ chunk riêng — vẽ placeholder xám nhấp nháy
  // trong khoảnh khắc chunk chưa về (thường <100ms sau khi vào world).
  const assets = useProfileAssets()

  const topSkills = [...SKILLS]
    .sort((a, b) => b.level - a.level)
    .slice(0, 3)

  const copy = async (kind, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Card visit"
      className="w-[92vw] max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#101018] shadow-2xl shadow-black/60"
    >
      <div className="flex items-start justify-between bg-gradient-to-r from-brand-400/20 to-transparent px-5 pt-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-brand-300">
          Card visit
        </p>
        <button
          type="button"
          onClick={() => setPhotoCardOpen(false)}
          aria-label="Đóng card visit"
          className="rounded-full px-2 py-1 text-sm text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-4 px-5 pb-5 pt-3">
        {assets?.portrait ? (
          <img
            src={assets.portrait}
            alt={`Ảnh chân dung ${PROFILE.name}`}
            className="h-44 w-32 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="h-44 w-32 shrink-0 animate-pulse rounded-xl bg-white/5" />
        )}
        <div className="min-w-0">
          <h3 className="text-xl font-semibold leading-tight text-white">
            {PROFILE.name}
          </h3>
          <p className="mt-1 text-sm text-white/70">{PROFILE.role}</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs text-green-300">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            {PROFILE.statusLine}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {topSkills.map((s) => (
              <span
                key={s.id}
                className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80"
              >
                {s.name} {s.level}%
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-white/10 px-5 py-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/70">{PROFILE.phone}</span>
          <button
            type="button"
            onClick={() => copy('phone', PROFILE.phone)}
            className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            {copied === 'phone' ? 'Đã sao chép' : 'Sao chép'}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-white/70">{PROFILE.email}</span>
          <button
            type="button"
            onClick={() => copy('email', PROFILE.email)}
            className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            {copied === 'email' ? 'Đã sao chép' : 'Sao chép'}
          </button>
        </div>
        <p className="text-white/60">
          {PROFILE.location} ·{' '}
          <a
            href="https://github.com/phamdung2301"
            target="_blank"
            rel="noreferrer noopener"
            className="text-brand-300 hover:underline"
          >
            github.com/phamdung2301
          </a>
        </p>
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
        {assets?.zaloQr ? (
          <img
            src={assets.zaloQr}
            alt="Mã QR Zalo"
            className="h-24 w-24 rounded-lg bg-white p-1"
          />
        ) : (
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-lg bg-white/5" />
        )}
        <div className="text-sm">
          <p className="font-medium text-white">Kết bạn Zalo</p>
          <p className="mt-1 text-white/60">
            Quét mã QR để nhắn tin trực tiếp.
          </p>
          <a
            href={PROFILE.zaloUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-medium text-ink-950"
          >
            Mở Zalo
          </a>
        </div>
      </div>
    </div>
  )
}
