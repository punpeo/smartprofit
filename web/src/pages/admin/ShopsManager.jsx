import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Save, X, Store, Edit3, Trash } from 'lucide-react'
import { api } from '../../api'
import { ImportBar } from '../../components/ExcelTools'

const TEMPLATE = [['店铺名称', '平台', '负责人']]
const row = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }

export function ShopsManager() {
  const [shops, setShops] = useState([])
  const [editing, setEditing] = useState(null)

  useEffect(() => { api.fetchShops().then(setShops) }, [])

  async function handleImport(rows) {
    const mapped = rows.map(r => ({
      shop_name: String(r['店铺名称'] || r.shop_name || ''),
      platform: String(r['平台'] || r.platform || ''),
      owner: String(r['负责人'] || r.owner || ''),
    })).filter(s => s.shop_name)
    if (mapped.length === 0) return alert('未识别到有效数据')
    for (const item of mapped) {
      try { const res = await api.createShop(item); setShops(prev => [...prev, { shop_id: res.shop_id, ...item, status: '盈利', today_profit: 0, total_profit: 0, profit_rate: 0 }]) } catch {}
    }
  }

  function startEdit(shop) { setEditing(shop ? { ...shop } : { shop_name: '', platform: '', owner: '' }) }
  function cancelEdit() { setEditing(null) }

  async function handleSave() {
    if (!editing.shop_name.trim()) return
    if (editing.shop_id) {
      try { await api.updateShop(editing.shop_id, { shop_name: editing.shop_name, platform: editing.platform, owner: editing.owner }) } catch {}
      setShops(prev => prev.map(s => s.shop_id === editing.shop_id ? { ...s, shop_name: editing.shop_name, platform: editing.platform, owner: editing.owner } : s))
    } else {
      try {
        const res = await api.createShop({ shop_name: editing.shop_name, platform: editing.platform, owner: editing.owner })
        setShops(prev => [...prev, { shop_id: res.shop_id, shop_name: editing.shop_name, platform: editing.platform, owner: editing.owner, status: '盈利', today_profit: 0, total_profit: 0, profit_rate: 0 }])
      } catch {
        setShops(prev => [...prev, { ...editing, shop_id: Date.now(), status: '盈利', today_profit: 0, total_profit: 0, profit_rate: 0 }])
      }
    }
    setEditing(null)
  }

  async function handleDelete(id) {
    try { await api.deleteShop(id) } catch {}
    setShops(prev => prev.filter(s => s.shop_id !== id))
  }

  async function handleClear() {
    if (!confirm('确定清空所有数据？')) return
    try { await api.clearAll() } catch {}
    setShops([])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-lg font-semibold text-white">店铺管理</h2><p className="text-sm text-white/80 mt-1">管理所有接入的电商店铺</p></div>
        <div className="flex items-center gap-2">
          <ImportBar onImport={handleImport} templateHeaders={TEMPLATE} templateName="店铺导入模板" label="导入店铺" />
          {shops.length > 0 && !editing && (
            <button onClick={handleClear} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all"><Trash size={13} /> 清空</button>
          )}
          {!editing && (
            <button onClick={() => startEdit(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all active:scale-95"><Plus size={14} /> 新增店铺</button>
          )}
        </div>
      </div>

      {editing && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4"><Edit3 size={15} className="text-blue-400" /><span className="text-sm font-medium text-white">{editing.shop_id ? '编辑店铺' : '新增店铺'}</span></div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <label className="flex flex-col gap-1"><span className="text-xs text-white/80">店铺名称 *</span>
              <input value={editing.shop_name} onChange={e => setEditing({ ...editing, shop_name: e.target.value })} className="px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] text-sm text-white/85 outline-none focus:border-blue-400/30" placeholder="例：京东自营店" /></label>
            <label className="flex flex-col gap-1"><span className="text-xs text-white/80">平台</span>
              <input value={editing.platform} onChange={e => setEditing({ ...editing, platform: e.target.value })} className="px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] text-sm text-white/85 outline-none focus:border-blue-400/30" placeholder="京东 / 天猫 / 拼多多" /></label>
            <label className="flex flex-col gap-1"><span className="text-xs text-white/80">负责人</span>
              <input value={editing.owner} onChange={e => setEditing({ ...editing, owner: e.target.value })} className="px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.04] text-sm text-white/85 outline-none focus:border-blue-400/30" placeholder="负责人姓名" /></label>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all"><Save size={13} /> 保存</button>
            <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/[0.12] text-sm text-white/80 hover:text-white transition-all"><X size={13} /> 取消</button>
          </div>
        </motion.div>
      )}

      <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }} initial="hidden" animate="show" className="grid grid-cols-2 gap-4">
        {shops.map(shop => (
          <motion.div key={shop.shop_id} variants={row} className="glass-card p-5 flex items-start justify-between group hover:border-white/[0.08] transition-all">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0"><Store size={18} className="text-blue-400" /></div>
              <div>
                <h3 className="text-sm font-medium text-white">{shop.shop_name}</h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-white/55"><span>{shop.platform}</span>{shop.owner && <><span className="text-white/12">|</span><span>{shop.owner}</span></>}</div>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${shop.status === '盈利' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>{shop.status || '盈利'}</span>
                  <span className="text-xs text-white/40">累计 ¥ {shop.total_profit?.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => startEdit(shop)} className="p-2 rounded-lg hover:bg-white/[0.04] text-white/55 hover:text-white transition-all"><Edit3 size={14} /></button>
              <button onClick={() => handleDelete(shop.shop_id)} className="p-2 rounded-lg hover:bg-red-400/10 text-white/55 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
            </div>
          </motion.div>
        ))}
        {shops.length === 0 && (
          <div className="col-span-2 flex flex-col items-center py-16 text-white/20 gap-3"><Store size={32} /><span className="text-sm">暂无店铺</span></div>
        )}
      </motion.div>
    </div>
  )
}
