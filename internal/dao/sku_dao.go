package dao

import (
	"context"
	"database/sql"
	"smartprofit/internal/model"
)

type SkuDao struct {
	db *sql.DB
}

func NewSkuDao(db *sql.DB) *SkuDao {
	return &SkuDao{db: db}
}

const getSkusByShopIDSQL = `SELECT sku_id, shop_id, sku_code, product_name, default_cost, category, created_at FROM skus WHERE shop_id = ? ORDER BY created_at DESC`

func (d *SkuDao) GetByShopID(ctx context.Context, shopID int64) ([]*model.SKU, error) {
	rows, err := d.db.QueryContext(ctx, getSkusByShopIDSQL, shopID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var skus []*model.SKU
	for rows.Next() {
		var sku model.SKU
		err := rows.Scan(
			&sku.SkuID, &sku.ShopID, &sku.SkuCode,
			&sku.ProductName, &sku.DefaultCost, &sku.Category, &sku.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		skus = append(skus, &sku)
	}
	return skus, nil
}

const getSkuByCodeSQL = `SELECT sku_id, shop_id, sku_code, product_name, default_cost FROM skus WHERE sku_code = ?`

func (d *SkuDao) GetByCode(ctx context.Context, skuCode string) (*model.SKU, error) {
	var sku model.SKU
	err := d.db.QueryRowContext(ctx, getSkuByCodeSQL, skuCode).Scan(
		&sku.SkuID, &sku.ShopID, &sku.SkuCode,
		&sku.ProductName, &sku.DefaultCost,
	)
	if err != nil {
		return nil, err
	}
	return &sku, nil
}

const createSkuSQL = `INSERT INTO skus (shop_id, sku_code, product_name, default_cost, category) VALUES (?, ?, ?, ?, ?)`

func (d *SkuDao) Create(ctx context.Context, sku *model.SKU) (int64, error) {
	result, err := d.db.ExecContext(ctx, createSkuSQL,
		sku.ShopID, sku.SkuCode, sku.ProductName, sku.DefaultCost, sku.Category,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (d *SkuDao) GetDefaultCost(ctx context.Context, skuID int64) (float64, error) {
	var defaultCost float64
	err := d.db.QueryRowContext(ctx, "SELECT default_cost FROM skus WHERE sku_id = ?", skuID).Scan(&defaultCost)
	return defaultCost, err
}

func (d *SkuDao) GetAll(ctx context.Context) ([]*model.SKU, error) {
	rows, err := d.db.QueryContext(ctx, "SELECT sk.sku_id, sk.shop_id, sk.product_id, sk.sku_code, sk.created_at, COALESCE(p.product_name,''), COALESCE(p.category,''), COALESCE(p.default_cost,0), COALESCE(sh.shop_name,'') FROM skus sk LEFT JOIN products p ON sk.product_id=p.product_id LEFT JOIN shops sh ON sk.shop_id=sh.shop_id ORDER BY sk.sku_code")
	if err != nil { return nil, err }
	defer rows.Close()
	var skus []*model.SKU
	for rows.Next() {
		var s model.SKU
		if err := rows.Scan(&s.SkuID, &s.ShopID, &s.ProductID, &s.SkuCode, &s.CreatedAt, &s.ProductName, &s.Category, &s.DefaultCost, &s.ShopName); err != nil { return nil, err }
		skus = append(skus, &s)
	}
	return skus, nil
}

func (d *SkuDao) Update(ctx context.Context, code string, shopID, productID int64) error {
	_, err := d.db.ExecContext(ctx, "UPDATE skus SET shop_id=?, product_id=? WHERE sku_code=?", shopID, productID, code)
	return err
}

func (d *SkuDao) Delete(ctx context.Context, code string) error {
	tx, _ := d.db.BeginTx(ctx, nil)
	defer tx.Rollback()
	tx.ExecContext(ctx, "DELETE FROM daily_profit_logs WHERE sku_id IN (SELECT sku_id FROM skus WHERE sku_code=?)", code)
	tx.ExecContext(ctx, "DELETE FROM skus WHERE sku_code=?", code)
	return tx.Commit()
}
