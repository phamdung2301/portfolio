import { Component } from 'react'

/**
 * S2 (chống đen trang) — ErrorBoundary bắt buộc cho toàn app.
 *
 * Bài học 2026-10-15 đã ghi nhưng trang này vẫn chưa có: React gỡ TOÀN
 * BỘ cây khi một chỗ throw trong render mà không có boundary → trang
 * đen hoàn toàn, không còn cả chữ, không biết lỗi ở đâu (đúng vụ
 * 2026-10-27: live đen cả giao diện, phải đoán mò qua bundle).
 * Boundary này bọc toàn bộ App: lỗi ở Scene 3D hay Overlay 2D đều hiện
 * thông báo + message + component stack lên màn hình, kèm nút tải lại —
 * thay vì đen thui. Nó KHÔNG bắt được lỗi ở tầng import module (lỗi đó
 * sập trước khi React mount); nếu sau khi có boundary mà trang vẫn đen
 * thì nguyên nhân nằm ở tầng import, cần bisect import tiếp.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    // eslint-disable-next-line no-console
    console.error('Portfolio render error:', error, info)
  }

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children
    const stack = (info?.componentStack || '')
      .split('\n')
      .slice(0, 25)
      .join('\n')
    return (
      <div className="min-h-screen w-full bg-[#07070a] px-6 py-10 text-white">
        <h1 className="text-2xl font-semibold">
          Trang gặp lỗi khi tải
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
          Đây là màn hình lỗi thay cho trang đen hoàn toàn — nó cho biết
          chính xác lỗi gì để sửa, thay vì phải đoán. Nhấn tải lại để thử
          lại.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black"
        >
          Tải lại trang
        </button>
        <p className="mt-6 font-mono text-sm text-red-300">
          {error.message || String(error)}
        </p>
        {stack && (
          <pre className="mt-4 max-w-4xl overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-white/5 p-4 font-mono text-xs leading-relaxed text-white/60">
            {stack}
          </pre>
        )}
      </div>
    )
  }
}
