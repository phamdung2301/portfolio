import { useEffect, useState } from 'react'

/**
 * GĐ1 (hiệu năng): ảnh chân dung + QR Zalo là ~288KB base64 trong
 * data/assets.js. Nhúng thẳng vào PROFILE khiến toàn bộ khối này nằm
 * trong bundle chính và chặn lần tương tác đầu. Giờ assets.js thành
 * chunk riêng, chỉ được tải khi mở card visit / tab Liên hệ (hoặc
 * preload khi vừa vào world).
 *
 * Trả về { portrait, zaloQr } hoặc null khi đang tải — component gọi
 * vẽ placeholder thay ảnh cho tới khi có giá trị.
 */
export function preloadProfileAssets() {
  return import('../data/assets.js')
}

export default function useProfileAssets() {
  const [assets, setAssets] = useState(null)

  useEffect(() => {
    let alive = true
    preloadProfileAssets().then((m) => {
      if (alive) setAssets({ portrait: m.PORTRAIT_DATA, zaloQr: m.ZALO_QR_DATA })
    })
    return () => {
      alive = false
    }
  }, [])

  return assets
}
