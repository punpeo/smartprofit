import { useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Store, Package, FileText, LayoutDashboard, ChevronRight, Boxes, Upload, ChevronDown, ListOrdered, RefreshCw, ShoppingCart, Megaphone } from 'lucide-react'
import Orb from '../components/Orb'

const ShopsManager = lazy(() => import('./admin/ShopsManager').then(m => ({ default: m.ShopsManager })))
const ProductManager = lazy(() => import('./admin/ProductManager').then(m => ({ default: m.ProductManager })))
const SKUsManager = lazy(() => import('./admin/SKUsManager').then(m => ({ default: m.SKUsManager })))
const DailyRecords = lazy(() => import('./admin/DailyRecords').then(m => ({ default: m.DailyRecords })))
const ImportCenter = lazy(() => import('./admin/ImportCenter').then(m => ({ default: m.ImportCenter })))
const DailySourcePage = lazy(() => import('./admin/DailySourcePage').then(m => ({ default: m.DailySourcePage })))

const NAV = [
  { key: 'import',    label: '文件导入', icon: Upload,            desc: '批量导入经营数据' },
  { key: 'shops',     label: '店铺管理', icon: Store,            desc: '管理所有店铺信息' },
  { key: 'products',  label: '商品管理', icon: Boxes,            desc: '管理商品及默认成本' },
  { key: 'skus',      label: 'SKU 管理', icon: Package,           desc: '管理商品 SKU 数据' },
]

const DAILY_SUB = [
  { key: 'records',     label: '销售记录', icon: ShoppingCart,  desc: '每日利润汇总' },
  { key: 'aftersale',   label: '售后记录', icon: RefreshCw,     desc: '每日退换货汇总' },
  { key: 'fillorder',   label: '补单记录', icon: ListOrdered,   desc: '每日补单汇总' },
  { key: 'promotion',   label: '推广记录', icon: Megaphone,     desc: '每日推广费汇总' },
]

const pages = {
  import: ImportCenter, shops: ShopsManager, products: ProductManager, skus: SKUsManager,
  records: DailyRecords, aftersale: () => <DailySourcePage type="aftersale" />,
  fillorder: () => <DailySourcePage type="fillorder" />, promotion: () => <DailySourcePage type="promotion" />,
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 border-blue-400/20 border-t-blue-400 animate-spin" />
    </div>
  )
}

export function Admin() {
  const navigate = useNavigate()
  const [active, setActive] = useState('shops')
  const Content = pages[active]

  return (
    <div className="relative h-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* Orb 背景 */}
      <div className="absolute inset-0 z-0">
        <Orb
          hoverIntensity={2}
          rotateOnHover
          hue={250}
          forceHoverState={false}
          backgroundColor="#0a0a0f"
        />
      </div>
      <div className="absolute inset-0 z-0 bg-[#0a0a0f]/60" />

      {/* Top Bar */}
      <nav className="relative z-10 shrink-0 glass border-b border-white/[0.07]">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between px-8 h-14">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors">
              <ArrowLeft size={15} /> 返回首页
            </button>
            <span className="text-white/12">|</span>
            <LayoutDashboard size={15} className="text-white/75" />
            <h1 className="text-sm font-medium text-white/85">后台管理</h1>
          </div>
          <span className="text-xs text-white/75">v1.0</span>
        </div>
      </nav>

      {/* Body: Sidebar + Content */}
      <div className="relative z-10 flex-1 flex max-w-[1440px] mx-auto w-full min-h-0 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-[240px] shrink-0 border-r border-white/[0.12] flex flex-col py-6 px-4 gap-1 overflow-y-auto">
          {NAV.map((item) => (
            <motion.button
              key={item.key}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActive(item.key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group ${
                active === item.key
                  ? 'bg-white/[0.12] text-white'
                  : 'text-white/75 hover:text-white/75 hover:bg-white/[0.04]'
              }`}
            >
              <item.icon size={17} className={active === item.key ? 'text-blue-400' : 'text-white/75 group-hover:text-white/75'} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-[11px] text-white/75 mt-0.5">{item.desc}</div>
              </div>
              {active === item.key && <ChevronRight size={14} className="text-white/75" />}
            </motion.button>
          ))}

          {/* 每日记录 — 可展开子菜单 */}
          <div className="mt-2">
            <button onClick={() => setActive(prev => DAILY_SUB.some(s => s.key === prev) ? 'shops' : 'records')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all w-full ${
                DAILY_SUB.some(s => s.key === active)
                  ? 'bg-white/[0.06] text-white'
                  : 'text-white/75 hover:text-white/75 hover:bg-white/[0.04]'
              }`}>
              <FileText size={17} className={DAILY_SUB.some(s => s.key === active) ? 'text-blue-400' : 'text-white/75'} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">每日记录</div>
                <div className="text-[11px] text-white/75 mt-0.5">查看各维度每日汇总</div>
              </div>
              <ChevronDown size={14} className={`text-white/55 transition-transform ${DAILY_SUB.some(s => s.key === active) ? 'rotate-180' : ''}`} />
            </button>

            {DAILY_SUB.map(sub => (
              <motion.button
                key={sub.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActive(sub.key)}
                className={`flex items-center gap-3 pl-12 pr-4 py-2.5 rounded-xl text-left transition-all w-full ${
                  active === sub.key
                    ? 'text-blue-400'
                    : 'text-white/55 hover:text-white/75 hover:bg-white/[0.03]'
                }`}
              >
                <sub.icon size={14} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{sub.label}</div>
                  <div className="text-[10px] text-white/75 mt-0.5">{sub.desc}</div>
                </div>
                {active === sub.key && <ChevronRight size={12} className="text-blue-400" />}
              </motion.button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 overflow-y-auto p-6">
          <Suspense fallback={<PageLoader />}>
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Content />
            </motion.div>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
