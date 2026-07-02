package main

import (
	"log"
	"net/http"

	"smartprofit/config"
	"smartprofit/internal/dao"
	"smartprofit/internal/handler"
	"smartprofit/pkg/db"
	"smartprofit/routes"
)

func main() {
	cfg := config.Load()

	// 初始化 SQLite 数据库
	if err := db.InitSQLite(cfg.Database.Path); err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}
	defer db.DB.Close()

	// 初始化 DAO
	shopDao := dao.NewShopDao(db.DB)
	skuDao := dao.NewSkuDao(db.DB)
	dailyProfitDao := dao.NewDailyProfitDao(db.DB)
	productDao := dao.NewProductDao(db.DB)

	h := &handler.Handler{
		ShopDao:        shopDao,
		SkuDao:         skuDao,
		DailyProfitDao: dailyProfitDao,
		ProductDao:     productDao,
	}

	// 注册路由
	router := routes.Setup(h)

	// 启动服务
	log.Printf("🚀 盈析服务已启动，监听端口 %s", cfg.Server.Port)
	log.Printf("   http://localhost%s", cfg.Server.Port)
	if err := http.ListenAndServe(cfg.Server.Port, router); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
