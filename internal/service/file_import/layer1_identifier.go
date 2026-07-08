package file_import

import (
	"strings"
)

// FileType 文件业务类型
type FileType string

const (
	TypeSales     FileType = "sales"     // 商品明细（销售数据）
	TypeAftersale FileType = "aftersale" // 售后明细 (ZIP)
	TypePromotion FileType = "promotion" // 推广费+补单混合
	TypeProduct   FileType = "product"   // 商品主数据
	TypeUnknown   FileType = "unknown"
)

// IdentifyFile 第一层：文件识别（模糊匹配文件名）
func IdentifyFile(name string) FileType {
	lower := strings.ToLower(name)
	if strings.Contains(lower, "商品明细") {
		return TypeSales
	}
	if strings.HasSuffix(lower, ".zip") {
		return TypeAftersale
	}
	if strings.Contains(lower, "推广费") || strings.Contains(lower, "推广费用") {
		return TypePromotion
	}
	if strings.Contains(lower, "商品") || strings.Contains(lower, "产品") {
		return TypeProduct
	}
	return TypeUnknown
}

// IdentifyBatch 批量文件类型判断
// IdentifyByHeaders 根据表头内容识别文件类型（不依赖文件名）
func IdentifyByHeaders(headers []string) FileType {
	headerSet := make(map[string]bool)
	for _, h := range headers { headerSet[strings.TrimSpace(h)] = true }

	// 售后特征
	if headerSet["客户期望"] || headerSet["服务单状态"] { return TypeAftersale }

	// 推广特征
	if headerSet["全站营销"] || headerSet["搜索快车"] { return TypePromotion }

	// 销售特征
	if headerSet["成交金额"] || headerSet["成交单量"] { return TypeSales }

	// 商品主数据特征
	if headerSet["商品名称"] || headerSet["默认成本"] || headerSet["默认运费"] { return TypeProduct }

	return TypeUnknown
}

func IdentifyBatch(names []string) map[FileType][]string {
	result := make(map[FileType][]string)
	for _, n := range names {
		t := IdentifyFile(n)
		result[t] = append(result[t], n)
	}
	return result
}
