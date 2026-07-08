package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"smartprofit/internal/dao"
	"smartprofit/internal/model"
	fileimport "smartprofit/internal/service/file_import"
)

type Handler struct {
	ShopDao        *dao.ShopDao
	SkuDao         *dao.SkuDao
	DailyProfitDao *dao.DailyProfitDao
	ProductDao     *dao.ProductDao
	AftersaleDao   *dao.AftersaleDao
	DB             *sql.DB
}

func writeJSON(w http.ResponseWriter, s int, v interface{}) { w.Header().Set("Content-Type","application/json; charset=utf-8"); w.WriteHeader(s); json.NewEncoder(w).Encode(v) }
func writeError(w http.ResponseWriter, s int, m string)      { writeJSON(w, s, map[string]string{"error":m}) }
func pathInt(r *http.Request, n string) (int, error)         { return strconv.Atoi(r.PathValue(n)) }
func today() string                                          { return time.Now().Format("2006-01-02") }

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]string{"status":"ok"}) }

func (h *Handler) DashboardKPIs(w http.ResponseWriter, r *http.Request) {
	st := r.URL.Query().Get("start"); if st == "" { st = today() }
	ed := r.URL.Query().Get("end"); if ed == "" { ed = today() }
	shops, _ := h.ShopDao.GetAll(r.Context(), st, ed)
	var tp, ts, tpr float64
	for _, s := range shops { tp += s.TotalProfit }
	rows, _ := h.DailyProfitDao.QueryAll(r.Context(), st, ed)
	for _, r2 := range rows { ts += r2.RealSalesAmount; tpr += r2.PromotionTotal }
	avg := 0.0; if ts > 0 { avg = tp / ts * 100 }
	writeJSON(w, 200, map[string]float64{"total_profit":tp,"total_sales":ts,"total_promo":tpr,"avg_profit_rate":avg})
}

func (h *Handler) ListShops(w http.ResponseWriter, r *http.Request) {
	st := r.URL.Query().Get("start"); if st == "" { st = today() }
	ed := r.URL.Query().Get("end"); if ed == "" { ed = today() }
	shops, _ := h.ShopDao.GetAll(r.Context(), st, ed)
	if shops == nil { shops = []*model.ShopSummary{} }
	writeJSON(w, 200, shops)
}
func (h *Handler) ShopSummary(w http.ResponseWriter, r *http.Request) {
	id, _ := pathInt(r,"id")
	st := r.URL.Query().Get("start"); if st == "" { st = today() }
	ed := r.URL.Query().Get("end"); if ed == "" { ed = today() }
	s, _ := h.DailyProfitDao.GetShopSummary(r.Context(), id, st, ed)
	if s == nil { s = &dao.ShopSummary{} }
	writeJSON(w, 200, map[string]interface{}{
		"total_sales":          s.TotalSales,
		"total_orders":         s.TotalOrders,
		"total_real_sales":     s.TotalRealSales,
		"total_real_orders":    s.TotalRealOrders,
		"total_order_items":    s.TotalOrderItems,
		"total_fill_count":     s.TotalFillCount,
		"total_fill_amount":    s.TotalFillAmount,
		"total_promo":          s.TotalPromo,
		"total_aftersale_cost": s.TotalAftersaleCost,
		"net_profit":           s.NetProfit,
	})
}

// Shop CRUD
func (h *Handler) CreateShop(w http.ResponseWriter, r *http.Request) {
	var b struct {
		ShopName string `json:"shop_name"`
		Platform string `json:"platform"`
		Owner    string `json:"owner"`
	}
	if json.NewDecoder(r.Body).Decode(&b) != nil || b.ShopName == "" { writeError(w,400,"invalid"); return }
	id, _ := h.ShopDao.Create(r.Context(), b.ShopName, b.Platform, b.Owner)
	writeJSON(w, 200, map[string]interface{}{"shop_id":id})
}
func (h *Handler) UpdateShop(w http.ResponseWriter, r *http.Request) {
	id, _ := pathInt(r,"id"); s, err := h.ShopDao.GetByID(r.Context(), int64(id))
	if err != nil { writeError(w,404,"not found"); return }
	var b map[string]string; json.NewDecoder(r.Body).Decode(&b)
	if v,ok:=b["shop_name"];ok{s.ShopName=v}
	if v,ok:=b["platform"];ok{s.Platform=v}
	if v,ok:=b["owner"];ok{s.Owner=v}
	h.ShopDao.Update(r.Context(), s)
	writeJSON(w,200,map[string]string{"message":"ok"})
}
func (h *Handler) DeleteShop(w http.ResponseWriter, r *http.Request) {
	id, _ := pathInt(r,"id"); h.ShopDao.Delete(r.Context(), int64(id))
	writeJSON(w,200,map[string]string{"message":"ok"})
}
func (h *Handler) ClearAll(w http.ResponseWriter, r *http.Request) {
	h.ShopDao.ClearAll(r.Context())
	writeJSON(w,200,map[string]string{"message":"ok"})
}

// Products
func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	ps, _ := h.ProductDao.GetAll(r.Context()); if ps == nil { ps = []*model.Product{} }
	writeJSON(w, 200, ps)
}
func (h *Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var p model.Product
	if json.NewDecoder(r.Body).Decode(&p) != nil || p.ProductName == "" { writeError(w,400,"invalid"); return }
	id, _ := h.ProductDao.Create(r.Context(), &p)
	writeJSON(w, 200, map[string]interface{}{"product_id":id})
}
func (h *Handler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	id, _ := pathInt(r,"id"); var p model.Product
	if json.NewDecoder(r.Body).Decode(&p) != nil { writeError(w,400,"invalid"); return }
	p.ProductID = int64(id); h.ProductDao.Update(r.Context(), &p)
	writeJSON(w,200,map[string]string{"message":"ok"})
}
func (h *Handler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	id, _ := pathInt(r,"id"); h.ProductDao.Delete(r.Context(), int64(id))
	writeJSON(w,200,map[string]string{"message":"ok"})
}

// SKU
func (h *Handler) ListSKUs(w http.ResponseWriter, r *http.Request) {
	id, _ := pathInt(r,"id"); p,_ := strconv.Atoi(r.URL.Query().Get("page"))
	if p<1 {p=1}; ps,_ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if ps<1||ps>100{ps=10}
	st := r.URL.Query().Get("start"); if st==""{st=today()}
	ed := r.URL.Query().Get("end"); if ed==""{ed=today()}
	items, _ := h.DailyProfitDao.ListByShopAndDate(r.Context(), id, st, ed, (p-1)*ps, ps)
	if items == nil { items = []*model.SKUDailyItem{} }
	writeJSON(w, 200, map[string]interface{}{"items":items,"page":p,"page_size":ps})
}
func (h *Handler) ListSKUBase(w http.ResponseWriter, r *http.Request) {
	skus, _ := h.SkuDao.GetAll(r.Context())
	if skus == nil { skus = []*model.SKU{} }
	writeJSON(w, 200, map[string]interface{}{"items":skus})
}
func (h *Handler) CreateSKU(w http.ResponseWriter, r *http.Request) {
	var b struct {
		ShopID    int64  `json:"shop_id"`
		ProductID int64  `json:"product_id"`
		SkuCode   string `json:"sku_code"`
	}
	if json.NewDecoder(r.Body).Decode(&b) != nil || b.SkuCode == "" || b.ProductID == 0 { writeError(w,400,"invalid"); return }
	id, _ := h.SkuDao.Create(r.Context(), &model.SKU{ShopID:b.ShopID,ProductID:b.ProductID,SkuCode:b.SkuCode})
	writeJSON(w, 200, map[string]interface{}{"sku_id":id})
}
func (h *Handler) UpdateSKU(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code"); var b struct {
		ShopID    int64 `json:"shop_id"`
		ProductID int64 `json:"product_id"`
	}
	if json.NewDecoder(r.Body).Decode(&b) != nil { writeError(w,400,"invalid"); return }
	h.SkuDao.Update(r.Context(), code, b.ShopID, b.ProductID)
	writeJSON(w,200,map[string]string{"message":"ok"})
}
func (h *Handler) DeleteSKU(w http.ResponseWriter, r *http.Request) {
	h.SkuDao.Delete(r.Context(), r.PathValue("code"))
	writeJSON(w,200,map[string]string{"message":"ok"})
}
// GetSKUDaily 获取指定 SKU 某日的利润记录
func (h *Handler) GetSKUDaily(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	date := r.URL.Query().Get("date")
	if date == "" { date = today() }
	log, err := h.DailyProfitDao.GetBySKUAndDate(r.Context(), code, date)
	if err != nil { writeJSON(w, 200, nil); return }
	writeJSON(w, 200, log)
}

func (h *Handler) SaveSKU(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code"); sku, err := h.SkuDao.GetByCode(r.Context(), code)
	if err != nil { writeError(w,404,"not found"); return }
	var b model.DailyProfitLog
	if json.NewDecoder(r.Body).Decode(&b) != nil { writeError(w,400,"invalid"); return }
	b.SkuID = sku.SkuID; if b.RecordDate == "" { b.RecordDate = today() }

	// 从 product 表获取默认成本参数，自动计算成本字段
	if sku.ProductID > 0 {
		products, _ := h.ProductDao.GetAll(r.Context())
		for _, p := range products {
			if p.ProductID == sku.ProductID {
				// 仅在前端未传值（为0）时自动计算，保留手动填入的值
				if b.ProductCost == 0 { b.ProductCost = float64(b.OrderItemsCount) * p.DefaultCost }
				if b.ShippingFee == 0 { b.ShippingFee = float64(b.OrderCount) * p.DefaultShippingCost }
				if b.ServiceFee == 0 { b.ServiceFee = b.SalesAmount * p.DefaultServiceFeeRate }
				if b.TaxFee == 0 { b.TaxFee = b.SalesAmount * p.DefaultTaxRate }
				if b.FreightInsurance == 0 { b.FreightInsurance = float64(b.OrderCount) * p.DefaultFreightInsurance }
				if b.ExchangeCost == 0 { b.ExchangeCost = float64(b.ExchangeCount) * p.DefaultExchangeCost }
				// 退货成本 = 销售额/订单量*退货量 - 商品默认成本*退货量 - 销售额/订单量*退货量*平台扣点费率
			if b.ReturnCost == 0 && b.OrderCount > 0 {
				unitPrice := b.SalesAmount / float64(b.OrderCount)
				b.ReturnCost = float64(b.ReturnCount) * (unitPrice - p.DefaultCost - unitPrice*p.PlatformCommissionRate)
			}
				if b.FillOrderCost == 0 { b.FillOrderCost = float64(b.FillOrderCount) * p.DefaultFillOrderCost }
				break
			}
		}
	}

	// 推广费合计自动计算
	// 从售后汇总表同步退货量/换货量（如 profit_logs 未传值）
	if b.ReturnCount == 0 {
		if rv, _, err := h.AftersaleDao.GetValidCounts(r.Context(), sku.SkuID, b.RecordDate); err == nil { b.ReturnCount = rv }
	}
	if b.ExchangeCount == 0 {
		if _, ev, err := h.AftersaleDao.GetValidCounts(r.Context(), sku.SkuID, b.RecordDate); err == nil { b.ExchangeCount = ev }
	}

	b.PromotionTotal = b.PromotionAlliance + b.PromotionAuto + b.PromotionJDUnion + b.PromotionSearch + b.PromotionRecommend

	// 最终利润自动计算
	c := b.ProductCost + b.ShippingFee + b.ServiceFee + b.TaxFee + b.FreightInsurance + b.ReturnCost + b.ExchangeCost + b.FillOrderCost
	b.FinalProfit = b.RealSalesAmount - c - b.PromotionTotal + b.FillOrderAmount

	h.DailyProfitDao.Save(r.Context(), &b)
	writeJSON(w,200,map[string]interface{}{"ok":true,"profit":b.FinalProfit})
}
// ── Source Table Handlers（写入后触发器自动同步到 daily_profit_logs）──

func (h *Handler) UpsertSales(w http.ResponseWriter, r *http.Request) {
	var log model.DailySalesLog
	if json.NewDecoder(r.Body).Decode(&log) != nil { writeError(w, 400, "invalid JSON"); return }
	if log.SkuID == 0 || log.RecordDate == "" { writeError(w, 400, "sku_id and record_date required"); return }
	_, err := h.DB.ExecContext(r.Context(),
		`INSERT INTO daily_sales_logs (shop_id, sku_id, record_date, sales_amount, order_count, order_items_count) VALUES (?,?,?,ROUND(?,2),?,?)
		ON CONFLICT(shop_id, sku_id, record_date) DO UPDATE SET sales_amount=ROUND(excluded.sales_amount,2), order_count=excluded.order_count, order_items_count=excluded.order_items_count, updated_at=datetime('now','+8 hours')`,
		log.ShopID, log.SkuID, log.RecordDate, log.SalesAmount, log.OrderCount, log.OrderItemsCount)
	if err != nil { writeError(w, 500, err.Error()); return }
	writeJSON(w, 200, map[string]string{"message": "ok"})
}

func (h *Handler) UpsertFillOrder(w http.ResponseWriter, r *http.Request) {
	var log model.DailyFillOrderLog
	if json.NewDecoder(r.Body).Decode(&log) != nil { writeError(w, 400, "invalid JSON"); return }
	if log.SkuID == 0 || log.RecordDate == "" { writeError(w, 400, "sku_id and record_date required"); return }

	// FillOrderCost 自动 = FillOrderCount × product.default_fill_order_cost（SQL 子查询）
	_, err := h.DB.ExecContext(r.Context(),
		`INSERT INTO daily_fill_order_logs (shop_id, sku_id, record_date, fill_order_count, fill_order_amount, fill_order_cost)
		VALUES (?1,?2,?3,?4,ROUND(?5,2),
			ROUND(?4,2) * COALESCE((SELECT p.default_fill_order_cost FROM products p JOIN skus s ON s.product_id=p.product_id WHERE s.sku_id=?2),0))
		ON CONFLICT(shop_id, sku_id, record_date) DO UPDATE SET
			fill_order_count=excluded.fill_order_count,
			fill_order_amount=ROUND(excluded.fill_order_amount,2),
			fill_order_cost=ROUND(excluded.fill_order_count,2) * COALESCE((SELECT p.default_fill_order_cost FROM products p JOIN skus s ON s.product_id=p.product_id WHERE s.sku_id=?2),0),
			updated_at=datetime('now','+8 hours')`,
		log.ShopID, log.SkuID, log.RecordDate, log.FillOrderCount, log.FillOrderAmount)
	if err != nil { writeError(w, 500, err.Error()); return }
	writeJSON(w, 200, map[string]string{"message": "ok"})
}

func (h *Handler) UpsertPromotion(w http.ResponseWriter, r *http.Request) {
	var log model.DailyPromotionLog
	if json.NewDecoder(r.Body).Decode(&log) != nil { writeError(w, 400, "invalid JSON"); return }
	if log.SkuID == 0 || log.RecordDate == "" { writeError(w, 400, "sku_id and record_date required"); return }
	_, err := h.DB.ExecContext(r.Context(),
		`INSERT INTO daily_promotion_logs (shop_id, sku_id, record_date, promotion_alliance, promotion_auto, promotion_jd_union, promotion_search, promotion_recommend, promotion_total) VALUES (?,?,?,ROUND(?,2),ROUND(?,2),ROUND(?,2),ROUND(?,2),ROUND(?,2),ROUND(?,2))
		ON CONFLICT(shop_id, sku_id, record_date) DO UPDATE SET promotion_alliance=ROUND(excluded.promotion_alliance,2), promotion_auto=ROUND(excluded.promotion_auto,2), promotion_jd_union=ROUND(excluded.promotion_jd_union,2), promotion_search=ROUND(excluded.promotion_search,2), promotion_recommend=ROUND(excluded.promotion_recommend,2), promotion_total=ROUND(excluded.promotion_total,2), updated_at=datetime('now','+8 hours')`,
		log.ShopID, log.SkuID, log.RecordDate, log.PromotionAlliance, log.PromotionAuto, log.PromotionJDUnion, log.PromotionSearch, log.PromotionRecommend, log.PromotionTotal)
	if err != nil { writeError(w, 500, err.Error()); return }
	writeJSON(w, 200, map[string]string{"message": "ok"})
}

func (h *Handler) UpsertAftersale(w http.ResponseWriter, r *http.Request) {
	var log model.DailyAftersaleLog
	if json.NewDecoder(r.Body).Decode(&log) != nil { writeError(w, 400, "invalid JSON"); return }
	if log.SkuID == 0 || log.RecordDate == "" { writeError(w, 400, "sku_id and record_date required"); return }
	if err := h.AftersaleDao.Upsert(r.Context(), &log); err != nil { writeError(w, 500, err.Error()); return }
	writeJSON(w, 200, map[string]string{"message": "ok"})
}

func (h *Handler) GetAftersale(w http.ResponseWriter, r *http.Request) {
	skuID, _ := pathInt(r, "sku_id")
	date := r.URL.Query().Get("date")
	if date == "" { date = today() }
	rv, ev, _ := h.AftersaleDao.GetValidCounts(r.Context(), int64(skuID), date)
	writeJSON(w, 200, map[string]int{"return_valid": rv, "exchange_valid": ev})
}

// HandleBatchImport 批量文件导入接口
func (h *Handler) HandleBatchImport(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(50 << 20); err != nil {
		writeError(w, 400, "parse form: "+err.Error()); return
	}
	files := r.MultipartForm.File["files"]
	if len(files) == 0 { writeError(w, 400, "no files"); return }

	// 保存临时文件（使用序号命名避免中文乱码）
	type fileInfo struct{ path, origName string }
	var infos []fileInfo
	for i, fh := range files {
		src, err := fh.Open()
		if err != nil { continue }
		ext := filepath.Ext(fh.Filename)
		dst := filepath.Join(os.TempDir(), fmt.Sprintf("import_%d%s", i, ext))
		out, err := os.Create(dst)
		if err != nil { src.Close(); continue }
		io.Copy(out, src)
		src.Close(); out.Close()
		infos = append(infos, fileInfo{dst, fh.Filename})
	}

	ctx := r.Context()
	codeToID, _ := fileimport.BuildCodeToID(ctx, h.DB)
	shopCodeToID, _ := fileimport.BuildShopNameToID(ctx, h.DB)

	var shopID int64
	for _, id := range shopCodeToID { shopID = id; break }

	results := make(map[string]int)
	for _, info := range infos {
		parsed, err := fileimport.ParseSheet(info.path)
		if err != nil { log.Printf("[import] parse %s: %v", info.origName, err); continue }

		// 基于解析后的表头识别类型（不受文件名乱码影响）
		ft := fileimport.IdentifyByHeaders(parsed.Headers)
		if ft == fileimport.TypeUnknown {
			ft = fileimport.IdentifyFile(info.origName) // 回退文件名识别
		}
		log.Printf("[import] file=%s type=%s (by headers)", info.origName, ft)

		switch ft {
		case fileimport.TypeSales:
			n, _ := fileimport.ImportSales(ctx, h.DB, parsed, codeToID, shopID)
			results["sales"] += n
		case fileimport.TypeAftersale:
			n, _ := fileimport.ImportAftersale(ctx, h.DB, parsed, codeToID, shopID)
			results["aftersale"] += n
		case fileimport.TypePromotion:
			p, f := fileimport.ImportPromotion(ctx, h.DB, parsed, codeToID, shopCodeToID)
			results["promotion"] += p
			results["fill_order"] += f
		case fileimport.TypeProduct:
			n, _ := fileimport.ImportProducts(ctx, h.DB, parsed)
			results["product"] += n
		}
		os.Remove(info.path)
	}

	writeJSON(w, 200, map[string]interface{}{"message": "import completed", "results": results})
}

// ClearProducts 仅清空 products 表数据，保留表结构和索引（同时重置自增ID）
func (h *Handler) ClearProducts(w http.ResponseWriter, r *http.Request) {
	h.DB.ExecContext(r.Context(), "DELETE FROM products")
	h.DB.ExecContext(r.Context(), "DELETE FROM sqlite_sequence WHERE name='products'")
	writeJSON(w, 200, map[string]string{"message": "products cleared"})
}

// ClearBusinessData 仅清空业务统计表，保留 shops/products/skus 基础数据
func (h *Handler) ClearBusinessData(w http.ResponseWriter, r *http.Request) {
	for _, t := range []string{"daily_sales_logs","daily_fill_order_logs","daily_promotion_logs","daily_aftersale_logs","daily_profit_logs"} {
		h.DB.ExecContext(r.Context(), "DELETE FROM "+t)
	}
	writeJSON(w, 200, map[string]string{"message": "business data cleared, base tables preserved"})
}

func (h *Handler) CopyYesterday(w http.ResponseWriter, r *http.Request) {
	id, _ := pathInt(r,"id"); h.DailyProfitDao.CopyYesterdayData(r.Context(), id)
	writeJSON(w,200,map[string]string{"message":"ok"})
}
