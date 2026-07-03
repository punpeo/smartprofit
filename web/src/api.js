import { MOCK_SHOPS, MOCK_KPIS, MOCK_SUMMARY, MOCK_SKUS } from './store';

const BASE = '/api';

async function request(path, options) {
  const res = await fetch(BASE + path, options);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

async function withFallback(fn, mock) {
  try { return await fn(); } catch { return mock; }
}

export const api = {
  // Read
  fetchShops:     () => withFallback(() => request('/shops'), MOCK_SHOPS),
  fetchKPIs:      () => withFallback(() => request('/dashboard/kpis'), MOCK_KPIS),
  fetchSummary:   (id) => withFallback(() => request(`/shops/${id}/summary`), MOCK_SUMMARY),
  fetchProducts:  () => withFallback(() => request('/products'), []),
  fetchSKUBase:   (shopId) => withFallback(async () => {
    const q = shopId ? `?shop_id=${shopId}` : ''
    const d = await request(`/skus${q}`)
    return d.items || d || []
  }, []), // 不回退假数据 — SKU 为空就是真的空
  fetchSKUs:      (id) => withFallback(async () => {
    const d = await request(`/shops/${id}/skus?page=1&page_size=100`);
    const items = d.items || d;
    if (!Array.isArray(items)) throw new Error('invalid');
    return items; // 空数组是合法的（无利润记录）
  }, MOCK_SKUS),

  // Write
  saveSKU:        (code, data) => request(`/skus/${code}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  createSKU:      (data) => request('/skus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  updateSKU:      (code, data) => request(`/skus/${code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  deleteSKU:      (code) => request(`/skus/${code}`, { method: 'DELETE' }),

  createShop:     (data) => request('/shops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  updateShop:     (id, data) => request(`/shops/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  deleteShop:     (id) => request(`/shops/${id}`, { method: 'DELETE' }),
  clearAll:       () => request('/clear-all', { method: 'POST' }),

  createProduct:  (data) => request('/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  updateProduct:  (id, data) => request(`/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  deleteProduct:  (id) => request(`/products/${id}`, { method: 'DELETE' }),
  copyYesterday:  (id) => request(`/shops/${id}/copy-yesterday`, { method: 'POST' }),
};
