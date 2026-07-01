package dao

import (
	"context"
	"database/sql"
	"smartprofit/internal/model"
)

type DailyProfitDao struct {
	db *sql.DB
}

func NewDailyProfitDao(db *sql.DB) *DailyProfitDao {
	return &DailyProfitDao{db: db}
}

// ==================== Upsert ====================

// SQLite 版 Upsert：INSERT OR REPLACE 在冲突时更新
const insertOrUpdateSQL = `
INSERT INTO daily_profit_logs (
    sku_id, record_date, sales_amount, order_count, order_items_count,
    real_sales_amount, real_order_count, fill_order_amount, fill_order_count,
    fill_order_cost, product_cost, shipping_fee, service_fee, tax_fee,
    freight_insurance, return_count, return_cost, exchange_count, exchange_cost,
    promotion_alliance, promotion_auto, promotion_jd_union,
    promotion_search, promotion_recommend, final_profit, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','+8 hours'))
ON CONFLICT(sku_id, record_date) DO UPDATE SET
    sales_amount = excluded.sales_amount,
    order_count = excluded.order_count,
    order_items_count = excluded.order_items_count,
    real_sales_amount = excluded.real_sales_amount,
    real_order_count = excluded.real_order_count,
    fill_order_amount = excluded.fill_order_amount,
    fill_order_count = excluded.fill_order_count,
    fill_order_cost = excluded.fill_order_cost,
    product_cost = excluded.product_cost,
    shipping_fee = excluded.shipping_fee,
    service_fee = excluded.service_fee,
    tax_fee = excluded.tax_fee,
    freight_insurance = excluded.freight_insurance,
    return_count = excluded.return_count,
    return_cost = excluded.return_cost,
    exchange_count = excluded.exchange_count,
    exchange_cost = excluded.exchange_cost,
    promotion_alliance = excluded.promotion_alliance,
    promotion_auto = excluded.promotion_auto,
    promotion_jd_union = excluded.promotion_jd_union,
    promotion_search = excluded.promotion_search,
    promotion_recommend = excluded.promotion_recommend,
    final_profit = excluded.final_profit,
    updated_at = datetime('now','+8 hours')
`

func (d *DailyProfitDao) Save(ctx context.Context, log *model.DailyProfitLog) error {
	_, err := d.db.ExecContext(ctx, insertOrUpdateSQL,
		log.SkuID, log.RecordDate, log.SalesAmount, log.OrderCount, log.OrderItemsCount,
		log.RealSalesAmount, log.RealOrderCount, log.FillOrderAmount, log.FillOrderCount,
		log.FillOrderCost, log.ProductCost, log.ShippingFee, log.ServiceFee, log.TaxFee,
		log.FreightInsurance, log.ReturnCount, log.ReturnCost, log.ExchangeCount, log.ExchangeCost,
		log.PromotionAlliance, log.PromotionAuto, log.PromotionJDUnion,
		log.PromotionSearch, log.PromotionRecommend, log.FinalProfit,
	)
	return err
}

// ==================== Shop Summary ====================

const getShopSummarySQL = `
SELECT
    COALESCE(SUM(d.sales_amount), 0) as total_sales,
    COALESCE(SUM(d.order_count), 0) as total_orders,
    COALESCE(SUM(d.fill_order_count), 0) as total_fill_count,
    COALESCE(SUM(d.fill_order_amount), 0) as total_fill_amount,
    COALESCE(SUM(d.promotion_total), 0) as total_promo,
    COALESCE(SUM(d.return_cost + d.exchange_cost), 0) as total_aftersale_cost,
    COALESCE(SUM(d.final_profit), 0) as net_profit
FROM daily_profit_logs d
JOIN skus s ON d.sku_id = s.sku_id
WHERE s.shop_id = ?
  AND d.record_date BETWEEN ? AND ?
`

type ShopSummary struct {
	TotalSales         float64 `json:"total_sales"`
	TotalOrders        int     `json:"total_orders"`
	TotalFillCount     int     `json:"total_fill_count"`
	TotalFillAmount    float64 `json:"total_fill_amount"`
	TotalPromo         float64 `json:"total_promo"`
	TotalAftersaleCost float64 `json:"total_aftersale_cost"`
	NetProfit          float64 `json:"net_profit"`
}

func (d *DailyProfitDao) GetShopSummary(ctx context.Context, shopID int, startDate, endDate string) (*ShopSummary, error) {
	var summary ShopSummary
	err := d.db.QueryRowContext(ctx, getShopSummarySQL, shopID, startDate, endDate).Scan(
		&summary.TotalSales, &summary.TotalOrders, &summary.TotalFillCount,
		&summary.TotalFillAmount, &summary.TotalPromo, &summary.TotalAftersaleCost,
		&summary.NetProfit,
	)
	if err != nil {
		return nil, err
	}
	return &summary, nil
}

// ==================== SKU List（分页） ====================

const listByShopAndDateSQL = `
SELECT
    s.sku_code, s.product_name,
    d.sales_amount, d.order_count, d.promotion_total, d.product_cost, d.final_profit
FROM daily_profit_logs d
JOIN skus s ON d.sku_id = s.sku_id
WHERE s.shop_id = ? AND d.record_date BETWEEN ? AND ?
ORDER BY d.final_profit DESC
LIMIT ? OFFSET ?
`

func (d *DailyProfitDao) ListByShopAndDate(ctx context.Context, shopID int, startDate, endDate string, offset, limit int) ([]*model.SKUDailyItem, error) {
	rows, err := d.db.QueryContext(ctx, listByShopAndDateSQL, shopID, startDate, endDate, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.SKUDailyItem
	for rows.Next() {
		var item model.SKUDailyItem
		err := rows.Scan(
			&item.SKUCode, &item.ProductName,
			&item.SalesAmount, &item.OrderCount, &item.PromotionTotal, &item.ProductCost, &item.FinalProfit,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, &item)
	}
	return items, nil
}

// ==================== Copy Yesterday ====================

// SQLite 版复制昨日数据
const copyYesterdaySQL = `
INSERT INTO daily_profit_logs (
    sku_id, record_date, sales_amount, order_count, order_items_count,
    real_sales_amount, real_order_count, fill_order_amount, fill_order_count,
    fill_order_cost, product_cost, shipping_fee, service_fee, tax_fee,
    freight_insurance, return_count, return_cost, exchange_count, exchange_cost,
    promotion_alliance, promotion_auto, promotion_jd_union,
    promotion_search, promotion_recommend, final_profit
)
SELECT
    sku_id, date('now') as record_date,
    sales_amount, order_count, order_items_count,
    real_sales_amount, real_order_count, fill_order_amount, fill_order_count,
    fill_order_cost, product_cost, shipping_fee, service_fee, tax_fee,
    freight_insurance, return_count, return_cost, exchange_count, exchange_cost,
    promotion_alliance, promotion_auto, promotion_jd_union,
    promotion_search, promotion_recommend,
    real_sales_amount - (
        product_cost + shipping_fee + service_fee + tax_fee +
        freight_insurance + return_cost + exchange_cost + fill_order_cost +
        promotion_alliance + promotion_auto + promotion_jd_union +
        promotion_search + promotion_recommend
    ) + fill_order_amount as final_profit
FROM daily_profit_logs
WHERE record_date = date('now', '-1 day')
  AND sku_id IN (SELECT sku_id FROM skus WHERE shop_id = ?)
ON CONFLICT(sku_id, record_date) DO UPDATE SET
    sales_amount = excluded.sales_amount,
    order_count = excluded.order_count,
    order_items_count = excluded.order_items_count,
    real_sales_amount = excluded.real_sales_amount,
    real_order_count = excluded.real_order_count,
    fill_order_amount = excluded.fill_order_amount,
    fill_order_count = excluded.fill_order_count,
    fill_order_cost = excluded.fill_order_cost,
    product_cost = excluded.product_cost,
    shipping_fee = excluded.shipping_fee,
    service_fee = excluded.service_fee,
    tax_fee = excluded.tax_fee,
    freight_insurance = excluded.freight_insurance,
    return_count = excluded.return_count,
    return_cost = excluded.return_cost,
    exchange_count = excluded.exchange_count,
    exchange_cost = excluded.exchange_cost,
    promotion_alliance = excluded.promotion_alliance,
    promotion_auto = excluded.promotion_auto,
    promotion_jd_union = excluded.promotion_jd_union,
    promotion_search = excluded.promotion_search,
    promotion_recommend = excluded.promotion_recommend,
    final_profit = excluded.final_profit,
    updated_at = datetime('now','+8 hours')
`

func (d *DailyProfitDao) CopyYesterdayData(ctx context.Context, shopID int) error {
	_, err := d.db.ExecContext(ctx, copyYesterdaySQL, shopID)
	return err
}
