import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, Calculator } from 'lucide-react'
import { api } from '../api'

const TABS = ['基础数据', '成本明细', '推广费用', '利润核算']

const INIT = (sku) => ({
  sales_amount: sku.sales_amount || 0,
  order_items_count: sku.order_items_count || 0,
  order_count: sku.order_count || 0,
  real_sales_amount: sku.real_sales_amount || 0,
  real_order_count: sku.real_order_count || 0,
  fill_order_amount: sku.fill_order_amount || 0,
  fill_order_count: sku.fill_order_count || 0,
  product_cost: sku.product_cost || 0,
  shipping_fee: sku.shipping_fee || 0,
  service_fee: sku.service_fee || 0,
  tax_fee: sku.tax_fee || 0,
  freight_insurance: sku.freight_insurance || 0,
  return_count: sku.return_count || 0,
  return_cost: sku.return_cost || 0,
  exchange_count: sku.exchange_count || 0,
  exchange_cost: sku.exchange_cost || 0,
  fill_order_cost: sku.fill_order_cost || 0,
  promotion_alliance: sku.promotion_alliance || 0,
  promotion_auto: sku.promotion_auto || 0,
  promotion_jd_union: sku.promotion_jd_union || 0,
  promotion_search: sku.promotion_search || 0,
  promotion_recommend: sku.promotion_recommend || 0,
})

function Input({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-white/55">{label}</span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="px-3 py-2 rounded-lg border border-white/[0.09] bg-white/[0.04] text-sm text-white/80 outline-none focus:border-blue-400/30 focus:bg-white/[0.07] transition-all"
      />
    </label>
  )
}

export function SKUModal({ sku, onClose, onSave }) {
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState(() => INIT(sku))
  const [saving, setSaving] = useState(false)

  const set = (key) => (v) => setForm(f => ({ ...f, [key]: v }))

  // 自动计算成本：读取商品(product)默认成本参数，套用公式
  async function autoCalc() {
    try {
      const resp = await fetch('/api/products')
      const products = await resp.json()
      const product = (products || []).find(p => p.product_id === (sku.product_id || 0))
      if (!product) return alert('未找到关联商品，请先在商品管理中设置默认成本参数')

      setForm(f => ({
        ...f,
        product_cost: Math.round((f.order_items_count || f.order_count || 0) * (product.default_cost || 0) * 100) / 100,
        shipping_fee: Math.round((f.order_count || 0) * (product.default_shipping_cost || 0) * 100) / 100,
        service_fee: Math.round((f.sales_amount || 0) * (product.default_service_fee_rate || 0) * 100) / 100,
        tax_fee: Math.round((f.sales_amount || 0) * (product.default_tax_rate || 0) * 100) / 100,
        freight_insurance: Math.round((f.order_count || 0) * (product.default_freight_insurance || 0) * 100) / 100,
        exchange_cost: Math.round((f.exchange_count || 0) * (product.default_exchange_cost || 0) * 100) / 100,
        return_cost: Math.round((f.return_count || 0) * (product.default_return_cost || 0) * 100) / 100,
        fill_order_cost: Math.round((f.fill_order_count || 0) * (product.default_fill_order_cost || 0) * 100) / 100,
      }))
    } catch {}
  }

  const profit = useMemo(() => {
    const cost = form.product_cost + form.shipping_fee + form.service_fee + form.tax_fee +
      form.freight_insurance + form.return_cost + form.exchange_cost + form.fill_order_cost
    const promo = form.promotion_alliance + form.promotion_auto + form.promotion_jd_union +
      form.promotion_search + form.promotion_recommend
    return form.real_sales_amount - cost - promo + form.fill_order_amount
  }, [form])

  const formula = useMemo(() => {
    const cost = form.product_cost + form.shipping_fee + form.service_fee + form.tax_fee +
      form.freight_insurance + form.return_cost + form.exchange_cost + form.fill_order_cost
    const promo = form.promotion_alliance + form.promotion_auto + form.promotion_jd_union +
      form.promotion_search + form.promotion_recommend
    return `${form.real_sales_amount.toLocaleString()} - ${cost.toLocaleString()} - ${promo.toLocaleString()} + ${form.fill_order_amount.toLocaleString()}`
  }, [form])

  async function handleSave() {
    setSaving(true)
    const promoTotal = form.promotion_alliance + form.promotion_auto + form.promotion_jd_union + form.promotion_search + form.promotion_recommend
    const payload = { ...form, promotion_total: promoTotal, final_profit: profit, record_date: '' }
    try {
      await api.saveSKU(sku.sku_code, payload)
    } catch {}
    onSave({ ...sku, ...form, promotion_total: promoTotal, final_profit: profit })
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col glass-card border-white/[0.09] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <div>
            <h2 className="text-base font-medium text-white">编辑 SKU</h2>
            <p className="text-xs text-white/55 mt-0.5 font-mono">{sku.sku_code} · {sku.product_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={autoCalc}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 transition-all"
              title="根据店铺默认成本参数自动计算">
              <Calculator size={13} /> 自动计算
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.05] text-white/65 hover:text-white transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.07] px-6">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`relative px-4 py-3 text-sm transition-all ${tab === i ? 'text-white font-medium' : 'text-white/65 hover:text-white/70'}`}>
              {t}
              {tab === i && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="销售额" value={form.sales_amount} onChange={set('sales_amount')} />
              <Input label="订单件数" value={form.order_items_count} onChange={set('order_items_count')} />
              <Input label="订单量" value={form.order_count} onChange={set('order_count')} />
              <Input label="真实销售额" value={form.real_sales_amount} onChange={set('real_sales_amount')} />
              <Input label="真实订单量" value={form.real_order_count} onChange={set('real_order_count')} />
              <Input label="补单金额" value={form.fill_order_amount} onChange={set('fill_order_amount')} />
              <Input label="补单数量" value={form.fill_order_count} onChange={set('fill_order_count')} />
            </div>
          )}
          {tab === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="商品成本" value={form.product_cost} onChange={set('product_cost')} />
              <Input label="运费" value={form.shipping_fee} onChange={set('shipping_fee')} />
              <Input label="交易服务费" value={form.service_fee} onChange={set('service_fee')} />
              <Input label="交易税费" value={form.tax_fee} onChange={set('tax_fee')} />
              <Input label="运费险" value={form.freight_insurance} onChange={set('freight_insurance')} />
              <Input label="换货量" value={form.exchange_count} onChange={set('exchange_count')} />
              <Input label="换货成本" value={form.exchange_cost} onChange={set('exchange_cost')} />
              <Input label="退货量" value={form.return_count} onChange={set('return_count')} />
              <Input label="退货成本" value={form.return_cost} onChange={set('return_cost')} />
              <Input label="补单成本" value={form.fill_order_cost} onChange={set('fill_order_cost')} />
            </div>
          )}
          {tab === 2 && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="全站营销" value={form.promotion_alliance} onChange={set('promotion_alliance')} />
              <Input label="智能投放" value={form.promotion_auto} onChange={set('promotion_auto')} />
              <Input label="京东联盟" value={form.promotion_jd_union} onChange={set('promotion_jd_union')} />
              <Input label="搜索快车" value={form.promotion_search} onChange={set('promotion_search')} />
              <Input label="推荐广告" value={form.promotion_recommend} onChange={set('promotion_recommend')} />
            </div>
          )}
          {tab === 3 && (
            <div className="flex flex-col items-center py-6">
              <div className="flex items-center gap-2 text-sm text-white/65 mb-4">
                <Calculator size={16} />
                利润计算公式
              </div>
              <code className="text-sm text-white/80 bg-white/[0.03] px-4 py-2 rounded-lg mb-6">
                {formula} = <span className={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>{profit.toLocaleString()}</span>
              </code>
              <div className={`w-full max-w-xs rounded-2xl p-8 text-center ${profit >= 0 ? 'bg-emerald-400/5 border border-emerald-400/15' : 'bg-red-400/5 border border-red-400/15'}`}>
                <div className="text-xs text-white/55 mb-2">最终利润</div>
                <div className={`text-4xl font-semibold tracking-tight tabular-nums ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ¥ {profit.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.07]">
          <button onClick={onClose} className="px-5 py-2.5 rounded-full border border-white/[0.12] text-sm text-white/80 hover:text-white hover:border-white/15 transition-all">
            取消
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50">
            {saving ? '保存中...' : '保存并提交'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
