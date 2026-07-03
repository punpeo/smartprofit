package db

import (
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

// InitSQLite 初始化 SQLite 数据库，自动建表
func InitSQLite(dbPath string) error {
	var err error
	DB, err = sql.Open("sqlite", dbPath)
	if err != nil {
		return fmt.Errorf("open sqlite failed: %w", err)
	}

	// 启用 WAL 模式 + 外键
	pragmas := []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA foreign_keys=ON",
		"PRAGMA busy_timeout=5000",
	}
	for _, p := range pragmas {
		if _, err := DB.Exec(p); err != nil {
			return fmt.Errorf("pragma %s failed: %w", p, err)
		}
	}

	if err := DB.Ping(); err != nil {
		return fmt.Errorf("ping sqlite failed: %w", err)
	}

	log.Println("SQLite connected:", dbPath)

	if err := createTables(DB); err != nil {
		return fmt.Errorf("create tables failed: %w", err)
	}

	return nil
}

func createTables(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS shops (
		shop_id    INTEGER PRIMARY KEY AUTOINCREMENT,
		shop_name  TEXT NOT NULL,
		platform   TEXT NOT NULL DEFAULT '',
		owner      TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL DEFAULT (datetime('now','+8 hours'))
	);

	CREATE TABLE IF NOT EXISTS products (
		product_id                INTEGER PRIMARY KEY AUTOINCREMENT,
		product_name              TEXT NOT NULL,
		category                  TEXT NOT NULL DEFAULT '',
		image_url                 TEXT NOT NULL DEFAULT '',
		default_cost              REAL NOT NULL DEFAULT 0,
		default_shipping_cost     REAL NOT NULL DEFAULT 0,
		default_service_fee_rate  REAL NOT NULL DEFAULT 0,
		default_tax_rate          REAL NOT NULL DEFAULT 0,
	platform_commission_rate  REAL NOT NULL DEFAULT 0,
		default_freight_insurance REAL NOT NULL DEFAULT 0,
		default_exchange_cost     REAL NOT NULL DEFAULT 0,
		default_return_cost       REAL NOT NULL DEFAULT 0,
		default_fill_order_cost   REAL NOT NULL DEFAULT 0,
		created_at                TEXT NOT NULL DEFAULT (datetime('now','+8 hours'))
	);

	CREATE TABLE IF NOT EXISTS skus (
		sku_id     INTEGER PRIMARY KEY AUTOINCREMENT,
		shop_id    INTEGER NOT NULL REFERENCES shops(shop_id),
		product_id INTEGER NOT NULL REFERENCES products(product_id),
		sku_code   TEXT NOT NULL UNIQUE,
		created_at TEXT NOT NULL DEFAULT (datetime('now','+8 hours'))
	);

	CREATE TABLE IF NOT EXISTS daily_profit_logs (
		log_id           INTEGER PRIMARY KEY AUTOINCREMENT,
		sku_id           INTEGER NOT NULL REFERENCES skus(sku_id),
		record_date      TEXT NOT NULL,

		/* 基础数据 */
		sales_amount      REAL NOT NULL DEFAULT 0,
		order_count       INTEGER NOT NULL DEFAULT 0,
		order_items_count INTEGER NOT NULL DEFAULT 0,
		real_sales_amount REAL NOT NULL DEFAULT 0,
		real_order_count  INTEGER NOT NULL DEFAULT 0,

		/* 补单 */
		fill_order_amount REAL NOT NULL DEFAULT 0,
		fill_order_count  INTEGER NOT NULL DEFAULT 0,
		fill_order_cost   REAL NOT NULL DEFAULT 0,

		/* 成本 */
		product_cost      REAL NOT NULL DEFAULT 0,
		shipping_fee      REAL NOT NULL DEFAULT 0,
		service_fee       REAL NOT NULL DEFAULT 0,
		tax_fee           REAL NOT NULL DEFAULT 0,
		freight_insurance REAL NOT NULL DEFAULT 0,
		return_count      INTEGER NOT NULL DEFAULT 0,
		return_cost       REAL NOT NULL DEFAULT 0,
		exchange_count    INTEGER NOT NULL DEFAULT 0,
		exchange_cost     REAL NOT NULL DEFAULT 0,

		/* 推广 */
		promotion_alliance  REAL NOT NULL DEFAULT 0,
		promotion_auto      REAL NOT NULL DEFAULT 0,
		promotion_jd_union  REAL NOT NULL DEFAULT 0,
		promotion_search    REAL NOT NULL DEFAULT 0,
		promotion_recommend REAL NOT NULL DEFAULT 0,
		promotion_total     REAL NOT NULL DEFAULT 0,

		final_profit REAL NOT NULL DEFAULT 0,

		updated_at TEXT NOT NULL DEFAULT (datetime('now','+8 hours')),
		UNIQUE(sku_id, record_date)
	);

	CREATE INDEX IF NOT EXISTS idx_dpl_sku_date ON daily_profit_logs(sku_id, record_date);
	`
	_, err := db.Exec(schema)
	if err != nil { return err }

	// 迁移：为旧数据库添加新增列（忽略已存在错误）
	for _, m := range []string{
		"ALTER TABLE products ADD COLUMN platform_commission_rate REAL NOT NULL DEFAULT 0",
	} {
		db.Exec(m)
	}

	// seed(db) // 演示数据已关闭，如需恢复取消此行注释
	return nil
}

// seed 插入演示数据
func seed(db *sql.DB) {
	var count int
	db.QueryRow("SELECT COUNT(*) FROM shops").Scan(&count)
	if count > 0 {
		return
	}

	log.Println("📦 插入种子数据...")

	// 店铺
	db.Exec(`INSERT INTO shops (shop_id, shop_name, platform) VALUES (1, '京东自营店', '京东')`)
	db.Exec(`INSERT INTO shops (shop_id, shop_name, platform) VALUES (2, '天猫旗舰店', '天猫')`)
	db.Exec(`INSERT INTO shops (shop_id, shop_name, platform) VALUES (3, '拼多多专营店', '拼多多')`)

	// SKU — 京东自营店
	jdSkus := [][3]string{
		{"JD001", "蓝牙耳机 Pro"}, {"JD002", "氮化镓充电器 65W"}, {"JD003", "手机壳 磁吸系列"},
		{"JD004", "钢化膜 3片装"}, {"JD005", "数据线 Type-C 快充"}, {"JD006", "移动电源 20000mAh"},
		{"JD007", "车载无线充电支架"}, {"JD008", "蓝牙自拍杆 三脚架"},
	}
	for _, s := range jdSkus {
		db.Exec(`INSERT OR IGNORE INTO skus (shop_id, sku_code, product_name, default_cost) VALUES (1, ?, ?, 0)`, s[0], s[1])
	}
	// SKU — 天猫旗舰店
	tmSkus := [][3]string{
		{"TM001", "蓝牙耳机 Pro"}, {"TM002", "氮化镓充电器 65W"}, {"TM003", "磁吸手机壳 全系列"},
		{"TM004", "钢化膜 2片装"}, {"TM005", "快充数据线 套装"}, {"TM006", "移动电源 10000mAh"},
	}
	for _, s := range tmSkus {
		db.Exec(`INSERT OR IGNORE INTO skus (shop_id, sku_code, product_name, default_cost) VALUES (2, ?, ?, 0)`, s[0], s[1])
	}
	// SKU — 拼多多专营店
	pddSkus := [][3]string{
		{"PD001", "蓝牙耳机 基础版"}, {"PD002", "手机壳 透明系列"}, {"PD003", "钢化膜 高清2片"},
		{"PD004", "数据线 3A快充"}, {"PD005", "充电器 20W单头"},
	}
	for _, s := range pddSkus {
		db.Exec(`INSERT OR IGNORE INTO skus (shop_id, sku_code, product_name, default_cost) VALUES (3, ?, ?, 0)`, s[0], s[1])
	}

	log.Println("   种子数据已就绪：3 店铺 / 19 SKU")
}
