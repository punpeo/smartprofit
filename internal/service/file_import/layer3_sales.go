package file_import

import (
	"context"
	"database/sql"
	"log"
	"strconv"

	"github.com/shopspring/decimal"
)

// ImportSales 第三层-类型1：商品明细 → daily_sales_logs
func ImportSales(ctx context.Context, db *sql.DB, result *ParseResult, codeToID map[string]int64, skuToShopID map[int64]int64) (int, error) {
	// 聚合：按 (sku_id, record_date) 分组
	type key struct{ skuID int64; date string }
	aggr := make(map[key]*struct {
		sales    decimal.Decimal
		orders   int
		items    int
	})

	skipped := 0
	for _, row := range result.Rows {
		skuCode := row["SKU"]
		if skuCode == "" { skipped++; continue }
		skuID, ok := codeToID[skuCode]
		if !ok { skipped++; continue }

		date := NormalizeDate(row["时间"])
		if date == "" { skipped++; continue }

		sales, err := decimal.NewFromString(row["成交金额"])
		if err != nil { skipped++; continue }

		orders, _ := strconv.Atoi(row["成交单量"])
		items, _ := strconv.Atoi(row["成交商品件数"])

		k := key{skuID, date}
		if v, ok := aggr[k]; ok {
			v.sales = v.sales.Add(sales)
			v.orders += orders
			v.items += items
		} else {
			aggr[k] = &struct {
				sales  decimal.Decimal
				orders int
				items  int
			}{sales, orders, items}
		}
	}

	// 批量 upsert
	const sqlUpsert = `INSERT INTO daily_sales_logs (shop_id, sku_id, record_date, sales_amount, order_count, order_items_count)
		VALUES (?,?,?,?,?,?)
		ON CONFLICT(shop_id, sku_id, record_date) DO UPDATE SET
			sales_amount=excluded.sales_amount, order_count=excluded.order_count,
			order_items_count=excluded.order_items_count, operator_name=excluded.operator_name, updated_at=datetime('now','+8 hours')`

	count := 0
	for k, v := range aggr {
		salesF, _ := v.sales.Float64()
		shopID := skuToShopID[k.skuID]; if shopID == 0 { shopID = 1 }
			_, err := db.ExecContext(ctx, sqlUpsert, shopID, k.skuID, k.date, salesF, v.orders, v.items, "")
		if err != nil {
			log.Printf("[import-sales] upsert error sku=%d date=%s: %v", k.skuID, k.date, err)
			continue
		}
		count++
	}

	log.Printf("[import-sales] done: %d groups upserted, %d rows skipped", count, skipped)
	return count, nil
}

// BuildCodeToID 构建 SKU编码→ID 映射
func BuildCodeToID(ctx context.Context, db *sql.DB) (map[string]int64, error) {
	rows, err := db.QueryContext(ctx, `SELECT sku_code, sku_id FROM skus`)
	if err != nil { return nil, err }
	defer rows.Close()
	m := make(map[string]int64)
	for rows.Next() {
		var code string; var id int64
		if err := rows.Scan(&code, &id); err != nil { continue }
		m[code] = id
	}
	return m, nil
}

// BuildShopNameToID 构建 店铺名称→ID 映射
func BuildShopNameToID(ctx context.Context, db *sql.DB) (map[string]int64, error) {
	rows, err := db.QueryContext(ctx, `SELECT shop_name, shop_id FROM shops`)
	if err != nil { return nil, err }
	defer rows.Close()
	m := make(map[string]int64)
	for rows.Next() {
		var name string; var id int64
		if err := rows.Scan(&name, &id); err != nil { continue }
		m[name] = id
	}
	return m, nil
}

