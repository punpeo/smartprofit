import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Download, Eye, X } from 'lucide-react'

const TYPE_INFO = {
  sales:     { label: '商品明细',    color: 'text-blue-400',   bg: 'bg-blue-400/5' },
  aftersale: { label: '售后明细',    color: 'text-purple-400', bg: 'bg-purple-400/5' },
  promotion: { label: '推广+补单',   color: 'text-amber-400',  bg: 'bg-amber-400/5' },
  product:   { label: '商品主数据',   color: 'text-emerald-400', bg: 'bg-emerald-400/5' },
  unknown:   { label: '无法识别',    color: 'text-red-400',    bg: 'bg-red-400/5' },
}

function identifyType(name) {
  const n = name.toLowerCase()
  if (n.includes('商品明细')) return 'sales'
  if (n.endsWith('.zip')) return 'aftersale'
  if (n.includes('推广费') || n.includes('推广费用')) return 'promotion'
  if (n.includes('商品') && (n.includes('主数据') || n.includes('默认成本'))) return 'product'
  return 'unknown'
}

export function ImportCenter() {
  const [files, setFiles] = useState([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(null)
  const fileRef = useRef(null)

  function handleFiles(e) {
    const selected = Array.from(e.target.files)
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      const merged = [...prev, ...selected.filter(f => !existing.has(f.name))]
      return merged.map(f => ({ ...f, _type: identifyType(f.name) }))
    })
    e.target.value = ''
  }

  function removeFile(name) { setFiles(prev => prev.filter(f => f.name !== name)) }
  function clearAll() { setFiles([]); setImported(null) }

  async function handleImport() {
    if (files.length === 0) return
    setImporting(true); setImported(null)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      const resp = await fetch('/api/import/batch', { method: 'POST', body: formData })
      const data = await resp.json()
      setImported(data.results || {})
    } catch { setImported({ error: true }) }
    setImporting(false); setFiles([])
  }

  const validFiles = files.filter(f => f._type !== 'unknown')
  const unknownFiles = files.filter(f => f._type === 'unknown')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">文件导入中心</h2>
          <p className="text-sm text-white/80 mt-1">支持商品明细 / 售后明细 / 推广费用 批量导入，自动识别类型</p>
        </div>
        {files.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={clearAll} className="px-3 py-1.5 rounded-full border border-white/[0.09] text-xs text-white/65 hover:text-white transition-all">清空</button>
            <button onClick={handleImport} disabled={importing || validFiles.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50">
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {importing ? '导入中...' : `导入 ${validFiles.length} 个文件`}
            </button>
          </div>
        )}
      </div>

      {/* Upload Zone */}
      <motion.div whileTap={{ scale: 0.99 }}
        onClick={() => fileRef.current?.click()}
        className="glass-card border-dashed border-2 border-white/[0.06] hover:border-white/[0.12] p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all mb-6">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center">
          <Upload size={28} className="text-white/25" />
        </div>
        <div className="text-center">
          <p className="text-sm text-white/65 font-medium mb-1">拖拽文件到此处，或点击上传</p>
          <p className="text-xs text-white/30">支持 .xlsx / .zip 格式，可同时选择多个文件</p>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.zip" multiple onChange={handleFiles} className="hidden" />
      </motion.div>

      {/* File List */}
      {files.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">已选择 {files.length} 个文件</p>
          <div className="flex flex-col gap-2">
            {files.map(f => {
              const t = TYPE_INFO[f._type]
              return (
                <div key={f.name} className={`flex items-center justify-between px-4 py-3 rounded-xl ${t.bg} border border-white/[0.04]`}>
                  <div className="flex items-center gap-3">
                    <FileText size={16} className={t.color} />
                    <div>
                      <div className="text-sm text-white/80">{f.name}</div>
                      <div className={`text-xs ${t.color}`}>{t.label}</div>
                    </div>
                  </div>
                  <button onClick={() => removeFile(f.name)} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/35 hover:text-white transition-all"><X size={15} /></button>
                </div>
              )
            })}
          </div>
          {unknownFiles.length > 0 && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-red-400/5 border border-red-400/10 text-xs text-red-400/70">
              <AlertCircle size={13} /> {unknownFiles.length} 个文件无法识别类型，将跳过
            </div>
          )}
        </div>
      )}

      {/* Import Result */}
      {imported && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} className="text-emerald-400" />
            <span className="text-base font-medium text-white">导入完成</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[
              ['sales','销售记录',imported.sales || 0],
              ['aftersale','售后记录',imported.aftersale || 0],
              ['promotion','推广记录',imported.promotion || 0],
              ['fill_order','补单记录',imported.fill_order || 0],
              ['product','商品主数据',imported.product || 0],
            ].map(([key, label, count]) => (
              <div key={key} className="text-center p-3 rounded-xl bg-white/[0.02]">
                <div className="text-2xl font-semibold text-white tabular-nums">{count}</div>
                <div className="text-xs text-white/40 mt-1">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/25 mt-4">经营总览、店铺详情、每日记录已自动同步更新</p>
        </motion.div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '下载商品明细模板', icon: Download, desc: '包含销售额、订单量、订单件数' },
          { label: '下载推广费模板', icon: Download, desc: '全站/智能/京东联盟/搜索/推荐' },
          { label: '下载补单模板', icon: Download, desc: '补单数量、补单金额' },
        ].map(item => (
          <button key={item.label} onClick={() => {
            const headers = item.label.includes('商品') ? [['时间','SKU','成交金额','成交商品件数','成交单量']]
              : item.label.includes('推广') ? [['时间','店铺','SKU','搜索快车','全站营销','京东联盟','智能投放','推荐广告']]
              : [['时间','店铺','SKU','补单数量','补单金额']]
            import('../../components/ExcelTools').then(m => m.downloadTemplate(headers, item.label))
          }}
            className="glass-card p-4 flex items-start gap-3 text-left hover:border-white/[0.08] transition-all group">
            <div className="w-9 h-9 rounded-lg bg-white/[0.03] flex items-center justify-center shrink-0 group-hover:bg-white/[0.06] transition-all">
              <Download size={16} className="text-white/35 group-hover:text-white/65 transition-all" />
            </div>
            <div>
              <div className="text-sm text-white/70 group-hover:text-white transition-all">{item.label}</div>
              <div className="text-xs text-white/30 mt-0.5">{item.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
