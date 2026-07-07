package model

// DailyPromotionLog SKU 每日推广费汇总表（分组维度：shop_id + sku_id + record_date）
type DailyPromotionLog struct {
	ID         int64  `db:"id" json:"id"`                 // 主键
	ShopID     int64  `db:"shop_id" json:"shop_id"`       // 店铺 ID
	SkuID      int64  `db:"sku_id" json:"sku_id"`         // SKU ID
	RecordDate string `db:"record_date" json:"record_date"` // 推广统计日期

	PromotionAlliance  float64 `db:"promotion_alliance" json:"promotion_alliance"`   // 全站营销
	PromotionAuto      float64 `db:"promotion_auto" json:"promotion_auto"`           // 智能投放
	PromotionJDUnion   float64 `db:"promotion_jd_union" json:"promotion_jd_union"`   // 京东联盟
	PromotionSearch    float64 `db:"promotion_search" json:"promotion_search"`       // 搜索快车
	PromotionRecommend float64 `db:"promotion_recommend" json:"promotion_recommend"` // 推荐广告
	PromotionTotal     float64 `db:"promotion_total" json:"promotion_total"`         // 推广费合计

	OperatorName string `db:"operator_name" json:"operator_name"` // 登记负责人
	CreatedAt    string `db:"created_at" json:"created_at"`
	UpdatedAt    string `db:"updated_at" json:"updated_at"`
}
