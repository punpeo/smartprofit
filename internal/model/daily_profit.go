package model

// DailyProfitLog 每日利润记录（对应 daily_profit_logs 表）
type DailyProfitLog struct {
	LogID      int64  `db:"log_id" json:"log_id"`           // 主键
	SkuID      int64  `db:"sku_id" json:"sku_id"`           // SKU ID（外键 → skus.sku_id）
	RecordDate string `db:"record_date" json:"record_date"` // 记录日期 (YYYY-MM-DD)

	// ── 基础数据 ──
	SalesAmount     float64 `db:"sales_amount" json:"sales_amount"`           // 销售额
	OrderCount      int     `db:"order_count" json:"order_count"`             // 订单量
	OrderItemsCount int     `db:"order_items_count" json:"order_items_count"` // 订单件数
	RealSalesAmount float64 `db:"real_sales_amount" json:"real_sales_amount"` // 真实销售额（销售额 - 补单金额）
	RealOrderCount  int     `db:"real_order_count" json:"real_order_count"`   // 真实订单量（订单量 - 补单数量）

	// ── 补单 ──
	FillOrderAmount float64 `db:"fill_order_amount" json:"fill_order_amount"` // 补单金额
	FillOrderCount  int     `db:"fill_order_count" json:"fill_order_count"`   // 补单数量
	FillOrderCost   float64 `db:"fill_order_cost" json:"fill_order_cost"`     // 补单成本

	// ── 成本 ──
	ProductCost      float64 `db:"product_cost" json:"product_cost"`             // 商品成本
	ShippingFee      float64 `db:"shipping_fee" json:"shipping_fee"`             // 运费
	ServiceFee       float64 `db:"service_fee" json:"service_fee"`               // 交易服务费
	TaxFee           float64 `db:"tax_fee" json:"tax_fee"`                       // 交易税费
	FreightInsurance float64 `db:"freight_insurance" json:"freight_insurance"`   // 运费险
	ReturnCount      int     `db:"return_count" json:"return_count"`             // 退货量
	ReturnCost       float64 `db:"return_cost" json:"return_cost"`               // 退货成本
	ExchangeCount    int     `db:"exchange_count" json:"exchange_count"`         // 换货量
	ExchangeCost     float64 `db:"exchange_cost" json:"exchange_cost"`           // 换货成本

	// ── 推广 ──
	PromotionAlliance  float64 `db:"promotion_alliance" json:"promotion_alliance"`   // 全站营销
	PromotionAuto      float64 `db:"promotion_auto" json:"promotion_auto"`           // 智能投放
	PromotionJDUnion   float64 `db:"promotion_jd_union" json:"promotion_jd_union"`   // 京东联盟
	PromotionSearch    float64 `db:"promotion_search" json:"promotion_search"`       // 搜索快车
	PromotionRecommend float64 `db:"promotion_recommend" json:"promotion_recommend"` // 推荐广告
	PromotionTotal     float64 `db:"promotion_total" json:"promotion_total"`         // 推广费合计（5项之和）

	FinalProfit float64 `db:"final_profit" json:"final_profit"` // 最终利润
}

// SKUDailyItem 列表展示用的简化结构（联表查询结果）
type SKUDailyItem struct {
	SKUCode        string  `db:"sku_code" json:"sku_code"`               // SKU 编码
	ProductName    string  `db:"product_name" json:"product_name"`       // 商品名称（JOIN products）
	SalesAmount    float64 `db:"sales_amount" json:"sales_amount"`       // 销售额
	OrderCount     int     `db:"order_count" json:"order_count"`         // 订单量
	PromotionTotal float64 `db:"promotion_total" json:"promotion_total"` // 推广费合计
	FillOrderCount int     `db:"fill_order_count" json:"fill_order_count"` // 补单数量
	ProductCost    float64 `db:"product_cost" json:"product_cost"`       // 商品成本
	FinalProfit    float64 `db:"final_profit" json:"final_profit"`       // 最终利润
}
