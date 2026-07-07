package model

// DailySalesLog SKU 每日销售汇总表（分组维度：shop_id + sku_id + record_date）
type DailySalesLog struct {
	ID        int64  `db:"id" json:"id"`                 // 主键
	ShopID    int64  `db:"shop_id" json:"shop_id"`       // 店铺 ID
	SkuID     int64  `db:"sku_id" json:"sku_id"`         // SKU ID
	RecordDate string `db:"record_date" json:"record_date"` // 统计日期

	SalesAmount     float64 `db:"sales_amount" json:"sales_amount"`           // 当日总销售额
	OrderCount      int     `db:"order_count" json:"order_count"`             // 当日订单总数量
	OrderItemsCount int     `db:"order_items_count" json:"order_items_count"` // 当日商品总件数

	OperatorName string `db:"operator_name" json:"operator_name"` // 登记负责人
	CreatedAt    string `db:"created_at" json:"created_at"`
	UpdatedAt    string `db:"updated_at" json:"updated_at"`
}
