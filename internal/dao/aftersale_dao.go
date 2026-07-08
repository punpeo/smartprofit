package dao

import (
	"context"
	"database/sql"
	"smartprofit/internal/model"
)

type AftersaleDao struct{ db *sql.DB }

func NewAftersaleDao(db *sql.DB) *AftersaleDao { return &AftersaleDao{db: db} }

const upsertAftersaleSQL = `
INSERT INTO daily_aftersale_logs (
	    shop_id,
    sku_id, record_date, return_total, return_valid, return_cancel,
    exchange_total, exchange_valid, exchange_cancel, aftersale_total, aftersale_cancel, operator_name
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(shop_id, sku_id, record_date) DO UPDATE SET
    return_total    = excluded.return_total,
    return_valid    = excluded.return_valid,
    return_cancel   = excluded.return_cancel,
    exchange_total  = excluded.exchange_total,
    exchange_valid  = excluded.exchange_valid,
    exchange_cancel = excluded.exchange_cancel,
    aftersale_total  = excluded.aftersale_total,
    aftersale_cancel = excluded.aftersale_cancel, operator_name = excluded.operator_name,
    updated_at      = datetime('now','+8 hours')
`

func (d *AftersaleDao) Upsert(ctx context.Context, log *model.DailyAftersaleLog) error {
	_, err := d.db.ExecContext(ctx, upsertAftersaleSQL,
		log.ShopID, log.SkuID, log.RecordDate,
		log.ReturnTotal, log.ReturnValid, log.ReturnCancel,
		log.ExchangeTotal, log.ExchangeValid, log.ExchangeCancel,
		log.AftersaleTotal, log.AftersaleCancel, log.OperatorName,
	)
	return err
}

// GetValidCounts 获取有效退换货数量，用于同步到 daily_profit_logs
func (d *AftersaleDao) GetValidCounts(ctx context.Context, skuID int64, recordDate string) (returnValid, exchangeValid int, err error) {
	err = d.db.QueryRowContext(ctx,
		`SELECT return_valid, exchange_valid FROM daily_aftersale_logs WHERE sku_id=? AND record_date=?`,
		skuID, recordDate,
	).Scan(&returnValid, &exchangeValid)
	if err == sql.ErrNoRows { return 0, 0, nil }
	return
}
