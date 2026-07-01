package dao

import (
	"context"
	"database/sql"
	"smartprofit/internal/model"
)

type ShopDao struct {
	db *sql.DB
}

func NewShopDao(db *sql.DB) *ShopDao {
	return &ShopDao{db: db}
}

// GetAll 获取所有店铺列表（含今日利润、累计利润）
const getAllShopsSQL = `
SELECT
    s.shop_id,
    s.shop_name,
    s.platform,
    COALESCE(today.total_profit, 0) as today_profit,
    COALESCE(total.total_profit, 0) as total_profit,
    CASE
        WHEN COALESCE(today.total_profit, 0) >= 0 THEN '盈利'
        ELSE '亏损'
    END as status,
    CASE
        WHEN COALESCE(total.total_sales, 0) > 0
        THEN ROUND(COALESCE(total.total_profit, 0) * 100.0 / COALESCE(total.total_sales, 1), 1)
        ELSE 0
    END as profit_rate
FROM shops s
LEFT JOIN (
    SELECT s2.shop_id, SUM(d.final_profit) as total_profit
    FROM daily_profit_logs d
    JOIN skus s2 ON d.sku_id = s2.sku_id
    WHERE d.record_date = date('now')
    GROUP BY s2.shop_id
) today ON s.shop_id = today.shop_id
LEFT JOIN (
    SELECT s2.shop_id, SUM(d.final_profit) as total_profit, SUM(d.real_sales_amount) as total_sales
    FROM daily_profit_logs d
    JOIN skus s2 ON d.sku_id = s2.sku_id
    GROUP BY s2.shop_id
) total ON s.shop_id = total.shop_id
ORDER BY today_profit DESC
`

func (d *ShopDao) GetAll(ctx context.Context) ([]*model.ShopSummary, error) {
	rows, err := d.db.QueryContext(ctx, getAllShopsSQL)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shops []*model.ShopSummary
	for rows.Next() {
		var shop model.ShopSummary
		var platform string
		err := rows.Scan(
			&shop.ShopID,
			&shop.ShopName,
			&platform,
			&shop.TodayProfit,
			&shop.TotalProfit,
			&shop.Status,
			&shop.ProfitRate,
		)
		if err != nil {
			return nil, err
		}
		shops = append(shops, &shop)
	}
	return shops, nil
}

// GetByID 根据ID获取店铺信息
const getShopByIDSQL = `SELECT shop_id, shop_name, platform, owner, created_at FROM shops WHERE shop_id = ?`

func (d *ShopDao) GetByID(ctx context.Context, shopID int64) (*model.Shop, error) {
	var shop model.Shop
	err := d.db.QueryRowContext(ctx, getShopByIDSQL, shopID).Scan(
		&shop.ShopID,
		&shop.ShopName,
		&shop.Platform,
		&shop.Owner,
		&shop.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &shop, nil
}
