package file_import

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// ═══════════════════════════════════════════
// 字段映射表 — 中文表头 → 数据表字段
// ═══════════════════════════════════════════

// SalesMapping 商品明细 → daily_sales_logs
var SalesMapping = map[string]string{
	"时间":     "record_date",
	"SKU":     "sku_code",
	"成交金额":   "sales_amount",
	"成交商品件数": "order_items_count",
	"成交单量":   "order_count",
}

// AftersaleExpect 客户期望 → 业务归类
var ReturnExpects = map[string]bool{
	"退货":    true,
	"未收货退款": true,
	"已收货退款": true,
	"退款":    true,
}
var ExchangeExpects = map[string]bool{
	"换货":   true,
	"维修":   true,
	"补发新品": true,
	"换货/维修": true,
}

// PromotionMapping 推广费 → daily_promotion_logs
var PromotionMapping = map[string]string{
	"时间":   "record_date",
	"店铺":   "shop_code",
	"SKU":   "sku_code",
	"搜索快车": "promotion_search",
	"全站营销": "promotion_alliance",
	"京东联盟": "promotion_jd_union",
	"智能投放": "promotion_auto",
	"推荐广告": "promotion_recommend",
}

// ProductMapping 商品主数据 → products
var ProductMapping = map[string]string{
	"商品名称":   "product_name",
	"分类":     "category",
	"默认成本":   "default_cost",
	"默认运费":   "default_shipping_cost",
	"服务费率":   "default_service_fee_rate",
	"税费率":    "default_tax_rate",
	"平台扣点费率": "platform_commission_rate",
	"运费险":    "default_freight_insurance",
	"换货成本":   "default_exchange_cost",
	"退货成本":   "default_return_cost",
	"补单成本":   "default_fill_order_cost",
}

// FillOrderMapping 补单字段 → daily_fill_order_logs
var FillOrderMapping = map[string]string{
	"补单数量": "fill_order_count",
	"补单金额": "fill_order_amount",
}

// NormalizeDate 标准化日期为 YYYY-MM-DD
func NormalizeDate(val string) string {
	if val == "" { return "" }
	// Excel 序列号：46206 → 2026-07-03
	if n, err := strconv.Atoi(val); err == nil && n > 40000 && n < 60000 {
		t := time.Date(1899, 12, 30, 0, 0, 0, 0, time.UTC).AddDate(0, 0, n)
		return t.Format("2006-01-02")
	}
	// 中文日期：7月3日
	if strings.Contains(val, "月") && strings.Contains(val, "日") {
		return parseChineseDate(val)
	}
	// 标准格式：2026-07-03、2026-07-03~2026-07-03
	if len(val) >= 10 { return val[:10] }
	return val
}

func parseChineseDate(val string) string {
	val = strings.TrimSuffix(val, "日")
	parts := strings.Split(val, "月")
	if len(parts) != 2 { return val }
	month, _ := strconv.Atoi(parts[0])
	day, _ := strconv.Atoi(parts[1])
	return fmt.Sprintf("%04d-%02d-%02d", time.Now().Year(), month, day)
}

// BuildSKUToShopID 构建 SKU ID→店铺 ID 映射
func BuildSKUToShopID(ctx context.Context, db *sql.DB) (map[int64]int64, error) {
	rows, err := db.QueryContext(ctx, `SELECT sku_id, shop_id FROM skus`)
	if err != nil { return nil, err }
	defer rows.Close()
	m := make(map[int64]int64)
	for rows.Next() {
		var skuID, shopID int64
		if err := rows.Scan(&skuID, &shopID); err != nil { continue }
		m[skuID] = shopID
	}
	return m, nil
}
