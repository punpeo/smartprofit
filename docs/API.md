# 盈析 · API 接口文档

**版本**: v3.0  
**Base URL**: `http://localhost:{port}/api`  
**Content-Type**: `application/json; charset=utf-8` (except file upload)  
**CORS**: 全开放 (`Access-Control-Allow-Origin: *`)

---

## 一、健康检查

### `GET /api/health`

健康检查，返回服务状态。

**Response** `200`:
```json
{ "status": "ok" }
```

---

## 二、Dashboard

### `GET /api/dashboard/kpis`

Dashboard KPI 卡片数据。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `start` | query | 今日 | 开始日期 YYYY-MM-DD |
| `end` | query | 今日 | 结束日期 YYYY-MM-DD |

**Response** `200`:
```json
{
  "total_profit": 73200.00,
  "total_sales": 290000.00,
  "total_promo": 4000.00,
  "avg_profit_rate": 25.24
}
```

---

## 三、店铺 (Shops)

### `GET /api/shops`

店铺列表 + 利润汇总（按时间筛选聚合）。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `start` | query | 今日 | 开始日期 |
| `end` | query | 今日 | 结束日期 |

**Response** `200`:
```json
[
  {
    "shop_id": 1,
    "shop_name": "京东自营店",
    "today_profit": 15200.00,
    "total_profit": 28500.00,
    "profit_rate": 18.5,
    "status": "盈利"
  }
]
```

### `POST /api/shops`

新增店铺。

**Request**:
```json
{
  "shop_name": "京东自营店",
  "platform": "京东",
  "owner": "张三"
}
```

**Response** `200`:
```json
{ "shop_id": 1 }
```

### `PUT /api/shops/{id}`

更新店铺信息。仅更新传入的字段。

**Request** (部分字段可选):
```json
{
  "shop_name": "新名称",
  "platform": "天猫",
  "owner": "李四"
}
```

**Response** `200`:
```json
{ "message": "ok" }
```

### `DELETE /api/shops/{id}`

删除店铺（级联删除关联 SKU 和利润记录，不删源数据表）。

**Response** `200`:
```json
{ "message": "ok" }
```

### `GET /api/shops/{id}/summary`

单个店铺汇总数据。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `start` | query | 今日 | 开始日期 |
| `end` | query | 今日 | 结束日期 |

**Response** `200`:
```json
{
  "total_sales": 290000.00,
  "total_orders": 1250,
  "total_real_sales": 278000.00,
  "total_real_orders": 1200,
  "total_order_items": 1580,
  "total_fill_count": 50,
  "total_fill_amount": 12000.00,
  "total_promo": 4000.00,
  "total_aftersale_cost": 850.00,
  "net_profit": 28500.00
}
```

### `GET /api/shops/{id}/skus`

店铺下 SKU 每日利润列表（分页）。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `start` | query | 今日 | 开始日期 |
| `end` | query | 今日 | 结束日期 |
| `page` | query | 1 | 页码 |
| `page_size` | query | 10 | 每页条数 (1-100) |

**Response** `200`:
```json
{
  "items": [
    {
      "sku_code": "JD001",
      "product_name": "蓝牙耳机 Pro",
      "sales_amount": 32000.00,
      "order_count": 45,
      "promotion_total": 1200.00,
      "product_cost": 17500.00,
      "final_profit": 8500.00
    }
  ],
  "page": 1,
  "page_size": 10
}
```

### `POST /api/shops/{id}/copy-yesterday`

复制昨天该店铺所有 SKU 的利润数据到今日。

**Response** `200`:
```json
{ "message": "ok" }
```

---

## 四、商品 (Products)

### `GET /api/products`

商品列表（按商品名排序）。

**Response** `200`: `Product[]`

```json
[
  {
    "product_id": 1,
    "product_name": "蓝牙耳机 Pro",
    "category": "音频",
    "image_url": "",
    "default_cost": 35.00,
    "default_shipping_cost": 5.00,
    "default_service_fee_rate": 0.01,
    "default_tax_rate": 0.003,
    "platform_commission_rate": 0.05,
    "default_freight_insurance": 3.00,
    "default_exchange_cost": 0,
    "default_return_cost": 0,
    "default_fill_order_cost": 3.00,
    "created_at": "2026-07-01T10:00:00+08:00"
  }
]
```

### `POST /api/products`

新增商品。

**Request**:
```json
{
  "product_name": "蓝牙耳机 Pro",
  "category": "音频",
  "default_cost": 35.00,
  "default_shipping_cost": 10.00,
  "default_service_fee_rate": 0.016,
  "default_tax_rate": 0.026,
  "platform_commission_rate": 0.05,
  "default_freight_insurance": 3.00,
  "default_exchange_cost": 0,
  "default_return_cost": 0,
  "default_fill_order_cost": 3.00
}
```

**Response** `200`:
```json
{ "product_id": 1 }
```

### `PUT /api/products/{id}`

更新商品。

**Request**: 同 POST（全量更新）
**Response** `200`:
```json
{ "message": "ok" }
```

### `DELETE /api/products/{id}`

删除商品。

**Response** `200`:
```json
{ "message": "ok" }
```

---

## 五、SKU

### `GET /api/skus`

SKU 基础列表（JOIN products + shops）。

**Response** `200`:
```json
{
  "items": [
    {
      "sku_id": 1,
      "shop_id": 1,
      "product_id": 1,
      "sku_code": "JD001",
      "product_name": "蓝牙耳机 Pro",
      "category": "音频",
      "default_cost": 35.00,
      "shop_name": "京东自营店",
      "created_at": "2026-07-01T10:00:00+08:00"
    }
  ]
}
```

### `POST /api/skus`

新增 SKU。

**Request**:
```json
{
  "shop_id": 1,
  "product_id": 1,
  "sku_code": "JD001"
}
```

**Response** `200`:
```json
{ "sku_id": 1 }
```

### `PUT /api/skus/{code}`

更新 SKU（更换关联的店铺/商品）。

**Request**:
```json
{
  "shop_id": 2,
  "product_id": 3
}
```

**Response** `200`:
```json
{ "message": "ok" }
```

### `DELETE /api/skus/{code}`

删除 SKU。

**Response** `200`:
```json
{ "message": "ok" }
```

### `GET /api/skus/{code}/daily`

获取指定 SKU 某日的利润记录。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `date` | query | 今日 | 日期 YYYY-MM-DD |

**Response** `200`: `DailyProfitLog | null`

```json
{
  "log_id": 1,
  "sku_id": 1,
  "record_date": "2026-07-07",
  "sales_amount": 32000.00,
  "order_count": 45,
  "order_items_count": 128,
  "real_sales_amount": 27800.00,
  "real_order_count": 40,
  "fill_order_amount": 4200.00,
  "fill_order_count": 5,
  "fill_order_cost": 15.00,
  "product_cost": 17500.00,
  "shipping_fee": 225.00,
  "service_fee": 512.00,
  "tax_fee": 96.00,
  "freight_insurance": 135.00,
  "return_count": 3,
  "return_cost": 150.00,
  "exchange_count": 1,
  "exchange_cost": 35.00,
  "promotion_alliance": 500.00,
  "promotion_auto": 300.00,
  "promotion_jd_union": 200.00,
  "promotion_search": 150.00,
  "promotion_recommend": 50.00,
  "promotion_total": 1200.00,
  "final_profit": 8500.00
}
```

### `POST /api/skus/{code}/save`

保存/更新日利润。自动从关联 Product 获取默认成本参数计算成本，从 `daily_aftersale_logs` 拉取售后数据，计算 `final_profit`。

**Request**: `DailyProfitLog`（仅需传有值的字段，未传字段自动计算）
```json
{
  "record_date": "2026-07-07",
  "sales_amount": 32000.00,
  "order_count": 45,
  "order_items_count": 128
}
```

**Response** `200`:
```json
{
  "ok": true,
  "profit": 8500.00
}
```

---

## 六、源数据写入（触发同步）

> 写入后 SQLite 触发器自动同步到 `daily_profit_logs`。

### `POST /api/sales`

Upsert 销售数据 → `daily_sales_logs`。

**Request**:
```json
{
  "shop_id": 1,
  "sku_id": 1,
  "record_date": "2026-07-07",
  "sales_amount": 4648.00,
  "order_count": 31,
  "order_items_count": 58
}
```

**Response** `200`:
```json
{ "message": "ok" }
```

### `POST /api/aftersale`

Upsert 售后数据 → `daily_aftersale_logs`。

**Request**:
```json
{
  "shop_id": 1,
  "sku_id": 1,
  "record_date": "2026-07-07",
  "return_total": 5,
  "return_valid": 3,
  "return_cancel": 2,
  "exchange_total": 2,
  "exchange_valid": 1,
  "exchange_cancel": 1,
  "aftersale_total": 7,
  "aftersale_cancel": 3,
  "operator_name": "张三"
}
```

**Response** `200`:
```json
{ "message": "ok" }
```

### `GET /api/aftersale/{sku_id}`

获取指定 SKU 的有效退货/换货量。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `date` | query | 今日 | 日期 |

**Response** `200`:
```json
{
  "return_valid": 3,
  "exchange_valid": 1
}
```

### `POST /api/fill-order`

Upsert 补单数据 → `daily_fill_order_logs`。补单成本自动 = 补单数量 × 商品默认补单成本。

**Request**:
```json
{
  "shop_id": 1,
  "sku_id": 1,
  "record_date": "2026-07-07",
  "fill_order_count": 5,
  "fill_order_amount": 4200.00
}
```

**Response** `200`:
```json
{ "message": "ok" }
```

### `POST /api/promotion`

Upsert 推广数据 → `daily_promotion_logs`。`promotion_total` 自动求和。

**Request**:
```json
{
  "shop_id": 1,
  "sku_id": 1,
  "record_date": "2026-07-07",
  "promotion_alliance": 500.00,
  "promotion_auto": 300.00,
  "promotion_jd_union": 200.00,
  "promotion_search": 150.00,
  "promotion_recommend": 50.00,
  "promotion_total": 1200.00
}
```

**Response** `200`:
```json
{ "message": "ok" }
```

---

## 七、批量操作

### `POST /api/import/batch`

批量文件导入。`Content-Type: multipart/form-data`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `files` | file[] | 多个文件，支持 `.xlsx` / `.zip` |

**自动识别类型**:

| 文件特征 | 类型 | 写入表 |
|---------|------|--------|
| 表头含"成交金额"/"成交单量"或文件名含"商品明细" | `sales` | `daily_sales_logs` |
| 表头含"客户期望"/"服务单状态"或 `.zip` 后缀 | `aftersale` | `daily_aftersale_logs` |
| 表头含"全站营销"/"搜索快车"或文件名含"推广费" | `promotion` | `daily_promotion_logs` + `daily_fill_order_logs` |
| 表头含"商品名称"/"默认成本"或文件名含"商品" | `product` | `products` |

**Response** `200`:
```json
{
  "message": "import completed",
  "results": {
    "sales": 12,
    "aftersale": 18,
    "promotion": 8,
    "fill_order": 8,
    "product": 5
  }
}
```

### `POST /api/clear-all`

清空全部数据（含基础表：shops, products, skus, daily_profit_logs）。

**Response** `200`:
```json
{ "message": "ok" }
```

### `POST /api/clear-products`

仅清空 `products` 表数据，保留表结构和索引。

**Response** `200`:
```json
{ "message": "products cleared" }
```

### `POST /api/clear-business-data`

仅清空业务统计表（保留 shops, products, skus 基础数据）。
清空范围: `daily_sales_logs`, `daily_fill_order_logs`, `daily_promotion_logs`, `daily_aftersale_logs`, `daily_profit_logs`。

**Response** `200`:
```json
{ "message": "business data cleared, base tables preserved" }
```

---

## 八、接口速查表

| Method | Path | Handler | 分类 |
|--------|------|---------|------|
| `GET` | `/api/health` | `Health` | 健康检查 |
| `GET` | `/api/dashboard/kpis` | `DashboardKPIs` | Dashboard |
| `GET` | `/api/shops` | `ListShops` | Shop |
| `POST` | `/api/shops` | `CreateShop` | Shop |
| `PUT` | `/api/shops/{id}` | `UpdateShop` | Shop |
| `DELETE` | `/api/shops/{id}` | `DeleteShop` | Shop |
| `GET` | `/api/shops/{id}/summary` | `ShopSummary` | Shop |
| `GET` | `/api/shops/{id}/skus` | `ListSKUs` | Shop |
| `POST` | `/api/shops/{id}/copy-yesterday` | `CopyYesterday` | Shop |
| `GET` | `/api/products` | `ListProducts` | Product |
| `POST` | `/api/products` | `CreateProduct` | Product |
| `PUT` | `/api/products/{id}` | `UpdateProduct` | Product |
| `DELETE` | `/api/products/{id}` | `DeleteProduct` | Product |
| `GET` | `/api/skus` | `ListSKUBase` | SKU |
| `POST` | `/api/skus` | `CreateSKU` | SKU |
| `PUT` | `/api/skus/{code}` | `UpdateSKU` | SKU |
| `DELETE` | `/api/skus/{code}` | `DeleteSKU` | SKU |
| `GET` | `/api/skus/{code}/daily` | `GetSKUDaily` | SKU |
| `POST` | `/api/skus/{code}/save` | `SaveSKU` | SKU |
| `POST` | `/api/sales` | `UpsertSales` | 源数据 |
| `POST` | `/api/aftersale` | `UpsertAftersale` | 源数据 |
| `GET` | `/api/aftersale/{sku_id}` | `GetAftersale` | 源数据 |
| `POST` | `/api/fill-order` | `UpsertFillOrder` | 源数据 |
| `POST` | `/api/promotion` | `UpsertPromotion` | 源数据 |
| `POST` | `/api/import/batch` | `HandleBatchImport` | 批量 |
| `POST` | `/api/clear-all` | `ClearAll` | 批量 |
| `POST` | `/api/clear-products` | `ClearProducts` | 批量 |
| `POST` | `/api/clear-business-data` | `ClearBusinessData` | 批量 |

---

## 九、错误响应

所有错误统一返回：

```json
{ "error": "错误描述" }
```

| 状态码 | 场景 |
|--------|------|
| `200` | 成功 |
| `400` | 请求参数无效 |
| `404` | 资源不存在 |
| `500` | 服务器内部错误 |
