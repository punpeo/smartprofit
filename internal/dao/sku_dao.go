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
