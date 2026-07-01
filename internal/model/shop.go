package model

// Shop 对应 shops 表
type Shop struct {
	ShopID    int64  `db:"shop_id" json:"shop_id"`
	ShopName  string `db:"shop_name" json:"shop_name"`
	Platform  string `db:"platform" json:"platform"`
	Owner     string `db:"owner" json:"owner"`
	CreatedAt string `db:"created_at" json:"created_at"`
}

// ShopSummary 店铺汇总数据 (用于 Dashboard 表格)
type ShopSummary struct {
	ShopID      int64   `db:"shop_id" json:"shop_id"`
	ShopName    string  `db:"shop_name" json:"shop_name"`
	TodayProfit float64 `db:"today_profit" json:"today_profit"`
	TotalProfit float64 `db:"total_profit" json:"total_profit"`
	ProfitRate  float64 `db:"profit_rate" json:"profit_rate"`
	Status      string  `db:"status" json:"status"`
}
