import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Megaphone, Percent, ArrowRight, Calendar } from 'lucide-react'
import { api } from '../api'
import { PageBackground } from '../components/PageBackground'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

function getDateRange(range) {
  const now = new Date()
  let end = now.toISOString().slice(0, 10)
  let start = end
  if (range === 'yesterday') { start = end = new Date(now - 86400000).toISOString().slice(0, 10) }
  if (range === '7days') start = new Date(now - 6 * 86400000).toISOString().slice(0, 10)
  if (range === '30days') start = new Date(now - 29 * 86400000).toISOString().slice(0, 10)
  return { start, end }
}

function KPICard({ label, value, sub, icon: Icon }) {
  return (
    <motion.div variants={item} className="glass-card p-6 glow group hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-white/65">{label}</span>
        <Icon size={18} className="text-blue-400/60" />
      </div>
      <div className="text-3xl font-semibold tracking-tight text-white tabular-nums">{value}</div>
      {sub && <div className="text-xs text-white/35 mt-2">{sub}</div>}
    </motion.div>
  )
}

function ShopRow({ rank, shop, onClick }) {
  const profit = shop.today_profit
  return (
    <motion.tr variants={item} className="border-b border-white/[0.03] hover:bg-white/[0.04] transition-colors group">
      <td className="py-4 px-6 text-sm text-white/55 tabular-nums">{rank}</td>
      <td className="py-4 px-6">
        <button onClick={() => onClick(shop)} className="text-sm font-medium text-white hover:text-blue-400 transition-colors text-left">{shop.shop_name}</button>
      </td>
      <td className={`py-4 px-6 text-sm tabular-nums font-medium ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        ¥ {Math.abs(profit).toLocaleString()}
      </td>
      <td className="py-4 px-6 text-sm text-white/70 tabular-nums">¥ {shop.total_profit.toLocaleString()}</td>
      <td className="py-4 px-6 text-sm text-white/70 tabular-nums">{shop.profit_rate?.toFixed(1)}%</td>
      <td className="py-4 px-6">
        <span className={`text-xs px-2.5 py-1 rounded-full ${shop.status === '盈利' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
          {shop.status === '盈利' ? '盈利' : '亏损'}
        </span>
      </td>
      <td className="py-4 px-6">
        <button onClick={() => onClick(shop)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">详情 <ArrowRight size={12} /></button>
      </td>
    </motion.tr>
  )
}

const TIME_LABELS = { today: '今日', yesterday: '昨日', '7days': '近 7 天', '30days': '近 30 天' }

export function Dashboard({ onSelectShop }) {
  const navigate = useNavigate()
  const [shops, setShops] = useState([])
  const [kpis, setKpis] = useState(null)
  const [timeRange, setTimeRange] = useState('today')
  const [dateStart, setDateStart] = useState(getDateRange('today').start)
  const [dateEnd, setDateEnd] = useState(getDateRange('today').end)
  const [periodLabel, setPeriodLabel] = useState('今日')

  useEffect(() => { load() }, [dateStart, dateEnd])

  async function load() {
    const [s, k] = await Promise.all([
      fetch(`/api/shops?start=${dateStart}&end=${dateEnd}`).then(r => r.json()),
      fetch(`/api/dashboard/kpis?start=${dateStart}&end=${dateEnd}`).then(r => r.json()),
    ])
    setShops(Array.isArray(s) ? s : []); setKpis(k)
  }

  function handleTimeRange(range) {
    setTimeRange(range)
    const { start, end } = getDateRange(range)
    setDateStart(start); setDateEnd(end)
    setPeriodLabel(TIME_LABELS[range] || `${start} ~ ${end}`)
  }

  function goShop(shop) { onSelectShop(shop); navigate(`/shop/${shop.shop_id}`) }
  const ranked = shops.map((s, i) => ({ ...s, rank: i + 1 }))

  return (
    <div className="relative min-h-screen bg-[#0a0a0f]">
      <PageBackground overlay />
      <nav className="relative z-10 sticky top-0 glass border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-8 h-14">
          <button onClick={() => navigate('/')} className="text-lg font-semibold tracking-tight text-white hover:text-blue-400 transition-colors">pun</button>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-white/70">经营总览</span>
            <button onClick={load} className="text-white/50 hover:text-white transition-colors">刷新</button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-10">
        {/* Time Filter + Period Label */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {Object.entries(TIME_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => handleTimeRange(key)}
                className={`px-4 py-1.5 rounded-full text-xs transition-all ${timeRange === key ? 'bg-white text-black font-medium' : 'border border-white/[0.09] text-white/70 hover:text-white'}`}>
                {label}
              </button>
            ))}
            <div className="w-px h-5 bg-white/[0.08] mx-1" />
            <Calendar size={14} className="text-white/40" />
            <input type="date" value={dateStart} onChange={e => { setDateStart(e.target.value); setTimeRange('') }}
              className="px-2.5 py-1.5 rounded-full border border-white/[0.09] bg-transparent text-xs text-white/70 outline-none focus:border-blue-400/30" />
            <span className="text-white/25 text-xs">至</span>
            <input type="date" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setTimeRange('') }}
              className="px-2.5 py-1.5 rounded-full border border-white/[0.09] bg-transparent text-xs text-white/70 outline-none focus:border-blue-400/30" />
          </div>
          <span className="text-xs text-white/35">统计时段：{periodLabel}</span>
        </div>

        {/* KPI Grid */}
        {kpis && (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <KPICard icon={DollarSign} label="总利润" value={`¥ ${kpis.total_profit.toLocaleString()}`} sub={periodLabel} />
            <KPICard icon={ShoppingCart} label="总销售额" value={`¥ ${kpis.total_sales.toLocaleString()}`} sub={periodLabel} />
            <KPICard icon={Megaphone} label="总推广支出" value={`¥ ${kpis.total_promo.toLocaleString()}`} sub={periodLabel} />
            <KPICard icon={Percent} label="平均利润率" value={`${(kpis.avg_profit_rate || 0).toFixed(2)}%`} sub={periodLabel} />
          </motion.div>
        )}

        {/* Shop Table */}
        <motion.div variants={container} initial="hidden" animate="show" className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
            <h2 className="text-base font-medium text-white">店铺排名</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] text-left">
                {['排名','店铺名称','当日利润','累计利润','利润率','状态',''].map(h => (
                  <th key={h} className="py-3 px-6 text-xs font-medium text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <motion.tbody variants={container} initial="hidden" animate="show">
              {ranked.map(s => <ShopRow key={s.shop_id} rank={s.rank} shop={s} onClick={goShop} />)}
            </motion.tbody>
          </table>
        </motion.div>
      </div>
    </div>
  )
}
