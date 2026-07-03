import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Search, Calculator, ChevronRight } from 'lucide-react'
import { api } from '../api'
import Aurora from './Aurora'

const todayStr = new Date().toISOString().slice(0, 10)

function Field({ label, value, onChange, disabled, required }) {
  const display = value === 0 ? '' : value
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-white/55">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</span>
      <input type="number" value={disabled ? (value || '') : display} placeholder="0"
        disabled={disabled}
        onChange={e => onChange(e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0))}
        className={`px-3 py-2 rounded-lg border text-sm outline-none transition-all ${disabled ? 'border-white/[0.04] bg-white/[0.01] text-white/40 cursor-not-allowed' : 'border-white/[0.09] bg-white/[0.04] text-white/80 focus:border-blue-400/30'}`} />
    </label>
  )
}

const INIT = {sales_amount:0,order_items_count:0,order_count:0,fill_order_amount:0,fill_order_count:0,return_count:0,exchange_count:0,product_cost:0,shipping_fee:0,service_fee:0,tax_fee:0,freight_insurance:0,return_cost:0,exchange_cost:0,fill_order_cost:0,promotion_alliance:0,promotion_auto:0,promotion_jd_union:0,promotion_search:0,promotion_recommend:0}

export function ProfitEditor({ shopId, baseSkus, recordDate, onClose, onSaved, mode = 'new', editSku = null }) {
  const [selected, setSelected] = useState(editSku)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ ...INIT })
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [isExisting, setIsExisting] = useState(false)
  const [productCache, setProductCache] = useState(null)

  const filtered = baseSkus.filter(s => !search || s.sku_code.toLowerCase().includes(search.toLowerCase()) || (s.product_name||'').toLowerCase().includes(search.toLowerCase()))

  // 选 SKU 后加载数据 + 缓存产品
  useEffect(() => {
    if (!selected) return
    setLoadingData(true)
    Promise.all([
      fetch('/api/skus/' + selected.sku_code + '/daily?date=' + recordDate).then(r => r.json()).catch(() => null),
      fetch('/api/products').then(r => r.json()).catch(() => []),
    ]).then(([data, prods]) => {
      setProductCache(prods)
      if (data && data.log_id) { setForm({ ...INIT, ...data }); setIsExisting(true) }
      else { setForm({ ...INIT }); setIsExisting(false) }
      setLoadingData(false)
    })
  }, [selected, recordDate])

  // 基础字段变化时热更新成本明细
  const calcFields = [form.sales_amount, form.order_count, form.order_items_count, form.fill_order_count, form.return_count, form.exchange_count]
  useEffect(() => {
    if (!selected?.product_id || !productCache) return
    const p = productCache.find(x => x.product_id === selected.product_id)
    if (!p) return
    setForm(f => ({
      ...f,
      product_cost: Math.round((f.order_items_count||f.order_count||0) * (p.default_cost||0) * 100) / 100,
      shipping_fee: Math.round((f.order_count||0) * (p.default_shipping_cost||0) * 100) / 100,
      service_fee: Math.round((f.sales_amount||0) * (p.default_service_fee_rate||0) * 100) / 100,
      tax_fee: Math.round((f.sales_amount||0) * (p.default_tax_rate||0) * 100) / 100,
      freight_insurance: Math.round((f.order_count||0) * (p.default_freight_insurance||0) * 100) / 100,
      exchange_cost: Math.round((f.exchange_count||0) * (p.default_exchange_cost||0) * 100) / 100,
      return_cost: Math.round((f.return_count||0) * ((0.958 * (f.sales_amount||0) / Math.max(1, f.order_count||1)) - (p.default_cost||0)) * 100) / 100,
      fill_order_cost: Math.round((f.fill_order_count||0) * (p.default_fill_order_cost||0) * 100) / 100,
    }))
  }, calcFields)

  const realSales = (form.sales_amount||0) - (form.fill_order_amount||0)
  const realOrders = Math.max(0, (form.order_count||0) - (form.fill_order_count||0))
  const promoTotal = form.promotion_alliance + form.promotion_auto + form.promotion_jd_union + form.promotion_search + form.promotion_recommend
  const totalCost = (form.product_cost||0)+(form.shipping_fee||0)+(form.service_fee||0)+(form.tax_fee||0)+(form.freight_insurance||0)+(form.return_cost||0)+(form.exchange_cost||0)+(form.fill_order_cost||0)
  const profit = realSales - totalCost - promoTotal + (form.fill_order_amount||0)

  // 手动刷新：重新拉产品数据并计算
  async function autoCalc() {
    if (!selected?.product_id) return
    try { const ps = await (await fetch('/api/products')).json(); setProductCache(ps); const p = (ps||[]).find(x => x.product_id === selected.product_id); if (!p) return
      setForm(f => ({...f,product_cost:Math.round((f.order_items_count||f.order_count||0)*(p.default_cost||0)*100)/100,shipping_fee:Math.round((f.order_count||0)*(p.default_shipping_cost||0)*100)/100,service_fee:Math.round((f.sales_amount||0)*(p.default_service_fee_rate||0)*100)/100,tax_fee:Math.round((f.sales_amount||0)*(p.default_tax_rate||0)*100)/100,freight_insurance:Math.round((f.order_count||0)*(p.default_freight_insurance||0)*100)/100,exchange_cost:Math.round((f.exchange_count||0)*(p.default_exchange_cost||0)*100)/100,return_cost:Math.round((f.return_count||0)*((0.958 * (f.sales_amount||0) / Math.max(1, f.order_count||1)) - (p.default_cost||0))*100)/100,fill_order_cost:Math.round((f.fill_order_count||0)*(p.default_fill_order_cost||0)*100)/100})) } catch {}
  }

  async function handleSave() {
    if (!selected) return
    if (!form.sales_amount || !form.order_count || !form.order_items_count) { alert('请填写销售额、订单量、订单件数（必填）'); return }
    setSaving(true)
    try { await api.saveSKU(selected.sku_code, {...form,real_sales_amount:realSales,real_order_count:realOrders,promotion_total:promoTotal,final_profit:profit,record_date:recordDate}) } catch {}
    onSaved?.(); setSaving(false); onClose()
  }
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{opacity:0,scale:0.96,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.96,y:10}} transition={{duration:0.2}} className="w-full max-w-5xl flex border border-white/[0.08] overflow-hidden rounded-2xl relative" style={{ height: '85vh', maxHeight: '85vh', background: '#0e0e16' }}>
        <Aurora colorStops={['#7cff67','#B497CF','#5227FF']} blend={0.5} amplitude={1.0} speed={1} />
        <div className="relative z-10 w-[240px] shrink-0 border-r border-white/[0.07] flex flex-col bg-[#0e0e16]/80 backdrop-blur-sm">
          <div className="px-4 py-3 border-b border-white/[0.07]"><p className="text-xs font-medium text-white/70 mb-2">店铺 SKU</p><div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.09] bg-white/[0.03]"><Search size={12} className="text-white/35" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索..." className="bg-transparent outline-none text-xs text-white/70 placeholder:text-white/25 w-full" /></div></div>
          <div className="flex-1 overflow-y-auto py-1">{filtered.map(s => (<button key={s.sku_code} onClick={() => setSelected(s)} className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all ${selected?.sku_code === s.sku_code ? 'bg-blue-500/10 border-r-2 border-blue-400' : 'hover:bg-white/[0.03] border-r-2 border-transparent'}`}><div className="min-w-0"><div className="text-sm text-white/85 truncate">{s.sku_code}</div><div className="text-[11px] text-white/35 truncate">{s.product_name || ''}</div></div>{selected?.sku_code === s.sku_code && <ChevronRight size={14} className="text-blue-400 shrink-0" />}</button>))}</div>
        </div>
        <div className="relative z-10 flex-1 flex flex-col min-w-0 bg-[#0e0e16]/60 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
            <div><h2 className="text-base font-medium text-white">{isExisting ? '✏️ 编辑利润数据' : mode === 'edit' ? '✏️ 编辑利润数据' : '➕ 新增利润数据'}{selected && <span className="text-white/45 font-normal ml-2 text-sm">{selected.sku_code} · {selected.product_name || ''}</span>}</h2><p className="text-xs text-white/35 mt-0.5">{'\u{1F4C5}'} {recordDate}{mode === 'new' && isExisting && <span className="text-amber-400/70 ml-2">今日已有记录，修改将覆盖原数据</span>}</p></div>
            <div className="flex items-center gap-2">{selected && <button onClick={autoCalc} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 transition-all"><Calculator size={13} /> 自动计算</button>}<button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.05] text-white/55 hover:text-white transition-all"><X size={18} /></button></div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!selected ? <div className="flex items-center justify-center h-full text-white/20 text-sm">{'←'} 请从左侧选择 SKU</div>
            : loadingData ? <div className="flex items-center justify-center h-full"><div className="w-5 h-5 rounded-full border-2 border-blue-400/20 border-t-blue-400 animate-spin" /></div>
            : <div className="grid grid-cols-2 gap-6">
              <div><p className="text-xs text-white/35 mb-3 uppercase tracking-wider">销售数据</p><div className="grid grid-cols-2 gap-3"><Field label="销售额" value={form.sales_amount} onChange={set('sales_amount')} required /><Field label="订单量" value={form.order_count} onChange={set('order_count')} required /><Field label="订单件数" value={form.order_items_count} onChange={set('order_items_count')} required /><Field label="补单金额" value={form.fill_order_amount} onChange={set('fill_order_amount')} /><Field label="补单数量" value={form.fill_order_count} onChange={set('fill_order_count')} /><Field label="退货量" value={form.return_count} onChange={set('return_count')} required /><Field label="换货量" value={form.exchange_count} onChange={set('exchange_count')} required /><Field label="真实销售额" value={realSales} disabled /><Field label="真实订单量" value={realOrders} disabled /></div></div>
              <div><p className="text-xs text-white/35 mb-3 uppercase tracking-wider">成本明细</p><div className="grid grid-cols-2 gap-3"><Field label="商品成本" value={form.product_cost} onChange={set('product_cost')} /><Field label="运费" value={form.shipping_fee} onChange={set('shipping_fee')} /><Field label="服务费" value={form.service_fee} onChange={set('service_fee')} /><Field label="税费" value={form.tax_fee} onChange={set('tax_fee')} /><Field label="运费险" value={form.freight_insurance} onChange={set('freight_insurance')} /><Field label="退货成本" value={form.return_cost} onChange={set('return_cost')} /><Field label="换货成本" value={form.exchange_cost} onChange={set('exchange_cost')} /><Field label="补单成本" value={form.fill_order_cost} onChange={set('fill_order_cost')} /></div></div>
              <div className="col-span-2"><p className="text-xs text-white/35 mb-3 uppercase tracking-wider">推广费用</p><div className="grid grid-cols-5 gap-3"><Field label="全站营销" value={form.promotion_alliance} onChange={set('promotion_alliance')} /><Field label="智能投放" value={form.promotion_auto} onChange={set('promotion_auto')} /><Field label="京东联盟" value={form.promotion_jd_union} onChange={set('promotion_jd_union')} /><Field label="搜索快车" value={form.promotion_search} onChange={set('promotion_search')} /><Field label="推荐广告" value={form.promotion_recommend} onChange={set('promotion_recommend')} /></div></div>
              <div className="col-span-2 flex items-center justify-between pt-4 border-t border-white/[0.07]"><div className="text-sm text-white/55">推广合计 <span className="text-white/85 tabular-nums ml-2">{'¥'} {promoTotal.toLocaleString()}</span><span className="text-white/20 mx-3">|</span>成本合计 <span className="text-white/85 tabular-nums ml-2">{'¥'} {totalCost.toLocaleString()}</span></div><div className="flex items-center gap-4"><div className="text-right"><div className="text-[11px] text-white/35">最终利润</div><div className={`text-xl font-semibold tabular-nums ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{'¥'} {profit.toLocaleString()}</div></div><button onClick={onClose} className="px-4 py-2 rounded-full border border-white/[0.09] text-sm text-white/65 hover:text-white transition-all">取消</button><button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50">{saving ? '保存中...' : '保存并提交'}</button></div></div>
            </div>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
