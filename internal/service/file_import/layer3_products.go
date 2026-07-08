package file_import

import (
	"context"
	"database/sql"
	"log"
	"strconv"
	"strings"
)

// importProductMapping 构建商品导入用的表头→标准字段映射
// 支持模糊匹配：去掉表头中的括号内容后匹配（如 "默认成本(元)" → "默认成本"）
func matchProductField(header string) string {
	// 去掉括号及内容
	clean := header
	for {
		start := strings.Index(clean, "(")
		if start < 0 { break }
		end := strings.Index(clean[start:], ")")
		if end < 0 { break }
		clean = clean[:start] + clean[start+end+1:]
	}
	clean = strings.TrimSpace(clean)
	if v, ok := ProductMapping[clean]; ok { return v }
	return ""
}

// ImportProducts 第三层-类型4：商品主数据 → products
func ImportProducts(ctx context.Context, db *sql.DB, result *ParseResult) (int, error) {
	// 构建表头→列索引映射
	colMap := make(map[int]string) // colIndex → dbField
	for i, h := range result.Headers {
		if field := matchProductField(h); field != "" {
			colMap[i] = field
		}
	}

	if len(colMap) == 0 {
		log.Printf("[import-product] no product headers matched in file %s", result.FileName)
		return 0, nil
	}

	const sqlUpsert = `INSERT INTO products (product_name, category, default_cost, default_shipping_cost,
		default_service_fee_rate, default_tax_rate, platform_commission_rate,
		default_freight_insurance, default_exchange_cost, default_return_cost, default_fill_order_cost)
		VALUES (?,?,?,?,?,?,?,?,?,?,?)
		ON CONFLICT(product_name) DO UPDATE SET
			category=excluded.category,
			default_cost=excluded.default_cost,
			default_shipping_cost=excluded.default_shipping_cost,
			default_service_fee_rate=excluded.default_service_fee_rate,
			default_tax_rate=excluded.default_tax_rate,
			platform_commission_rate=excluded.platform_commission_rate,
			default_freight_insurance=excluded.default_freight_insurance,
			default_exchange_cost=excluded.default_exchange_cost,
			default_return_cost=excluded.default_return_cost,
			default_fill_order_cost=excluded.default_fill_order_cost`

	parseFloat := func(s string) float64 {
		s = strings.TrimSpace(s)
		if s == "" { return 0 }
		v, _ := strconv.ParseFloat(s, 64)
		return v
	}

	count := 0
	for _, row := range result.Rows {
		var p struct {
			name, category                                                         string
			cost, shipping, serviceRate, taxRate, commission, insurance, exchange, returnCost, fillCost float64
		}

		for colIdx, field := range colMap {
			val := ""
			if colIdx < len(result.Headers) {
				val = strings.TrimSpace(row[result.Headers[colIdx]])
			}
			switch field {
			case "product_name":              p.name = val
			case "category":                  p.category = val
			case "default_cost":              p.cost = parseFloat(val)
			case "default_shipping_cost":     p.shipping = parseFloat(val)
			case "default_service_fee_rate":  p.serviceRate = parseFloat(val)
			case "default_tax_rate":          p.taxRate = parseFloat(val)
			case "platform_commission_rate":  p.commission = parseFloat(val)
			case "default_freight_insurance": p.insurance = parseFloat(val)
			case "default_exchange_cost":     p.exchange = parseFloat(val)
			case "default_return_cost":       p.returnCost = parseFloat(val)
			case "default_fill_order_cost":   p.fillCost = parseFloat(val)
			}
		}

		if p.name == "" { continue }

		if _, err := db.ExecContext(ctx, sqlUpsert,
			p.name, p.category, p.cost, p.shipping,
			p.serviceRate, p.taxRate, p.commission,
			p.insurance, p.exchange, p.returnCost, p.fillCost,
		); err != nil {
			log.Printf("[import-product] upsert error name=%s: %v", p.name, err)
			continue
		}
		count++
	}

	log.Printf("[import-product] done: %d products upserted", count)
	return count, nil
}
