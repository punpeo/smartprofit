# 盈析 · 动画交互设计规范

**版本**: v1.0  
**技术栈**: React 19 + Framer Motion 11 + Tailwind CSS 4  
**目标帧率**: 60fps（低配电脑 ≥30fps）

---

## 一、全局动画标准

### 1.1 动画令牌 (Design Tokens)

| Token | 值 | 用途 |
|-------|-----|------|
| `--ease-default` | `[0.4, 0, 0.2, 1]` | 标准缓出，所有入场动画 |
| `--ease-spring` | `{ type: 'spring', stiffness: 300, damping: 30 }` | 弹窗、模态框 |
| `--ease-bounce` | `{ type: 'spring', stiffness: 400, damping: 15 }` | 按钮点击反馈 |
| `--duration-fast` | `150ms` | 按钮 hover、图标切换 |
| `--duration-base` | `250ms` | 卡片入场、行动画 |
| `--duration-slow` | `400ms` | 页面入场、大区块 |
| `--duration-page` | `500ms` | 路由切换 |
| `--stagger-sm` | `30ms` | 表格行、列表项 |
| `--stagger-md` | `60ms` | KPI 卡片 |
| `--stagger-lg` | `100ms` | 页面区块 |

### 1.2 缓动曲线选用原则

```
入场动画  → ease-out（快进慢停，符合人眼预期）
出场动画  → ease-in （快出，释放空间）
弹窗      → spring  （物理直觉，有重量感）
按钮      → spring  （触感反馈）
hover     → linear 150ms（即时响应）
```

### 1.3 层级规则 (Z-Index)

| 层级 | z-index | 组件 |
|------|---------|------|
| 背景层 | 0 | PageBackground / Orb / FloatingLines |
| 内容层 | 10 | 页面所有内容布局 |
| 粘性导航 | 50 | Nav bar (sticky) |
| 下拉/弹窗 | 100 | Modal overlay, select dropdown |
| Toast | 2000 | 通知消息 |

---

## 二、全套动效逻辑

### 2.1 页面入场 (Route Transition)

**视觉表现**: 新页面从下方 20px 淡入，旧页面淡出。

**当前实现**: `App.jsx` 使用 `AnimatePresence mode="wait"` 包裹 `<Routes>`。Framer Motion 的 `AnimatePresence` 在 react-router v7 中自动处理路由切换。

```jsx
// App.jsx — 当前已实现
<AnimatePresence mode="wait">
  <Routes>
    <Route path="/" element={<HomePage />} />
    ...
  </Routes>
</AnimatePresence>
```

**性能注意**: 避免在路由切换时同时触发大量子组件动画。`mode="wait"` 确保旧页面完全卸载后再挂载新页面，避免两套 DOM 并存导致布局抖动。

### 2.2 路由切换 (Page Transition)

**视觉表现**: 旧页面透明度降至 0（200ms），新页面从 y:12px 淡入（400ms ease-out）。

**推荐增强**（当前部分缺失）:
```jsx
// 每个页面根元素添加
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
>
```

**已实现页面**: HomePage（完整动画）、Dashboard（staggerChildren）、ShopDetail（staggerChildren）

### 2.3 弹窗 (Modal)

**已实现**: SKUModal — `AnimatePresence` + `motion.div`

| 阶段 | 动画 | 时长 | 缓动 |
|------|------|------|------|
| 遮罩入场 | `opacity: 0 → 1` | 200ms | ease-out |
| 弹窗入场 | `scale: 0.96 → 1, y: 10 → 0, opacity: 0 → 1` | 250ms | spring(300,30) |
| 弹窗退场 | 反向 | 150ms | ease-in |
| 遮罩退场 | opacity: 1 → 0 | 150ms | ease-in |

**当前代码** (`SKUModal.jsx`):
```jsx
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm">
  <motion.div
    initial={{ opacity: 0, scale: 0.96, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.96, y: 10 }}
    transition={{ duration: 0.2 }}>
```

**性能注意**: 遮罩使用 `backdrop-filter: blur(4px)` — 这是 GPU 昂贵的属性。低配电脑可降级为纯色遮罩 `bg-black/50`。

### 2.4 标签页切换 (Tab Indicator)

**已实现**: SKUModal 内 Tab 切换 — `layoutId="tab-indicator"`

```jsx
{tab === i && <motion.div layoutId="tab-indicator" 
  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />}
```

**视觉表现**: 蓝色指示条在标签间滑动，带 spring 物理惯性。

**性能注意**: `layoutId` 动画依赖 `layout` 计算，父容器需 `overflow: hidden` 防止指示条溢出。

### 2.5 按钮交互

| 类型 | Hover | 按下 (Active) | 禁用 |
|------|-------|---------------|------|
| Primary (白底黑字) | `scale: 1.05` 放大 | `scale: 0.95` 缩小 | `opacity: 0.5` |
| Ghost (边框) | `border-color` 变亮 | `scale: 0.95` | `opacity: 0.5` |
| 表格操作 (编辑/删除) | `opacity: 0→1` 出现 | — | — |
| Icon 按钮 (圆形) | `bg` 从透明变浅色 | `scale: 0.9` | — |

**当前实现**:
```css
/* 全局按钮规范 */
.btn-primary:active { transform: scale(0.95); }
.btn-primary:hover { background: var(--blue-focus); }
.btn-secondary:hover { background: rgba(0,102,204,0.06); }
```

**性能注意**: 使用 CSS `transform` 而非 `width/height` 做缩放 — GPU 加速，不触发 layout。

### 2.6 表格行

**视觉表现**: 行从左侧 6px 淡入，逐行 stagger 30ms，hover 时背景微亮。

**已实现**: ShopDetail + DailyRecords + SKUsManager

```jsx
const row = { hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0 } }
// 容器
<motion.div variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.03 } } }}>
  // 每行
  <motion.tr variants={row} ...>
```

**性能注意**: 
- `staggerChildren` 延迟控制为 20-30ms，超过 50ms 会感觉"卡顿"
- 表格超过 50 行时，仅动画前 20 行，其余直接显示
- 翻页时使用 `AnimatePresence mode="wait"` 避免新旧行重叠

### 2.7 输入框

| 交互 | 动画 | 时长 |
|------|------|------|
| Focus | `border-color` 从 `white/10` 到 `blue-400/30` + `box-shadow` 内发光 | 150ms |
| Hover | `border-color` 微亮 | 150ms |
| Error | `border-color` → `red-400` + `shake` (X轴抖动 3 次) | 400ms |

**当前实现**: Tailwind `focus:border-blue-400/30 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.15)]`

### 2.8 加载态

| 场景 | 动画 | 位置 |
|------|------|------|
| 页面加载 | 旋转圆环 `animate-spin` + 文字 | 居中 |
| 表格加载 | 同上 | 表格区域 |
| 数据刷新 | 顶部微进度条 (2px, 蓝色) | Nav bar 下方 |
| 懒加载 (Admin) | 旋转圆环 `animate-spin` | 内容区 |

**当前实现**:
```jsx
<div className="w-5 h-5 rounded-full border-2 border-blue-400/20 border-t-blue-400 animate-spin" />
```

### 2.9 空状态

**视觉表现**: 图标从下方 20px 淡入 (400ms)，文字 200ms 后跟随。

```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
  className="flex flex-col items-center py-20 text-white/20 gap-3"
>
  <Package size={32} />
  <span>暂无数据</span>
</motion.div>
```

### 2.10 下拉菜单 (Select)

**视觉表现**: 点击展开时 `scaleY: 0→1`，选项 hover 时背景微亮。

**性能注意**: 原生 `<select>` 下拉由 OS 渲染，不受 Framer Motion 控制。自定义下拉菜单应使用 `AnimatePresence` + `motion.div`，`transformOrigin: "top"`。

### 2.11 KPI 卡片

**已实现**: `staggerChildren: 0.06s` — 4 张卡片依次从下方 24px 淡入

```jsx
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }
```

**数字跳动效果**（推荐新增）:
```jsx
// 使用 useSpring 做数字递增动画
const spring = useSpring(0, { stiffness: 100, damping: 20 })
// 数字从 0 递增到目标值
```

### 2.12 Toast 通知

**已实现**: `toastIn` 关键帧动画 — 从上方 8px 淡入

```css
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
```

### 2.13 侧边栏导航 (Admin)

**视觉表现**: 选中项背景高亮过渡，`ChevronRight` 图标出现/消失。

```jsx
<motion.button
  whileTap={{ scale: 0.97 }}
  className={active === key ? 'bg-white/[0.06]' : 'hover:bg-white/[0.02]'}
>
  {active === item.key && <ChevronRight size={14} />}
</motion.button>
```

### 2.14 背景动画 (WebGL/Canvas)

| 组件 | 技术 | 性能注意 |
|------|------|----------|
| Orb (Admin) | OGL WebGL | `IntersectionObserver` 离开视口暂停渲染 |
| FloatingLines (首页) | Three.js | `IntersectionObserver` + `document.hidden` 检测 |
| Threads (备用) | OGL WebGL | 同上 |

**已实现**: 所有 WebGL 组件都有 `isVisible` 和 `document.hidden` 检测，离开视口或切标签自动暂停 `requestAnimationFrame`。

---

## 三、性能规避清单

### 3.1 已知问题与解决方案

| 问题 | 原因 | 解决 |
|------|------|------|
| StrictMode 双调用导致重复 key | React 开发模式下 useEffect 执行两次 | `cancelled` 标志位 + cleanup 函数 |
| 表格分页闪烁 | `AnimatePresence mode="wait"` 导致翻页白屏 | 单页表格移除 `AnimatePresence`，用 `key` 直接触发 |
| 日期选择器交互卡顿 | `<input type="date">` 原生控件渲染慢 | 保持原生，不做自定义 DatePicker |
| backdrop-filter 性能 | GPU 合成层开销大 | 低配检测 → 降级为纯色背景 |
| JS bundle 过大 | three.js + ogl + xlsx 全打包 | React.lazy 按需加载 Admin 子页面 |

### 3.2 低配电脑适配

```js
// 检测低性能设备
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isLowEnd = navigator.hardwareConcurrency <= 4

// 降级策略
if (prefersReducedMotion || isLowEnd) {
  // 1. 禁用 staggerChildren（所有元素同时出现）
  // 2. 弹窗 duration 减半 (100ms)
  // 3. backdrop-filter 替换为纯色
  // 4. WebGL 背景替换为静态 CSS 渐变
}
```

### 3.3 动画 DO/DON'T

| DO ✅ | DON'T ❌ |
|-------|---------|
| `transform` + `opacity` 做动画 | `width`/`height`/`top`/`left` 做动画 |
| `will-change` 提前告知浏览器 | 全局滥用 `will-change`（内存泄漏） |
| `layoutId` 用于单一元素 | 多个 `layoutId` 同时动画（计算爆炸） |
| `staggerChildren: 30ms` | `staggerChildren: 200ms`（感觉卡顿） |
| Canvas `IntersectionObserver` | Canvas 无限 `requestAnimationFrame` |
| `useSpring` 物理动画 | `duration` 硬编码弹性动画 |
| `animate={{ opacity: 1 }}` | `animate={{ opacity: [0, 0.5, 1] }}` 多关键帧 |

---

## 四、组件动画速查表

| 组件 | 动画类型 | 时长 | stagger | 文件 |
|------|---------|------|---------|------|
| HomePage Hero | fadeIn + y | 600ms | — | HomePage.jsx |
| HomePage 卡片 | fadeIn + y | 600ms | 100ms | HomePage.jsx |
| Dashboard KPI | fadeIn + y | 400ms | 60ms | Dashboard.jsx |
| Dashboard 表格行 | fadeIn + y | 400ms | 60ms | Dashboard.jsx |
| ShopDetail 汇总卡片 | fadeIn + y | 350ms | 50ms | ShopDetail.jsx |
| ShopDetail SKU 行 | fadeIn + x | 200ms | 30ms | ShopDetail.jsx |
| SKUModal 弹窗 | scale + y + opacity | 250ms | — | SKUModal.jsx |
| SKUModal Tab | layoutId 滑动 | spring | — | SKUModal.jsx |
| Admin 侧边栏 | whileTap scale | 150ms | — | Admin.jsx |
| Admin 页面切换 | fadeIn + y | 200ms | — | Admin.jsx |
| ShopsManager 卡片 | fadeIn + y | — | 30ms | ShopsManager.jsx |
| ProductManager 卡片 | fadeIn + y | — | 30ms | ProductManager.jsx |
| SKUsManager 表格行 | fadeIn + x | 200ms | 20ms | SKUsManager.jsx |
| DailyRecords 表格行 | fadeIn + x | 200ms | 20ms | DailyRecords.jsx |
| Toast | y + opacity | 300ms | — | CSS @keyframes |
| 加载 Spinner | rotate | 无限 | — | Tailwind animate-spin |
| 按钮 active | scale | 150ms | — | CSS transform |
| 输入框 focus | border-color + shadow | 150ms | — | Tailwind transition |
