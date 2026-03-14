import * as XLSX from 'xlsx'
import { TYPE_LABELS, STATUS_LABELS } from './constants'

export function exportAssetsToExcel(assets, filename = 'PhilFIDA7_Assets') {
  const rows = assets.map((a, i) => ({
    '#': i + 1,
    'Asset Tag': a.assetTag,
    'Name': a.name,
    'Type': TYPE_LABELS[a.type] || a.type,
    'Subtype': a.subtype || '',
    'Status': STATUS_LABELS[a.status] || a.status,
    'Serial Number': a.serialNumber || '',
    'Assigned To': a.assignedTo || '',
    'Purchase Date': a.purchaseDate || '',
    'Value (PHP)': a.value != null ? a.value : '',
    'Notes': a.notes || '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)

  const colWidths = [
    { wch: 4 },   // #
    { wch: 22 },  // Asset Tag
    { wch: 28 },  // Name
    { wch: 20 },  // Type
    { wch: 20 },  // Subtype
    { wch: 22 },  // Status
    { wch: 20 },  // Serial Number
    { wch: 20 },  // Assigned To
    { wch: 14 },  // Purchase Date
    { wch: 14 },  // Value
    { wch: 30 },  // Notes
  ]
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Assets')

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`)
}
