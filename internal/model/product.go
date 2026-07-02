package model

// Product 商品（对应 products 表）
// 一个商品可对应多个 SKU（如不同颜色/规格/店铺）
// 默认成本参数用于自动计算 SKU 日利润
type Product struct {
	ProductID   int64   `db:"product_id" json:"product_id"`       // 主键
	ProductName string  `db:"product_name" json:"product_name"`   // 商品名称
	Category    string  `db:"category" json:"category"`           // 商品分类
	ImageURL    string  `db:"image_url" json:"image_url"`         // 商品图片 URL
	DefaultCost float64 `db:"default_cost" json:"default_cost"`   // 商品默认成本（元/件）
	CreatedAt   string  `db:"created_at" json:"created_at"`       // 创建时间

	// 默认成本参数（用于自动计算 SKU 日利润）
	DefaultShippingCost     float64 `db:"default_shipping_cost" json:"default_shipping_cost"`         // 默认运费（元/单）
	DefaultServiceFeeRate   float64 `db:"default_service_fee_rate" json:"default_service_fee_rate"`   // 默认交易服务费率
	DefaultTaxRate          float64 `db:"default_tax_rate" json:"default_tax_rate"`                   // 默认交易税费率
	DefaultFreightInsurance float64 `db:"default_freight_insurance" json:"default_freight_insurance"` // 默认运费险（元/单）
	DefaultExchangeCost     float64 `db:"default_exchange_cost" json:"default_exchange_cost"`         // 默认换货成本（元/件）
	DefaultReturnCost       float64 `db:"default_return_cost" json:"default_return_cost"`             // 默认退货成本（元/件）
	DefaultFillOrderCost    float64 `db:"default_fill_order_cost" json:"default_fill_order_cost"`     // 默认补单成本（元/件）
}
