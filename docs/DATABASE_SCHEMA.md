# 盈析 · 电商利润经营分析系统

## 数据库表结构说明文档

**版本**: v3.0  
**数据库**: SQLite 3  
**日期**: 2026-07-07  
**字符集**: UTF-8  
**存储引擎**: WAL 模式 (Write-Ahead Logging)

---

## 一、数据库概述

本系统使用 SQLite 作为嵌入式数据库，数据库文件为 `smartprofit.db`，随应用启动自动创建。包含 **8 张业务表** + **8 个触发器**，采用「源数据表 → 触发器 → 利润汇总表」的架构，外键约束保障数据完整性，WAL 模式支持并发读写。

### 配置参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `journal_mode` | WAL | 预写日志，支持并发读写 |
| `foreign_keys` | ON | 启用外键约束 |
| `busy_timeout` | 5000ms | 锁等待超时 |

---

## 二、整体架构

### 2.1 数据流

```
┌─────────────────────────────────────────────────────────┐
│                    源数据层（4 张表）                       │
│  daily_sales_logs  │  daily_fill_order_logs              │
│  daily_promotion_logs  │  daily_aftersale_logs           │
│         │                        │                       │
│         │  TRIGGER (INSERT/UPDATE)│                       │
│         ▼                        ▼                       │
│  ┌──────────────────────────────────────────┐           │
│  │       daily_profit_logs (汇总表)          │           │
│  │  每条 SKU × 每天 = 一条利润记录            │           │
│  └──────────────────────────────────────────┘           │
│              ▲                                          │
│              │ JOIN                                     │
│     ┌────────┴────────┐                                 │
│     │  shops  │ products │  skus                        │
│     │ (基础数据层)      │                               │
│     └──────────────────┘                               │
└─────────────────────────────────────────────────────────┘
```

### 2.2 表分类

| 分类 | 表名 | 说明 |
|------|------|------|
| 基础数据 | `shops`、`products`、`skus` | 店铺/商品/SKU 主数据 |
| 源数据 | `daily_sales_logs`、`daily_aftersale_logs`、`daily_fill_order_logs`、`daily_promotion_logs` | 文件导入时直接写入的原始汇总数据 |
| 利润汇总 | `daily_profit_logs` | 触发器自动同步 + SaveSKU 手动编辑，存储最终利润计算结果 |

---

## 三、实体关系图 (ER)

```
┌──────────┐       ┌──────────┐
│  shops   │       │ products │
│  店铺表   │       │  商品表   │
├──────────┤       ├──────────┤
│ shop_id  │──┐    │product_id│──┐
│ shop_name│  │    │prod_name │  │
│ platform │  │    │category  │  │
│ owner    │  │    │default_* │  │
│created_at│  │    │platform_ │  │
└──────────┘  │    │commission│  │
              │    │_rate     │  │
              │    │created_at│  │
              │    └──────────┘  │
              │                  │
              │    ┌──────────┐  │
              │    │   skus   │  │
              │    │  SKU表   │  │
              │    ├──────────┤  │
              ├───→│ shop_id  │  │
              │    │product_id│←─┘
              │    │ sku_code │
              │    │created_at│
              │    └────┬─────┘
              │         │
              │         │ (sku_id, record_date)
              │         │
┌─────────────┴─────────▼──────────────────────┐
│           源数据层（4 张表）                    │
│                                               │
│  daily_sales_logs      daily_fill_order_logs  │
│  ├ shop_id + sku_id    ├ shop_id + sku_id     │
│  ├ record_date         ├ record_date          │
│  ├ sales_amount        ├ fill_order_count     │
│  ├ order_count         ├ fill_order_amount    │
│  └ order_items_count   └ fill_order_cost      │
│                                               │
│  daily_promotion_logs  daily_aftersale_logs   │
│  ├ shop_id + sku_id    ├ shop_id + sku_id     │
│  ├ record_date         ├ record_date          │
│  └ promotion_* (5项)   └ return/exchange_*    │
│                                               │
│   全部通过 TRIGGER INSERT/UPDATE               │
│   ────────────────────────────▶               │
│         ┌──────────────────────┐              │
│         │  daily_profit_logs   │              │
│         │     每日利润记录       │              │
│         ├──────────────────────┤              │
│         │ log_id (PK)          │              │
│         │ sku_id (FK)          │              │
│         │ record_date          │              │
│         │ sales_amount         │              │
│         │ ...                  │              │
│         │ final_profit         │              │
│         └──────────────────────┘              │
└───────────────────────────────────────────────┘

关系：
  shops 1──N skus
  products 1──N skus
  skus 1──N daily_sales_logs / daily_fill_order_logs / daily_promotion_logs / daily_aftersale_logs
  skus 1──N daily_profit_logs
```

---

## 四、基础数据表

### 4.1 shops（店铺表）

| 序号 | 字段名 | 类型 | 约束 | 默认值 | 说明 |
|------|--------|------|------|--------|------|
| 1 | `shop_id` | INTEGER | PK, AUTOINCREMENT | — | 主键，店铺唯一标识 |
| 2 | `shop_name` | TEXT | NOT NULL | — | 店铺名称，如"京东自营店" |
| 3 | `platform` | TEXT | NOT NULL | `''` | 所属平台，如京东/天猫/拼多多 |
| 4 | `owner` | TEXT | NOT NULL | `''` | 店铺负责人 |
| 5 | `created_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 创建时间（北京时间） |

---

### 4.2 products（商品表）

| 序号 | 字段名 | 类型 | 约束 | 默认值 | 说明 |
|------|--------|------|------|--------|------|
| 1 | `product_id` | INTEGER | PK, AUTOINCREMENT | — | 主键 |
| 2 | `product_name` | TEXT | NOT NULL | — | 商品名称 |
| 3 | `category` | TEXT | NOT NULL | `''` | 商品分类（音频/充电/保护/线材/车载/拍摄） |
| 4 | `image_url` | TEXT | NOT NULL | `''` | 商品图片 URL |
| 5 | `default_cost` | REAL | NOT NULL | `0` | 商品默认成本（元/件） |
| 6 | `default_shipping_cost` | REAL | NOT NULL | `0` | 默认运费（元/单） |
| 7 | `default_service_fee_rate` | REAL | NOT NULL | `0` | 默认交易服务费率（小数，如 0.01 = 1%） |
| 8 | `default_tax_rate` | REAL | NOT NULL | `0` | 默认交易税费率 |
| 9 | `platform_commission_rate` | REAL | NOT NULL | `0` | **平台扣点费率**（如 0.05 = 5%，用于计算退货成本） |
| 10 | `default_freight_insurance` | REAL | NOT NULL | `0` | 默认运费险（元/单） |
| 11 | `default_exchange_cost` | REAL | NOT NULL | `0` | 默认换货成本（元/件） |
| 12 | `default_return_cost` | REAL | NOT NULL | `0` | 默认退货成本（元/件） |
| 13 | `default_fill_order_cost` | REAL | NOT NULL | `0` | 默认补单成本（元/件） |
| 14 | `created_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 创建时间 |

**字段 5-13 的用途**: 在 SaveSKU 保存利润记录时，系统根据商品默认参数自动计算各项成本（仅在前端未传值的字段上生效）：

| 成本项 | 计算公式 | 触发条件 |
|--------|---------|---------|
| 商品成本 | 订单件数 × `default_cost` | `product_cost == 0` |
| 运费 | 订单量 × `default_shipping_cost` | `shipping_fee == 0` |
| 交易服务费 | 销售额 × `default_service_fee_rate` | `service_fee == 0` |
| 交易税费 | 销售额 × `default_tax_rate` | `tax_fee == 0` |
| 运费险 | 订单量 × `default_freight_insurance` | `freight_insurance == 0` |
| 换货成本 | 换货量 × `default_exchange_cost` | `exchange_cost == 0` |
| 退货成本 | 退货量 × (单价 - 成本 - 单价×扣点费率) | `return_cost == 0` |
| 补单成本 | 补单数量 × `default_fill_order_cost` | `fill_order_cost == 0` |

---

### 4.3 skus（SKU 表）

| 序号 | 字段名 | 类型 | 约束 | 默认值 | 说明 |
|------|--------|------|------|--------|------|
| 1 | `sku_id` | INTEGER | PK, AUTOINCREMENT | — | 主键 |
| 2 | `shop_id` | INTEGER | FK → shops(shop_id), NOT NULL | — | 所属店铺 ID |
| 3 | `product_id` | INTEGER | FK → products(product_id), NOT NULL | — | 所属商品 ID |
| 4 | `sku_code` | TEXT | UNIQUE, NOT NULL | — | SKU 编码，如 "JD001" |
| 5 | `created_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 创建时间 |

**说明**: 商品名称、分类、默认成本等展示字段通过 JOIN `products` 表获取，SKU 表本身仅存储关联关系。

---

## 五、源数据表（4 张）

源数据表是**文件导入的直接写入目标**，每个分组维度为 `(shop_id, sku_id, record_date)`。插入或更新后，SQLite 触发器自动将数据同步到 `daily_profit_logs`。

### 5.1 daily_sales_logs（销售汇总表）

| 序号 | 字段名 | 类型 | 约束 | 默认值 | 说明 |
|------|--------|------|------|--------|------|
| 1 | `id` | INTEGER | PK, AUTOINCREMENT | — | 主键 |
| 2 | `shop_id` | INTEGER | NOT NULL | — | 店铺 ID |
| 3 | `sku_id` | INTEGER | NOT NULL | — | SKU ID |
| 4 | `record_date` | TEXT | NOT NULL | — | 统计日期 (YYYY-MM-DD) |
| 5 | `sales_amount` | REAL | NOT NULL | `0` | 当日总销售额 |
| 6 | `order_count` | INTEGER | NOT NULL | `0` | 当日订单总数量 |
| 7 | `order_items_count` | INTEGER | NOT NULL | `0` | 当日商品总件数 |
| 8 | `operator_name` | TEXT | NOT NULL | `''` | 登记负责人 |
| 9 | `created_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 创建时间 |
| 10 | `updated_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 更新时间 |

**约束**: `UNIQUE(shop_id, sku_id, record_date)`  
**索引**: `idx_dsl_sku_date (sku_id, record_date)`  
**同步触发器**: `trg_sales_sync` (INSERT)、`trg_sales_sync_upd` (UPDATE) → 写入 `daily_profit_logs.sales_amount / order_count / order_items_count`

---

### 5.2 daily_aftersale_logs（售后汇总表）

| 序号 | 字段名 | 类型 | 约束 | 默认值 | 说明 |
|------|--------|------|------|--------|------|
| 1 | `id` | INTEGER | PK, AUTOINCREMENT | — | 主键 |
| 2 | `shop_id` | INTEGER | NOT NULL | `0` | 店铺 ID |
| 3 | `sku_id` | INTEGER | NOT NULL | — | SKU ID |
| 4 | `record_date` | TEXT | NOT NULL | — | 售后申请日期 (YYYY-MM-DD) |
| 5 | `return_total` | INTEGER | NOT NULL | `0` | 退货售后总单数（含取消） |
| 6 | `return_valid` | INTEGER | NOT NULL | `0` | 有效退货单数（状态≠取消） |
| 7 | `return_cancel` | INTEGER | NOT NULL | `0` | 已取消退货单数 |
| 8 | `exchange_total` | INTEGER | NOT NULL | `0` | 换货售后总单数（含取消） |
| 9 | `exchange_valid` | INTEGER | NOT NULL | `0` | 有效换货单数（状态≠取消） |
| 10 | `exchange_cancel` | INTEGER | NOT NULL | `0` | 已取消换货单数 |
| 11 | `aftersale_total` | INTEGER | NOT NULL | `0` | 当日售后总单数 |
| 12 | `aftersale_cancel` | INTEGER | NOT NULL | `0` | 当日取消售后单数 |
| 13 | `operator_name` | TEXT | NOT NULL | `''` | 登记负责人 |
| 14 | `created_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 创建时间 |
| 15 | `updated_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 更新时间 |

**约束**: `UNIQUE(shop_id, sku_id, record_date)`  
**索引**: `idx_das_sku_date (sku_id, record_date)`、`idx_das_date (record_date)`  
**同步方式**: **无触发器**。售后数据通过 `SaveSKU` 接口拉取 `return_valid` / `exchange_valid` 后写入 `daily_profit_logs`

---

### 5.3 daily_fill_order_logs（补单汇总表）

| 序号 | 字段名 | 类型 | 约束 | 默认值 | 说明 |
|------|--------|------|------|--------|------|
| 1 | `id` | INTEGER | PK, AUTOINCREMENT | — | 主键 |
| 2 | `shop_id` | INTEGER | NOT NULL | `0` | 店铺 ID |
| 3 | `sku_id` | INTEGER | NOT NULL | — | SKU ID |
| 4 | `record_date` | TEXT | NOT NULL | — | 补单登记日期 |
| 5 | `fill_order_count` | INTEGER | NOT NULL | `0` | 补单商品总件数 |
| 6 | `fill_order_amount` | REAL | NOT NULL | `0` | 补单销售总金额 |
| 7 | `fill_order_cost` | REAL | NOT NULL | `0` | 补单总成本（自动计算） |
| 8 | `operator_name` | TEXT | NOT NULL | `''` | 登记负责人 |
| 9 | `created_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 创建时间 |
| 10 | `updated_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 更新时间 |

**约束**: `UNIQUE(shop_id, sku_id, record_date)`  
**索引**: `idx_dfl_sku_date (sku_id, record_date)`  
**成本自动计算**: `fill_order_cost = fill_order_count × products.default_fill_order_cost`（SQL 子查询，Upsert 时自动计算）  
**同步触发器**: `trg_fill_sync` (INSERT)、`trg_fill_sync_upd` (UPDATE) → 写入 `daily_profit_logs.fill_order_count / fill_order_amount / fill_order_cost`

---

### 5.4 daily_promotion_logs（推广费用汇总表）

| 序号 | 字段名 | 类型 | 约束 | 默认值 | 说明 |
|------|--------|------|------|--------|------|
| 1 | `id` | INTEGER | PK, AUTOINCREMENT | — | 主键 |
| 2 | `shop_id` | INTEGER | NOT NULL | — | 店铺 ID |
| 3 | `sku_id` | INTEGER | NOT NULL | — | SKU ID |
| 4 | `record_date` | TEXT | NOT NULL | — | 推广统计日期 |
| 5 | `promotion_alliance` | REAL | NOT NULL | `0` | 全站营销 |
| 6 | `promotion_auto` | REAL | NOT NULL | `0` | 智能投放 |
| 7 | `promotion_jd_union` | REAL | NOT NULL | `0` | 京东联盟 |
| 8 | `promotion_search` | REAL | NOT NULL | `0` | 搜索快车 |
| 9 | `promotion_recommend` | REAL | NOT NULL | `0` | 推荐广告 |
| 10 | `promotion_total` | REAL | NOT NULL | `0` | 推广费合计（5 项之和） |
| 11 | `operator_name` | TEXT | NOT NULL | `''` | 登记负责人 |
| 12 | `created_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 创建时间 |
| 13 | `updated_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 更新时间 |

**约束**: `UNIQUE(shop_id, sku_id, record_date)`  
**索引**: `idx_dplog_sku_date (sku_id, record_date)`  
**同步触发器**: `trg_promo_sync` (INSERT)、`trg_promo_sync_upd` (UPDATE) → 写入 `daily_profit_logs.promotion_*`（5项 + 合计）

---

## 六、利润汇总表

### 6.1 daily_profit_logs（每日利润记录表）

| 序号 | 字段名 | 类型 | 约束 | 默认值 | 说明 |
|------|--------|------|------|--------|------|
| **主键与关联** | | | | | |
| 1 | `log_id` | INTEGER | PK, AUTOINCREMENT | — | 主键 |
| 2 | `sku_id` | INTEGER | FK → skus(sku_id), NOT NULL | — | 关联 SKU |
| 3 | `record_date` | TEXT | NOT NULL | — | 记录日期 (YYYY-MM-DD) |
| **基础数据** | | | | | |
| 4 | `sales_amount` | REAL | NOT NULL | `0` | 销售额 |
| 5 | `order_count` | INTEGER | NOT NULL | `0` | 订单量 |
| 6 | `order_items_count` | INTEGER | NOT NULL | `0` | 订单件数 |
| 7 | `real_sales_amount` | REAL | NOT NULL | `0` | 真实销售额（剔除补单） |
| 8 | `real_order_count` | INTEGER | NOT NULL | `0` | 真实订单量（剔除补单） |
| **补单数据** | | | | | |
| 9 | `fill_order_amount` | REAL | NOT NULL | `0` | 补单金额 |
| 10 | `fill_order_count` | INTEGER | NOT NULL | `0` | 补单数量 |
| 11 | `fill_order_cost` | REAL | NOT NULL | `0` | 补单成本 |
| **成本明细** | | | | | |
| 12 | `product_cost` | REAL | NOT NULL | `0` | 商品成本 |
| 13 | `shipping_fee` | REAL | NOT NULL | `0` | 运费 |
| 14 | `service_fee` | REAL | NOT NULL | `0` | 交易服务费 |
| 15 | `tax_fee` | REAL | NOT NULL | `0` | 交易税费 |
| 16 | `freight_insurance` | REAL | NOT NULL | `0` | 运费险 |
| 17 | `return_count` | INTEGER | NOT NULL | `0` | 退货量 |
| 18 | `return_cost` | REAL | NOT NULL | `0` | 退货成本 |
| 19 | `exchange_count` | INTEGER | NOT NULL | `0` | 换货量 |
| 20 | `exchange_cost` | REAL | NOT NULL | `0` | 换货成本 |
| **推广费用** | | | | | |
| 21 | `promotion_alliance` | REAL | NOT NULL | `0` | 全站营销 |
| 22 | `promotion_auto` | REAL | NOT NULL | `0` | 智能投放 |
| 23 | `promotion_jd_union` | REAL | NOT NULL | `0` | 京东联盟 |
| 24 | `promotion_search` | REAL | NOT NULL | `0` | 搜索快车 |
| 25 | `promotion_recommend` | REAL | NOT NULL | `0` | 推荐广告 |
| 26 | `promotion_total` | REAL | NOT NULL | `0` | 推广费合计（自动计算） |
| **计算结果** | | | | | |
| 27 | `final_profit` | REAL | NOT NULL | `0` | **最终利润** |
| 28 | `updated_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 更新时间 |

**约束**: `UNIQUE(sku_id, record_date)`  
**索引**: `idx_dpl_sku_date (sku_id, record_date)`

---

## 七、触发器系统（8 个）

触发器是系统的核心数据联动机制：源数据表写入后自动同步到 `daily_profit_logs`，减少应用层代码。

### 7.1 销售同步触发器

```sql
-- INSERT: 源数据写入时自动在 profit_logs 创建对应记录（OR IGNORE 防重复）
CREATE TRIGGER trg_sales_sync AFTER INSERT ON daily_sales_logs
BEGIN
    INSERT OR IGNORE INTO daily_profit_logs (sku_id, record_date, sales_amount, order_count, order_items_count)
    VALUES (NEW.sku_id, NEW.record_date, ROUND(NEW.sales_amount,2), NEW.order_count, NEW.order_items_count);
END;

-- UPDATE: 源数据更新时同步刷新 profit_logs
CREATE TRIGGER trg_sales_sync_upd AFTER UPDATE ON daily_sales_logs
BEGIN
    UPDATE daily_profit_logs SET
        sales_amount = ROUND(NEW.sales_amount,2), order_count = NEW.order_count,
        order_items_count = NEW.order_items_count, updated_at = datetime('now','+8 hours')
    WHERE sku_id = NEW.sku_id AND record_date = NEW.record_date;
END;
```

### 7.2 补单同步触发器

```sql
CREATE TRIGGER trg_fill_sync AFTER INSERT ON daily_fill_order_logs
BEGIN
    INSERT OR IGNORE INTO daily_profit_logs (sku_id, record_date, fill_order_count, fill_order_amount, fill_order_cost)
    VALUES (NEW.sku_id, NEW.record_date, NEW.fill_order_count, ROUND(NEW.fill_order_amount,2), ROUND(NEW.fill_order_cost,2));
END;

CREATE TRIGGER trg_fill_sync_upd AFTER UPDATE ON daily_fill_order_logs
BEGIN
    UPDATE daily_profit_logs SET
        fill_order_count = NEW.fill_order_count, fill_order_amount = ROUND(NEW.fill_order_amount,2),
        fill_order_cost = ROUND(NEW.fill_order_cost,2), updated_at = datetime('now','+8 hours')
    WHERE sku_id = NEW.sku_id AND record_date = NEW.record_date;
END;
```

### 7.3 推广同步触发器

```sql
CREATE TRIGGER trg_promo_sync AFTER INSERT ON daily_promotion_logs
BEGIN
    INSERT OR IGNORE INTO daily_profit_logs (sku_id, record_date,
        promotion_alliance, promotion_auto, promotion_jd_union, promotion_search, promotion_recommend, promotion_total)
    VALUES (NEW.sku_id, NEW.record_date,
        ROUND(NEW.promotion_alliance,2), ROUND(NEW.promotion_auto,2), ROUND(NEW.promotion_jd_union,2),
        ROUND(NEW.promotion_search,2), ROUND(NEW.promotion_recommend,2), ROUND(NEW.promotion_total,2));
END;

CREATE TRIGGER trg_promo_sync_upd AFTER UPDATE ON daily_promotion_logs
BEGIN
    UPDATE daily_profit_logs SET
        promotion_alliance = ROUND(NEW.promotion_alliance,2), promotion_auto = ROUND(NEW.promotion_auto,2),
        promotion_jd_union = ROUND(NEW.promotion_jd_union,2), promotion_search = ROUND(NEW.promotion_search,2),
        promotion_recommend = ROUND(NEW.promotion_recommend,2), promotion_total = ROUND(NEW.promotion_total,2),
        updated_at = datetime('now','+8 hours')
    WHERE sku_id = NEW.sku_id AND record_date = NEW.record_date;
END;
```

### 7.4 promotion_total 自动计算触发器

```sql
-- 直接写入 daily_profit_logs 时，自动求和 5 项推广费
CREATE TRIGGER trg_dpl_promo_insert AFTER INSERT ON daily_profit_logs
BEGIN
    UPDATE daily_profit_logs SET promotion_total =
        NEW.promotion_alliance + NEW.promotion_auto + NEW.promotion_jd_union +
        NEW.promotion_search + NEW.promotion_recommend
    WHERE log_id = NEW.log_id;
END;

-- 更新任意推广项时自动重算合计
CREATE TRIGGER trg_dpl_promo_update AFTER UPDATE ON daily_profit_logs
WHEN NEW.promotion_alliance <> OLD.promotion_alliance OR NEW.promotion_auto <> OLD.promotion_auto OR
     NEW.promotion_jd_union <> OLD.promotion_jd_union OR NEW.promotion_search <> OLD.promotion_search OR
     NEW.promotion_recommend <> OLD.promotion_recommend
BEGIN
    UPDATE daily_profit_logs SET promotion_total =
        NEW.promotion_alliance + NEW.promotion_auto + NEW.promotion_jd_union +
        NEW.promotion_search + NEW.promotion_recommend
    WHERE log_id = NEW.log_id;
END;
```

### 7.5 售后同步（无触发器）

`daily_aftersale_logs` **不使用触发器**。售后数据（有效退货量/换货量）在 `SaveSKU` 接口中主动拉取：

```go
// handler.go SaveSKU 中
if b.ReturnCount == 0 {
    rv, _, _ := h.AftersaleDao.GetValidCounts(ctx, sku.SkuID, b.RecordDate)
    b.ReturnCount = rv
}
if b.ExchangeCount == 0 {
    _, ev, _ := h.AftersaleDao.GetValidCounts(ctx, sku.SkuID, b.RecordDate)
    b.ExchangeCount = ev
}
```

---

## 八、利润计算公式

```
推广费合计 = 全站营销 + 智能投放 + 京东联盟 + 搜索快车 + 推荐广告

最终利润 = 真实销售额
         - 商品成本
         - 运费
         - 交易服务费
         - 交易税费
         - 运费险
         - 退货成本          （退货量 × (单价 - 成本 - 单价 × 平台扣点费率)）
         - 换货成本
         - 补单成本
         - 推广费合计
         + 补单金额
```

**计算位置**: 
- 触发器自动同步 → `daily_profit_logs` 基础字段
- `SaveSKU` 接口 (`handler.go:218-219`) → 自动计算 `final_profit`

---

## 九、索引汇总

| 索引名 | 表 | 列 | 用途 |
|--------|-----|-----|------|
| `idx_dpl_sku_date` | `daily_profit_logs` | `(sku_id, record_date)` | SKU 利润查询 |
| `idx_dsl_sku_date` | `daily_sales_logs` | `(sku_id, record_date)` | 销售数据查询 |
| `idx_das_sku_date` | `daily_aftersale_logs` | `(sku_id, record_date)` | 售后数据按 SKU 查询 |
| `idx_das_date` | `daily_aftersale_logs` | `(record_date)` | 售后数据按日期查询 |
| `idx_dfl_sku_date` | `daily_fill_order_logs` | `(sku_id, record_date)` | 补单数据查询 |
| `idx_dplog_sku_date` | `daily_promotion_logs` | `(sku_id, record_date)` | 推广数据查询 |

---

## 十、API 接口索引

### 基础 CRUD

| Method | Path | 说明 | 关联表 |
|--------|------|------|--------|
| `GET` | `/api/shops?start=&end=` | 店铺列表 + 利润汇总 | shops ⨝ skus ⨝ daily_profit_logs |
| `POST` | `/api/shops` | 新增店铺 | shops |
| `PUT` | `/api/shops/{id}` | 更新店铺 | shops |
| `DELETE` | `/api/shops/{id}` | 删除店铺（级联） | shops → skus → daily_profit_logs |
| `GET` | `/api/products` | 商品列表 | products |
| `POST` | `/api/products` | 新增商品 | products |
| `PUT` | `/api/products/{id}` | 更新商品 | products |
| `DELETE` | `/api/products/{id}` | 删除商品 | products |
| `GET` | `/api/skus` | SKU 基础列表（JOIN products + shops） | skus ⨝ products ⨝ shops |
| `POST` | `/api/skus` | 新增 SKU | skus |
| `PUT` | `/api/skus/{code}` | 更新 SKU | skus |
| `DELETE` | `/api/skus/{code}` | 删除 SKU | skus |

### 利润与汇总

| Method | Path | 说明 |
|--------|------|------|
| `GET` | `/api/dashboard/kpis?start=&end=` | Dashboard KPI（总利润/总销售额/总推广/利润率） |
| `GET` | `/api/shops/{id}/summary?start=&end=` | 店铺汇总（销售额/订单/补单/推广/售后/净利） |
| `GET` | `/api/shops/{id}/skus?start=&end=&page=&page_size=` | 店铺下 SKU 每日利润列表（分页） |
| `GET` | `/api/skus/{code}/daily?date=` | 获取指定 SKU 某日的利润记录 |
| `POST` | `/api/skus/{code}/save` | 保存/更新日利润（自动计算成本+利润） |
| `POST` | `/api/shops/{id}/copy-yesterday` | 复制昨日数据到今日 |

### 源数据写入（触发器自动同步 profit_logs）

| Method | Path | 说明 |
|--------|------|------|
| `POST` | `/api/sales` | Upsert 销售数据 → `daily_sales_logs` |
| `POST` | `/api/aftersale` | Upsert 售后数据 → `daily_aftersale_logs` |
| `GET` | `/api/aftersale/{sku_id}?date=` | 获取有效退货/换货量 |
| `POST` | `/api/fill-order` | Upsert 补单数据 → `daily_fill_order_logs` |
| `POST` | `/api/promotion` | Upsert 推广数据 → `daily_promotion_logs` |

### 批量操作

| Method | Path | 说明 |
|--------|------|------|
| `POST` | `/api/import/batch` | 批量文件导入（multipart/form-data，支持 .xlsx/.zip） |
| `POST` | `/api/clear-all` | 清空全部数据（含基础表） |
| `POST` | `/api/clear-business-data` | 仅清空业务统计表（保留 shops/products/skus） |
| `GET` | `/api/health` | 健康检查 |

---

## 十一、文件导入架构

文件导入采用 3 层管道架构，位于 `internal/service/file_import/`：

### Layer 1: 文件识别 (`layer1_identifier.go`)

- `IdentifyByHeaders(headers)` — 基于表头列名匹配，优先级最高
- `IdentifyFile(filename)` — 基于文件名关键词匹配（如"商品明细"→销售，"推广费"→推广，`.zip`→售后）
- 识别结果类型: `TypeSales` | `TypeAftersale` | `TypePromotion` | `TypeUnknown`

### Layer 2: 文件解析 (`layer2_parser.go`)

- `ParseSheet(path)` — 统一解析入口，支持 `.xlsx` 和 `.zip`（解压后读第一个 xlsx）
- 返回 `ParsedSheet{Headers, Rows}`

### Layer 3: 数据导入（按类型分发）

| 文件 | 处理函数 | 写入表 |
|------|---------|--------|
| `layer3_sales.go` | `ImportSales()` | `daily_sales_logs` (Upsert) |
| `layer3_aftersale.go` | `ImportAftersale()` | `daily_aftersale_logs` (Upsert) |
| `layer3_promotion.go` | `ImportPromotion()` | `daily_promotion_logs` + `daily_fill_order_logs` |

### 导入流程

```
上传文件 → 保存临时文件 → ParseSheet 解析
  → IdentifyByHeaders 识别类型（回退 IdentifyFile）
    → 按类型分发 Import*
      → Upsert 源数据表 → 触发器自动同步 profit_logs
        → 返回写入行数 → 清理临时文件
```

### SKU 编码映射

`mapper.go` 提供 `BuildCodeToID()` 和 `BuildShopNameToID()` — 将文件中的 SKU 编码字符串映射为数据库 `sku_id`，将店铺名称映射为 `shop_id`。

---

## 十二、种子数据

> **状态：已禁用。** `seed(db)` 调用已注释，如需恢复取消 `sqlite.go:268` 行注释。

种子数据设计包含 3 店铺 + 若干 SKU 的演示数据。当前种子函数需要重构：
- SKU 表不包含 `product_name` / `default_cost` 列（这些字段在 `products` 表中），种子数据的 INSERT 语句需适配
- 缺少 products 表种子数据插入
- 演示利润数据需改为通过源数据表触发器写入

---

## 十三、已知问题与限制

### 13.1 级联删除不完整

`DELETE /api/shops/{id}` 和 `POST /api/clear-all` 仅级联删除 `daily_profit_logs`、`skus`，**不会自动清理 4 张源数据表**（`daily_sales_logs` / `daily_fill_order_logs` / `daily_promotion_logs` / `daily_aftersale_logs`）。如需彻底清空请额外调用 `POST /api/clear-business-data`。

### 13.2 源数据表外键

源数据表的 `shop_id` 字段使用 `NOT NULL DEFAULT 0` 而非 `REFERENCES shops(shop_id)`，允许 shop_id=0 作为未知店铺的兜底值。这是一个有意的架构权衡：文件导入时可能无法精确匹配店铺名。

### 13.3 promotion_total 双重计算

`promotion_total` 在数据库层（触发器 `trg_dpl_promo_*`）和应用层（`SaveSKU` handler）各计算一次，确保数据一致性。`CopyYesterday` 的 SQL 直接使用 5 项推广费之和而非 `promotion_total` 列，等效但路径不同。

---

## 十四、技术说明

| 项目 | 说明 |
|------|------|
| **数据库文件** | `smartprofit.db`，位于应用根目录 |
| **驱动** | `modernc.org/sqlite` — 纯 Go 实现的 SQLite 驱动，无需 CGO |
| **连接池** | `db.DB` 全局单例，所有 DAO 共享同一连接 |
| **迁移策略** | `CREATE TABLE IF NOT EXISTS` + 启动时 `ALTER TABLE ADD COLUMN`（容错忽略已存在列） |
| **种子数据** | 仅在 `shops` 表为空时插入，当前已禁用 |
| **数据同步** | 源数据表通过 SQLite 触发器自动同步到 `daily_profit_logs`；售后数据通过应用层拉取 |
| **文件导入** | 3 层管道：识别 → 解析 → 导入，支持 `.xlsx` 和 `.zip` |
| **代码位置** | 模型: `internal/model/` · DAO: `internal/dao/` · Handler: `internal/handler/` · 导入: `internal/service/file_import/` |
