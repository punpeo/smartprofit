import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Save, X, Package, Edit3, Search, Trash, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../../api'
import { ImportBar } from '../../components/ExcelTools'
import { useDebounce } from '../../hooks/useDebounce'

const TEMPLATE = [['SKU编码', '商品ID', '所属店铺ID']]
const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }

export function SKUsManager() {
  const [skus, setSkus] = useState([])
  const [shops, setShops] = useState([])
  const [products, setProducts] = useState([])
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filterShopId, setFilterShopId] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 200)
  function setFilter(val) { setFilterShopId(val); setPage(1) }
  function setSearchVal(val) { setSearch(val); setPage(1) }
  const pageSize = 10

  async function handleImport(rows) {
    const mapped = rows.map(r => ({
      sku_code: String(r['SKU编码'] || r.sku_code || ''),
      product_id: Number(r['商品ID'] || r.product_id) || 0,
      shop_id: Number(r['所属店铺ID'] || r.shop_id) || shops[0]?.shop_id || 1,
    })).filter(s => s.sku_code && s.product_id)
    if (mapped.length === 0) return alert('未识别到有效数据，请确认包含 SKU编码 和 商品ID 列')

    const imported = []
    for (const item of mapped) {
      try {
        const res = await api.createSKU(item)
        imported.push({ sku_id: res.sku_id, ...item })
      } catch {
        imported.push({ sku_id: Date.now() + Math.random(), ...item })
      }
    }
    setSkus(prev => [...prev, ...imported])
  }

  function loadSKUs(shopId) {
    api.fetchSKUBase(shopId).then(data => setSkus(data))
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.fetchShops(),
      api.fetchSKUBase(),
      fetch('/api/products').then(r => r.json()).catch(() => []),
    ]).then(([s, sk, prods]) => {
      if (cancelled) return
      setShops(s)
      setSkus(sk)
      setProducts(Array.isArray(prods) ? prods : [])
    })
    return () => { cancelled = true }
  }, [])

  function startEdit(sku) {
    if (sku) {
      setEditing({
        sku_code: sku.sku_code || '',
        product_id: sku.product_id || '',
        shop_id: sku.shop_id || shops[0]?.shop_id || 1,
        _isEdit: true,
      })
    } else {
      setEditing({ sku_code: '', product_id: '', shop_id: shops[0]?.shop_id || 1, _isEdit: false })
    }
  }

  function handleProductChange(pid) {
    setEditing(e => ({ ...e, product_id: pid ? Number(pid) : '' }))
  }
  function cancelEdit() { setEditing(null) }

  async function handleSave() {
    if (!editing.sku_code.trim() || !editing.product_id) return
    if (editing._isEdit) {
      try { await api.updateSKU(editing.sku_code, { shop_id: editing.shop_id, product_id: editing.product_id }) } catch {}
      setSkus(prev => { const idx = prev.findIndex(s => s.sku_code === editing.sku_code); if (idx >= 0) { const u = [...prev]; u[idx] = editing; return u } return prev })
    } else {
      try {
        const res = await api.createSKU({ sku_code: editing.sku_code, product_id: editing.product_id, shop_id: editing.shop_id })
        setSkus(prev => [...prev, { sku_id: res.sku_id, sku_code: editing.sku_code, product_id: editing.product_id, shop_id: editing.shop_id }])
      } catch {
        setSkus(prev => [...prev, { ...editing, sku_id: Date.now() }])
      }
    }
    setEditing(null)
  }

  async function handleDelete(code) {
    try { await api.deleteSKU(code) } catch {}
    setSkus(prev => prev.filter(s => s.sku_code !== code && s.sku_id !== code))
  }

  async function handleClear() {
    if (!confirm('确定清空所有 SKU？')) return
    // 逐个删除（后端不支持批量）
    for (const s of skus) { try { await api.deleteSKU(s.sku_code) } catch {} }
    setSkus([])
  }

  const filtered = useMemo(() => skus.filter(s => {
    const matchSearch = !debouncedSearch || s.sku_code.toLowerCase().includes(debouncedSearch.toLowerCase()) || (s.product_name || '').toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchShop = !filterShopId || s.shop_id === Number(filterShopId)
    return matchSearch && matchShop
  }), [skus, debouncedSearch, filterShopId])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
  const ROW_H = 48

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">SKU 管理</h2>
          <p className="text-sm text-white/80 mt-1">管理所有商品 SKU 基础信息</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterShopId} onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/[0.12] bg-[#1a1a24] text-sm text-white/85 outline-none focus:border-blue-400/30">
            <option value="" className="bg-[#1a1a24] text-white">全部店铺</option>
            {shops.map(s => <option key={s.shop_id} value={s.shop_id} className="bg-[#1a1a24] text-white">{s.shop_name}</option>)}
          </select>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04]">
            <Search size={14} className="text-white/75" />
            <input value={search} onChange={e => setSearchVal(e.target.value)} placeholder="搜索 SKU..." className="bg-transparent outline-none text-sm text-white/75 placeholder:text-white/50 w-40" />
          </div>
          <ImportBar onImport={handleImport} templateHeaders={TEMPLATE} templateName="SKU导入模板" label="导入 SKU" />
          {skus.length > 0 && !editing && (
            <button onClick={handleClear}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all">
              <Trash size={13} /> 清空
            </button>
          )}
          {!editing && (
            <button onClick={() => startEdit(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all active:scale-95">
              <Plus size={14} /> 新增 SKU
            </button>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Edit3 size={15} className="text-blue-400" />
            <span className="text-sm font-medium text-white">{editing._isEdit ? '编辑 SKU' : '新增 SKU'}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-white/80">关联商品 *</span>
              <select value={editing.product_id || ''} onChange={e => handleProductChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-white/[0.12] bg-[#1a1a24] text-sm text-white/85 outline-none focus:border-blue-400/30">
                <option value="" className="bg-[#1a1a24] text-white">请选择商品</option>
                {products.map(p => (
                  <option key={p.product_id} value={p.product_id} className="bg-[#1a1a24] text-white">
                    {p.product_name} {p.category ? `· ${p.category}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-white/80">SKU 编码 *</span>
              <input value={editing.sku_code} onChange={e => setEditing({ ...editing, sku_code: e.target.value })}
                disabled={editing._isEdit}
                className="px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] text-sm text-white/85 outline-none focus:border-blue-400/30 disabled:opacity-40" placeholder="例：JD001-RED" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-white/80">所属店铺 *</span>
              <select value={editing.shop_id} onChange={e => setEditing({ ...editing, shop_id: Number(e.target.value) })}
                className="px-3 py-2 rounded-lg border border-white/[0.12] bg-[#1a1a24] text-sm text-white/85 outline-none focus:border-blue-400/30">
                {shops.map(s => <option key={s.shop_id} value={s.shop_id} className="bg-[#1a1a24] text-white">{s.shop_name}</option>)}
              </select>
            </label>
          </div>
          {editing.product_id && (
            <div className="text-xs text-white/35 mb-4 px-1">
              商品名称和默认成本由关联商品的「商品管理」中设置
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all"><Save size={13} /> 保存</button>
            <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/[0.12] text-sm text-white/80 hover:text-white transition-all"><X size={13} /> 取消</button>
          </div>
        </motion.div>
      )}

      {/* SKU Table — 单一表格 sticky 表头，固定 10 行 */}
      <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }} initial="hidden" animate="show"
        className="glass-card overflow-hidden flex flex-col">
        <div className="overflow-y-auto" style={{ maxHeight: ROW_H * 10 + 40 }}>
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#16161f] border-b border-white/[0.07]">
                {['SKU编码','商品名称','店铺','默认成本','分类',''].map((h, idx) => (
                  <th key={h} className={`py-3 px-3 text-[11px] font-medium text-white/40 uppercase tracking-wider text-left border-r border-white/[0.05] last:border-r-0 ${idx===0?'w-[100px]':''} ${idx===2?'w-[100px]':''} ${idx===3?'w-[90px]':''} ${idx===4?'w-[80px]':''} ${idx===5?'w-[80px]':''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? paged.map(s => {
                const shop = shops.find(sh => sh.shop_id === s.shop_id)
                return (
                  <motion.tr key={s.sku_code} variants={row} style={{ height: ROW_H }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                    <td className="px-3 text-xs text-white/55 font-mono align-middle border-r border-white/[0.04] truncate">{s.sku_code}</td>
                    <td className="px-3 text-sm text-white/80 align-middle border-r border-white/[0.04] truncate">{s.product_name}</td>
                    <td className="px-3 text-sm text-white/65 align-middle border-r border-white/[0.04] truncate">{shop?.shop_name || '-'}</td>
                    <td className="px-3 text-sm text-white/70 tabular-nums align-middle border-r border-white/[0.04]">¥ {s.default_cost?.toLocaleString()}</td>
                    <td className="px-3 text-sm text-white/55 align-middle border-r border-white/[0.04] truncate">{s.category || '-'}</td>
                    <td className="px-2 align-middle">
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { startEdit(s); setPage(1) }} className="p-1 rounded-md hover:bg-white/[0.04] text-white/55 hover:text-white transition-all"><Edit3 size={13} /></button>
                        <button onClick={() => handleDelete(s.sku_code)} className="p-1 rounded-md hover:bg-red-400/10 text-white/55 hover:text-red-400 transition-all"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </motion.tr>
                )
              }) : (
                <tr style={{ height: ROW_H * 10 }}>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center h-full text-white/20 gap-3">
                      <Package size={28} />
                      <span className="text-xs">暂无数据</span>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.length > 0 && paged.length < pageSize && Array.from({ length: pageSize - paged.length }).map((_, i) => (
                <tr key={`empty-${i}`} style={{ height: ROW_H }} className="border-b border-white/[0.02]">
                  <td colSpan={6} className="px-3" />
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
    </div>
  )
}
