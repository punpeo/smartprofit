import { useEffect, useRef, useState } from 'react'

/** 检测元素是否在视口内 — 用于延迟/跳过离屏动画 */
export function useInView(options = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        obs.unobserve(el) // 进入一次后停止观察，避免重复计算
      }
    }, { threshold: 0.1, ...options })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, inView]
}
