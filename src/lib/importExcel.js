import ExcelJS from 'exceljs'
import { TYPE_LABELS, SUBTYPE_OPTIONS } from './constants'

function buildArticleMap() {
  const map = new Map()
  for (const [typeKey, subtypes] of Object.entries(SUBTYPE_OPTIONS)) {
    for (const sub of subtypes) {
      map.set(normalize(sub), { type: typeKey, subtype: sub })
    }
    map.set(normalize(TYPE_LABELS[typeKey]), { type: typeKey, subtype: null })
  }
  return map
}

const articleMap = buildArticleMap()

function normalize(s) {
  if (!s || typeof s !== 'string') return ''
  return String(s).trim().toUpperCase()
}

function findColumnIndex(row, headerNames) {
  const indices = {}
  for (let col = 1; col <= 30; col++) {
    const cell = row.getCell(col)
    const val = (cell && cell.value != null) ? String(cell.value).trim() : ''
    const norm = normalize(val)
    for (const h of headerNames) {
      if (normalize(h) === norm && !indices[h]) {
        indices[h] = col
        break
      }
    }
  }
  return indices
}

function parseArticle(articleStr) {
  if (!articleStr) return { type: 'ICT_EQUIPMENT', subtype: null }
  const match = articleMap.get(normalize(articleStr))
  if (match) return match
  return { type: 'ICT_EQUIPMENT', subtype: null }
}

function parseDescription(desc) {
  if (!desc) return { name: '', serialNumber: null }
  const s = String(desc).trim()
  const snMatch = s.match(/\bS\/N:\s*([^,\n]+)/i) || s.match(/\bSerial[:\s]+([^,\n]+)/i)
  const serialNumber = snMatch ? snMatch[1].trim() : null
  const name = snMatch ? s.replace(snMatch[0], '').replace(/^,\s*|\s*,\s*$/g, '').trim() : s
  return { name: name || '', serialNumber: serialNumber || null }
}

function parseValue(val) {
  if (val == null || val === '') return null
  const s = String(val).replace(/^P\s*/i, '').replace(/,/g, '').trim()
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseYear(val) {
  if (val == null || val === '') return null
  const n = parseInt(String(val).trim(), 10)
  return isNaN(n) ? null : n
}

function parseNum(val) {
  if (val == null || val === '') return null
  const n = parseFloat(String(val).replace(/,/g, ''))
  return isNaN(n) ? null : n
}

export async function parseAssetsFromExcel(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) return { assets: [], errors: ['No worksheet found in file.'] }

  const errors = []
  const headerNames = [
    'ARTICLE', 'DESCRIPTION', 'SERIAL NUMBER', 'OLD PROPERTY NUMBER', 'NEW PROPERTY NUMBER', 'YEAR OF ACQ.',
    'TOTAL VALUE', 'ISSUED TO', 'LOCATION',
    'QUANTITY per PROPERTY CARD', 'QUANTITY per PHYSICAL COUNT', 'REMARKS',
  ]

  let headerRow = worksheet.getRow(1)
  let colMap = findColumnIndex(headerRow, headerNames)

  if (Object.keys(colMap).length < 3) {
    headerRow = worksheet.getRow(2)
    colMap = findColumnIndex(headerRow, headerNames)
  }

  if (Object.keys(colMap).length === 0) {
    return { assets: [], errors: ['Could not find template column headers (ARTICLE, DESCRIPTION, etc.).'] }
  }

  // Start after header row(s). If row 2 looks like sub-headers (Quantity, Value), skip it too.
  let startRow = (headerRow.number || 1) + 1
  const row2 = worksheet.getRow(2)
  if (headerRow.number === 1 && row2) {
    const row2Vals = []
    for (let c = 1; c <= 30; c++) {
      const cell = row2.getCell(c)
      const v = cell && cell.value
      if (v != null && String(v).trim()) row2Vals.push(String(v).trim().toUpperCase())
    }
    const isSubHeaderRow = row2Vals.some(v => v === 'QUANTITY' || v === 'VALUE') && row2Vals.length <= 3
    if (isSubHeaderRow) startRow = 3
  }

  const assets = []

  worksheet.eachRow(function (row, rowNumber) {
    if (rowNumber < startRow) return
    const get = function (colName) {
      const idx = colMap[colName]
      if (!idx) return ''
      const cell = row.getCell(idx)
      const v = cell && cell.value
      if (v == null) return ''
      return String(v).trim()
    }

    const articleStr = get('ARTICLE')
    const descStr = get('DESCRIPTION')
    const assetTag = get('OLD PROPERTY NUMBER')
    const nameFromDesc = parseDescription(descStr).name

    if (!assetTag && !nameFromDesc && !get('NEW PROPERTY NUMBER')) return
    // Skip rows that look like headers (ARTICLE cell contains a header name)
    const articleNorm = normalize(articleStr)
    if (headerNames.some(function (h) { return normalize(h) === articleNorm })) return

    const parsed = parseArticle(articleStr)
    const descParsed = parseDescription(descStr)
    const serialFromCol = get('SERIAL NUMBER')
    const serialNumber = (serialFromCol && serialFromCol.trim()) || descParsed.serialNumber || null

    const asset = {
      assetTag: assetTag || '',
      newPropertyNumber: get('NEW PROPERTY NUMBER') || null,
      name: (descParsed.name || nameFromDesc) || '',
      type: parsed.type,
      subtype: parsed.subtype,
      status: 'SPARE',
      serialNumber,
      issuedTo: get('ISSUED TO') || null,
      location: get('LOCATION') || null,
      yearOfAcquisition: parseYear(get('YEAR OF ACQ.')),
      value: parseValue(get('TOTAL VALUE')),
      quantityPerPropertyCard: parseNum(get('QUANTITY per PROPERTY CARD')),
      quantityPerPhysicalCount: parseNum(get('QUANTITY per PHYSICAL COUNT')),
      notes: get('REMARKS') || null,
    }

    assets.push(asset)
  })

  return { assets, errors }
}
