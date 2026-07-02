package dao

import (
	"context"
	"database/sql"
	"smartprofit/internal/model"
)

type ProductDao struct{ db *sql.DB }

func NewProductDao(db *sql.DB) *ProductDao { return &ProductDao{db: db} }

const getAllProductsSQL = `SELECT product_id,product_name,category,image_url,default_cost,default_shipping_cost,default_service_fee_rate,default_tax_rate,default_freight_insurance,default_exchange_cost,default_return_cost,default_fill_order_cost,created_at FROM products ORDER BY product_name`

func (d *ProductDao) GetAll(ctx context.Context) ([]*model.Product, error) {
	rows, err := d.db.QueryContext(ctx, getAllProductsSQL)
	if err != nil { return nil, err }
	defer rows.Close()
	var ps []*model.Product
	for rows.Next() {
		var p model.Product
		if err := rows.Scan(&p.ProductID,&p.ProductName,&p.Category,&p.ImageURL,&p.DefaultCost,&p.DefaultShippingCost,&p.DefaultServiceFeeRate,&p.DefaultTaxRate,&p.DefaultFreightInsurance,&p.DefaultExchangeCost,&p.DefaultReturnCost,&p.DefaultFillOrderCost,&p.CreatedAt); err != nil { return nil, err }
		ps = append(ps, &p)
	}
	return ps, nil
}

const createProductSQL = `INSERT INTO products (product_name,category,image_url,default_cost,default_shipping_cost,default_service_fee_rate,default_tax_rate,default_freight_insurance,default_exchange_cost,default_return_cost,default_fill_order_cost) VALUES (?,?,?,?,?,?,?,?,?,?,?)`

func (d *ProductDao) Create(ctx context.Context, p *model.Product) (int64, error) {
	r, err := d.db.ExecContext(ctx, createProductSQL, p.ProductName, p.Category, p.ImageURL, p.DefaultCost, p.DefaultShippingCost, p.DefaultServiceFeeRate, p.DefaultTaxRate, p.DefaultFreightInsurance, p.DefaultExchangeCost, p.DefaultReturnCost, p.DefaultFillOrderCost)
	if err != nil { return 0, err }
	return r.LastInsertId()
}

const updateProductSQL = `UPDATE products SET product_name=?,category=?,image_url=?,default_cost=?,default_shipping_cost=?,default_service_fee_rate=?,default_tax_rate=?,default_freight_insurance=?,default_exchange_cost=?,default_return_cost=?,default_fill_order_cost=? WHERE product_id=?`

func (d *ProductDao) Update(ctx context.Context, p *model.Product) error {
	_, err := d.db.ExecContext(ctx, updateProductSQL, p.ProductName, p.Category, p.ImageURL, p.DefaultCost, p.DefaultShippingCost, p.DefaultServiceFeeRate, p.DefaultTaxRate, p.DefaultFreightInsurance, p.DefaultExchangeCost, p.DefaultReturnCost, p.DefaultFillOrderCost, p.ProductID)
	return err
}

func (d *ProductDao) Delete(ctx context.Context, id int64) error {
	_, err := d.db.ExecContext(ctx, `DELETE FROM products WHERE product_id=?`, id)
	return err
}
