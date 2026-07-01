package model

// DailyProfitLog 对应 daily_profit_logs 表
type DailyProfitLog struct {
	LogID      int64  `db:"log_id" json:"log_id"`
	SkuID      int64  `db:"sku_id" json:"sku_id"`
	RecordDate string `db:"record_date" json:"record_date"`

	// 基础数据
	SalesAmount     float64 `db:"sales_amount" json:"sales_amount"`
	OrderCount      int     `db:"order_count" json:"order_count"`
	OrderItemsCount int     `db:"order_items_count" json:"order_items_count"`
	RealSalesAmount float64 `db:"real_sales_amount" json:"real_sales_amount"`
	RealOrderCount  int     `db:"real_order_count" json:"real_order_count"`

	// 补单
	FillOrderAmount float64 `db:"fill_order_amount" json:"fill_order_amount"`
	FillOrderCount  int     `db:"fill_order_count" json:"fill_order_count"`
	FillOrderCost   float64 `db:"fill_order_cost" json:"fill_order_cost"`

	// 成本
	ProductCost      float64 `db:"product_cost" json:"product_cost"`
	ShippingFee      float64 `db:"shipping_fee" json:"shipping_fee"`
	ServiceFee       float64 `db:"service_fee" json:"service_fee"`
	TaxFee           float64 `db:"tax_fee" json:"tax_fee"`
	FreightInsurance float64 `db:"freight_insurance" json:"freight_insurance"`
	ReturnCount      int     `db:"return_count" json:"return_count"`
	ReturnCost       float64 `db:"return_cost" json:"return_cost"`
	ExchangeCount    int     `db:"exchange_count" json:"exchange_count"`
	ExchangeCost     float64 `db:"exchange_cost" json:"exchange_cost"`

	// 推广
	PromotionAlliance  float64 `db:"promotion_alliance" json:"promotion_alliance"`
	PromotionAuto      float64 `db:"promotion_auto" json:"promotion_auto"`
	PromotionJDUnion   float64 `db:"promotion_jd_union" json:"promotion_jd_union"`
	PromotionSearch    float64 `db:"promotion_search" json:"promotion_search"`
	PromotionRecommend float64 `db:"promotion_recommend" json:"promotion_recommend"`
	PromotionTotal     float64 `db:"promotion_total" json:"promotion_total"`

	FinalProfit float64 `db:"final_profit" json:"final_profit"`
}

// SKUDailyItem 用于列表展示的简化结构
type SKUDailyItem struct {
	SKUCode        string  `db:"sku_code" json:"sku_code"`
	ProductName    string  `db:"product_name" json:"product_name"`
	SalesAmount    float64 `db:"sales_amount" json:"sales_amount"`
	OrderCount     int     `db:"order_count" json:"order_count"`
	PromotionTotal float64 `db:"promotion_total" json:"promotion_total"`
	ProductCost    float64 `db:"product_cost" json:"product_cost"`
	FinalProfit    float64 `db:"final_profit" json:"final_profit"`
}
