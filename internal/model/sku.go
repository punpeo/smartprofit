package model

// SKU 对应 skus 表
type SKU struct {
	SkuID       int64   `db:"sku_id" json:"sku_id"`
	ShopID      int64   `db:"shop_id" json:"shop_id"`
	SkuCode     string  `db:"sku_code" json:"sku_code"`
	ProductName string  `db:"product_name" json:"product_name"`
	DefaultCost float64 `db:"default_cost" json:"default_cost"`
	Category    string  `db:"category" json:"category"`
	CreatedAt   string  `db:"created_at" json:"created_at"`
}
