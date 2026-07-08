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
		product_name              TEXT NOT NULL UNIQUE,
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

	CREATE TABLE IF NOT EXISTS daily_aftersale_logs (
		id              INTEGER PRIMARY KEY AUTOINCREMENT,
		shop_id         INTEGER NOT NULL DEFAULT 0,
		sku_id          INTEGER NOT NULL,
		record_date     TEXT NOT NULL,
		return_total    INTEGER NOT NULL DEFAULT 0,
		return_valid    INTEGER NOT NULL DEFAULT 0,
		return_cancel   INTEGER NOT NULL DEFAULT 0,
		exchange_total  INTEGER NOT NULL DEFAULT 0,
		exchange_valid  INTEGER NOT NULL DEFAULT 0,
		exchange_cancel INTEGER NOT NULL DEFAULT 0,
		aftersale_total  INTEGER NOT NULL DEFAULT 0,
		aftersale_cancel INTEGER NOT NULL DEFAULT 0,
		operator_name   TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL DEFAULT (datetime('now','+8 hours')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now','+8 hours')),
		UNIQUE(shop_id, sku_id, record_date)
	);
	CREATE INDEX IF NOT EXISTS idx_das_sku_date ON daily_aftersale_logs(sku_id, record_date);
	CREATE INDEX IF NOT EXISTS idx_das_date ON daily_aftersale_logs(record_date);

	CREATE TABLE IF NOT EXISTS daily_sales_logs (
		id                INTEGER PRIMARY KEY AUTOINCREMENT,
		shop_id           INTEGER NOT NULL,
		sku_id            INTEGER NOT NULL,
		record_date       TEXT NOT NULL,
		sales_amount      REAL NOT NULL DEFAULT 0,
		order_count       INTEGER NOT NULL DEFAULT 0,
		order_items_count INTEGER NOT NULL DEFAULT 0,
		operator_name     TEXT NOT NULL DEFAULT '',
		created_at        TEXT NOT NULL DEFAULT (datetime('now','+8 hours')),
		updated_at        TEXT NOT NULL DEFAULT (datetime('now','+8 hours')),
		UNIQUE(shop_id, sku_id, record_date)
	);
	CREATE INDEX IF NOT EXISTS idx_dsl_sku_date ON daily_sales_logs(sku_id, record_date);

	CREATE TABLE IF NOT EXISTS daily_fill_order_logs (
		id                  INTEGER PRIMARY KEY AUTOINCREMENT,
		shop_id             INTEGER NOT NULL DEFAULT 0,
		sku_id              INTEGER NOT NULL,
		record_date         TEXT NOT NULL,
		fill_order_count     INTEGER NOT NULL DEFAULT 0,
		fill_order_amount    REAL NOT NULL DEFAULT 0,
		fill_order_cost      REAL NOT NULL DEFAULT 0,
		operator_name       TEXT NOT NULL DEFAULT '',
		created_at          TEXT NOT NULL DEFAULT (datetime('now','+8 hours')),
		updated_at          TEXT NOT NULL DEFAULT (datetime('now','+8 hours')),
		UNIQUE(shop_id, sku_id, record_date)
	);
	CREATE INDEX IF NOT EXISTS idx_dfl_sku_date ON daily_fill_order_logs(sku_id, record_date);

	CREATE TABLE IF NOT EXISTS daily_promotion_logs (
		id                  INTEGER PRIMARY KEY AUTOINCREMENT,
		shop_id             INTEGER NOT NULL,
		sku_id              INTEGER NOT NULL,
		record_date         TEXT NOT NULL,
		promotion_alliance  REAL NOT NULL DEFAULT 0,
		promotion_auto      REAL NOT NULL DEFAULT 0,
		promotion_jd_union  REAL NOT NULL DEFAULT 0,
		promotion_search    REAL NOT NULL DEFAULT 0,
		promotion_recommend REAL NOT NULL DEFAULT 0,
		promotion_total     REAL NOT NULL DEFAULT 0,
		operator_name       TEXT NOT NULL DEFAULT '',
		created_at          TEXT NOT NULL DEFAULT (datetime('now','+8 hours')),
		updated_at          TEXT NOT NULL DEFAULT (datetime('now','+8 hours')),
		UNIQUE(shop_id, sku_id, record_date)
	);
	CREATE INDEX IF NOT EXISTS idx_dplog_sku_date ON daily_promotion_logs(sku_id, record_date);

	CREATE INDEX IF NOT EXISTS idx_dpl_sku_date ON daily_profit_logs(sku_id, record_date);

	-- 触发器：sales_logs → profit_logs
	CREATE TRIGGER IF NOT EXISTS trg_sales_sync AFTER INSERT ON daily_sales_logs
	BEGIN
		INSERT OR IGNORE INTO daily_profit_logs (sku_id, record_date, sales_amount, order_count, order_items_count)
		VALUES (NEW.sku_id, NEW.record_date, ROUND(NEW.sales_amount,2), NEW.order_count, NEW.order_items_count);
	END;
	CREATE TRIGGER IF NOT EXISTS trg_sales_sync_upd AFTER UPDATE ON daily_sales_logs
	BEGIN
		UPDATE daily_profit_logs SET
			sales_amount = ROUND(NEW.sales_amount,2), order_count = NEW.order_count,
			order_items_count = NEW.order_items_count, updated_at = datetime('now','+8 hours')
		WHERE sku_id = NEW.sku_id AND record_date = NEW.record_date;
	END;

	-- 触发器：fill_order_logs → profit_logs
	CREATE TRIGGER IF NOT EXISTS trg_fill_sync AFTER INSERT ON daily_fill_order_logs
	BEGIN
		INSERT INTO daily_profit_logs (sku_id, record_date, fill_order_count, fill_order_amount, fill_order_cost)
		VALUES (NEW.sku_id, NEW.record_date, NEW.fill_order_count, ROUND(NEW.fill_order_amount,2), ROUND(NEW.fill_order_cost,2))
		ON CONFLICT(sku_id, record_date) DO UPDATE SET
			fill_order_count = excluded.fill_order_count,
			fill_order_amount = ROUND(excluded.fill_order_amount,2),
			fill_order_cost = ROUND(excluded.fill_order_cost,2),
			updated_at = datetime('now','+8 hours');
	END;
	CREATE TRIGGER IF NOT EXISTS trg_fill_sync_upd AFTER UPDATE ON daily_fill_order_logs
	BEGIN
		UPDATE daily_profit_logs SET
			fill_order_count = NEW.fill_order_count, fill_order_amount = ROUND(NEW.fill_order_amount,2),
			fill_order_cost = ROUND(NEW.fill_order_cost,2), updated_at = datetime('now','+8 hours')
		WHERE sku_id = NEW.sku_id AND record_date = NEW.record_date;
	END;

	-- 触发器：promotion_logs → profit_logs
	CREATE TRIGGER IF NOT EXISTS trg_promo_sync AFTER INSERT ON daily_promotion_logs
	BEGIN
		INSERT INTO daily_profit_logs (sku_id, record_date, promotion_alliance, promotion_auto, promotion_jd_union, promotion_search, promotion_recommend, promotion_total)
		VALUES (NEW.sku_id, NEW.record_date, ROUND(NEW.promotion_alliance,2), ROUND(NEW.promotion_auto,2), ROUND(NEW.promotion_jd_union,2), ROUND(NEW.promotion_search,2), ROUND(NEW.promotion_recommend,2), ROUND(NEW.promotion_total,2))
		ON CONFLICT(sku_id, record_date) DO UPDATE SET
			promotion_alliance = ROUND(excluded.promotion_alliance,2),
			promotion_auto = ROUND(excluded.promotion_auto,2),
			promotion_jd_union = ROUND(excluded.promotion_jd_union,2),
			promotion_search = ROUND(excluded.promotion_search,2),
			promotion_recommend = ROUND(excluded.promotion_recommend,2),
			promotion_total = ROUND(excluded.promotion_total,2),
			updated_at = datetime('now','+8 hours');
	END;
	CREATE TRIGGER IF NOT EXISTS trg_promo_sync_upd AFTER UPDATE ON daily_promotion_logs
	BEGIN
		UPDATE daily_profit_logs SET
			promotion_alliance = ROUND(NEW.promotion_alliance,2), promotion_auto = ROUND(NEW.promotion_auto,2),
			promotion_jd_union = ROUND(NEW.promotion_jd_union,2), promotion_search = ROUND(NEW.promotion_search,2),
			promotion_recommend = ROUND(NEW.promotion_recommend,2), promotion_total = ROUND(NEW.promotion_total,2),
			updated_at = datetime('now','+8 hours')
		WHERE sku_id = NEW.sku_id AND record_date = NEW.record_date;
	END;

	-- 触发器：aftersale_logs → profit_logs（仅同步有效退货/换货量）
	CREATE TRIGGER IF NOT EXISTS trg_aftersale_sync AFTER INSERT ON daily_aftersale_logs
	BEGIN
		INSERT INTO daily_profit_logs (sku_id, record_date, return_count, exchange_count)
		VALUES (NEW.sku_id, NEW.record_date, NEW.return_valid, NEW.exchange_valid)
		ON CONFLICT(sku_id, record_date) DO UPDATE SET
			return_count = excluded.return_count,
			exchange_count = excluded.exchange_count,
			updated_at = datetime('now','+8 hours');
	END;
	CREATE TRIGGER IF NOT EXISTS trg_aftersale_sync_upd AFTER UPDATE ON daily_aftersale_logs
	BEGIN
		UPDATE daily_profit_logs SET
			return_count = NEW.return_valid,
			exchange_count = NEW.exchange_valid,
			updated_at = datetime('now','+8 hours')
		WHERE sku_id = NEW.sku_id AND record_date = NEW.record_date;
	END;

		-- 触发器：promotion_total 自动 = 五项推广之和
	CREATE TRIGGER IF NOT EXISTS trg_dpl_promo_insert AFTER INSERT ON daily_profit_logs
	BEGIN
		UPDATE daily_profit_logs SET promotion_total =
			NEW.promotion_alliance + NEW.promotion_auto + NEW.promotion_jd_union +
			NEW.promotion_search + NEW.promotion_recommend
		WHERE log_id = NEW.log_id;
	END;

	CREATE TRIGGER IF NOT EXISTS trg_dpl_promo_update AFTER UPDATE ON daily_profit_logs
	WHEN NEW.promotion_alliance <> OLD.promotion_alliance OR NEW.promotion_auto <> OLD.promotion_auto OR
	     NEW.promotion_jd_union <> OLD.promotion_jd_union OR NEW.promotion_search <> OLD.promotion_search OR
	     NEW.promotion_recommend <> OLD.promotion_recommend
	BEGIN
		UPDATE daily_profit_logs SET promotion_total =
			NEW.promotion_alliance + NEW.promotion_auto + NEW.promotion_jd_union +
			NEW.promotion_search + NEW.promotion_recommend
		WHERE log_id = NEW.log_id;
	END;
	`
	_, err := db.Exec(schema)
	if err != nil { return err }

	// 迁移：为旧数据库添加新增列（忽略已存在错误）
	for _, m := range []string{
		"ALTER TABLE products ADD COLUMN platform_commission_rate REAL NOT NULL DEFAULT 0",
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name ON products(product_name)",
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
