package model

// Shop 店铺（对应 shops 表）
type Shop struct {
	ShopID    int64  `db:"shop_id" json:"shop_id"`       // 主键
	ShopName  string `db:"shop_name" json:"shop_name"`   // 店铺名称
	Platform  string `db:"platform" json:"platform"`     // 平台（京东/天猫/拼多多）
	Owner     string `db:"owner" json:"owner"`           // 负责人
	CreatedAt string `db:"created_at" json:"created_at"` // 创建时间
}

// ShopSummary 店铺汇总数据（联表聚合查询结果，用于 Dashboard 表格）
type ShopSummary struct {
	ShopID      int64   `db:"shop_id" json:"shop_id"`             // 店铺 ID
	ShopName    string  `db:"shop_name" json:"shop_name"`         // 店铺名称
	TodayProfit float64 `db:"today_profit" json:"today_profit"`   // 当日利润（按 record_date 筛选）
	TotalProfit float64 `db:"total_profit" json:"total_profit"`   // 累计利润（所选时段）
	ProfitRate  float64 `db:"profit_rate" json:"profit_rate"`     // 利润率 (%)
	Status      string  `db:"status" json:"status"`               // 盈利 / 亏损
}
