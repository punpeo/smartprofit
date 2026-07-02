package routes

import (
	"net/http"
	"smartprofit/internal/handler"
)

func Setup(h *handler.Handler) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", h.Health)
	mux.HandleFunc("GET /api/dashboard/kpis", h.DashboardKPIs)
	mux.HandleFunc("GET /api/shops", h.ListShops)
	mux.HandleFunc("POST /api/shops", h.CreateShop)
	mux.HandleFunc("PUT /api/shops/{id}", h.UpdateShop)
	mux.HandleFunc("DELETE /api/shops/{id}", h.DeleteShop)
	mux.HandleFunc("POST /api/clear-all", h.ClearAll)
	mux.HandleFunc("GET /api/shops/{id}/summary", h.ShopSummary)
	mux.HandleFunc("GET /api/shops/{id}/skus", h.ListSKUs)
	mux.HandleFunc("POST /api/shops/{id}/copy-yesterday", h.CopyYesterday)

	mux.HandleFunc("GET /api/products", h.ListProducts)
	mux.HandleFunc("POST /api/products", h.CreateProduct)
	mux.HandleFunc("PUT /api/products/{id}", h.UpdateProduct)
	mux.HandleFunc("DELETE /api/products/{id}", h.DeleteProduct)

	mux.HandleFunc("GET /api/skus", h.ListSKUBase)
	mux.HandleFunc("POST /api/skus", h.CreateSKU)
	mux.HandleFunc("PUT /api/skus/{code}", h.UpdateSKU)
	mux.HandleFunc("DELETE /api/skus/{code}", h.DeleteSKU)
	mux.HandleFunc("POST /api/skus/{code}/save", h.SaveSKU)

	staticFS := http.FileServer(http.Dir("web"))
	mux.Handle("GET /", staticFS)
	return withCORS(mux)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions { w.WriteHeader(http.StatusNoContent); return }
		next.ServeHTTP(w, r)
	})
}
