package file_import

import (
	"context"
	"database/sql"
	"log"
	"strconv"
	"strings"

	"github.com/shopspring/decimal"
)

// ImportPromotion 第三层-类型3：推广费+补单 → daily_promotion_logs + daily_fill_order_logs
func ImportPromotion(ctx context.Context, db *sql.DB, result *ParseResult, codeToID map[string]int64, shopCodeToID map[string]int64) (promoCount, fillCount int) {
	type key struct{ shopID, skuID int64; date string }

	// 推广聚合
	type promoAgg struct {
		alliance, auto, jd, search, recommend decimal.Decimal
	}
	promoMap := make(map[key]*promoAgg)

	// 补单聚合
	type fillAgg struct {
		count int
		amt   decimal.Decimal
	}
	fillMap := make(map[key]*fillAgg)

	for _, row := range result.Rows {
		skuCode := row["SKU"]
		if skuCode == "" { continue }
		skuID, ok := codeToID[skuCode]
		if !ok { continue }

		shopName := row["店铺"]
		shopID := shopCodeToID[shopName]
		if shopID == 0 {
			if id, ok := shopCodeToID[shopName]; ok { shopID = id }
		}

		date := NormalizeDate(row["时间"])
		if date == "" { continue }

		k := key{shopID, skuID, date}

		// 推广字段（空单元格默认 0）
		safeDec := func(s string) decimal.Decimal {
			s = strings.TrimSpace(s)
			if s == "" { return decimal.Zero }
			d, _ := decimal.NewFromString(s)
			return d
		}
		alliance := safeDec(row["全站营销"])
		auto := safeDec(row["智能投放"])
		jd := safeDec(row["京东联盟"])
		search := safeDec(row["搜索快车"])
		recommend := safeDec(row["推荐广告"])

		hasPromo := !alliance.IsZero() || !auto.IsZero() || !jd.IsZero() || !search.IsZero() || !recommend.IsZero()
		if hasPromo {
			if v, ok := promoMap[k]; ok {
				v.alliance = v.alliance.Add(alliance)
				v.auto = v.auto.Add(auto)
				v.jd = v.jd.Add(jd)
				v.search = v.search.Add(search)
				v.recommend = v.recommend.Add(recommend)
			} else {
				promoMap[k] = &promoAgg{alliance, auto, jd, search, recommend}
			}
		}

		// 补单字段
		fillCnt, _ := strconv.Atoi(row["补单数量"])
		fillAmt, _ := decimal.NewFromString(row["补单金额"])
		if fillCnt > 0 || !fillAmt.IsZero() {
			if v, ok := fillMap[k]; ok {
				v.count += fillCnt
				v.amt = v.amt.Add(fillAmt)
			} else {
				fillMap[k] = &fillAgg{fillCnt, fillAmt}
			}
		}
	}

	// 写入 daily_promotion_logs
	const sqlPromo = `INSERT INTO daily_promotion_logs (shop_id, sku_id, record_date,
		promotion_alliance, promotion_auto, promotion_jd_union, promotion_search, promotion_recommend, promotion_total)
		VALUES (?,?,?,?,?,?,?,?,?)
		ON CONFLICT(shop_id, sku_id, record_date) DO UPDATE SET
			promotion_alliance=excluded.promotion_alliance, promotion_auto=excluded.promotion_auto,
			promotion_jd_union=excluded.promotion_jd_union, promotion_search=excluded.promotion_search,
			promotion_recommend=excluded.promotion_recommend, promotion_total=excluded.promotion_total,
			updated_at=datetime('now','+8 hours')`

	for k, v := range promoMap {
		a, _ := v.alliance.Float64(); au, _ := v.auto.Float64()
		j, _ := v.jd.Float64(); s, _ := v.search.Float64(); r, _ := v.recommend.Float64()
		total := a + au + j + s + r
		if _, err := db.ExecContext(ctx, sqlPromo, k.shopID, k.skuID, k.date, a, au, j, s, r, total); err != nil {
			log.Printf("[import-promo] upsert error: %v", err)
		} else { promoCount++ }
	}

	// 写入 daily_fill_order_logs（FillOrderCost = FillOrderCount × product.default_fill_order_cost）
	const sqlFill = `INSERT INTO daily_fill_order_logs (shop_id, sku_id, record_date, fill_order_count, fill_order_amount, fill_order_cost)
		VALUES (?,?,?,?,?, ROUND(?,2) * COALESCE((SELECT p.default_fill_order_cost FROM products p JOIN skus s ON s.product_id=p.product_id WHERE s.sku_id=?),0))
		ON CONFLICT(shop_id, sku_id, record_date) DO UPDATE SET
			fill_order_count=excluded.fill_order_count,
			fill_order_amount=excluded.fill_order_amount,
			fill_order_cost=ROUND(excluded.fill_order_count,2) * COALESCE((SELECT p.default_fill_order_cost FROM products p JOIN skus s ON s.product_id=p.product_id WHERE s.sku_id=?),0),
			updated_at=datetime('now','+8 hours')`

	for k, v := range fillMap {
		amtF, _ := v.amt.Float64()
		if _, err := db.ExecContext(ctx, sqlFill, k.shopID, k.skuID, k.date, v.count, amtF, v.count, k.skuID, v.count, k.skuID); err != nil {
			log.Printf("[import-fill] upsert error: %v", err)
		} else { fillCount++ }
	}

	log.Printf("[import-promo] done: %d promo groups, %d fill groups", promoCount, fillCount)
	return
}
