import ExcelJS from 'exceljs'
import { TYPE_LABELS } from './constants'

function formatValuePHP(value) {
  if (value == null || value === '') return ''
  const num = Number(value)
  if (isNaN(num)) return ''
  return `P${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export async function exportAssetsToExcel(assets, filename = 'PhilFIDA_Assets') {
  const rows = assets.map((a) => {
    const article = a.subtype || TYPE_LABELS[a.type] || a.type || ''
    const descParts = [a.name]
    if (a.serialNumber) descParts.push(`S/N: ${a.serialNumber}`)
    const description = a.description?.trim() || descParts.join(', ')
    return {
      'ARTICLE':                      article,
      'DESCRIPTION':                  description,
      'OLD PROPERTY NUMBER':          a.assetTag || '',
      'NEW PROPERTY NUMBER':          a.newPropertyNumber || '',
      'YEAR OF ACQ.':                 a.yearOfAcquisition != null ? a.yearOfAcquisition : '',
      'UNIT OF MEASURE':              'UNIT',
      'TOTAL VALUE':                  formatValuePHP(a.value),
      'ISSUED TO':                    a.issuedTo || '',
      'LOCATION':                     a.location || '',
      'QUANTITY per PROPERTY CARD':   a.quantityPerPropertyCard != null ? a.quantityPerPropertyCard : '',
      'QUANTITY per PHYSICAL COUNT':  a.quantityPerPhysicalCount != null ? a.quantityPerPhysicalCount : '',
      'SHORTAGE/OVERAGE Quantity':    '',
      'SHORTAGE/OVERAGE Value':       '',
      'REMARKS':                      a.notes || '',
    }
  })

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Assets')

  const colKeys = [
    'ARTICLE', 'DESCRIPTION', 'OLD PROPERTY NUMBER', 'NEW PROPERTY NUMBER', 'YEAR OF ACQ.',
    'UNIT OF MEASURE', 'TOTAL VALUE', 'ISSUED TO', 'LOCATION',
    'QUANTITY per PROPERTY CARD', 'QUANTITY per PHYSICAL COUNT',
    'SHORTAGE/OVERAGE Quantity', 'SHORTAGE/OVERAGE Value', 'REMARKS',
  ]
  const widths = [18, 60, 20, 20, 14, 16, 16, 22, 22, 24, 24, 18, 18, 40]

  worksheet.columns = colKeys.map((key, i) => ({ key, width: widths[i] }))

  // Row 1: main headers; columns 12-13 share merged "SHORTAGE/OVERAGE"
  const headerRow1 = [
    'ARTICLE', 'DESCRIPTION', 'OLD PROPERTY NUMBER', 'NEW PROPERTY NUMBER', 'YEAR OF ACQ.',
    'UNIT OF MEASURE', 'TOTAL VALUE', 'ISSUED TO', 'LOCATION',
    'QUANTITY per PROPERTY CARD', 'QUANTITY per PHYSICAL COUNT',
    'SHORTAGE/OVERAGE', '', 'REMARKS',
  ]
  const row1 = worksheet.addRow(headerRow1)
  row1.font = { bold: true }
  row1.alignment = { horizontal: 'center' }
  worksheet.mergeCells(1, 12, 1, 13) // L1:M1 for SHORTAGE/OVERAGE

  // Row 2: sub-headers for SHORTAGE/OVERAGE (Quantity, Value) only
  const headerRow2 = ['', '', '', '', '', '', '', '', '', '', '', 'Quantity', 'Value', '']
  const row2 = worksheet.addRow(headerRow2)
  row2.font = { bold: true }
  row2.alignment = { horizontal: 'center' }

  worksheet.addRows(rows)

  const date = new Date().toISOString().slice(0, 10)
  const fullFilename = `${filename}_${date}.xlsx`

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fullFilename
  link.click()
  URL.revokeObjectURL(url)
}
