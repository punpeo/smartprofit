/* ============================================================
   盈析 · Vue 3 应用
   依赖: Vue 3 CDN (全局 Vue 对象)
   ============================================================ */

const { createApp, ref, reactive, computed, watch, onMounted } = Vue;

createApp({
    setup() {
        // ============================================================
        // 1. State
        // ============================================================
        const page = ref('dashboard');           // 'dashboard' | 'shop-detail'
        const currentShop = ref(null);           // 当前选中店铺对象
        const shops = ref([]);                   // 店铺排名列表
        const skuItems = ref([]);                // 当前店铺 SKU 列表
        const shopSummary = ref(null);           // 店铺汇总数据
        const kpis = ref({ total_profit: 0, total_sales: 0, total_promo: 0, avg_profit_rate: 0 });

        // UI
        const timeRange = ref('7days');
        const currentPageNum = ref(1);
        const pageSize = ref(10);
        const modalVisible = ref(false);
        const modalTab = ref(0);
        const editingSkuCode = ref('');
        const toastMsg = ref('');
        const toastTimer = ref(null);
        const loading = ref(false);
        const apiAvailable = ref(true);

        // Modal form (v-model bound)
        const form = reactive({
            sales_amount: 0, order_items_count: 0, order_count: 0,
            real_sales_amount: 0, real_order_count: 0,
            fill_order_amount: 0, fill_order_count: 0,
            product_cost: 0, shipping_fee: 0, service_fee: 0, tax_fee: 0,
            freight_insurance: 0, return_count: 0, return_cost: 0,
            exchange_count: 0, exchange_cost: 0, fill_order_cost: 0,
            promotion_alliance: 0, promotion_auto: 0, promotion_jd_union: 0,
            promotion_search: 0, promotion_recommend: 0,
        });

        // Date range
        const dateStart = ref('2026-06-01');
        const dateEnd = ref('2026-06-30');

        // ============================================================
        // 2. Computed
        // ============================================================

        const totalPages = computed(() => Math.max(1, Math.ceil(skuItems.value.length / pageSize.value)));

        const pagedSkus = computed(() => {
            const start = (currentPageNum.value - 1) * pageSize.value;
            return skuItems.value.slice(start, start + pageSize.value);
        });

        const pageNumbers = computed(() => {
            const arr = [];
            for (let i = 1; i <= totalPages.value; i++) arr.push(i);
            return arr;
        });

        // 利润公式展示
        const profitFormulaText = computed(() => {
            const totalCost = form.product_cost + form.shipping_fee + form.service_fee +
                form.tax_fee + form.freight_insurance + form.return_cost +
                form.exchange_cost + form.fill_order_cost;
            const totalPromo = form.promotion_alliance + form.promotion_auto +
                form.promotion_jd_union + form.promotion_search + form.promotion_recommend;
            return `利润 = 真实销售额 (${form.real_sales_amount.toLocaleString()}) - (成本合计 ${totalCost.toLocaleString()} + 推广合计 ${totalPromo.toLocaleString()}) + 补单金额 (${form.fill_order_amount.toLocaleString()})`;
        });

        const profitResult = computed(() => {
            const totalCost = form.product_cost + form.shipping_fee + form.service_fee +
                form.tax_fee + form.freight_insurance + form.return_cost +
                form.exchange_cost + form.fill_order_cost;
            const totalPromo = form.promotion_alliance + form.promotion_auto +
                form.promotion_jd_union + form.promotion_search + form.promotion_recommend;
            return form.real_sales_amount - totalCost - totalPromo + form.fill_order_amount;
        });

        // Dashboard 表格数据（带排名）
        const rankedShops = computed(() =>
            shops.value.map((s, i) => ({ ...s, rank: i + 1 }))
        );

        // ============================================================
        // 3. API Helpers
        // ============================================================

        const API = {
            async get(path) {
                const res = await fetch(path);
                if (!res.ok) throw new Error(res.statusText);
                return res.json();
            },
            async post(path, body) {
                const res = await fetch(path, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error(res.statusText);
                return res.json();
            },
        };

        // ============================================================
        // 4. Data Fetching
        // ============================================================

        async function fetchShops() {
            try {
                const data = await API.get('/api/shops');
                shops.value = Array.isArray(data) ? data : [];
                apiAvailable.value = true;
            } catch {
                apiAvailable.value = false;
                // Fallback mock
                shops.value = [
                    { shop_id: 1, shop_name: '京东自营店', today_profit: 15200, total_profit: 98000, profit_rate: 22, status: '盈利' },
                    { shop_id: 2, shop_name: '天猫旗舰店', today_profit: 12800, total_profit: 85600, profit_rate: 18, status: '盈利' },
                    { shop_id: 3, shop_name: '拼多多专营店', today_profit: -3200, total_profit: 12400, profit_rate: 8, status: '亏损' },
                ];
            }
        }

        async function fetchDashboardKpis() {
            try {
                const data = await API.get('/api/dashboard/kpis');
                kpis.value = data;
            } catch {
                kpis.value = { total_profit: 245680, total_sales: 1250000, total_promo: 45800, avg_profit_rate: 19.6 };
            }
        }

        async function fetchShopDetail() {
            if (!currentShop.value) return;
            const sid = currentShop.value.shop_id;
            const start = dateStart.value;
            const end = dateEnd.value;

            loading.value = true;
            try {
                const [summary, skuData] = await Promise.all([
                    API.get(`/api/shops/${sid}/summary?start=${start}&end=${end}`),
                    API.get(`/api/shops/${sid}/skus?start=${start}&end=${end}&page=1&page_size=100`),
                ]);
                shopSummary.value = summary;
                skuItems.value = (skuData && skuData.items) ? skuData.items : [];
                apiAvailable.value = true;
            } catch {
                apiAvailable.value = false;
                // Fallback mock
                shopSummary.value = {
                    total_sales: 158000, total_orders: 3450, total_real_sales: 152000,
                    total_real_orders: 3200, total_order_items: 3800,
                    total_fill_count: 250, total_fill_amount: 12500, total_fill_cost: 6200,
                    total_promo: 8500, total_aftersale_cost: 4200, net_profit: 28500,
                };
                skuItems.value = [
                    { sku_code: 'JD001', product_name: '蓝牙耳机 Pro', sales_amount: 32000, order_count: 520, promotion_total: 3800, product_cost: 18000, final_profit: 8500 },
                    { sku_code: 'JD002', product_name: '氮化镓充电器 65W', sales_amount: 21000, order_count: 380, promotion_total: 2550, product_cost: 11000, final_profit: 6200 },
                    { sku_code: 'JD003', product_name: '手机壳 磁吸系列', sales_amount: 8500, order_count: 420, promotion_total: 1180, product_cost: 3800, final_profit: 2900 },
                    { sku_code: 'JD004', product_name: '钢化膜 3片装', sales_amount: 5200, order_count: 350, promotion_total: 710, product_cost: 2200, final_profit: 1950 },
                    { sku_code: 'JD005', product_name: '数据线 Type-C 快充', sales_amount: 6800, order_count: 310, promotion_total: 830, product_cost: 2800, final_profit: 2700 },
                    { sku_code: 'JD006', product_name: '移动电源 20000mAh', sales_amount: 18500, order_count: 260, promotion_total: 2170, product_cost: 9500, final_profit: 5800 },
                    { sku_code: 'JD007', product_name: '车载无线充电支架', sales_amount: 6200, order_count: 190, promotion_total: 790, product_cost: 2600, final_profit: 2400 },
                    { sku_code: 'JD008', product_name: '蓝牙自拍杆 三脚架', sales_amount: 4200, order_count: 160, promotion_total: 590, product_cost: 1800, final_profit: 1550 },
                ];
            } finally {
                loading.value = false;
                currentPageNum.value = 1;
            }
        }

        // ============================================================
        // 5. Navigation
        // ============================================================

        function goToShop(shop) {
            currentShop.value = shop;
            page.value = 'shop-detail';
            fetchShopDetail();
        }

        function goToDashboard() {
            page.value = 'dashboard';
            currentShop.value = null;
            fetchShops();
            fetchDashboardKpis();
        }

        // ============================================================
        // 6. Modal
        // ============================================================

        function openModal(sku) {
            editingSkuCode.value = sku.sku_code || sku.sku_code;
            // Populate form from SKU data
            Object.assign(form, {
                sales_amount: sku.sales_amount || 0,
                order_items_count: sku.order_items_count || sku.order_count || 0,
                order_count: sku.order_count || 0,
                real_sales_amount: sku.real_sales_amount || sku.sales_amount || 0,
                real_order_count: sku.real_order_count || sku.order_count || 0,
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
            });
            modalTab.value = 0;
            modalVisible.value = true;
            document.body.style.overflow = 'hidden';
        }

        function openFirstSku() {
            if (skuItems.value.length > 0) {
                openModal(skuItems.value[0]);
            } else {
                showToast('⚠️ 当前店铺暂无 SKU 数据');
            }
        }

        function closeModal() {
            modalVisible.value = false;
            document.body.style.overflow = '';
        }

        function switchTab(index) {
            modalTab.value = index;
        }

        // ============================================================
        // 7. Actions
        // ============================================================

        async function saveData() {
            const code = editingSkuCode.value;
            if (!code) return;

            const payload = {
                record_date: '', // 后端会填今天
                ...form,
                final_profit: profitResult.value,
            };

            try {
                await API.post(`/api/skus/${code}/save`, payload);
                showToast('✅ 数据已保存');
                closeModal();
                if (page.value === 'shop-detail') fetchShopDetail();
            } catch {
                // 离线模式：本地更新
                const idx = skuItems.value.findIndex(s => s.sku_code === code);
                if (idx >= 0) {
                    skuItems.value[idx] = {
                        ...skuItems.value[idx],
                        sales_amount: form.sales_amount,
                        order_count: form.order_count,
                        promotion_total: form.promotion_alliance + form.promotion_auto + form.promotion_jd_union + form.promotion_search + form.promotion_recommend,
                        product_cost: form.product_cost,
                        final_profit: profitResult.value,
                    };
                }
                showToast('⚠️ 离线模式：仅本地更新（后端未连接）');
                closeModal();
            }
        }

        function setTimeRange(range) {
            timeRange.value = range;
            // 根据时间范围自动设置日期
            const now = new Date();
            const end = now.toISOString().slice(0, 10);
            let start = end;
            switch (range) {
                case 'today': break;
                case 'yesterday':
                    const y = new Date(now - 86400000);
                    start = end = y.toISOString().slice(0, 10);
                    break;
                case '7days':
                    start = new Date(now - 6 * 86400000).toISOString().slice(0, 10);
                    break;
                case '30days':
                    start = new Date(now - 29 * 86400000).toISOString().slice(0, 10);
                    break;
            }
            dateStart.value = start;
            dateEnd.value = end;
            if (page.value === 'shop-detail') fetchShopDetail();
        }

        async function copyYesterday() {
            if (currentShop.value && page.value === 'shop-detail') {
                try {
                    await API.post(`/api/shops/${currentShop.value.shop_id}/copy-yesterday`, {});
                    showToast('📋 昨日数据已复制到今日');
                    fetchShopDetail();
                } catch {
                    showToast('⚠️ 后端未连接，无法复制');
                }
            } else {
                showToast('📋 请先进入店铺详情页（演示功能）');
            }
        }

        async function batchImport() {
            showToast('📂 批量导入功能（需后端支持 CSV 上传）');
        }

        function setFixedCosts() {
            const shop = currentShop.value;
            const name = shop ? shop.shop_name : '当前店铺';
            const val = prompt(`请输入「${name}」的固定成本（月租金/人工等）：`, '0');
            if (val !== null) {
                showToast(`💡 固定成本已记录: ¥ ${(parseFloat(val) || 0).toLocaleString()}（演示功能）`);
            }
        }

        // ============================================================
        // 8. Pagination
        // ============================================================

        function goToPage(p) {
            if (p >= 1 && p <= totalPages.value) {
                currentPageNum.value = p;
            }
        }

        function prevPage() { goToPage(currentPageNum.value - 1); }
        function nextPage() { goToPage(currentPageNum.value + 1); }

        // ============================================================
        // 9. Toast
        // ============================================================

        function showToast(msg) {
            toastMsg.value = msg;
            if (toastTimer.value) clearTimeout(toastTimer.value);
            toastTimer.value = setTimeout(() => { toastMsg.value = ''; }, 2500);
        }

        // ============================================================
        // 10. Keyboard
        // ============================================================

        function onKeydown(e) {
            if (e.key === 'Escape' && modalVisible.value) {
                closeModal();
            }
        }

        // ============================================================
        // 11. Init
        // ============================================================

        onMounted(() => {
            fetchShops();
            fetchDashboardKpis();
            document.addEventListener('keydown', onKeydown);
        });

        // ============================================================
        // 12. Format helpers
        // ============================================================

        function fmt(n, decimals = 0) {
            if (n == null) return '--';
            return Number(n).toLocaleString(undefined, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            });
        }

        function fmtMoney(n) {
            if (n == null) return '¥ --';
            const v = Number(n);
            const sign = v < 0 ? '-¥ ' : '¥ ';
            return sign + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function profitClass(n) {
            return Number(n) >= 0 ? 'status-profit' : 'status-loss';
        }

        // ============================================================
        // Return
        // ============================================================

        return {
            // State
            page, currentShop, shops, skuItems, shopSummary, kpis,
            timeRange, currentPageNum, pageSize, modalVisible, modalTab,
            editingSkuCode, toastMsg, loading, apiAvailable, form,
            dateStart, dateEnd,
            // Computed
            totalPages, pagedSkus, pageNumbers, profitFormulaText, profitResult, rankedShops,
            // Methods
            goToShop, goToDashboard, openModal, openFirstSku, closeModal, switchTab,
            saveData, setTimeRange, copyYesterday, batchImport, setFixedCosts,
            goToPage, prevPage, nextPage,
            // Helpers
            fmt, fmtMoney, profitClass, showToast,
        };
    },
}).mount('#app');
