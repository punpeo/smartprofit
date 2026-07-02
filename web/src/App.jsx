import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { HomePage } from './pages/HomePage'
import { Dashboard } from './pages/Dashboard'
import { ShopDetail } from './pages/ShopDetail'
import { Admin } from './pages/Admin'

export default function App() {
  const [shop, setShop] = useState(null)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#eeeef2]">
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<Dashboard onSelectShop={(s) => setShop(s)} />} />
          <Route path="/shop/:id" element={<ShopDetail shop={shop} />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}
