package dao

import (
	"context"
	"database/sql"
	"smartprofit/internal/model"
)

type ShopDao struct{ db *sql.DB }

func NewShopDao(db *sql.DB) *ShopDao { return &ShopDao{db: db} }

const getAllShopsSQL = `
SELECT s.shop_id, s.shop_name, s.platform,
    COALESCE(period.total_profit,0) as today_profit,
    COALESCE(period.total_profit,0) as total_profit,
    CASE WHEN COALESCE(period.total_profit,0)>=0 THEN '盈利' ELSE '亏损' END as status,
    CASE WHEN COALESCE(period.total_sales,0)>0 THEN ROUND(COALESCE(period.total_profit,0)*100.0/COALESCE(period.total_sales,1),1) ELSE 0 END as profit_rate
FROM shops s
LEFT JOIN (SELECT s2.shop_id, SUM(d.final_profit) as total_profit, SUM(d.real_sales_amount) as total_sales FROM daily_profit_logs d JOIN skus s2 ON d.sku_id=s2.sku_id WHERE d.record_date BETWEEN ? AND ? GROUP BY s2.shop_id) period ON s.shop_id=period.shop_id
ORDER BY today_profit DESC`

func (d *ShopDao) GetAll(ctx context.Context, startDate, endDate string) ([]*model.ShopSummary, error) {
	rows, err := d.db.QueryContext(ctx, getAllShopsSQL, startDate, endDate)
	if err != nil { return nil, err }
	defer rows.Close()
	var shops []*model.ShopSummary
	for rows.Next() {
		var s model.ShopSummary; var platform string
		if err := rows.Scan(&s.ShopID, &s.ShopName, &platform, &s.TodayProfit, &s.TotalProfit, &s.Status, &s.ProfitRate); err != nil { return nil, err }
		shops = append(shops, &s)
	}
	return shops, nil
}

const getShopByIDSQL = `SELECT shop_id, shop_name, platform, owner, created_at FROM shops WHERE shop_id=?`

func (d *ShopDao) GetByID(ctx context.Context, shopID int64) (*model.Shop, error) {
	var s model.Shop
	err := d.db.QueryRowContext(ctx, getShopByIDSQL, shopID).Scan(&s.ShopID, &s.ShopName, &s.Platform, &s.Owner, &s.CreatedAt)
	if err != nil { return nil, err }
	return &s, nil
}

const createShopSQL = `INSERT INTO shops (shop_name, platform, owner) VALUES (?,?,?)`

func (d *ShopDao) Create(ctx context.Context, name, platform, owner string) (int64, error) {
	r, err := d.db.ExecContext(ctx, createShopSQL, name, platform, owner)
	if err != nil { return 0, err }
	return r.LastInsertId()
}

const updateShopSQL = `UPDATE shops SET shop_name=?, platform=?, owner=? WHERE shop_id=?`

func (d *ShopDao) Update(ctx context.Context, s *model.Shop) error {
	_, err := d.db.ExecContext(ctx, updateShopSQL, s.ShopName, s.Platform, s.Owner, s.ShopID)
	return err
}

func (d *ShopDao) Delete(ctx context.Context, shopID int64) error {
	tx, _ := d.db.BeginTx(ctx, nil)
	defer tx.Rollback()
	tx.ExecContext(ctx, `DELETE FROM daily_profit_logs WHERE sku_id IN (SELECT sku_id FROM skus WHERE shop_id=?)`, shopID)
	tx.ExecContext(ctx, `DELETE FROM skus WHERE shop_id=?`, shopID)
	tx.ExecContext(ctx, `DELETE FROM shops WHERE shop_id=?`, shopID)
	return tx.Commit()
}

// ClearAll 清空全部数据 + 重置自增序号
func (d *ShopDao) ClearAll(ctx context.Context) error {
	tx, _ := d.db.BeginTx(ctx, nil)
	defer tx.Rollback()
	tx.ExecContext(ctx, `DELETE FROM daily_profit_logs`)
	tx.ExecContext(ctx, `DELETE FROM skus`)
	tx.ExecContext(ctx, `DELETE FROM products`)
	tx.ExecContext(ctx, `DELETE FROM shops`)
	tx.ExecContext(ctx, `DELETE FROM sqlite_sequence`) // 重置所有自增序号
	return tx.Commit()
}
