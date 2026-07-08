package file_import

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	"github.com/xuri/excelize/v2"
)

// RowData 标准化行数据（表头→值）
type RowData map[string]string

// ParseResult 解析结果
type ParseResult struct {
	FileName string
	Rows     []RowData
	Headers  []string
}

// ParseSheet 第二层：统一格式解包
// 支持 .xlsx 和 .zip（内含 .xlsx），返回标准化行数据
// 自动检测多行表头（前3行中匹配关键字最多的行作为表头）
func ParseSheet(filePath string) (*ParseResult, error) {
	data, err := os.ReadFile(filePath)
	if err != nil { return nil, fmt.Errorf("read file: %w", err) }

	if strings.HasSuffix(strings.ToLower(filePath), ".zip") {
		return parseFromZip(data, filePath)
	}
	return parseExcel(data, filePath)
}

// keywordScore 表头行匹配关键字得分
var headerKeywords = []string{
	"SKU", "时间", "成交金额", "销售额", "订单量",
	"客户期望", "服务单状态", "商品编号", "售后申请时间",
	"全站营销", "搜索快车", "京东联盟", "推广费",
	"补单数量", "补单金额",
}

func scoreHeaderRow(row []string) int {
	s := 0
	for _, cell := range row {
		t := strings.TrimSpace(cell)
		for _, kw := range headerKeywords {
			if strings.Contains(t, kw) { s++ }
		}
	}
	return s
}

// findBestHeaderRow 在前3行中找到得分最高的行作为表头
func findBestHeaderRow(rows [][]string) (headerRow int) {
	bestScore := 0
	maxRows := len(rows)
	if maxRows > 3 { maxRows = 3 }
	for i := 0; i < maxRows; i++ {
		if s := scoreHeaderRow(rows[i]); s > bestScore {
			bestScore = s
			headerRow = i
		}
	}
	return
}

func parseFromZip(data []byte, name string) (*ParseResult, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil { return nil, fmt.Errorf("zip open: %w", err) }
	if len(zr.File) == 0 { return nil, fmt.Errorf("empty zip") }

	// 取第一个表格文件
	for _, f := range zr.File {
		if strings.HasSuffix(strings.ToLower(f.Name), ".xlsx") || strings.HasSuffix(strings.ToLower(f.Name), ".xls") {
			rc, err := f.Open()
			if err != nil { continue }
			content, _ := io.ReadAll(rc)
			rc.Close()
			return parseExcel(content, name)
		}
	}
	return nil, fmt.Errorf("no xlsx found in zip")
}

func parseExcel(data []byte, name string) (*ParseResult, error) {
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil { return nil, fmt.Errorf("excel open: %w", err) }

	// 扫描所有 Sheet，选表头匹配最好的那个（跳过封面页）
	var bestSheet string
	var bestRows [][]string
	bestScore := 0
	for _, sheet := range f.GetSheetList() {
		rows, err := f.GetRows(sheet)
		if err != nil || len(rows) < 2 { continue }
		// 检查前3行中最高得分
		maxRows := len(rows)
		if maxRows > 3 { maxRows = 3 }
		for i := 0; i < maxRows; i++ {
			if s := scoreHeaderRow(rows[i]); s > bestScore {
				bestScore = s
				bestSheet = sheet
				bestRows = rows
			}
		}
	}
	if bestSheet == "" { return nil, fmt.Errorf("no valid data sheet found") }

	allRows := bestRows

	// 多行表头检测：前3行中匹配关键字最多的作为表头
	headerIdx := findBestHeaderRow(allRows)
	headers := make([]string, len(allRows[headerIdx]))
	for i, h := range allRows[headerIdx] { headers[i] = strings.TrimSpace(h) }

	result := &ParseResult{FileName: name, Headers: headers}
	// 数据行从表头行之后开始
	for _, r := range allRows[headerIdx+1:] {
		if isEmptyRow(r) { continue }
		row := make(RowData)
		for i, v := range r {
			if i < len(headers) { row[headers[i]] = strings.TrimSpace(v) }
		}
		result.Rows = append(result.Rows, row)
	}

	log.Printf("[import] parsed %s sheet=%s header=row%d %d data rows", name, bestSheet, headerIdx+1, len(result.Rows))
	return result, nil
}

func isEmptyRow(r []string) bool {
	for _, v := range r { if strings.TrimSpace(v) != "" { return false } }
	return true
}
