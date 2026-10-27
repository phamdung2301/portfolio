import { useEffect, useState } from 'react'
import { PROFILE, PROJECTS, SKILLS } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'
import { TerminalBody } from './WorldTerminal.jsx'
import FlappyGame from './FlappyGame.jsx'

/**
 * S2 (máy tính khi ngồi) — cửa sổ máy tính với 5 tab, chỉ mở khi seated.
 *  - Terminal: dùng chung TerminalBody với terminal standalone (không
 *    lồng hai cửa sổ) — gõ lệnh thật từ data.
 *  - Code: 3 đoạn trích từ source thật (rút gọn, ghi rõ là trích), đọc
 *    được, đổi file bằng nút bấm.
 *  - Dự án: danh sách + chi tiết inline từ data; "Xem trên trang chính"
 *    thoát world và cuộn tới section Dự án.
 *  - Liên hệ: email + số điện thoại do user cung cấp, copy/mailto/Zalo.
 *  - Game: FlappyGame (canvas 2D, kỷ lục localStorage).
 * Phím 1–5 đổi tab (bỏ qua khi đang gõ trong input, để số không nhảy
 * vào terminal). Đóng cửa sổ thì vẫn ngồi; đứng dậy bằng nút riêng.
 */
const TABS = [
  { id: 'terminal', label: 'Terminal', key: '1' },
  { id: 'code', label: 'Code', key: '2' },
  { id: 'projects', label: 'Dự án', key: '3' },
  { id: 'contact', label: 'Liên hệ', key: '4' },
  { id: 'game', label: 'Game', key: '5' },
]

const CODE_FILES = [
  {
    name: 'CameraRig.jsx',
    code: `const KEYFRAMES = [
  { position: [0, 2.2, 8.5], target: [0, 2.0, 0] }, // hero
  { position: [-3.8, 2.0, 6.4], target: [-1.8, 1.5, 0] }, // about
  { position: [0, 2.5, 5.6], target: [0, 2.05, 0] }, // skills
]`,
  },
  {
    name: 'SkillCluster.jsx',
    code: `// Scale mượt khi hover hoặc được chọn từ UI (F5: active)
const targetScale = active ? 1.35 : 1
const s = THREE.MathUtils.damp(mesh.scale.x, targetScale, 8, delta)
mesh.scale.setScalar(s)`,
  },
  {
    name: 'usePortfolio.js',
    code: `export const usePortfolioStore = create((set) => ({
  activeSection: 'hero',
  hoveredSkill: null,
  setActiveSection: (activeSection) => set({ activeSection }),
}))`,
  },
]

export default function SeatedComputer() {
  const seatedTab = usePortfolioStore((s) => s.seatedTab)
  const setSeatedTab = usePortfolioStore((s) => s.setSeatedTab)
  const setComputerOpen = usePortfolioStore((s) => s.setComputerOpen)
  const setSeated = usePortfolioStore((s) => s.setSeated)
  const setWorldMode = usePortfolioStore((s) => s.setWorldMode)
  const setWorldExitTarget = usePortfolioStore(
    (s) => s.setWorldExitTarget,
  )
  const setActiveSection = usePortfolioStore((s) => s.setActiveSection)

  const [codeFile, setCodeFile] = useState(CODE_FILES[0])
  const [selectedProject, setSelectedProject] = useState(null)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    const onKey = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }
      const tab = TABS.find((t) => t.key === e.key)
      if (tab) setSeatedTab(tab.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSeatedTab])

  const copy = async (kind, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  const stand = () => {
    setComputerOpen(false)
    setSeated(false)
  }

  const gotoProjects = () => {
    setComputerOpen(false)
    setSeated(false)
    setWorldExitTarget('projects')
    setActiveSection('projects')
    setWorldMode(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Máy tính khi ngồi"
      className="flex max-h-[82vh] w-[92vw] max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/85 shadow-2xl shadow-black/60 backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
        <span className="h-3 w-3 rounded-full bg-green-400/80" />
        <span className="ml-1 font-mono text-xs text-white/60">
          dung@portfolio — máy tính
        </span>
        <div className="ml-auto flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSeatedTab(tab.id)}
              className={`rounded-full px-3 py-1 text-xs ${
                seatedTab === tab.id
                  ? 'bg-white text-ink-950'
                  : 'text-white/65 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.label} ({tab.key})
            </button>
          ))}
          <button
            type="button"
            onClick={stand}
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            Đứng dậy
          </button>
          <button
            type="button"
            onClick={() => setComputerOpen(false)}
            aria-label="Đóng máy tính (vẫn ngồi)"
            className="rounded-full px-2 py-1 text-sm text-white/60 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {seatedTab === 'terminal' && <TerminalBody />}

        {seatedTab === 'code' && (
          <div className="px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {CODE_FILES.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setCodeFile(f)}
                  className={`rounded-full px-3 py-1 font-mono text-xs ${
                    codeFile.name === f.name
                      ? 'bg-white text-ink-950'
                      : 'border border-white/20 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
            <p className="mt-3 font-mono text-xs text-white/40">
              Trích từ source thật của trang này (rút gọn).
            </p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-white/5 p-4 font-mono text-[13px] leading-relaxed text-white/85">
              {codeFile.code}
            </pre>
          </div>
        )}

        {seatedTab === 'projects' && (
          <div className="px-4 py-4">
            <div className="flex flex-col gap-2">
              {PROJECTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProject(p)}
                  className={`rounded-xl border px-4 py-3 text-left ${
                    selectedProject?.id === p.id
                      ? 'border-white/50 bg-white/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="font-medium text-white">{p.title}</span>
                  <span className="ml-2 font-mono text-xs text-white/50">
                    {p.year} · {p.stack.join(', ')}
                  </span>
                </button>
              ))}
            </div>
            {selectedProject && (
              <div className="mt-4 rounded-xl bg-white/5 p-4">
                <p className="text-sm leading-relaxed text-white/75">
                  {selectedProject.description}
                </p>
                <p className="mt-2 text-sm text-white/70">
                  <span className="text-white/90">Thử thách: </span>
                  {selectedProject.detail.challenge}
                </p>
                <p className="mt-1 text-sm text-white/70">
                  <span className="text-white/90">Cách làm: </span>
                  {selectedProject.detail.approach}
                </p>
                <button
                  type="button"
                  onClick={gotoProjects}
                  className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink-950"
                >
                  Xem trên trang chính
                </button>
              </div>
            )}
          </div>
        )}

        {seatedTab === 'contact' && (
          <div className="space-y-4 px-4 py-4 text-sm">
            <p className="text-white/80">
              {PROFILE.name} — {PROFILE.role}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-white/70">{PROFILE.email}</span>
              <button
                type="button"
                onClick={() => copy('email', PROFILE.email)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
              >
                {copied === 'email' ? 'Đã sao chép' : 'Sao chép'}
              </button>
              <a
                href={`mailto:${PROFILE.email}`}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-950"
              >
                Mở app mail
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-white/70">{PROFILE.phone}</span>
              <button
                type="button"
                onClick={() => copy('phone', PROFILE.phone)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
              >
                {copied === 'phone' ? 'Đã sao chép' : 'Sao chép'}
              </button>
              <a
                href={PROFILE.zaloUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
              >
                Nhắn Zalo
              </a>
            </div>
            <div className="flex items-center gap-3">
              <img
                src={PROFILE.zaloQr}
                alt="Mã QR Zalo"
                className="h-24 w-24 rounded-lg bg-white p-1"
              />
              <p className="text-xs text-white/60">
                Quét mã để kết bạn Zalo.
                <br />
                Trạng thái: {PROFILE.statusLine}
              </p>
            </div>
          </div>
        )}

        {seatedTab === 'game' && <FlappyGame />}
      </div>
    </div>
  )
}
