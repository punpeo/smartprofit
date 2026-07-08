import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Megaphone, Percent, ArrowRight, Calendar, Upload, Loader2, CheckCircle, X, Wallet, Store, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { PageBackground } from '../components/PageBackground'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const card = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const rowVariant = { hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0, transition: { duration: 0.2 } } }

function getDateRange(range) {
  const now = new Date()
  let end = now.toISOString().slice(0, 10)
  let start = end
  if (range === 'yesterday') { start = end = new Date(now - 86400000).toISOString().slice(0, 10) }
  if (range === '7days') start = new Date(now - 6 * 86400000).toISOString().slice(0, 10)
  if (range === '30days') start = new Date(now - 29 * 86400000).toISOString().slice(0, 10)
  return { start, end }
}

function SummaryCard({ icon: Icon, label, value, sub, accent, accentBg }) {
  return (
    <motion.div variants={card} className="glass-card p-4 flex flex-col gap-2 group hover:border-white/[0.09] transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/55 uppercase tracking-wider">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentBg || 'bg-white/[0.03]'}`}>
          <Icon size={13} className={accent || 'text-white/55'} />
        </div>
      </div>
      <div className="text-lg font-semibold text-white tabular-nums tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-white/65 leading-relaxed">{sub}</div>}
    </motion.div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-6 h-6 rounded-full border-2 border-blue-400/20 border-t-blue-400 animate-spin" />
        <span className="text-sm text-white/65">加载中...</span>
      </div>
    </div>
  )
}

const TIME_LABELS = { today: '今日', yesterday: '昨日', '7days': '近 7 天', '30days': '近 30 天' }

export function Dashboard({ onSelectShop }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [shops, setShops] = useState([])
  const [kpis, setKpis] = useState(null)
  const [timeRange, setTimeRange] = useState('yesterday')
  const [dateStart, setDateStart] = useState(getDateRange('yesterday').start)
  const [dateEnd, setDateEnd] = useState(getDateRange('yesterday').end)
  const [periodLabel, setPeriodLabel] = useState('昨日')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 14

  useEffect(() => { load() }, [dateStart, dateEnd])

  async function load() {
    setLoading(true)
    const [s, k] = await Promise.all([
      fetch(`/api/shops?start=${dateStart}&end=${dateEnd}`).then(r => r.json()),
      fetch(`/api/dashboard/kpis?start=${dateStart}&end=${dateEnd}`).then(r => r.json()),
    ])
    setShops(Array.isArray(s) ? s : []); setKpis(k); setPage(1); setLoading(false)
  }

  function handleTimeRange(range) {
    setTimeRange(range)
    const { start, end } = getDateRange(range)
    setDateStart(start); setDateEnd(end)
    setPeriodLabel(TIME_LABELS[range] || `${start} ~ ${end}`)
  }

  async function handleImport(e) {
    const files = Array.from(e.target.files); if (files.length === 0) return
    setImporting(true); setImportResult(null)
    const fd = new FormData(); files.forEach(f => fd.append('files', f))
    try {
      const resp = await fetch('/api/import/batch', { method: 'POST', body: fd })
      const data = await resp.json()
      setImportResult(data.results || {})
      load()
    } catch { setImportResult({ error: true }) }
    setImporting(false); e.target.value = ''
  }

  function goShop(shop) { onSelectShop(shop); navigate(`/shop/${shop.shop_id}`) }
  const ranked = shops.map((s, i) => ({ ...s, rank: i + 1 }))
  const totalPages = Math.max(1, Math.ceil(ranked.length / pageSize))
  const paged = ranked.slice((page - 1) * pageSize, page * pageSize)

  if (loading && !kpis) return <LoadingSkeleton />

  return (
    <div className="relative h-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
      <PageBackground overlay />
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.zip" multiple onChange={handleImport} className="hidden" />

      {/* ── Nav ── */}
      <nav className="relative z-10 shrink-0 glass border-b border-white/[0.07]">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between px-8 h-14">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => navigate('/')} className="text-lg font-semibold tracking-tight text-white hover:text-blue-400 transition-colors shrink-0">pun</button>
            <span className="text-white/25 shrink-0">|</span>
            <h1 className="text-sm font-medium text-white/80">经营总览</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-white/25">{periodLabel} · 更新于 {new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</span>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all"><Upload size={12} /> 导入数据</button>
            <button onClick={load} className="text-xs text-white/50 hover:text-white transition-colors">刷新</button>
          </div>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="relative z-10 flex-1 flex gap-6 max-w-[1440px] mx-auto px-8 py-6 w-full min-h-0 overflow-hidden">

        {/* ═══════════ 左侧面板 ═══════════ */}
        <aside className="w-[340px] shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto">

          {/* 总利润 Hero */}
          {kpis && (
            <motion.div variants={card} initial="hidden" animate="show"
              className={`glass-card p-5 shrink-0 border ${(kpis.total_profit ?? 0) >= 0 ? 'border-emerald-400/10' : 'border-red-400/10'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Wallet size={15} className={(kpis.total_profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                <span className="text-[11px] text-white/55 uppercase tracking-wider">总利润</span>
              </div>
              <div className={`text-3xl font-semibold tracking-tight tabular-nums ${(kpis.total_profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ¥ {kpis.total_profit.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-white/65">
                {(kpis.total_profit ?? 0) >= 0 ? <TrendingUp size={11} className="text-emerald-400" /> : <TrendingDown size={11} className="text-red-400" />}
                {periodLabel}
              </div>
            </motion.div>
          )}

          {/* KPI 汇总卡片组 */}
          {kpis && (
            <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} initial="hidden" animate="show"
              className="grid grid-cols-2 gap-3">
              <SummaryCard icon={DollarSign} label="总销售额" value={`¥ ${kpis.total_sales.toLocaleString()}`} sub={periodLabel} accent="text-blue-400" accentBg="bg-blue-500/10" />
              <SummaryCard icon={ShoppingCart} label="总推广支出" value={`¥ ${kpis.total_promo.toLocaleString()}`} sub={periodLabel} accent="text-amber-400" accentBg="bg-amber-500/10" />
              <SummaryCard icon={Percent} label="平均利润率" value={`${(kpis.avg_profit_rate || 0).toFixed(2)}%`} sub={periodLabel} accent="text-cyan-400" accentBg="bg-cyan-500/10" />
              <SummaryCard icon={Store} label="店铺数量" value={`${shops.length} 家`} sub="含盈利/亏损" accent="text-purple-400" accentBg="bg-purple-500/10" />
            </motion.div>
          )}

          {/* Import Toast */}
          {importing && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-400/5 border border-blue-400/10 text-sm text-blue-400/80">
              <Loader2 size={15} className="animate-spin" /> 正在导入...
            </div>
          )}
          {importResult && !importing && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="px-4 py-3 rounded-xl bg-emerald-400/5 border border-emerald-400/10 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={15} className="text-emerald-400" />
                <span className="text-emerald-400/80 text-xs font-medium">导入完成</span>
                <button onClick={() => setImportResult(null)} className="ml-auto p-1 rounded hover:bg-white/[0.05]"><X size={12} className="text-white/30" /></button>
              </div>
              <div className="text-xs text-white/40">
                销售 {importResult.sales || 0} · 售后 {importResult.aftersale || 0} · 推广 {importResult.promotion || 0} · 补单 {importResult.fill_order || 0}
              </div>
            </motion.div>
          )}
        </aside>

        {/* ═══════════ 右侧：店铺排名 ═══════════ */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* 时间筛选 */}
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <div className="flex items-center gap-1.5">
              {Object.entries(TIME_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => handleTimeRange(key)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${timeRange === key ? 'bg-white text-black font-medium' : 'border border-white/[0.09] text-white/70 hover:text-white hover:border-white/12'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-white/[0.09] mx-1" />
            <Calendar size={14} className="text-white/40" />
            <input type="date" value={dateStart} onChange={e => { setDateStart(e.target.value); setTimeRange('') }}
              className="w-[130px] px-2.5 py-1.5 rounded-full border border-white/[0.09] bg-transparent text-xs text-white/75 outline-none focus:border-blue-400/30" />
            <span className="text-white/55 text-xs">至</span>
            <input type="date" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setTimeRange('') }}
              className="w-[130px] px-2.5 py-1.5 rounded-full border border-white/[0.09] bg-transparent text-xs text-white/75 outline-none focus:border-blue-400/30" />
            <div className="flex-1" />
            <span className="text-xs text-white/65">共 {shops.length} 家店铺</span>
          </div>

          {/* 店铺排名表格 */}
          <div className="glass-card flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* 表头 */}
            <div className="shrink-0 border-b border-white/[0.07] bg-[#0e0e14] sticky top-0 z-10">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[50px]" />
                  <col className="w-[160px]" />
                  <col className="w-[120px]" />
                  <col className="w-[120px]" />
                  <col className="w-[80px]" />
                  <col className="w-[80px]" />
                  <col className="w-[80px]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="py-2.5 pl-6 pr-2 text-[11px] font-medium text-white/65 uppercase tracking-wider text-center">#</th>
                    <th className="py-2.5 px-2 text-[11px] font-medium text-white/65 uppercase tracking-wider text-left">店铺名称</th>
                    <th className="py-2.5 px-2 text-[11px] font-medium text-white/65 uppercase tracking-wider text-right">当日利润</th>
                    <th className="py-2.5 px-2 text-[11px] font-medium text-white/65 uppercase tracking-wider text-right">累计利润</th>
                    <th className="py-2.5 px-2 text-[11px] font-medium text-white/65 uppercase tracking-wider text-right">利润率</th>
                    <th className="py-2.5 px-2 text-[11px] font-medium text-white/65 uppercase tracking-wider text-center">状态</th>
                    <th className="py-2.5 pl-2 pr-6 text-[11px] font-medium text-white/65 uppercase tracking-wider text-center">操作</th>
                  </tr>
                </thead>
              </table>
            </div>

            {/* 表体 */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[50px]" />
                  <col className="w-[160px]" />
                  <col className="w-[120px]" />
                  <col className="w-[120px]" />
                  <col className="w-[80px]" />
                  <col className="w-[80px]" />
                  <col className="w-[80px]" />
                </colgroup>
                <tbody>
                  {paged.length > 0 ? paged.map(s => {
                    const pf = s.today_profit ?? 0
                    return (
                      <motion.tr key={s.shop_id} variants={rowVariant}
                        className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 pl-6 pr-2 text-xs text-white/55 tabular-nums text-center">{s.rank}</td>
                        <td className="py-3 px-2 text-sm text-white/80 truncate" title={s.shop_name}>
                          <button onClick={() => goShop(s)} className="hover:text-blue-400 transition-colors text-left">{s.shop_name}</button>
                        </td>
                        <td className={`py-3 px-2 text-sm tabular-nums text-right font-medium ${pf >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pf >= 0 ? '¥' : '-¥'}{Math.abs(pf).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-sm text-white/80 tabular-nums text-right">¥{s.total_profit.toLocaleString()}</td>
                        <td className="py-3 px-2 text-sm text-white/80 tabular-nums text-right">{s.profit_rate?.toFixed(1)}%</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`text-xs px-2.5 py-1 rounded-full ${s.status === '盈利' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                            {s.status === '盈利' ? '盈利' : '亏损'}
                          </span>
                        </td>
                        <td className="py-3 pl-2 pr-6 text-center">
                          <button onClick={() => goShop(s)} className="flex items-center gap-1 mx-auto text-xs text-blue-400 hover:text-blue-300 transition-colors">详情 <ArrowRight size={12} /></button>
                        </td>
                      </motion.tr>
                    )
                  }) : (
                    <tr>
                      <td colSpan={7}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                          className="flex flex-col items-center justify-center py-20 gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-white/[0.02] flex items-center justify-center">
                            <Store size={24} className="text-white/15" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-white/30 font-medium">暂无店铺</p>
                            <p className="text-xs text-white/15 mt-1">请先创建店铺并导入数据</p>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {shops.length > 0 && (
              <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-white/[0.07]">
                <span className="text-[11px] text-white/55">{shops.length} 家店铺 · 第 {page}/{totalPages} 页</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="p-1.5 rounded-md text-white/70 hover:text-white disabled:opacity-10 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft size={13} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let n = i + 1
                    if (totalPages > 7 && page > 4) n = page - 3 + i
                    if (n > totalPages) return null
                    return (
                      <button key={n} onClick={() => setPage(n)}
                        className={`w-7 h-7 rounded-md text-[11px] transition-all ${page === n ? 'bg-white text-black font-medium' : 'text-white/55 hover:text-white hover:bg-white/[0.04]'}`}>
                        {n}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="p-1.5 rounded-md text-white/70 hover:text-white disabled:opacity-10 disabled:cursor-not-allowed transition-all">
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
