package model

// SKU 对应 skus 表（商品名称/分类/成本由 JOIN products 获取）
type SKU struct {
	SkuID       int64   `db:"sku_id" json:"sku_id"`
	ShopID      int64   `db:"shop_id" json:"shop_id"`
	ProductID   int64   `db:"product_id" json:"product_id"`
	SkuCode     string  `db:"sku_code" json:"sku_code"`
	CreatedAt   string  `db:"created_at" json:"created_at"`

	// JOIN 字段
	ProductName string  `db:"product_name" json:"product_name,omitempty"`
	Category    string  `db:"category" json:"category,omitempty"`
	DefaultCost float64 `db:"default_cost" json:"default_cost,omitempty"`
	ShopName    string  `db:"shop_name" json:"shop_name,omitempty"`
}
