package model

// DailyFillOrderLog SKU 每日补单汇总表（分组维度：shop_id + sku_id + record_date）
// FillOrderCost 通过 SKU JOIN products 表自动计算：FillOrderCount × product.default_fill_order_cost
type DailyFillOrderLog struct {
	ID         int64  `db:"id" json:"id"`                   // 主键
	ShopID     int64  `db:"shop_id" json:"shop_id"`         // 店铺 ID
	SkuID      int64  `db:"sku_id" json:"sku_id"`           // SKU ID
	RecordDate string `db:"record_date" json:"record_date"` // 补单登记日期 (YYYY-MM-DD)

	FillOrderCount  int     `db:"fill_order_count" json:"fill_order_count"`   // 补单商品总件数（同步 profit.FillOrderCount）
	FillOrderAmount float64 `db:"fill_order_amount" json:"fill_order_amount"` // 补单销售总金额（同步 profit.FillOrderAmount）
	FillOrderCost   float64 `db:"fill_order_cost" json:"fill_order_cost"`     // 补单商品总成本 = FillOrderCount × product.default_fill_order_cost（自动计算）

	OperatorName string `db:"operator_name" json:"operator_name"` // 登记负责人
	CreatedAt    string `db:"created_at" json:"created_at"`       // 创建时间
	UpdatedAt    string `db:"updated_at" json:"updated_at"`       // 更新时间
}
