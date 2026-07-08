package file_import

import (
	"context"
	"database/sql"
	"log"
	"strings"
)

// ImportAftersale 第三层-类型2：售后明细 → daily_aftersale_logs
func ImportAftersale(ctx context.Context, db *sql.DB, result *ParseResult, codeToID map[string]int64, skuToShopID map[int64]int64) (int, error) {
	// 聚合：按 (shop_id, sku_id, record_date)
	type key struct{ shopID, skuID int64; date string }
	type agg struct {
		returnTotal, returnValid, returnCancel     int
		exchangeTotal, exchangeValid, exchangeCancel int
		aftersaleTotal, aftersaleCancel              int
	}
	aggr := make(map[key]*agg)

	skipped := 0
	for _, row := range result.Rows {
		skuCode := row["商品编号"]
		if skuCode == "" { skuCode = row["SKU"] }
		if skuCode == "" { skipped++; continue }

		skuID, ok := codeToID[skuCode]
		if !ok { skipped++; continue }

		date := NormalizeDate(row["售后申请时间"])
		if date == "" { date = NormalizeDate(row["时间"]) }
		if date == "" { skipped++; continue }

		expect := strings.TrimSpace(row["客户期望"])
		status := strings.TrimSpace(row["服务单状态"])
		isCancel := strings.Contains(status, "取消")

		k := key{skuToShopID[skuID], skuID, date}
		a := aggr[k]
		if a == nil { a = &agg{}; aggr[k] = a }

		a.aftersaleTotal++
		if isCancel {
			a.aftersaleCancel++
		}

		// 归类退货/换货
		if ReturnExpects[expect] {
			a.returnTotal++
			if isCancel { a.returnCancel++ } else { a.returnValid++ }
		} else if ExchangeExpects[expect] {
			a.exchangeTotal++
			if isCancel { a.exchangeCancel++ } else { a.exchangeValid++ }
		}
	}

	const sqlUpsert = `INSERT INTO daily_aftersale_logs (shop_id, sku_id, record_date,
		return_total, return_valid, return_cancel,
		exchange_total, exchange_valid, exchange_cancel,
		aftersale_total, aftersale_cancel)
		VALUES (?,?,?,?,?,?,?,?,?,?,?)
		ON CONFLICT(shop_id, sku_id, record_date) DO UPDATE SET
			return_total=excluded.return_total, return_valid=excluded.return_valid, return_cancel=excluded.return_cancel,
			exchange_total=excluded.exchange_total, exchange_valid=excluded.exchange_valid, exchange_cancel=excluded.exchange_cancel,
			aftersale_total=excluded.aftersale_total, aftersale_cancel=excluded.aftersale_cancel,
			updated_at=datetime('now','+8 hours')`

	count := 0
	for k, v := range aggr {
		_, err := db.ExecContext(ctx, sqlUpsert,
			k.shopID, k.skuID, k.date,
			v.returnTotal, v.returnValid, v.returnCancel,
			v.exchangeTotal, v.exchangeValid, v.exchangeCancel,
			v.aftersaleTotal, v.aftersaleCancel,
		)
		if err != nil {
			log.Printf("[import-aftersale] upsert error sku=%d date=%s: %v", k.skuID, k.date, err)
			continue
		}
		count++
	}

	log.Printf("[import-aftersale] done: %d groups upserted, %d rows skipped", count, skipped)
	return count, nil
}

