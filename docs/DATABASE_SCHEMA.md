# 盈析 · 电商利润经营分析系统

## 数据库表结构说明文档

**版本**: v2.0  
**数据库**: SQLite 3  
**日期**: 2026-07-02  
**字符集**: UTF-8  
**存储引擎**: WAL 模式 (Write-Ahead Logging)

---

## 一、数据库概述

本系统使用 SQLite 作为嵌入式数据库，数据库文件为 `smartprofit.db`，随应用启动自动创建。包含 4 张业务表，采用外键约束保障数据完整性，启用 WAL 模式以支持并发读写。

### 配置参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `journal_mode` | WAL | 预写日志，支持并发读写 |
| `foreign_keys` | ON | 启用外键约束 |
| `busy_timeout` | 5000ms | 锁等待超时 |

---

## 二、实体关系图 (ER)

```
┌──────────┐       ┌──────────┐       ┌────────────────────┐
│  shops   │       │ products │       │  daily_profit_logs │
│  店铺表   │       │  商品表   │       │     每日利润记录     │
├──────────┤       ├──────────┤       ├────────────────────┤
│ shop_id  │──┐    │product_id│──┐    │ log_id             │
│ shop_name│  │    │prod_name │  │    │ sku_id     (FK)    │
│ platform │  │    │category  │  │    │ record_date        │
│ owner    │  │    │default_* │  │    │ sales_amount       │
│created_at│  │    │created_at│  │    │ ...                │
└──────────┘  │    └──────────┘  │    │ final_profit       │
              │                  │    └────────────────────┘
              │    ┌──────────┐  │              ▲
              │    │   skus   │  │              │
              │    │  SKU表   │  │              │
              │    ├──────────┤  │              │
              ├───→│ shop_id  │  │              │
              │    │product_id│←─┘              │
              │    │ sku_code │                 │
              │    │created_at│←────────────────┘
              │    └──────────┘   (JOIN via sku_id)
              │
              ▼
         shops 1──N skus
         products 1──N skus
         skus 1──N daily_profit_logs
```

### 关系说明

| 关系 | 类型 | 说明 |
|------|------|------|
| shops → skus | 1 : N | 一个店铺下可有多个 SKU |
| products → skus | 1 : N | 一个商品可对应多个 SKU（不同店铺/规格） |
| skus → daily_profit_logs | 1 : N | 一个 SKU 每天一条利润记录 |

---

## 三、表结构详细说明

### 3.1 shops（店铺表）

| 序号 | 字段名 | 类型 | 约束 | 默认值 | 说明 |
|------|--------|------|------|--------|------|
| 1 | `shop_id` | INTEGER | PK, AUTOINCREMENT | — | 主键，店铺唯一标识 |
| 2 | `shop_name` | TEXT | NOT NULL | — | 店铺名称，如"京东自营店" |
| 3 | `platform` | TEXT | NOT NULL | `''` | 所属平台，如京东/天猫/拼多多 |
| 4 | `owner` | TEXT | NOT NULL | `''` | 店铺负责人 |
| 5 | `created_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 创建时间（北京时间） |

**索引**: 主键 `shop_id`

---

### 3.2 products（商品表）

| 序号 | 字段名 | 类型 | 约束 | 默认值 | 说明 |
|------|--------|------|------|--------|------|
| 1 | `product_id` | INTEGER | PK, AUTOINCREMENT | — | 主键，商品唯一标识 |
| 2 | `product_name` | TEXT | NOT NULL | — | 商品名称 |
| 3 | `category` | TEXT | NOT NULL | `''` | 商品分类（音频/充电/保护/线材/车载/拍摄） |
| 4 | `image_url` | TEXT | NOT NULL | `''` | 商品图片 URL |
| 5 | `default_cost` | REAL | NOT NULL | `0` | **商品默认成本（元/件）** |
| 6 | `default_shipping_cost` | REAL | NOT NULL | `0` | 默认运费（元/单） |
| 7 | `default_service_fee_rate` | REAL | NOT NULL | `0` | 默认交易服务费率（小数，如 0.01 = 1%） |
| 8 | `default_tax_rate` | REAL | NOT NULL | `0` | 默认交易税费率 |
| 9 | `default_freight_insurance` | REAL | NOT NULL | `0` | 默认运费险（元/单） |
| 10 | `default_exchange_cost` | REAL | NOT NULL | `0` | 默认换货成本（元/件） |
| 11 | `default_return_cost` | REAL | NOT NULL | `0` | 默认退货成本（元/件） |
| 12 | `default_fill_order_cost` | REAL | NOT NULL | `0` | 默认补单成本（元/件） |
| 13 | `created_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 创建时间 |

**索引**: 主键 `product_id`

**字段 5-12 的用途**: 在创建每日利润记录时，系统根据商品默认参数自动计算各项成本：

| 成本项 | 计算公式 |
|--------|---------|
| 商品成本 | 订单件数 × `default_cost` |
| 运费 | 订单量 × `default_shipping_cost` |
| 交易服务费 | 销售额 × `default_service_fee_rate` |
| 交易税费 | 销售额 × `default_tax_rate` |
| 运费险 | 订单量 × `default_freight_insurance` |
| 换货成本 | 换货量 × `default_exchange_cost` |
| 退货成本 | 退货量 × `default_return_cost` |
| 补单成本 | 补单数量 × `default_fill_order_cost` |

---

### 3.3 skus（SKU 表）

| 序号 | 字段名 | 类型 | 约束 | 默认值 | 说明 |
|------|--------|------|------|--------|------|
| 1 | `sku_id` | INTEGER | PK, AUTOINCREMENT | — | 主键，SKU 唯一标识 |
| 2 | `shop_id` | INTEGER | FK → shops(shop_id), NOT NULL | — | 所属店铺 ID |
| 3 | `product_id` | INTEGER | FK → products(product_id), NOT NULL | — | 所属商品 ID |
| 4 | `sku_code` | TEXT | UNIQUE, NOT NULL | — | SKU 编码，如 "JD001" |
| 5 | `created_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 创建时间 |

**索引**: 主键 `sku_id`、唯一索引 `sku_code`

**说明**: 商品名称、分类、默认成本等展示字段通过 JOIN `products` 表获取，SKU 表本身仅存储关联关系。

---

### 3.4 daily_profit_logs（每日利润记录表）

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
| 26 | `promotion_total` | REAL | NOT NULL | `0` | 推广费合计（业务层计算） |
| **计算结果** | | | | | |
| 27 | `final_profit` | REAL | NOT NULL | `0` | **最终利润** |
| 28 | `updated_at` | TEXT | NOT NULL | `datetime('now','+8 hours')` | 更新时间 |

**约束**: `UNIQUE(sku_id, record_date)` — 每个 SKU 每天仅一条记录（Upsert 依据）  
**索引**: `idx_dpl_sku_date (sku_id, record_date)`

---

## 四、利润计算公式

```
推广费合计 = 全站营销 + 智能投放 + 京东联盟 + 搜索快车 + 推荐广告

最终利润 = 真实销售额
         - 商品成本
         - 运费
         - 交易服务费
         - 交易税费
         - 运费险
         - 退货成本
         - 换货成本
         - 补单成本
         - 推广费合计
         + 补单金额
```

---

## 五、种子数据

系统首次启动时自动插入演示数据：

| 表 | 行数 | 内容 |
|------|------|------|
| `shops` | 3 | 京东自营店、天猫旗舰店、拼多多专营店 |
| `products` | 17 | 蓝牙耳机/充电器/手机壳/钢化膜/数据线/移动电源等 |
| `skus` | 19 | JD001-JD008 (京东8个)、TM001-TM006 (天猫6个)、PD001-PD005 (拼多多5个) |
| `daily_profit_logs` | 19 | 每条 SKU 一条当日利润演示数据 |

### 商品分类

| 分类 | 商品数 | 示例 |
|------|--------|------|
| 音频 | 2 | 蓝牙耳机 Pro、蓝牙耳机 基础版 |
| 充电 | 4 | 氮化镓充电器、移动电源 20000mAh、移动电源 10000mAh、充电器 20W |
| 保护 | 5 | 手机壳 磁吸系列、钢化膜 3片装、磁吸手机壳 全系列、钢化膜 2片装、手机壳 透明系列、钢化膜 高清2片 |
| 线材 | 3 | 数据线 Type-C 快充、快充数据线 套装、数据线 3A快充 |
| 车载 | 1 | 车载无线充电支架 |
| 拍摄 | 1 | 蓝牙自拍杆 三脚架 |

---

## 六、API 接口索引

| Method | Path | 说明 | 关联表 |
|--------|------|------|--------|
| `GET` | `/api/shops` | 店铺列表 + 利润汇总 | shops ⨝ skus ⨝ daily_profit_logs |
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
| `GET` | `/api/shops/{id}/skus` | 每日利润列表（分页+日期筛选） | daily_profit_logs ⨝ skus ⨝ products |
| `POST` | `/api/skus/{code}/save` | 保存/更新日利润 | daily_profit_logs (Upsert) |
| `POST` | `/api/shops/{id}/copy-yesterday` | 复制昨日数据 | daily_profit_logs |
| `POST` | `/api/clear-all` | 清空全部数据 | shops + products + skus + daily_profit_logs |
| `GET` | `/api/health` | 健康检查 | — |

---

## 七、技术说明

- **数据库文件**: `smartprofit.db`，位于应用根目录
- **驱动**: `modernc.org/sqlite` — 纯 Go 实现的 SQLite 驱动，无需 CGO
- **连接池**: 应用层单例 `db.DB`，所有 DAO 共享同一连接
- **迁移策略**: `CREATE TABLE IF NOT EXISTS` + 启动时 `ALTER TABLE ADD COLUMN`（容错忽略已存在列）
- **种子数据**: 仅在 `shops` 表为空时插入，已存在数据则跳过
