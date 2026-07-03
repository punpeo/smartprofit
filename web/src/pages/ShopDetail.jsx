import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, DollarSign, Package, AlertCircle, Megaphone, Wrench, Wallet, Plus, Upload, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Store } from 'lucide-react'
import { api } from '../api'
import { SKUModal } from '../components/SKUModal'
import { ProfitEditor } from '../components/ProfitEditor'
import { PageBackground } from '../components/PageBackground'
import { parseExcelFile } from '../components/ExcelTools'

const todayStr = new Date().toISOString().slice(0, 10)
const card = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const row = { hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0, transition: { duration: 0.2 } } }

/* ── 汇总小卡片 ── */
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

function getDateRange(range) {
  const now = new Date()
  let end = now.toISOString().slice(0, 10)
  let start = end
  if (range === 'yesterday') { start = end = new Date(now - 86400000).toISOString().slice(0, 10) }
  if (range === '7days') start = new Date(now - 6 * 86400000).toISOString().slice(0, 10)
  if (range === '30days') start = new Date(now - 29 * 86400000).toISOString().slice(0, 10)
  return { start, end }
}

export function ShopDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [skus, setSkus] = useState([])
  const [shopName, setShopName] = useState('')
  const [page, setPage] = useState(1)
  const [editSku, setEditSku] = useState(null)
  const [editorMode, setEditorMode] = useState('new')
  const [showProfitEditor, setShowProfitEditor] = useState(false)
  const [timeRange, setTimeRange] = useState('today')
  const [dateStart, setDateStart] = useState(getDateRange('today').start)
  const [dateEnd, setDateEnd] = useState(getDateRange('today').end)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef(null)
  const pageSize = 10

  const [baseSkus, setBaseSkus] = useState([]) // SKU 基础列表（用于新增记录）

  useEffect(() => { load() }, [id, dateStart, dateEnd])
  useEffect(() => { api.fetchSKUBase(id).then(d => setBaseSkus(d)) }, [id])

  async function load() {
    setLoading(true)
    const [shops, s, skData] = await Promise.all([
      api.fetchShops(),
      fetch(`/api/shops/${id}/summary?start=${dateStart}&end=${dateEnd}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/shops/${id}/skus?start=${dateStart}&end=${dateEnd}&page=1&page_size=100`).then(r => r.json()).catch(() => ({ items: [] })),
    ])
    const sk = skData?.items || skData || []
    const shop = shops.find(sh => sh.shop_id === Number(id))
    setShopName(shop?.shop_name || `店铺 #${id}`)
    setSummary(s || {}); setSkus(Array.isArray(sk) ? sk : []); setPage(1); setLoading(false)
  }

  function handleTimeRange(range) {
    setTimeRange(range)
    const { start, end } = getDateRange(range)
    setDateStart(start); setDateEnd(end)
  }

  const totalPages = Math.max(1, Math.ceil(skus.length / pageSize))
  const paged = skus.slice((page - 1) * pageSize, page * pageSize)

  function handleSave(updated) {
    setSkus(prev => prev.map(s => s.sku_code === updated.sku_code ? { ...s, ...updated } : s))
    setModalSku(null)
    load() // 刷新汇总卡片
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    try {
      const rows = await parseExcelFile(file)
      let count = 0
      for (const r of rows) {
        try {
          const code = r['SKU编码'] || r.sku_code
          if (!code) continue
          const promoTotal = (parseFloat(r['全站营销']||r.promotion_alliance)||0)+(parseFloat(r['智能投放']||r.promotion_auto)||0)+(parseFloat(r['京东联盟']||r.promotion_jd_union)||0)+(parseFloat(r['搜索快车']||r.promotion_search)||0)+(parseFloat(r['推荐广告']||r.promotion_recommend)||0)
          await api.saveSKU(String(code), {
            sales_amount: parseFloat(r['销售额']||r.sales_amount)||0,
            order_count: parseInt(r['订单量']||r.order_count)||0,
            order_items_count: parseInt(r['订单件数']||r.order_items_count)||0,
            real_sales_amount: parseFloat(r['真实销售额']||r.real_sales_amount)||0,
            real_order_count: parseInt(r['真实订单量']||r.real_order_count)||0,
            fill_order_amount: parseFloat(r['补单金额']||r.fill_order_amount)||0,
            fill_order_count: parseInt(r['补单数量']||r.fill_order_count)||0,
            fill_order_cost: parseFloat(r['补单成本']||r.fill_order_cost)||0,
            product_cost: parseFloat(r['商品成本']||r.product_cost)||0,
            shipping_fee: parseFloat(r['运费']||r.shipping_fee)||0,
            service_fee: parseFloat(r['交易服务费']||r.service_fee)||0,
            tax_fee: parseFloat(r['交易税费']||r.tax_fee)||0,
            freight_insurance: parseFloat(r['运费险']||r.freight_insurance)||0,
            return_count: parseInt(r['退货量']||r.return_count)||0, return_cost: parseFloat(r['退货成本']||r.return_cost)||0,
            exchange_count: parseInt(r['换货量']||r.exchange_count)||0, exchange_cost: parseFloat(r['换货成本']||r.exchange_cost)||0,
            promotion_alliance: parseFloat(r['全站营销']||r.promotion_alliance)||0,
            promotion_auto: parseFloat(r['智能投放']||r.promotion_auto)||0,
            promotion_jd_union: parseFloat(r['京东联盟']||r.promotion_jd_union)||0,
            promotion_search: parseFloat(r['搜索快车']||r.promotion_search)||0,
            promotion_recommend: parseFloat(r['推荐广告']||r.promotion_recommend)||0,
            promotion_total: promoTotal, record_date: '',
          })
          count++
        } catch {}
      }
      if (count > 0) { alert(`已导入 ${count} 条记录`); load() }
      else alert('未识别到有效数据')
    } catch { alert('文件解析失败') }
    fileRef.current.value = ''
  }

  if (!summary) return <LoadingSkeleton />

  const profit = summary.net_profit ?? 0

  return (
    <div className="relative h-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
      <PageBackground overlay />
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />

      {/* ── Nav ── */}
      <nav className="relative z-10 shrink-0 glass border-b border-white/[0.07]">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between px-8 h-14">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-white/65 hover:text-white transition-colors shrink-0">
              <ArrowLeft size={15} /> 返回总览
            </button>
            <span className="text-white/25 shrink-0">|</span>
            <div className="flex items-center gap-2 min-w-0">
              <Store size={15} className="text-white/55 shrink-0" />
              <h1 className="text-sm font-medium text-white/80 truncate">{shopName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowProfitEditor(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all active:scale-95">
              <Plus size={14} /> 新增记录
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/[0.12] text-sm text-white/75 hover:border-white/15 hover:text-white transition-all">
              <Upload size={13} /> 批量导入
            </button>
          </div>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="relative z-10 flex-1 flex gap-6 max-w-[1440px] mx-auto px-8 py-6 w-full min-h-0 overflow-hidden">

        {/* ═══════════ 左侧面板 ═══════════ */}
        <aside className="w-[340px] shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto">

          {/* 净利润 Hero */}
          <motion.div variants={card} initial="hidden" animate="show"
            className={`glass-card p-5 shrink-0 border ${profit >= 0 ? 'border-emerald-400/10' : 'border-red-400/10'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={15} className={profit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              <span className="text-[11px] text-white/55 uppercase tracking-wider">净利润</span>
            </div>
            <div className={`text-3xl font-semibold tracking-tight tabular-nums ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ¥ {profit.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-white/65">
              {profit >= 0 ? <TrendingUp size={11} className="text-emerald-400" /> : <TrendingDown size={11} className="text-red-400" />}
              当前所选时段
            </div>
          </motion.div>

          {/* 数据汇总卡片组 */}
          <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} initial="hidden" animate="show"
            className="grid grid-cols-2 gap-3">
            <SummaryCard icon={DollarSign}   label="总销售额"   value={`¥ ${summary.total_sales?.toLocaleString()}`}       sub={`真实 ¥ ${summary.total_real_sales?.toLocaleString()}`} accent="text-blue-400"   accentBg="bg-blue-500/10" />
            <SummaryCard icon={Package}      label="总订单量"   value={summary.total_orders?.toLocaleString()}             sub={`真实 ${summary.total_real_orders?.toLocaleString()} 单`} accent="text-purple-400" accentBg="bg-purple-500/10" />
            <SummaryCard icon={AlertCircle}  label="补单情况"   value={`${summary.total_fill_count} 件`}                   sub={`¥ ${summary.total_fill_amount?.toLocaleString()}`}     accent="text-amber-400"  accentBg="bg-amber-500/10" />
            <SummaryCard icon={Megaphone}    label="总推广费"   value={`¥ ${summary.total_promo?.toLocaleString()}`}        sub="全站 · 智能 · 搜索 · 推荐" accent="text-cyan-400"   accentBg="bg-cyan-500/10" />
            <SummaryCard icon={Wrench}       label="总售后成本" value={`¥ ${summary.total_aftersale_cost?.toLocaleString()}`}  sub="退货 & 换货"               accent="text-red-400"    accentBg="bg-red-500/10" />
            <SummaryCard icon={Wallet}       label="净利润合计" value={`¥ ${summary.net_profit?.toLocaleString()}`}         accent="text-emerald-400" accentBg="bg-emerald-500/10" />
          </motion.div>
        </aside>

        {/* ═══════════ 右侧 ═══════════ */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* 时间筛选 */}
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <div className="flex items-center gap-1.5">
              {[{k:'today',v:'今日'},{k:'yesterday',v:'昨日'},{k:'7days',v:'近7天'},{k:'30days',v:'近30天'}].map(({k,v}) => (
                <button key={k} onClick={() => handleTimeRange(k)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${timeRange === k ? 'bg-white text-black font-medium' : 'border border-white/[0.09] text-white/70 hover:text-white hover:border-white/12'}`}>
                  {v}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-white/[0.09] mx-1" />
            <input type="date" value={dateStart} onChange={e => { setDateStart(e.target.value); setTimeRange('') }}
              className="w-[130px] px-2.5 py-1.5 rounded-full border border-white/[0.09] bg-transparent text-xs text-white/75 outline-none focus:border-blue-400/30" />
            <span className="text-white/55 text-xs">至</span>
            <input type="date" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setTimeRange('') }}
              className="w-[130px] px-2.5 py-1.5 rounded-full border border-white/[0.09] bg-transparent text-xs text-white/75 outline-none focus:border-blue-400/30" />
            <div className="flex-1" />
            <span className="text-xs text-white/65">共 {skus.length} 条</span>
          </div>

          {/* SKU 表格 */}
          <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }} initial="hidden" animate="show"
            className="glass-card flex-1 flex flex-col min-h-0 overflow-hidden">

            <div className="shrink-0 border-b border-white/[0.07]">
              <table className="w-full">
                <thead>
                  <tr>
                    {['SKU编码','商品名称','销售额','订单量','推广费','商品成本','利润',''].map((h, i) => (
                      <th key={h} className={`py-2.5 px-4 text-[11px] font-medium text-white/65 uppercase tracking-wider text-left ${i === 0 ? 'pl-6' : ''} ${i === 7 ? 'pr-6' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <tbody>
                  {paged.length > 0 ? paged.map(s => {
                      const pf = s.final_profit ?? 0
                      return (
                        <motion.tr key={s.sku_code} variants={row}
                          className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
                          <td className="py-3 pl-6 pr-4 text-xs text-white/55 font-mono">{s.sku_code}</td>
                          <td className="py-3 px-4 text-sm text-white/80">{s.product_name}</td>
                          <td className="py-3 px-4 text-sm text-white/80 tabular-nums">¥ {s.sales_amount?.toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm text-white/80 tabular-nums">{s.order_count?.toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm text-white/80 tabular-nums">¥ {s.promotion_total?.toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm text-white/80 tabular-nums">¥ {s.product_cost?.toLocaleString()}</td>
                          <td className={`py-3 px-4 text-sm font-semibold tabular-nums ${pf >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ¥ {pf.toLocaleString()}
                          </td>
                          <td className="py-3 pl-4 pr-6">
                            <button onClick={() => { setEditorMode('edit'); setEditSku(s); setShowProfitEditor(true) }}
                              className="px-3 py-1.5 rounded-full border border-white/[0.09] text-xs text-blue-400 hover:text-blue-300 hover:border-blue-400/20 transition-all">编辑</button>
                          </td>
                        </motion.tr>
                      )
                    }) : (
                      <tr>
                        <td colSpan={8}>
                          <div className="flex flex-col items-center justify-center py-20 text-white/25 gap-3">
                            <Package size={28} />
                            <span className="text-xs">暂无数据，点击「新增记录」开始录入</span>
                          </div>
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>

            {skus.length > 0 && (
              <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-white/[0.07]">
                <span className="text-[11px] text-white/55">第 {page} / {totalPages} 页</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="p-1.5 rounded-md text-white/70 hover:text-white disabled:opacity-10 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft size={13} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i + 1} onClick={() => setPage(i + 1)}
                      className={`w-7 h-7 rounded-md text-[11px] transition-all ${page === i + 1 ? 'bg-white text-black font-medium' : 'text-white/55 hover:text-white hover:bg-white/[0.04]'}`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="p-1.5 rounded-md text-white/70 hover:text-white disabled:opacity-10 disabled:cursor-not-allowed transition-all">
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {showProfitEditor && (
          <ProfitEditor shopId={id} baseSkus={baseSkus} recordDate={dateEnd || todayStr}
            mode={editorMode} editSku={editSku}
            onClose={() => { setShowProfitEditor(false); setEditSku(null) }}
            onSaved={() => { load(); setShowProfitEditor(false); setEditSku(null) }} />
        )}
      </AnimatePresence>
    </div>
  )
}
