package model

// SKU 商品库存单位（对应 skus 表）
// 商品名称/分类/默认成本通过 product_id 关联 products 表 JOIN 获取
type SKU struct {
	SkuID     int64  `db:"sku_id" json:"sku_id"`         // 主键
	ShopID    int64  `db:"shop_id" json:"shop_id"`       // 所属店铺 ID（外键 → shops.shop_id）
	ProductID int64  `db:"product_id" json:"product_id"` // 所属商品 ID（外键 → products.product_id）
	SkuCode   string `db:"sku_code" json:"sku_code"`     // SKU 编码（唯一，如 JD001）
	CreatedAt string `db:"created_at" json:"created_at"` // 创建时间

	// JOIN 字段（联表查询时填充，omitempty 忽略零值）
	ProductName string  `db:"product_name" json:"product_name,omitempty"` // 商品名称（JOIN products）
	Category    string  `db:"category" json:"category,omitempty"`         // 商品分类（JOIN products）
	DefaultCost float64 `db:"default_cost" json:"default_cost,omitempty"` // 默认成本（JOIN products）
	ShopName    string  `db:"shop_name" json:"shop_name,omitempty"`       // 店铺名称（JOIN shops）
}
