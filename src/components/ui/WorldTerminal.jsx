import { useEffect, useRef, useState } from 'react'
import { PROFILE, PROJECTS, SKILLS } from '../../data/portfolio.js'
import { usePortfolioStore } from '../../store/usePortfolio.js'
import { copyWorldEmail } from '../world/actions.js'

/**
 * S2 — terminal thật trong Thế giới tự do.
 * Mọi output lấy từ data thật (SKILLS/PROJECTS/PROFILE), không hardcode
 * văn bản trang trí. DOM thật (không phải texture 3D) để chữ nét, gõ
 * thật và đọc màn hình được. Esc để đóng do HUD xử lý tập trung
 * (tránh double-handler: terminal không tự bắt Esc).
 */
const COMMANDS = [
  'help',
  'whoami',
  'skills',
  'projects',
  'contact',
  'copy',
  'goto',
  'play',
  'clear',
  'exit',
  'sudo',
]

const SECTIONS = {
  hero: 'hero',
  'trang-chu': 'hero',
  about: 'about',
  'gioi-thieu': 'about',
  skills: 'skills',
  'ky-nang': 'skills',
  projects: 'projects',
  'du-an': 'projects',
  contact: 'contact',
  'lien-he': 'contact',
}

export default function WorldTerminal() {
  const setTerminalOpen = usePortfolioStore((s) => s.setTerminalOpen)
  const setWorldMode = usePortfolioStore((s) => s.setWorldMode)
  const setWorldExitTarget = usePortfolioStore(
    (s) => s.setWorldExitTarget,
  )
  const setActiveSection = usePortfolioStore((s) => s.setActiveSection)
  const [lines, setLines] = useState([
    { kind: 'out', text: `Chào mừng tới terminal của ${PROFILE.name}.` },
    { kind: 'out', text: `Gõ 'help' để xem lệnh. Gõ 'goto skills' để quay về trang chính.` },
  ])
  const [value, setValue] = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const outRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    outRef.current?.scrollTo(0, outRef.current.scrollHeight)
  }, [lines])

  const print = (newLines) =>
    setLines((prev) => [...prev, ...newLines])

  const run = (raw) => {
    const cmdline = raw.trim()
    print([{ kind: 'in', text: `$ ${cmdline}` }])
    if (!cmdline) return
    setHistory((h) => [cmdline, ...h])
    setHistIdx(-1)
    const [cmd, ...args] = cmdline.split(/\s+/)
    switch (cmd) {
      case 'help':
        print([
          {
            kind: 'out',
            text: 'help, whoami, skills, projects, contact, copy, goto <section>, play, clear, exit',
          },
        ])
        break
      case 'whoami':
        print([
          {
            kind: 'out',
            text: `${PROFILE.name} — ${PROFILE.role} — ${PROFILE.location}`,
          },
        ])
        break
      case 'skills':
        print(
          SKILLS.map((s) => ({ kind: 'out', text: `• ${s.name} — ${s.level}%` })),
        )
        break
      case 'projects':
        print(
          PROJECTS.map((p) => ({
            kind: 'out',
            text: `• ${p.title} (${p.year}) — ${p.stack.join(', ')}`,
          })),
        )
        break
      case 'contact':
        print([{ kind: 'out', text: `Email: ${PROFILE.email} (gõ 'copy' để sao chép)` }])
        break
      case 'copy':
        copyWorldEmail()
        print([{ kind: 'out', text: `Đã sao chép: ${PROFILE.email}` }])
        break
      case 'goto': {
        const target = SECTIONS[args[0]]
        if (!target) {
          print([
            {
              kind: 'out',
              text: 'Section không rõ. Thử: hero, about, skills, projects, contact.',
            },
          ])
        } else {
          print([{ kind: 'out', text: `Đang thoát thế giới, tới ${target}…` }])
          setTerminalOpen(false)
          setWorldExitTarget(target)
          setActiveSection(target)
          setWorldMode(false)
        }
        break
      }
      case 'play':
        print([
          {
            kind: 'out',
            text: 'Bạn đang ở trong thế giới rồi — đi tới các khối kỹ năng, nhấn E để thu thập đủ 7 khối.',
          },
        ])
        break
      case 'clear':
        setLines([])
        break
      case 'exit':
        setTerminalOpen(false)
        break
      case 'sudo':
        print([{ kind: 'out', text: 'Bạn không có quyền sudo ở đây đâu 😄' }])
        break
      default:
        print([
          {
            kind: 'out',
            text: `Lệnh không rõ: ${cmd} — gõ 'help' để xem danh sách.`,
          },
        ])
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const prefix = value.trim()
      if (!prefix) return
      const match = COMMANDS.find((c) => c.startsWith(prefix))
      if (match) setValue(match + (match === 'goto' ? ' ' : ''))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next)
      setValue(history[next])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx <= 0) {
        setHistIdx(-1)
        setValue('')
      } else {
        const next = histIdx - 1
        setHistIdx(next)
        setValue(history[next])
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Terminal trong thế giới 3D"
      className="w-[92vw] max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-black/85 shadow-2xl shadow-black/60 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
          <span className="h-3 w-3 rounded-full bg-green-400/80" />
          <span className="ml-2 font-mono text-xs text-white/60">
            dung@portfolio: ~
          </span>
        </div>
        <button
          type="button"
          onClick={() => setTerminalOpen(false)}
          aria-label="Đóng terminal"
          className="rounded-full px-3 py-1 text-sm text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div
        ref={outRef}
        className="h-72 overflow-y-auto px-4 py-3 font-mono text-sm leading-relaxed"
      >
        {lines.map((line, i) => (
          <p
            key={i}
            className={
              line.kind === 'in' ? 'text-brand-300' : 'text-white/80'
            }
          >
            {line.text}
          </p>
        ))}
      </div>

      <form
        className="flex items-center gap-2 border-t border-white/10 px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          run(value)
          setValue('')
        }}
      >
        <span className="shrink-0 font-mono text-sm text-brand-300">
          dung@portfolio:~$
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Nhập lệnh terminal"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-white outline-none"
        />
      </form>
    </div>
  )
}
