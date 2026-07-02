// Single source of mock data — mirrors backend API response shapes

export const MOCK_SHOPS = [
  { shop_id: 1, shop_name: '京东自营店', platform: '京东', today_profit: 15200, total_profit: 98000, profit_rate: 22, status: '盈利' },
  { shop_id: 2, shop_name: '天猫旗舰店', platform: '天猫', today_profit: 12800, total_profit: 85600, profit_rate: 18, status: '盈利' },
  { shop_id: 3, shop_name: '拼多多专营店', platform: '拼多多', today_profit: -3200, total_profit: 12400, profit_rate: 8, status: '亏损' },
];

export const MOCK_KPIS = {
  total_profit: 245680, total_sales: 1250000, total_promo: 45800, avg_profit_rate: 19.6,
};

export const MOCK_SUMMARY = {
  total_sales: 158000, total_orders: 3450, total_real_sales: 152000,
  total_real_orders: 3200, total_order_items: 3800,
  total_fill_count: 250, total_fill_amount: 12500, total_fill_cost: 6200,
  total_promo: 8500, total_aftersale_cost: 4200, net_profit: 28500,
};

export const MOCK_SKUS = [
  { sku_code: 'JD001', product_name: '蓝牙耳机 Pro', sales_amount: 32000, order_count: 520, promotion_total: 3800, product_cost: 18000, final_profit: 8500, real_sales_amount: 30800, order_items_count: 540, real_order_count: 498, fill_order_amount: 1600, fill_order_count: 22, fill_order_cost: 700, shipping_fee: 900, service_fee: 640, tax_fee: 320, freight_insurance: 120, return_count: 8, return_cost: 520, exchange_count: 5, exchange_cost: 350, promotion_alliance: 1800, promotion_auto: 900, promotion_jd_union: 300, promotion_search: 600, promotion_recommend: 200 },
  { sku_code: 'JD002', product_name: '氮化镓充电器 65W', sales_amount: 21000, order_count: 380, promotion_total: 2550, product_cost: 11000, final_profit: 6200, real_sales_amount: 19800, order_items_count: 400, real_order_count: 360, fill_order_amount: 1400, fill_order_count: 20, fill_order_cost: 550, shipping_fee: 600, service_fee: 420, tax_fee: 210, freight_insurance: 80, return_count: 6, return_cost: 380, exchange_count: 3, exchange_cost: 200, promotion_alliance: 1200, promotion_auto: 600, promotion_jd_union: 200, promotion_search: 400, promotion_recommend: 150 },
  { sku_code: 'JD003', product_name: '手机壳 磁吸系列', sales_amount: 8500, order_count: 420, promotion_total: 1180, product_cost: 3800, final_profit: 2900, real_sales_amount: 8200, order_items_count: 450, real_order_count: 400, fill_order_amount: 800, fill_order_count: 20, fill_order_cost: 300, shipping_fee: 350, service_fee: 170, tax_fee: 85, freight_insurance: 40, return_count: 10, return_cost: 400, exchange_count: 4, exchange_cost: 160, promotion_alliance: 500, promotion_auto: 300, promotion_jd_union: 100, promotion_search: 200, promotion_recommend: 80 },
  { sku_code: 'JD004', product_name: '钢化膜 3片装', sales_amount: 5200, order_count: 350, promotion_total: 710, product_cost: 2200, final_profit: 1950, real_sales_amount: 5000, order_items_count: 380, real_order_count: 330, fill_order_amount: 500, fill_order_count: 20, fill_order_cost: 200, shipping_fee: 200, service_fee: 100, tax_fee: 50, freight_insurance: 25, return_count: 5, return_cost: 180, exchange_count: 2, exchange_cost: 80, promotion_alliance: 300, promotion_auto: 180, promotion_jd_union: 60, promotion_search: 120, promotion_recommend: 50 },
  { sku_code: 'JD005', product_name: '数据线 Type-C 快充', sales_amount: 6800, order_count: 310, promotion_total: 830, product_cost: 2800, final_profit: 2700, real_sales_amount: 6500, order_items_count: 330, real_order_count: 295, fill_order_amount: 450, fill_order_count: 15, fill_order_cost: 180, shipping_fee: 250, service_fee: 130, tax_fee: 65, freight_insurance: 30, return_count: 7, return_cost: 260, exchange_count: 3, exchange_cost: 120, promotion_alliance: 350, promotion_auto: 200, promotion_jd_union: 70, promotion_search: 150, promotion_recommend: 60 },
  { sku_code: 'JD006', product_name: '移动电源 20000mAh', sales_amount: 18500, order_count: 260, promotion_total: 2170, product_cost: 9500, final_profit: 5800, real_sales_amount: 17500, order_items_count: 280, real_order_count: 248, fill_order_amount: 1200, fill_order_count: 12, fill_order_cost: 400, shipping_fee: 500, service_fee: 370, tax_fee: 185, freight_insurance: 70, return_count: 4, return_cost: 300, exchange_count: 2, exchange_cost: 150, promotion_alliance: 1000, promotion_auto: 500, promotion_jd_union: 200, promotion_search: 350, promotion_recommend: 120 },
  { sku_code: 'JD007', product_name: '车载无线充电支架', sales_amount: 6200, order_count: 190, promotion_total: 790, product_cost: 2600, final_profit: 2400, real_sales_amount: 5900, order_items_count: 200, real_order_count: 180, fill_order_amount: 400, fill_order_count: 10, fill_order_cost: 150, shipping_fee: 220, service_fee: 120, tax_fee: 60, freight_insurance: 25, return_count: 3, return_cost: 140, exchange_count: 2, exchange_cost: 100, promotion_alliance: 350, promotion_auto: 200, promotion_jd_union: 60, promotion_search: 130, promotion_recommend: 50 },
  { sku_code: 'JD008', product_name: '蓝牙自拍杆 三脚架', sales_amount: 4200, order_count: 160, promotion_total: 590, product_cost: 1800, final_profit: 1550, real_sales_amount: 4000, order_items_count: 170, real_order_count: 150, fill_order_amount: 300, fill_order_count: 10, fill_order_cost: 120, shipping_fee: 180, service_fee: 80, tax_fee: 40, freight_insurance: 20, return_count: 4, return_cost: 150, exchange_count: 1, exchange_cost: 50, promotion_alliance: 250, promotion_auto: 150, promotion_jd_union: 50, promotion_search: 100, promotion_recommend: 40 },
];
