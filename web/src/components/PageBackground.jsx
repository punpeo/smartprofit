import FloatingLines from './FloatingLines'

// 模块级常量 — 避免每次渲染创建新数组导致 FloatingLines 无限重跑
const WAVES = ['top', 'middle', 'bottom']
const COUNTS = [6, 8, 5]
const DISTS = [6, 7, 5]
const GRADIENT = ['#3b82f6', '#6366f1', '#8b5cf6']

/** 通用页面背景：Three.js 浮游线条 + 暗色遮罩 */
export function PageBackground({ gradient, overlay = true }) {
  return (
    <div className="absolute inset-0 z-0">
      <FloatingLines
        linesGradient={gradient || GRADIENT}
        enabledWaves={WAVES}
        lineCount={COUNTS}
        lineDistance={DISTS}
        animationSpeed={0.8}
        interactive
        parallax
        bendRadius={4}
        bendStrength={-1.5}
        mixBlendMode="screen"
      />
      {overlay && (
        <>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] rounded-full bg-blue-500/3 blur-[120px]" />
            <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] rounded-full bg-indigo-500/3 blur-[100px]" />
          </div>
          <div className="absolute inset-0 bg-[#0a0a0f]/80" />
        </>
      )}
    </div>
  )
}
