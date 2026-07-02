import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FileText, Search, Trash, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { api } from '../../api'
import { ImportBar } from '../../components/ExcelTools'

const TEMPLATE = [['SKU编码', '商品名称', '销售额', '订单量', '订单件数', '真实销售额', '真实订单量', '补单金额', '补单数量', '补单成本', '商品成本', '运费', '交易服务费', '交易税费', '运费险', '退货量', '退货成本', '换货量', '换货成本', '全站营销', '智能投放', '京东联盟', '搜索快车', '推荐广告']]

const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }

function getDateRange(range) {
  const now = new Date()
  let end = now.toISOString().slice(0, 10)
  let start = end
  switch (range) {
    case 'today': break
    case 'yesterday':
      start = end = new Date(now - 86400000).toISOString().slice(0, 10); break
    case '7days': start = new Date(now - 6 * 86400000).toISOString().slice(0, 10); break
    case '30days': start = new Date(now - 29 * 86400000).toISOString().slice(0, 10); break
    default: break
  }
  return { start, end }
}

export function DailyRecords() {
  const [records, setRecords] = useState([])
  const [shops, setShops] = useState([])
  const [selectedShop, setSelectedShop] = useState('')
  const [search, setSearch] = useState('')
  const [timeRange, setTimeRange] = useState('7days')
  const [dateStart, setDateStart] = useState(getDateRange('7days').start)
  const [dateEnd, setDateEnd] = useState(getDateRange('7days').end)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const pageSize = 10
  const ROW_H = 48 // 每行固定高度 px

  useEffect(() => { api.fetchShops().then(setShops) }, [])

  // 选店铺或改时间后自动查询
  useEffect(() => { handleQuery() }, [selectedShop, dateStart, dateEnd])

  function handleTimeRange(range) {
    setTimeRange(range)
    const { start, end } = getDateRange(range)
    setDateStart(start); setDateEnd(end)
  }

  async function handleQuery() {
    setLoading(true); setPage(1)
    try {
      const all = []
      const shopIds = selectedShop ? [Number(selectedShop)] : shops.map(s => s.shop_id)
      for (const sid of shopIds) {
        try {
          const resp = await fetch(`/api/shops/${sid}/skus?start=${dateStart}&end=${dateEnd}&page=1&page_size=500`)
          const json = await resp.json()
          const items = json.items || json || []
          all.push(...items)
        } catch {}
      }
      setRecords(all)
    } catch { setRecords([]) }
    setLoading(false)
  }

  async function handleImport(rows) {
    const imported = rows.map((r, i) => {
      const pf = (parseFloat(r['真实销售额'] || r.real_sales_amount) || 0)
        - (parseFloat(r['商品成本'] || r.product_cost) || 0)
        - (parseFloat(r['运费'] || r.shipping_fee) || 0)
        - (parseFloat(r['交易服务费'] || r.service_fee) || 0)
        - (parseFloat(r['交易税费'] || r.tax_fee) || 0)
        - (parseFloat(r['运费险'] || r.freight_insurance) || 0)
        - (parseFloat(r['退货成本'] || r.return_cost) || 0)
        - (parseFloat(r['换货成本'] || r.exchange_cost) || 0)
        - (parseFloat(r['补单成本'] || r.fill_order_cost) || 0)
        - (parseFloat(r['全站营销'] || r.promotion_alliance) || 0)
        - (parseFloat(r['智能投放'] || r.promotion_auto) || 0)
        - (parseFloat(r['京东联盟'] || r.promotion_jd_union) || 0)
        - (parseFloat(r['搜索快车'] || r.promotion_search) || 0)
        - (parseFloat(r['推荐广告'] || r.promotion_recommend) || 0)
        + (parseFloat(r['补单金额'] || r.fill_order_amount) || 0)
      return {
        sku_code: r['SKU编码'] || r.sku_code || `IMP${Date.now() + i}`,
        product_name: r['商品名称'] || r.product_name || '',
        sales_amount: parseFloat(r['销售额'] || r.sales_amount) || 0,
        order_count: parseInt(r['订单量'] || r.order_count) || 0,
        promotion_total: (parseFloat(r['全站营销'] || r.promotion_alliance) || 0) + (parseFloat(r['智能投放'] || r.promotion_auto) || 0) + (parseFloat(r['京东联盟'] || r.promotion_jd_union) || 0) + (parseFloat(r['搜索快车'] || r.promotion_search) || 0) + (parseFloat(r['推荐广告'] || r.promotion_recommend) || 0),
        product_cost: parseFloat(r['商品成本'] || r.product_cost) || 0,
        final_profit: pf,
      }
    }).filter(s => s.sku_code && s.product_name)
    if (imported.length === 0) return alert('未识别到有效数据')
    imported.forEach(r => {
      api.saveSKU(r.sku_code, {
        sales_amount: r.sales_amount, order_count: r.order_count,
        real_sales_amount: r.sales_amount, real_order_count: r.order_count,
        product_cost: r.product_cost, promotion_total: r.promotion_total,
        final_profit: r.final_profit, record_date: '',
      }).catch(() => {})
    })
    setRecords(prev => [...prev, ...imported])
  }

  // Filter + Paginate
  const filtered = useMemo(() => {
    let list = records
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(r => r.sku_code?.toLowerCase().includes(s) || r.product_name?.toLowerCase().includes(s))
    }
    return list
  }, [records, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Summary stats
  const totalProfit = useMemo(() => filtered.reduce((s, r) => s + (r.final_profit || 0), 0), [filtered])
  const totalSales = useMemo(() => filtered.reduce((s, r) => s + (r.sales_amount || 0), 0), [filtered])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">每日记录</h2>
          <p className="text-sm text-white/80 mt-1">查看各店铺的每日利润记录明细</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportBar onImport={handleImport} templateHeaders={TEMPLATE} templateName="每日记录导入模板" label="导入记录" />
          {records.length > 0 && (
            <button onClick={async () => { if (confirm('确定清空所有每日记录？')) { try { await api.clearAll() } catch {}; setRecords([]) } }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all">
              <Trash size={13} /> 清空
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Time chips */}
          <div className="flex items-center gap-1.5">
            {['today','yesterday','7days','30days'].map(t => (
              <button key={t} onClick={() => handleTimeRange(t)}
                className={`px-3 py-1.5 rounded-full text-xs transition-all ${timeRange === t ? 'bg-white text-black font-medium' : 'border border-white/[0.09] text-white/70 hover:text-white hover:border-white/15'}`}>
                {{today:'今日',yesterday:'昨日','7days':'近 7 天','30days':'近 30 天'}[t]}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/[0.08]" />

          {/* Date range */}
          <Calendar size={14} className="text-white/40" />
          <input type="date" value={dateStart} onChange={e => { setDateStart(e.target.value); setTimeRange('') }}
            className="px-2.5 py-1.5 rounded-full border border-white/[0.09] bg-white/[0.02] text-xs text-white/75 outline-none focus:border-blue-400/30" />
          <span className="text-white/25 text-xs">至</span>
          <input type="date" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setTimeRange('') }}
            className="px-2.5 py-1.5 rounded-full border border-white/[0.09] bg-white/[0.02] text-xs text-white/75 outline-none focus:border-blue-400/30" />

          <div className="w-px h-5 bg-white/[0.08]" />

          {/* Shop selector */}
          <select value={selectedShop} onChange={e => setSelectedShop(e.target.value)}
            className="px-3 py-1.5 rounded-full border border-white/[0.09] bg-[#1a1a24] text-xs text-white/75 outline-none focus:border-blue-400/30">
            <option value="" className="bg-[#1a1a24] text-white">全部店铺</option>
            {shops.map(s => <option key={s.shop_id} value={s.shop_id} className="bg-[#1a1a24] text-white">{s.shop_name}</option>)}
          </select>

          {/* SKU Search */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.09] bg-white/[0.02]">
            <Search size={13} className="text-white/45" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索 SKU 编码或名称..."
              className="bg-transparent outline-none text-xs text-white/75 placeholder:text-white/30 w-44" />
          </div>

          <button onClick={handleQuery} className="px-4 py-1.5 rounded-full bg-blue-500/15 text-blue-400 text-xs hover:bg-blue-500/25 transition-all">
            查询
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {filtered.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-6 mb-4 px-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">记录数</span>
            <span className="text-sm font-medium text-white tabular-nums">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">总销售额</span>
            <span className="text-sm font-medium text-white/85 tabular-nums">¥ {totalSales.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">总利润</span>
            <span className={`text-sm font-semibold tabular-nums flex items-center gap-1 ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalProfit >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              ¥ {totalProfit.toLocaleString()}
            </span>
          </div>
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-blue-400/20 border-t-blue-400 animate-spin" />
          <span className="text-xs text-white/30">加载中...</span>
        </div>
      ) : filtered.length === 0 && !loading ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-white/15 gap-3">
          <FileText size={28} />
          <span className="text-xs">该条件下暂无记录</span>
          <span className="text-[11px] text-white/10">试试调整筛选条件或导入数据</span>
        </div>
      ) : (
        <>
          {/* Table — 单一表格 sticky 表头，完美对齐 */}
          <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }} initial="hidden" animate="show"
            className="glass-card overflow-hidden flex flex-col">
            <div className="overflow-y-auto" style={{ maxHeight: ROW_H * 10 + 40 }}>
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#16161f] border-b border-white/[0.07]">
                    {['SKU编码','商品名称','销售额','订单量','推广费','商品成本','利润','状态'].map((h, idx) => (
                      <th key={h} className={`py-3 px-3 text-[11px] font-medium text-white/40 uppercase tracking-wider text-left border-r border-white/[0.05] last:border-r-0 ${idx===0?'w-[100px]':''} ${idx===2?'w-[110px]':''} ${idx===3?'w-[80px] text-center':''} ${idx>=4&&idx<=6?'w-[100px] text-right':''} ${idx===7?'w-[72px] text-center':''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r, i) => {
                    const pf = r.final_profit ?? 0
                    return (
                      <motion.tr key={r.sku_code || i} variants={row}
                        style={{ height: ROW_H }}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 text-xs text-white/50 font-mono align-middle border-r border-white/[0.04] truncate">{r.sku_code}</td>
                        <td className="px-3 text-sm text-white/80 align-middle border-r border-white/[0.04] truncate">{r.product_name}</td>
                        <td className="px-3 text-sm text-white/70 tabular-nums align-middle border-r border-white/[0.04] text-right">¥ {r.sales_amount?.toLocaleString()}</td>
                        <td className="px-3 text-sm text-white/70 tabular-nums align-middle border-r border-white/[0.04] text-center">{r.order_count?.toLocaleString()}</td>
                        <td className="px-3 text-sm text-white/70 tabular-nums align-middle border-r border-white/[0.04] text-right">¥ {r.promotion_total?.toLocaleString()}</td>
                        <td className="px-3 text-sm text-white/70 tabular-nums align-middle border-r border-white/[0.04] text-right">¥ {r.product_cost?.toLocaleString()}</td>
                        <td className={`px-3 text-sm font-semibold tabular-nums align-middle border-r border-white/[0.04] text-right ${pf >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ¥ {pf.toLocaleString()}
                        </td>
                        <td className="px-1 align-middle text-center">
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${pf >= 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                            {pf >= 0 ? '盈利' : '亏损'}
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })}
                  {paged.length < pageSize && Array.from({ length: pageSize - paged.length }).map((_, i) => (
                    <tr key={`empty-${i}`} style={{ height: ROW_H }} className="border-b border-white/[0.02]">
                      <td colSpan={8} className="px-3" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-white/[0.07]">
              <span className="text-xs text-white/30">第 {page} / {totalPages} 页 · 共 {filtered.length} 条</span>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 rounded-md text-white/30 hover:text-white disabled:opacity-15 disabled:cursor-not-allowed transition-all">
                  <ChevronLeft size={13} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let num = i + 1
                  if (totalPages > 7 && page > 4) num = page - 3 + i
                  if (totalPages > 7 && num > totalPages) return null
                  return (
                    <button key={num} onClick={() => setPage(num)}
                      className={`w-7 h-7 rounded-md text-[11px] transition-all ${page === num ? 'bg-white text-black font-medium' : 'text-white/35 hover:text-white hover:bg-white/[0.02]'}`}>
                      {num}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="p-1.5 rounded-md text-white/30 hover:text-white disabled:opacity-15 disabled:cursor-not-allowed transition-all">
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
