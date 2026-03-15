import * as XLSX from 'xlsx'
import { TYPE_LABELS, STATUS_LABELS } from './constants'

const CURRENT_YEAR = new Date().getFullYear()
function isForReplacement(year) {
  if (!year) return false
  return (CURRENT_YEAR - Number(year)) >= 5
}

export function exportAssetsToExcel(assets, filename = 'PhilFIDA_Assets') {
  const rows = assets.map((a, i) => ({
    '#':                          i + 1,
    'Old Property Number':        a.assetTag || '',
    'New Property Number':        a.newPropertyNumber || '',
    'Name':                       a.name || '',
    'Type':                       TYPE_LABELS[a.type] || a.type || '',
    'Subtype':                    a.subtype || '',
    'Status':                     STATUS_LABELS[a.status] || a.status || '',
    'Serial Number':              a.serialNumber || '',
    'Issued To':                  a.issuedTo || '',
    'Location':                   a.location || '',
    'Year of Acquisition':        a.yearOfAcquisition != null ? a.yearOfAcquisition : '',
    'Age (Years)':                a.yearOfAcquisition != null ? CURRENT_YEAR - Number(a.yearOfAcquisition) : '',
    'For Replacement':            isForReplacement(a.yearOfAcquisition) ? 'YES' : 'NO',
    'Total Value (PHP)':          a.value != null ? a.value : '',
    'Qty Per Property Card':      a.quantityPerPropertyCard != null ? a.quantityPerPropertyCard : '',
    'Qty Per Physical Count':     a.quantityPerPhysicalCount != null ? a.quantityPerPhysicalCount : '',
    'Region':                     a.region || '',
    'Notes':                      a.notes || '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)

  // Apply red fill to cells in the "For Replacement" column where value is YES
  const forReplacementColIndex = Object.keys(rows[0] || {}).indexOf('For Replacement')
  if (forReplacementColIndex >= 0) {
    const colLetter = String.fromCharCode(65 + forReplacementColIndex)
    rows.forEach((row, i) => {
      if (row['For Replacement'] === 'YES') {
        const cellRef = `${colLetter}${i + 2}`
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { bold: true, color: { rgb: '991B1B' } },
            fill: { fgColor: { rgb: 'FEF2F2' } },
          }
        }
      }
    })
  }

  ws['!cols'] = [
    { wch: 4  },  // #
    { wch: 22 },  // Old Property Number
    { wch: 22 },  // New Property Number
    { wch: 30 },  // Name
    { wch: 22 },  // Type
    { wch: 22 },  // Subtype
    { wch: 22 },  // Status
    { wch: 20 },  // Serial Number
    { wch: 22 },  // Issued To
    { wch: 22 },  // Location
    { wch: 18 },  // Year of Acquisition
    { wch: 12 },  // Age (Years)
    { wch: 16 },  // For Replacement
    { wch: 16 },  // Total Value
    { wch: 22 },  // Qty Per Property Card
    { wch: 22 },  // Qty Per Physical Count
    { wch: 12 },  // Region
    { wch: 34 },  // Notes
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Assets')

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`)
}
