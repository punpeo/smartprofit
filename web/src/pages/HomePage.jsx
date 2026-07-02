import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, Layers, Zap, Server } from 'lucide-react'
import { PageBackground } from '../components/PageBackground'

const features = [
  { icon: BarChart3, title: '实时利润看板', desc: '多店铺 SKU 级利润一目了然' },
  { icon: Layers, title: '多店铺管理', desc: '统一管理，切换秒级响应' },
  { icon: Zap, title: '智能核算', desc: '推广、售后、补单自动分摊' },
]

export function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="relative h-screen flex flex-col overflow-hidden">
      <PageBackground overlay />

      {/* Nav */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="relative z-10 shrink-0 w-full max-w-6xl mx-auto flex items-center justify-between px-8 py-5"
      >
        <span className="text-xl font-semibold tracking-tight text-white">pun</span>
        <div className="flex items-center gap-6 text-sm text-white/75">
          <button onClick={() => navigate('/dashboard')} className="hover:text-white transition-colors">功能</button>
          <span className="hover:text-white transition-colors cursor-pointer">关于</span>
          <button onClick={() => navigate('/admin')} className="flex items-center gap-1.5 text-white/45 hover:text-white transition-colors">
            <Server size={13} /> 后台
          </button>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-all">进入系统</button>
        </div>
      </motion.nav>

      {/* Hero — 占据大部分空间 */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-blue-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            利润分析系统
          </div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
          className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.08] text-white mb-5">
          每一分利润<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-300">都有迹可循</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }}
          className="text-base text-white/70 max-w-lg leading-relaxed mb-8">
          打通多店铺数据，SKU 级利润精准核算。推广费、补单、售后成本自动分摊。
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}
          className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="group flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black font-medium text-base hover:bg-white/90 transition-all hover:scale-105 active:scale-95">
            进入系统 <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button className="px-6 py-2.5 rounded-full border border-white/12 text-white/75 text-base hover:border-white/25 hover:text-white transition-all">了解更多</button>
        </motion.div>
      </div>

      {/* Feature Cards — 底部紧凑 */}
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }}
        className="relative z-10 shrink-0 grid grid-cols-3 gap-4 max-w-3xl mx-auto px-6 pb-8">
        {features.map((f, i) => (
          <div key={i} className="glass-card p-4 flex flex-col items-center text-center group hover:border-white/[0.10] transition-all">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition-all">
              <f.icon size={16} className="text-blue-400" />
            </div>
            <h3 className="font-medium text-white text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-white/55 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
