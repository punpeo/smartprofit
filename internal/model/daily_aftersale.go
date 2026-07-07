package model

// DailyAftersaleLog SKU 每日售后汇总表（分组维度：shop_id + sku_id + record_date）
// 退货量/换货量区分有效/取消，仅有效数据同步到 daily_profit_logs
type DailyAftersaleLog struct {
	ID         int64  `db:"id" json:"id"`                   // 主键
	ShopID     int64  `db:"shop_id" json:"shop_id"`         // 店铺 ID
	SkuID      int64  `db:"sku_id" json:"sku_id"`           // SKU ID（外键 → skus.sku_id）
	RecordDate string `db:"record_date" json:"record_date"` // 售后申请日期 (YYYY-MM-DD)

	// 退货统计
	ReturnTotal  int `db:"return_total" json:"return_total"`   // 退货售后总单数（含取消）
	ReturnValid  int `db:"return_valid" json:"return_valid"`   // 有效退货单数（状态≠取消，同步到 daily_profit_logs.ReturnCount）
	ReturnCancel int `db:"return_cancel" json:"return_cancel"` // 已取消退货单数

	// 换货统计
	ExchangeTotal  int `db:"exchange_total" json:"exchange_total"`   // 换货售后总单数（含取消）
	ExchangeValid  int `db:"exchange_valid" json:"exchange_valid"`   // 有效换货单数（状态≠取消，同步到 daily_profit_logs.ExchangeCount）
	ExchangeCancel int `db:"exchange_cancel" json:"exchange_cancel"` // 已取消换货单数

	// 扩展统计
	AftersaleTotal  int `db:"aftersale_total" json:"aftersale_total"`   // 当日售后总单数
	AftersaleCancel int `db:"aftersale_cancel" json:"aftersale_cancel"` // 当日取消售后单数

	OperatorName string `db:"operator_name" json:"operator_name"` // 登记负责人
	CreatedAt    string `db:"created_at" json:"created_at"`       // 创建时间
	UpdatedAt    string `db:"updated_at" json:"updated_at"`       // 更新时间
}
