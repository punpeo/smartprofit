package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"smartprofit/internal/dao"
	"smartprofit/internal/model"
)

type Handler struct {
	ShopDao        *dao.ShopDao
	SkuDao         *dao.SkuDao
	DailyProfitDao *dao.DailyProfitDao
	ProductDao     *dao.ProductDao
}

func writeJSON(w http.ResponseWriter, s int, v interface{}) { w.Header().Set("Content-Type","application/json; charset=utf-8"); w.WriteHeader(s); json.NewEncoder(w).Encode(v) }
func writeError(w http.ResponseWriter, s int, m string)      { writeJSON(w, s, map[string]string{"error":m}) }
func pathInt(r *http.Request, n string) (int, error)         { return strconv.Atoi(r.PathValue(n)) }
func today() string                                          { return time.Now().Format("2006-01-02") }

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]string{"status":"ok"}) }

func (h *Handler) DashboardKPIs(w http.ResponseWriter, r *http.Request) {
	shops, _ := h.ShopDao.GetAll(r.Context())
	var tp, ts, tpr float64
	for _, s := range shops { tp += s.TotalProfit }
	rows, _ := h.DailyProfitDao.QueryAll(r.Context())
	for _, r := range rows { ts += r.RealSalesAmount; tpr += r.PromotionTotal }
	avg := 0.0; if ts > 0 { avg = tp / ts * 100 }
	writeJSON(w, 200, map[string]float64{"total_profit":tp,"total_sales":ts,"total_promo":tpr,"avg_profit_rate":avg})
}

func (h *Handler) ListShops(w http.ResponseWriter, r *http.Request) {
	shops, _ := h.ShopDao.GetAll(r.Context())
	if shops == nil { shops = []*model.ShopSummary{} }
	writeJSON(w, 200, shops)
}
func (h *Handler) ShopSummary(w http.ResponseWriter, r *http.Request) {
	id, _ := pathInt(r,"id"); s, _ := h.DailyProfitDao.GetShopSummary(r.Context(), id, today(), today())
	if s == nil { s = &dao.ShopSummary{} }
	writeJSON(w, 200, s)
}

// Shop CRUD
func (h *Handler) CreateShop(w http.ResponseWriter, r *http.Request) {
	var b struct{ShopName,Platform,Owner string}
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
	var b struct{ShopID,ProductID int64; SkuCode string}
	if json.NewDecoder(r.Body).Decode(&b) != nil || b.SkuCode == "" || b.ProductID == 0 { writeError(w,400,"invalid"); return }
	id, _ := h.SkuDao.Create(r.Context(), &model.SKU{ShopID:b.ShopID,ProductID:b.ProductID,SkuCode:b.SkuCode})
	writeJSON(w, 200, map[string]interface{}{"sku_id":id})
}
func (h *Handler) UpdateSKU(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code"); var b struct{ShopID,ProductID int64}
	if json.NewDecoder(r.Body).Decode(&b) != nil { writeError(w,400,"invalid"); return }
	h.SkuDao.Update(r.Context(), code, b.ShopID, b.ProductID)
	writeJSON(w,200,map[string]string{"message":"ok"})
}
func (h *Handler) DeleteSKU(w http.ResponseWriter, r *http.Request) {
	h.SkuDao.Delete(r.Context(), r.PathValue("code"))
	writeJSON(w,200,map[string]string{"message":"ok"})
}
func (h *Handler) SaveSKU(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code"); sku, err := h.SkuDao.GetByCode(r.Context(), code)
	if err != nil { writeError(w,404,"not found"); return }
	var b model.DailyProfitLog
	if json.NewDecoder(r.Body).Decode(&b) != nil { writeError(w,400,"invalid"); return }
	b.SkuID = sku.SkuID; if b.RecordDate == "" { b.RecordDate = today() }
	b.PromotionTotal = b.PromotionAlliance+b.PromotionAuto+b.PromotionJDUnion+b.PromotionSearch+b.PromotionRecommend
	c := b.ProductCost+b.ShippingFee+b.ServiceFee+b.TaxFee+b.FreightInsurance+b.ReturnCost+b.ExchangeCost+b.FillOrderCost
	b.FinalProfit = b.RealSalesAmount - c - b.PromotionTotal + b.FillOrderAmount
	h.DailyProfitDao.Save(r.Context(), &b)
	writeJSON(w,200,map[string]interface{}{"ok":true,"profit":b.FinalProfit})
}
func (h *Handler) CopyYesterday(w http.ResponseWriter, r *http.Request) {
	id, _ := pathInt(r,"id"); h.DailyProfitDao.CopyYesterdayData(r.Context(), id)
	writeJSON(w,200,map[string]string{"message":"ok"})
}
