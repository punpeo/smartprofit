import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight, Calendar, RefreshCw, Eye, Download } from 'lucide-react'

const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }

function getDateRange(range) {
  const now = new Date()
  let end = now.toISOString().slice(0, 10)
  let start = end
  switch (range) {
    case 'today': break
    case 'yesterday': start = end = new Date(now - 86400000).toISOString().slice(0, 10); break
    case '7days': start = new Date(now - 6 * 86400000).toISOString().slice(0, 10); break
    case '30days': start = new Date(now - 29 * 86400000).toISOString().slice(0, 10); break
  }
  return { start, end }
}

// 金额字段（需 ¥ 前缀 + 2 位小数 + 颜色）
const AMOUNT_KEYS = new Set([
  'fill_order_amount', 'fill_order_cost',
  'promotion_alliance', 'promotion_auto', 'promotion_jd_union',
  'promotion_search', 'promotion_recommend', 'promotion_total',
  'sales_amount', 'product_cost', 'shipping_fee', 'service_fee',
  'tax_fee', 'freight_insurance', 'return_cost', 'exchange_cost',
  'final_profit', 'total_sales', 'total_profit',
])

// 数量字段（整数右对齐，不显示 ¥）
const COUNT_KEYS = new Set([
  'order_count', 'order_items_count', 'fill_order_count',
  'return_total', 'return_valid', 'return_cancel',
  'exchange_total', 'exchange_valid', 'exchange_cancel',
  'aftersale_total', 'aftersale_cancel',
])

// 负向指标（退货/退款/成本/补单成本 — 标红处理）
const NEGATIVE_KEYS = new Set([
  'return_total', 'return_valid', 'return_cost',
  'exchange_cost', 'fill_order_cost', 'aftersale_total',
])

/* ── 格式化函数（8 条展示规范）── */
function fmt(v, key) {
  // 规则6: 空值统一展示「—」
  if (v === null || v === undefined || v === '') return '—'
  // SKU编码、日期等始终当字符串展示，不转数字
  if (key === 'sku_code' || key === 'record_date' || key === 'operator_name' || key === 'shop_name') return String(v)
  const n = Number(v)
  if (isNaN(n)) return String(v)

  if (AMOUNT_KEYS.has(key)) {
    // 规则2: 金额保留 2 位小数
    const s = n.toFixed(2)
    const [intPart, decPart] = s.split('.')
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + decPart
    return '¥' + formatted
  }
  if (COUNT_KEYS.has(key)) {
    // 规则2: 数量为整数
    return Math.round(n).toLocaleString()
  }
  // 默认
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(2)
}

function cellColor(v, key) {
  if (v === null || v === undefined || v === '') return 'text-white/55'
  const n = Number(v)
  if (isNaN(n)) return 'text-white/75'
  // 规则7: 正负数据颜色
  if (NEGATIVE_KEYS.has(key)) {
    return n > 0 ? 'text-red-400' : 'text-white/55'
  }
  if (key === 'final_profit' || AMOUNT_KEYS.has(key)) {
    return n > 0 ? 'text-emerald-400' : n < 0 ? 'text-red-400' : 'text-white/55'
  }
  return 'text-white/75'
}

/* ── 字段类型标记（amount / count / id / text）── */
const FIELD_TYPES = {
  id: 'id', record_date: 'id', shop_id: 'id', sku_id: 'id', sku_code: 'id',
  product_name: 'text', category: 'text', operator_name: 'text',
  shop_name: 'text',
}

function fieldType(key) {
  if (FIELD_TYPES[key]) return FIELD_TYPES[key]
  if (AMOUNT_KEYS.has(key)) return 'amount'
  if (COUNT_KEYS.has(key)) return 'count'
  return 'text'
}

function colAlign(ft) {
  if (ft === 'amount' || ft === 'count') return 'right'
  if (ft === 'id') return 'center'
  return 'left'
}

function colWidth(key, ft) {
  if (key === 'record_date') return 'w-[110px]'
  if (key === 'sku_code') return 'w-[140px]'
  if (ft === 'id') return 'w-[60px]'
  if (ft === 'count') return 'w-[80px]'
  if (ft === 'amount') return 'w-[110px]'
  return ''
}

/* ── 页面配置 ── */
const PAGE_CONFIGS = {
  aftersale: {
    title: '每日售后记录', desc: '查看每日售后汇总明细（退货/换货数据）',
    endpoint: '/api/daily/aftersale', exportLabel: '导出售后记录',
    columns: ['record_date','shop_name','sku_code','return_valid','return_total','exchange_valid','exchange_total','aftersale_total','operator_name'],
    labels: { record_date:'日期', shop_name:'店铺', sku_code:'SKU编码',
      return_valid:'有效退货', return_total:'退货总数', exchange_valid:'有效换货', exchange_total:'换货总数', aftersale_total:'售后合计', operator_name:'负责人' },
    detailFields: ['record_date','shop_name','sku_code','return_total','return_valid','return_cancel','exchange_total','exchange_valid','exchange_cancel','aftersale_total','aftersale_cancel','operator_name'],
    idKeys: ['shop_id','sku_id'],
  },
  fillorder: {
    title: '每日补单记录', desc: '查看每日补单汇总明细（补单数量/金额/成本）',
    endpoint: '/api/daily/fill-order', exportLabel: '导出补单记录',
    columns: ['record_date','shop_name','sku_code','fill_order_count','fill_order_amount','fill_order_cost','operator_name'],
    labels: { record_date:'日期', shop_name:'店铺', sku_code:'SKU编码',
      fill_order_count:'补单数量', fill_order_amount:'补单金额', fill_order_cost:'补单成本', operator_name:'负责人' },
    detailFields: ['record_date','shop_name','sku_code','fill_order_count','fill_order_amount','fill_order_cost','operator_name'],
    idKeys: ['shop_id','sku_id'],
  },
  promotion: {
    title: '每日推广费记录', desc: '查看每日推广费用汇总明细（全站/智能/联盟/搜索/推荐）',
    endpoint: '/api/daily/promotion', exportLabel: '导出推广记录',
    columns: ['record_date','shop_name','sku_code','promotion_alliance','promotion_auto','promotion_search','promotion_recommend','promotion_total','operator_name'],
    labels: { record_date:'日期', shop_name:'店铺', sku_code:'SKU编码',
      promotion_alliance:'全站营销', promotion_auto:'智能投放', promotion_search:'搜索快车',
      promotion_recommend:'推荐广告', promotion_total:'推广合计', operator_name:'负责人' },
    detailFields: ['record_date','shop_name','sku_code','promotion_alliance','promotion_auto','promotion_jd_union','promotion_search','promotion_recommend','promotion_total','operator_name'],
    idKeys: ['shop_id','sku_id'],
  },
}

export function DailySourcePage({ type }) {
  const cfg = PAGE_CONFIGS[type]
  const [records, setRecords] = useState([])
  const [shops, setShops] = useState([])
  const [selectedShop, setSelectedShop] = useState('')
  const [timeRange, setTimeRange] = useState('yesterday')
  const [dateStart, setDateStart] = useState(getDateRange('yesterday').start)
  const [dateEnd, setDateEnd] = useState(getDateRange('yesterday').end)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const pageSize = 10
  const ROW_H = 48

  useEffect(() => { fetch('/api/shops').then(r => r.json()).then(setShops).catch(() => {}) }, [])
  useEffect(() => { load() }, [selectedShop, dateStart, dateEnd, page])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ start: dateStart, end: dateEnd, page: String(page), page_size: String(pageSize) })
      if (selectedShop) params.set('shop_id', selectedShop)
      const r = await fetch(`${cfg.endpoint}?${params}`).then(r => r.json())
      setRecords(r.items || []); setTotal(r.total || 0)
    } catch { setRecords([]); setTotal(0) }
    setLoading(false)
  }

  function handleTimeRange(range) {
    setTimeRange(range)
    const { start, end } = getDateRange(range)
    setDateStart(start); setDateEnd(end); setPage(1)
  }

  async function showDetail(id) {
    try { const r = await fetch(`${cfg.endpoint}/${id}`).then(r => r.json()); setDetail(r) } catch { setDetail(null) }
  }

  async function handleExport() {
    try {
      const params = new URLSearchParams({ start: dateStart, end: dateEnd, page: '1', page_size: '10000' })
      if (selectedShop) params.set('shop_id', selectedShop)
      const r = await fetch(`${cfg.endpoint}?${params}`).then(r => r.json())
      const items = r.items || []
      if (items.length === 0) return alert('无数据可导出')
      const headers = cfg.columns.map(c => cfg.labels[c])
      const rows = items.map(item => cfg.columns.map(c => {
        const v = item[c]; const ft = fieldType(c)
        if (v == null) return '-'
        if (ft === 'amount') return Number(v).toFixed(2)
        return String(v)
      }))
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
      a.download = `${cfg.exportLabel}_${dateStart}_${dateEnd}.csv`; a.click()
    } catch { alert('导出失败') }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">{cfg.title}</h2>
          <p className="text-sm text-white/80 mt-1">{cfg.desc}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/[0.09] text-sm text-white/65 hover:text-white transition-all">
            <Download size={13} /> 导出
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/[0.09] text-sm text-white/65 hover:text-white transition-all">
            <RefreshCw size={13} /> 刷新
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {['today','yesterday','7days','30days'].map(t => (
            <button key={t} onClick={() => handleTimeRange(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-all ${timeRange === t ? 'bg-white text-black font-medium' : 'border border-white/[0.09] text-white/70 hover:text-white'}`}>
              {{today:'今日',yesterday:'昨日','7days':'近7天','30days':'近30天'}[t]}
            </button>
          ))}
          <div className="w-px h-5 bg-white/[0.08]" />
          <Calendar size={14} className="text-white/40" />
          <input type="date" value={dateStart} onChange={e => { setDateStart(e.target.value); setTimeRange(''); setPage(1) }}
            className="px-2.5 py-1.5 rounded-full border border-white/[0.09] bg-white/[0.02] text-xs text-white/75 outline-none focus:border-blue-400/30" />
          <span className="text-white/25 text-xs">至</span>
          <input type="date" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setTimeRange(''); setPage(1) }}
            className="px-2.5 py-1.5 rounded-full border border-white/[0.09] bg-white/[0.02] text-xs text-white/75 outline-none focus:border-blue-400/30" />
          <div className="w-px h-5 bg-white/[0.08]" />
          <select value={selectedShop} onChange={e => { setSelectedShop(e.target.value); setPage(1) }}
            className="px-3 py-1.5 rounded-full border border-white/[0.09] bg-[#1a1a24] text-xs text-white/75 outline-none focus:border-blue-400/30">
            <option value="" className="bg-[#1a1a24] text-white">全部店铺</option>
            {shops.map(s => <option key={s.shop_id} value={s.shop_id} className="bg-[#1a1a24] text-white">{s.shop_name}</option>)}
          </select>
        </div>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}
            className="glass-card p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-base font-medium text-white mb-4">记录详情 #{detail.id}</h3>
            <div className="grid grid-cols-2 gap-3">
              {cfg.detailFields.map(k => {
                const lb = cfg.labels[k] || k
                return (
                  <div key={k} className="flex justify-between py-1.5 border-b border-white/[0.05]">
                    <span className="text-xs text-white/50">{lb}</span>
                    <span className={`text-xs tabular-nums ${cellColor(detail[k], k)}`}>{fmt(detail[k], k)}</span>
                  </div>
                )
              })}
            </div>
            <button onClick={() => setDetail(null)} className="mt-4 w-full py-2 rounded-full border border-white/[0.09] text-sm text-white/60 hover:text-white transition-all">关闭</button>
          </motion.div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-6 mb-4 px-2">
        <span className="text-xs text-white/40">共 <span className="text-white/70">{total}</span> 条</span>
        <span className="text-xs text-white/40">第 {page}/{totalPages} 页</span>
      </div>

      {/* Table — 复用每日记录固定行高布局 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 rounded-full border-2 border-blue-400/20 border-t-blue-400 animate-spin" />
        </div>
      ) : records.length === 0 && !loading ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-white/15 gap-3">
          <Search size={28} />
          <span className="text-xs">该条件下暂无记录</span>
        </div>
      ) : (
        <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }} initial="hidden" animate="show"
          className="glass-card overflow-hidden flex flex-col">
          <div className="overflow-y-auto" style={{ maxHeight: ROW_H * 10 + 40 }}>
            <table className="w-full table-fixed">
              <colgroup>
                {cfg.columns.map(c => { const ft = fieldType(c); return <col key={c} className={colWidth(c, ft) || ''} /> })}
                <col className="w-[60px]" />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#16161f] border-b border-white/[0.07]">
                  {cfg.columns.map(c => {
                    const ft = fieldType(c); const align = colAlign(ft)
                    return <th key={c} className={`py-3 px-3 text-[11px] font-medium text-white/40 uppercase tracking-wider border-r border-white/[0.05] last:border-r-0 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>{cfg.labels[c]}</th>
                  })}
                  <th className="py-3 px-3 text-[11px] font-medium text-white/40 uppercase tracking-wider text-center">详情</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <motion.tr key={r.id || i} variants={row} style={{ height: ROW_H }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    {cfg.columns.map(c => {
                      const ft = fieldType(c); const align = colAlign(ft); const val = r[c]
                      const display = fmt(val, c); const color = cellColor(val, c)
                      const needTitle = ft === 'text' && typeof val === 'string' && val.length > 12
                      const titleText = c === 'shop_name' ? `店铺ID: ${r.shop_id}` : c === 'sku_code' ? `SKU ID: ${r.sku_id}` : (needTitle ? val : undefined)
                      return (
                        <td key={c} title={titleText}
                          className={`px-3 text-xs tabular-nums align-middle border-r border-white/[0.04] last:border-r-0 ${color} ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>
                          <span className="block truncate">{display}</span>
                        </td>
                      )
                    })}
                    <td className="px-1 align-middle text-center border-r border-white/[0.04]">
                      <button onClick={() => showDetail(r.id)} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-white/40 hover:text-blue-400 transition-all">
                        <Eye size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {/* 填充空行保持固定高度 */}
                {records.length < pageSize && Array.from({ length: pageSize - records.length }).map((_, i) => (
                  <tr key={`empty-${i}`} style={{ height: ROW_H }} className="border-b border-white/[0.02]">
                    <td colSpan={cfg.columns.length + 1} className="px-3" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-white/[0.07]">
            <span className="text-xs text-white/30">{total} 条 · 第 {page}/{totalPages} 页</span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded-md text-white/30 hover:text-white disabled:opacity-15 transition-all"><ChevronLeft size={13} /></button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let num = i + 1
                if (totalPages > 7 && page > 4) num = page - 3 + i
                if (num > totalPages) return null
                return <button key={num} onClick={() => setPage(num)}
                  className={`w-7 h-7 rounded-md text-[11px] transition-all ${page === num ? 'bg-white text-black font-medium' : 'text-white/35 hover:text-white'}`}>{num}</button>
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded-md text-white/30 hover:text-white disabled:opacity-15 transition-all"><ChevronRight size={13} /></button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
