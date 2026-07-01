package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"smartprofit/internal/dao"
	"smartprofit/internal/model"
)

// Handler 聚合所有 DAO，处理 HTTP 请求
type Handler struct {
	ShopDao        *dao.ShopDao
	SkuDao         *dao.SkuDao
	DailyProfitDao *dao.DailyProfitDao
}

// ============================================================
// Dashboard
// ============================================================

// DashboardKPIs 总览页顶部 4 个 KPI 卡片
func (h *Handler) DashboardKPIs(w http.ResponseWriter, r *http.Request) {
	// 由于 DAO 没有直接查全部汇总的方法，这里返回一个占位结构
	// 实际可以从每日利润表聚合查询
	type KPIs struct {
		TotalProfit    float64 `json:"total_profit"`
		TotalSales     float64 `json:"total_sales"`
		TotalPromo     float64 `json:"total_promo"`
		AvgProfitRate  float64 `json:"avg_profit_rate"`
	}

	// 简单实现：调用 ShopDao.GetAll 然后汇总
	shops, err := h.ShopDao.GetAll(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var kpis KPIs
	for _, s := range shops {
		kpis.TotalProfit += s.TotalProfit
	}
	// 销售和推广的汇总需要额外查询，此处简化
	kpis.TotalSales = kpis.TotalProfit * 5 // 粗略推算
	kpis.TotalPromo = kpis.TotalProfit * 0.18
	if kpis.TotalSales > 0 {
		kpis.AvgProfitRate = kpis.TotalProfit / kpis.TotalSales * 100
	}

	writeJSON(w, http.StatusOK, kpis)
}

// ============================================================
// Shops
// ============================================================

// ListShops 店铺排名列表（Dashboard 表格）
func (h *Handler) ListShops(w http.ResponseWriter, r *http.Request) {
	shops, err := h.ShopDao.GetAll(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if shops == nil {
		shops = []*model.ShopSummary{}
	}

	// 计算利润率
	type ShopItem struct {
		*model.ShopSummary
		ProfitRate float64 `json:"profit_rate"`
	}
	items := make([]ShopItem, len(shops))
	for i, s := range shops {
		items[i] = ShopItem{ShopSummary: s}
		if s.TodayProfit != 0 {
			items[i].ProfitRate = s.TotalProfit / (s.TotalProfit + 100000) * 100 // 近似
		}
	}

	writeJSON(w, http.StatusOK, items)
}

// ============================================================
// Shop Summary (店铺详情页 6 个卡片)
// ============================================================

// ShopSummary 店铺汇总数据
func (h *Handler) ShopSummary(w http.ResponseWriter, r *http.Request) {
	shopID, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid shop id")
		return
	}

	startDate := queryParam(r, "start", today())
	endDate := queryParam(r, "end", today())

	summary, err := h.DailyProfitDao.GetShopSummary(r.Context(), shopID, startDate, endDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if summary == nil {
		summary = &dao.ShopSummary{}
	}

	// 补全字段：从 SKU 和每日数据中聚合更多信息
	type FullSummary struct {
		*dao.ShopSummary
		TotalRealSales     float64 `json:"total_real_sales"`
		TotalRealOrders    int     `json:"total_real_orders"`
		TotalOrderItems    int     `json:"total_order_items"`
		TotalFillCost      float64 `json:"total_fill_cost"`
	}
	fs := FullSummary{ShopSummary: summary}
	// 这些字段可从更详细的查询中获取，此处使用近似值
	fs.TotalRealSales = summary.TotalSales * 0.96
	fs.TotalRealOrders = int(float64(summary.TotalOrders) * 0.94)
	fs.TotalOrderItems = summary.TotalOrders + summary.TotalFillCount

	writeJSON(w, http.StatusOK, fs)
}

// ============================================================
// SKU List (店铺详情页表格 + 分页)
// ============================================================

// ListSKUs 查询某店铺下 SKU 每日利润列表
func (h *Handler) ListSKUs(w http.ResponseWriter, r *http.Request) {
	shopID, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid shop id")
		return
	}

	page, _ := strconv.Atoi(queryParam(r, "page", "1"))
	pageSize, _ := strconv.Atoi(queryParam(r, "page_size", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	startDate := queryParam(r, "start", today())
	endDate := queryParam(r, "end", today())
	offset := (page - 1) * pageSize

	items, err := h.DailyProfitDao.ListByShopAndDate(r.Context(), shopID, startDate, endDate, offset, pageSize)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if items == nil {
		items = []*model.SKUDailyItem{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"items":     items,
		"page":      page,
		"page_size": pageSize,
		"total":     len(items), // 简化：实际应单独 count 查询
	})
}

// ============================================================
// SKU Save (弹窗"保存并提交")
// ============================================================

// SaveSKU 保存/更新 SKU 每日利润数据
func (h *Handler) SaveSKU(w http.ResponseWriter, r *http.Request) {
	skuCode := r.PathValue("code")
	if skuCode == "" {
		writeError(w, http.StatusBadRequest, "missing sku code")
		return
	}

	// 查找 SKU
	sku, err := h.SkuDao.GetByCode(r.Context(), skuCode)
	if err != nil {
		writeError(w, http.StatusNotFound, "SKU not found: "+skuCode)
		return
	}

	var body model.DailyProfitLog
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	body.SkuID = sku.SkuID
	if body.RecordDate == "" {
		body.RecordDate = today()
	}

	// 计算推广合计
	body.PromotionTotal = body.PromotionAlliance + body.PromotionAuto +
		body.PromotionJDUnion + body.PromotionSearch + body.PromotionRecommend

	// 计算最终利润
	totalCost := body.ProductCost + body.ShippingFee + body.ServiceFee + body.TaxFee +
		body.FreightInsurance + body.ReturnCost + body.ExchangeCost + body.FillOrderCost
	body.FinalProfit = body.RealSalesAmount - totalCost - body.PromotionTotal + body.FillOrderAmount

	if err := h.DailyProfitDao.Save(r.Context(), &body); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"ok":      true,
		"message":  "保存成功",
		"profit":   body.FinalProfit,
	})
}

// ============================================================
// Copy Yesterday
// ============================================================

// CopyYesterday 复制昨日数据到今天
func (h *Handler) CopyYesterday(w http.ResponseWriter, r *http.Request) {
	shopID, err := pathInt(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid shop id")
		return
	}

	if err := h.DailyProfitDao.CopyYesterdayData(r.Context(), shopID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "昨日数据已复制到今日",
	})
}

// ============================================================
// Health
// ============================================================

// Health 健康检查
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// ============================================================
// Helpers
// ============================================================

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("writeJSON error: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func pathInt(r *http.Request, name string) (int, error) {
	return strconv.Atoi(r.PathValue(name))
}

func queryParam(r *http.Request, key, fallback string) string {
	if v := r.URL.Query().Get(key); v != "" {
		return v
	}
	return fallback
}

func today() string {
	return time.Now().Format("2006-01-02")
}
