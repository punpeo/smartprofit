import { useRef } from 'react'
import * as XLSX from 'xlsx'
import { Download, Upload } from 'lucide-react'

/**
 * 下载 Excel 模板
 * @param {string[][]} headers - [[col1, col2, ...]] 第一行是表头
 * @param {string} filename - 下载文件名
 */
export function downloadTemplate(headers, filename) {
  const ws = XLSX.utils.aoa_to_sheet(headers)
  // 设置列宽
  ws['!cols'] = headers[0].map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * 解析上传的 Excel，返回 JSON 数组
 * @param {File} file
 * @returns {Promise<object[]>}
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws)
        resolve(data)
      } catch (err) {
        reject(new Error('文件解析失败，请确认格式正确'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 导入按钮 + 下载模板 组合组件
 * @param {{ onImport: (rows: object[]) => void, templateHeaders: string[][], templateName: string, accept?: string }} props
 */
export function ImportBar({ onImport, templateHeaders, templateName, label = '导入 Excel' }) {
  const fileRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    parseExcelFile(file).then(onImport).catch(err => alert(err.message))
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
      <button onClick={() => fileRef.current.click()}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/[0.09] text-sm text-white/65 hover:text-white hover:border-white/15 transition-all">
        <Upload size={13} /> {label}
      </button>
      <button onClick={() => downloadTemplate(templateHeaders, templateName)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/[0.09] text-sm text-white/55 hover:text-white hover:border-white/12 transition-all">
        <Download size={13} /> 下载模板
      </button>
    </div>
  )
}
