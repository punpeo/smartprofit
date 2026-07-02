import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Save, X, Boxes, Edit3, Trash, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../../api'
import { ImportBar } from '../../components/ExcelTools'

const TEMPLATE = [['商品名称','分类','默认成本','默认运费','服务费率','税费率','运费险','换货成本','退货成本','补单成本']]
const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }

const COST_FIELDS = [
  ['default_cost','默认成本','元/件'],
  ['default_shipping_cost','默认运费','元/单'],
  ['default_service_fee_rate','服务费率','如 0.01'],
  ['default_tax_rate','税费率','如 0.005'],
  ['default_freight_insurance','运费险','元/单'],
  ['default_exchange_cost','换货成本','元/件'],
  ['default_return_cost','退货成本','元/件'],
  ['default_fill_order_cost','补单成本','元/件'],
]

const defaultCosts = Object.fromEntries(COST_FIELDS.map(([k]) => [k, 0]))

export function ProductManager() {
  const [products, setProducts] = useState([])
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => { api.fetchProducts().then(setProducts) }, [])

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const filtered = products.filter(p => {
    const m = !search || p.product_name.toLowerCase().includes(search.toLowerCase())
    const c = !filterCat || p.category === filterCat
    return m && c
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  function startEdit(p) {
    setEditing(p ? { ...defaultCosts, ...p } : { product_name: '', category: '', image_url: '', ...defaultCosts, _isEdit: false })
  }
  function cancelEdit() { setEditing(null) }

  async function handleSave() {
    if (!editing.product_name.trim()) return
    const data = {
      product_name: editing.product_name, category: editing.category || '', image_url: editing.image_url || '',
      ...Object.fromEntries(COST_FIELDS.map(([k]) => [k, editing[k] ?? 0])),
    }
    if (editing.product_id) {
      try { await api.updateProduct(editing.product_id, data) } catch {}
      setProducts(prev => prev.map(p => p.product_id === editing.product_id ? { ...p, ...data } : p))
    } else {
      try {
        const res = await api.createProduct(data)
        setProducts(prev => [...prev, { product_id: res.product_id, ...data }])
      } catch {
        setProducts(prev => [...prev, { product_id: Date.now(), ...data }])
      }
    }
    setEditing(null)
  }

  async function handleDelete(id) {
    try { await api.deleteProduct(id) } catch {}
    setProducts(prev => prev.filter(p => p.product_id !== id))
  }

  async function handleImport(rows) {
    const mapped = rows.map(r => ({
      product_name: String(r['商品名称'] || r.product_name || ''),
      category: String(r['分类'] || r.category || ''),
      ...Object.fromEntries(COST_FIELDS.map(([k, label]) => [k, parseFloat(r[label] || r[k]) || 0])),
    })).filter(p => p.product_name)
    if (mapped.length === 0) return alert('未识别到有效数据')
    for (const item of mapped) {
      try { await api.createProduct(item) } catch {}
    }
    api.fetchProducts().then(setProducts)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">商品管理</h2>
          <p className="text-sm text-white/80 mt-1">管理商品基础信息及默认成本参数</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04]">
            <Search size={14} className="text-white/45" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="搜索商品..." className="bg-transparent outline-none text-sm text-white/75 placeholder:text-white/40 w-32" />
          </div>
          <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-white/[0.12] bg-[#1a1a24] text-sm text-white/75 outline-none focus:border-blue-400/30">
            <option value="" className="bg-[#1a1a24] text-white">全部分类</option>
            {categories.map(c => <option key={c} value={c} className="bg-[#1a1a24] text-white">{c}</option>)}
          </select>
          <ImportBar onImport={handleImport} templateHeaders={TEMPLATE} templateName="商品导入模板" label="导入商品" />
          {products.length > 0 && !editing && (
            <button onClick={() => { if (confirm('确定清空所有商品？')) { products.forEach(p => api.deleteProduct(p.product_id).catch(()=>{})); setProducts([]) } }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all">
              <Trash size={13} /> 清空
            </button>
          )}
          {!editing && (
            <button onClick={() => startEdit(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all active:scale-95">
              <Plus size={14} /> 新增商品
            </button>
          )}
        </div>
      </div>

      {editing && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Edit3 size={15} className="text-blue-400" />
            <span className="text-sm font-medium text-white">{editing.product_id ? '编辑商品' : '新增商品'}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-2">
            <label className="flex flex-col gap-1"><span className="text-xs text-white/80">商品名称 *</span>
              <input value={editing.product_name} onChange={e => setEditing({ ...editing, product_name: e.target.value })}
                className="px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] text-sm text-white/85 outline-none focus:border-blue-400/30" placeholder="例：蓝牙耳机 Pro" /></label>
            <label className="flex flex-col gap-1"><span className="text-xs text-white/80">分类</span>
              <input value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })}
                className="px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] text-sm text-white/85 outline-none focus:border-blue-400/30" placeholder="如：音频" /></label>
            <label className="flex flex-col gap-1"><span className="text-xs text-white/80">图片 URL</span>
              <input value={editing.image_url} onChange={e => setEditing({ ...editing, image_url: e.target.value })}
                className="px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] text-sm text-white/85 outline-none focus:border-blue-400/30" placeholder="https://..." /></label>
          </div>
          <p className="text-[11px] text-white/30 mb-3 px-1">默认成本参数（SKU 自动计算时使用）</p>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {COST_FIELDS.map(([key, label, placeholder]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[11px] text-white/60">{label}</span>
                <input type="number" step="any" value={editing[key] ?? 0}
                  onChange={e => setEditing({ ...editing, [key]: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] text-sm text-white/85 outline-none focus:border-blue-400/30" placeholder={placeholder} />
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all"><Save size={13} /> 保存</button>
            <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/[0.12] text-sm text-white/80 hover:text-white transition-all"><X size={13} /> 取消</button>
          </div>
        </motion.div>
      )}

      <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }} initial="hidden" animate="show" className="grid grid-cols-2 gap-4">
        {paged.map(p => (
          <motion.div key={p.product_id} variants={row}
            className="glass-card p-5 flex items-start justify-between group hover:border-white/[0.08] transition-all">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Boxes size={18} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">{p.product_name}</h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-white/55">
                  <span>{p.category || '未分类'}</span>
                  {p.default_cost > 0 && <span>成本 ¥{p.default_cost}</span>}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-white/40">
                  <span>运费 ¥{p.default_shipping_cost||0}</span>
                  <span>费率 {(p.default_service_fee_rate||0)*100}%</span>
                  <span>税率 {(p.default_tax_rate||0)*100}%</span>
                  <span>运费险 ¥{p.default_freight_insurance||0}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => startEdit(p)} className="p-2 rounded-lg hover:bg-white/[0.04] text-white/55 hover:text-white transition-all"><Edit3 size={14} /></button>
              <button onClick={() => handleDelete(p.product_id)} className="p-2 rounded-lg hover:bg-red-400/10 text-white/55 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 flex flex-col items-center py-16 text-white/20 gap-3">
            <Boxes size={32} />
            <span className="text-sm">{products.length === 0 ? '暂无商品' : '无匹配结果'}</span>
          </div>
        )}
      </motion.div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-6 px-2">
          <span className="text-xs text-white/30">共 {filtered.length} 件商品 · 第 {page}/{totalPages} 页</span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1} className="p-1.5 rounded-md text-white/30 hover:text-white disabled:opacity-15 transition-all"><ChevronLeft size={13} /></button>
            {Array.from({length:Math.min(totalPages,7)},(_,i)=>{
              let n=i+1; if(totalPages>7&&page>4)n=page-3+i; if(totalPages>7&&n>totalPages)return null
              return <button key={n} onClick={()=>setPage(n)} className={`w-7 h-7 rounded-md text-[11px] transition-all ${page===n?'bg-white text-black font-medium':'text-white/35 hover:text-white'}`}>{n}</button>
            })}
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page>=totalPages} className="p-1.5 rounded-md text-white/30 hover:text-white disabled:opacity-15 transition-all"><ChevronRight size={13} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
