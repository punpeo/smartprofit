package routes

import (
	"net/http"

	"smartprofit/internal/handler"
)

// Setup 注册所有路由，返回可用的 http.Handler
func Setup(h *handler.Handler) http.Handler {
	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("GET /api/health", h.Health)

	// Dashboard
	mux.HandleFunc("GET /api/dashboard/kpis", h.DashboardKPIs)
	mux.HandleFunc("GET /api/shops", h.ListShops)

	// Shop Detail
	mux.HandleFunc("GET /api/shops/{id}/summary", h.ShopSummary)
	mux.HandleFunc("GET /api/shops/{id}/skus", h.ListSKUs)
	mux.HandleFunc("POST /api/shops/{id}/copy-yesterday", h.CopyYesterday)

	// SKU
	mux.HandleFunc("POST /api/skus/{code}/save", h.SaveSKU)

	// Static files (must be last — catches all remaining paths)
	staticFS := http.FileServer(http.Dir("static"))
	mux.Handle("GET /", staticFS)

	return withCORS(mux)
}

// withCORS 包装 CORS 中间件
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
