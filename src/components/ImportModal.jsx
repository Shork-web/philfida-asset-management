import { useState, useRef, useCallback, useMemo } from 'react'
import { parseAssetsFromExcel } from '../lib/importExcel'
import { createAsset, getAssetDuplicateMessages } from '../lib/api'
import {
  TYPE_OPTIONS,
  TYPE_LABELS,
  SUBTYPE_OPTIONS,
  STATUS_OPTIONS,
  STATUS_LABELS,
} from '../lib/constants'
import { IconX, IconUpload, IconTrash } from './Icons'

function draftId() {
  return `dr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Normalize one parsed/edited row for Firestore createAsset */
function rowToImportPayload(row, userRegion) {
  const { __draftId: _id, ...rest } = row
  const yearRaw = rest.yearOfAcquisition
  const valueRaw = rest.value
  const qCard = rest.quantityPerPropertyCard
  const qPhys = rest.quantityPerPhysicalCount

  const num = (v) => {
    if (v === '' || v == null) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  return {
    assetTag: typeof rest.assetTag === 'string' ? rest.assetTag.trim() || null : rest.assetTag || null,
    newPropertyNumber:
      typeof rest.newPropertyNumber === 'string'
        ? rest.newPropertyNumber.trim() || null
        : rest.newPropertyNumber ?? null,
    name: (typeof rest.name === 'string' ? rest.name : String(rest.name ?? '')).trim() || '',
    description: rest.description?.trim?.() ? rest.description.trim() : null,
    type: rest.type || 'ICT_EQUIPMENT',
    subtype: rest.subtype?.trim?.() ? rest.subtype.trim() : null,
    status: rest.status || 'SPARE',
    serialNumber:
      typeof rest.serialNumber === 'string'
        ? rest.serialNumber.trim() || null
        : rest.serialNumber ?? null,
    issuedTo:
      typeof rest.issuedTo === 'string' ? rest.issuedTo.trim() || null : rest.issuedTo ?? null,
    location:
      typeof rest.location === 'string' ? rest.location.trim() || null : rest.location ?? null,
    yearOfAcquisition: num(yearRaw),
    value: num(valueRaw),
    quantityPerPropertyCard: num(qCard),
    quantityPerPhysicalCount: num(qPhys),
    notes: typeof rest.notes === 'string' ? rest.notes.trim() || null : rest.notes ?? null,
    region: userRegion && userRegion !== 'all' ? userRegion : null,
  }
}

/**
 * Same order as import: each row is checked against Firestore-backed assets plus
 * synthetic entries for earlier valid rows in this file (new #, old #, serial).
 * @returns {Array<{ rowNum: number, messages: string[] }>}
 */
function computeImportDuplicateIssues(draftRows, existingAssets, userRegion) {
  if (!draftRows?.length) return []
  const issues = []
  const cumulative = [...(existingAssets || [])]

  draftRows.forEach((row, index) => {
    const payload = rowToImportPayload(row, userRegion)
    const rowNum = index + 1
    if (!payload.name?.trim() || !String(payload.newPropertyNumber ?? '').trim()) {
      return
    }
    const dupMsgs = getAssetDuplicateMessages(payload, cumulative, undefined)
    if (dupMsgs.length > 0) {
      issues.push({ rowNum, messages: dupMsgs })
      return
    }
    cumulative.push({
      id: `import-preview-${row.__draftId}`,
      name: payload.name,
      newPropertyNumber: payload.newPropertyNumber,
      assetTag: payload.assetTag,
      serialNumber: payload.serialNumber,
    })
  })

  return issues
}

function normalizeDraftFromParse(assets) {
  return assets.map((a) => ({
    __draftId: draftId(),
    assetTag: a.assetTag ?? '',
    newPropertyNumber: a.newPropertyNumber ?? '',
    name: a.name ?? '',
    type: a.type || 'ICT_EQUIPMENT',
    subtype: a.subtype ?? '',
    status: a.status || 'SPARE',
    serialNumber: a.serialNumber ?? '',
    issuedTo: a.issuedTo ?? '',
    location: a.location ?? '',
    yearOfAcquisition: a.yearOfAcquisition ?? '',
    value: a.value ?? '',
    quantityPerPropertyCard: a.quantityPerPropertyCard ?? '',
    quantityPerPhysicalCount: a.quantityPerPhysicalCount ?? '',
    notes: a.notes ?? '',
  }))
}

export default function ImportModal({ userRegion, existingAssets = [], onClose, onImported, toast }) {
  const [draftRows, setDraftRows] = useState(null)
  const [error, setError] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  const updateRow = useCallback((index, patch) => {
    setDraftRows((prev) => {
      if (!prev) return prev
      return prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    })
  }, [])

  const onTypeChange = useCallback((index, newType) => {
    setDraftRows((prev) => {
      if (!prev) return prev
      return prev.map((r, i) => {
        if (i !== index) return r
        const subs = SUBTYPE_OPTIONS[newType] || []
        const keep = r.subtype && subs.includes(r.subtype)
        return {
          ...r,
          type: newType,
          subtype: keep ? r.subtype : subs[0] || '',
        }
      })
    })
  }, [])

  const removeRow = useCallback((index) => {
    setDraftRows((prev) => {
      if (!prev) return prev
      const next = prev.filter((_, i) => i !== index)
      return next.length === 0 ? null : next
    })
  }, [])

  const missingNpnRowNums = useMemo(() => {
    if (!draftRows?.length) return []
    return draftRows
      .map((r, i) => (!String(r.newPropertyNumber ?? '').trim() ? i + 1 : null))
      .filter((x) => x != null)
  }, [draftRows])

  const importDuplicateIssues = useMemo(
    () => computeImportDuplicateIssues(draftRows, existingAssets, userRegion),
    [draftRows, existingAssets, userRegion],
  )

  const duplicateRowNums = useMemo(
    () => new Set(importDuplicateIssues.map((i) => i.rowNum)),
    [importDuplicateIssues],
  )

  const canImport =
    draftRows?.length > 0 &&
    missingNpnRowNums.length === 0 &&
    importDuplicateIssues.length === 0

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setDraftRows(null)
    try {
      const buffer = await file.arrayBuffer()
      const { assets, errors } = await parseAssetsFromExcel(buffer)
      if (errors?.length) {
        setError(errors.length > 1 ? errors.join(' ') : errors[0])
        return
      }
      if (!assets?.length) {
        setError('No valid rows found. Check that the file uses the expected column names.')
        return
      }
      setDraftRows(normalizeDraftFromParse(assets))
    } catch (err) {
      setError(err.message || 'Could not read file. Use the export template format.')
    }
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!draftRows?.length) return
    const missingNpn = draftRows
      .map((r, i) => (!String(r.newPropertyNumber ?? '').trim() ? i + 1 : null))
      .filter((x) => x != null)
    if (missingNpn.length > 0) {
      const msg = `NEW PROPERTY NUMBER is required for every row. It is missing on row(s) ${missingNpn.join(', ')} (table order). Fill them in or remove those rows, then try Import again.`
      setError(msg)
      toast(msg, 'error')
      return
    }
    const dupPrecheck = computeImportDuplicateIssues(draftRows, existingAssets, userRegion)
    if (dupPrecheck.length > 0) {
      const msg = `Resolve duplicate serial or property numbers on the listed rows before importing (${dupPrecheck.length} row${dupPrecheck.length !== 1 ? 's' : ''}).`
      toast(msg, 'error')
      return
    }
    setError(null)
    setImporting(true)
    let success = 0
    let failed = 0
    const cumulative = [...existingAssets]
    for (const row of draftRows) {
      const payload = rowToImportPayload(row, userRegion)
      if (!payload.name?.trim() || !String(payload.newPropertyNumber ?? '').trim()) {
        failed++
        continue
      }
      const dupMsgs = getAssetDuplicateMessages(payload, cumulative, undefined)
      if (dupMsgs.length > 0) {
        failed++
        console.warn('Import duplicate slipped past pre-check:', payload, dupMsgs)
        continue
      }
      try {
        const created = await createAsset(payload)
        cumulative.push(created)
        success++
      } catch (err) {
        failed++
        console.error('Import row failed:', payload, err)
      }
    }
    setImporting(false)
    if (success > 0) {
      toast(`Imported ${success} asset${success !== 1 ? 's' : ''}`, 'success')
      onImported()
      onClose()
    }
    if (failed > 0) {
      toast(
        `${failed} row${failed !== 1 ? 's' : ''} skipped or failed (e.g. missing name, missing new property number, or server error).`,
        'error',
      )
    }
  }

  const handleClear = () => {
    setDraftRows(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="modal import-modal import-modal-wide"
        style={{ maxWidth: 'min(1120px, 98vw)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>Import Assets</h3>
          <button className="btn-icon" onClick={onClose} type="button">
            <IconX />
          </button>
        </div>
        <div className="modal-body">
          <p className="import-hint">
            Upload an Excel file in the export template format. After loading, <strong>review and edit</strong> rows below,
            then click Import. <strong>NEW PROPERTY NUMBER</strong> is required on every row (imports are blocked if it is missing).
            Columns: ARTICLE → type/subtype, DESCRIPTION → name (optional S/N in text), SERIAL NUMBER,
            OLD/NEW property numbers,
            year, value, issued to, location, quantities, remarks.
          </p>

          <div className="import-upload-card">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="import-file-input"
            />
            <button
              type="button"
              className="btn btn-ghost import-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconUpload />
              <span>
                <span className="import-upload-btn-title">Choose Excel file</span>
                <span className="import-upload-btn-meta">.xlsx or .xls · same columns as export</span>
              </span>
            </button>
          </div>

          {error && <div className="import-error">{error}</div>}

          {draftRows && draftRows.length > 0 && (
            <div className="import-draft-panel">
              <div className="import-draft-toolbar">
                <div className="import-draft-toolbar-left">
                  <h4 className="import-draft-heading">Review &amp; edit</h4>
                  <span className="import-draft-badge" title="Rows ready to import">
                    {draftRows.length} row{draftRows.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="import-draft-scroll-hint" aria-hidden="true">
                  <span className="import-draft-scroll-icon">↔</span> Scroll sideways for all columns
                </p>
              </div>
              <p className="import-draft-hint">
                Edit any cell below. Use <strong>Remove</strong> to drop a row. <strong>Import</strong> stays disabled until every row has a New # and no duplicate new/old property number or serial (vs the registry or another row in this file).
              </p>

              {missingNpnRowNums.length > 0 && (
                <div className="import-block-banner import-block-banner-npn" role="status">
                  <strong>Missing New #</strong>
                  <p>
                    Row{missingNpnRowNums.length !== 1 ? 's' : ''} <strong>{missingNpnRowNums.join(', ')}</strong> need a NEW PROPERTY NUMBER before you can import.
                  </p>
                </div>
              )}

              {importDuplicateIssues.length > 0 && (
                <div className="import-block-banner import-block-banner-dup" role="alert">
                  <strong>Duplicate values — import blocked</strong>
                  <p className="import-block-banner-lead">
                    These rows clash with an asset already in the system or with an earlier row in this table. Change the New #, Old #, or Serial, or remove the row.
                  </p>
                  <ul className="import-dup-issue-list">
                    {importDuplicateIssues.map(({ rowNum, messages }) => (
                      <li key={rowNum} className="import-dup-issue-item">
                        <span className="import-dup-issue-row">Row {rowNum}</span>
                        <ul className="import-dup-issue-msgs">
                          {messages.map((m, j) => (
                            <li key={j}>{m}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="import-draft-wrap">
                <table className="import-draft-table">
                  <thead>
                    <tr className="import-draft-head-group">
                      <th rowSpan={2} className="import-col-idx import-sticky-left" scope="col">
                        #
                      </th>
                      <th colSpan={2} scope="colgroup" className="import-th-merge">
                        Classification
                      </th>
                      <th colSpan={4} scope="colgroup" className="import-th-merge">
                        Identification
                      </th>
                      <th colSpan={3} scope="colgroup" className="import-th-merge">
                        Status &amp; value
                      </th>
                      <th colSpan={2} scope="colgroup" className="import-th-merge">
                        Assignment
                      </th>
                      <th colSpan={2} scope="colgroup" className="import-th-merge">
                        Quantities
                      </th>
                      <th rowSpan={2} scope="col" className="import-col-notes">
                        Notes
                      </th>
                      <th rowSpan={2} className="import-col-del import-sticky-right import-th-del" scope="col" aria-label="Remove" />
                    </tr>
                    <tr className="import-draft-head-cols">
                      <th scope="col" className="import-th-sub import-col-type">
                        Type
                      </th>
                      <th scope="col" className="import-th-sub import-col-sub">
                        Subtype
                      </th>
                      <th scope="col" className="import-th-sub import-col-name">
                        Name
                      </th>
                      <th scope="col" className="import-th-sub import-col-prop">
                        Old #
                      </th>
                      <th scope="col" className="import-th-sub import-col-prop">
                        New #
                      </th>
                      <th scope="col" className="import-th-sub import-col-sn">
                        Serial
                      </th>
                      <th scope="col" className="import-th-sub import-col-status">
                        Status
                      </th>
                      <th scope="col" className="import-th-sub import-col-yr">
                        Year
                      </th>
                      <th scope="col" className="import-th-sub import-col-val" title="Total value (PHP)">
                        Value
                      </th>
                      <th scope="col" className="import-th-sub import-col-mid">
                        Issued to
                      </th>
                      <th scope="col" className="import-th-sub import-col-mid">
                        Location
                      </th>
                      <th scope="col" className="import-th-sub import-col-qty">
                        Q.card
                      </th>
                      <th scope="col" className="import-th-sub import-col-qty">
                        Q.phys
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftRows.map((row, index) => {
                      const subtypes = SUBTYPE_OPTIONS[row.type] || []
                      const rowNum = index + 1
                      const isDupRow = duplicateRowNums.has(rowNum)
                      const isNpnMissing = !String(row.newPropertyNumber ?? '').trim()
                      return (
                        <tr
                          key={row.__draftId}
                          className={
                            isDupRow ? 'import-draft-row-dup' : isNpnMissing ? 'import-draft-row-npn' : undefined
                          }
                        >
                          <td className="import-col-idx-cell import-sticky-left">
                            <span className="import-row-num">{index + 1}</span>
                          </td>
                          <td>
                            <select
                              className="import-cell-select"
                              value={row.type}
                              onChange={(e) => onTypeChange(index, e.target.value)}
                              aria-label={`Row ${index + 1} type`}
                            >
                              {TYPE_OPTIONS.map((t) => (
                                <option key={t} value={t}>
                                  {TYPE_LABELS[t]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="import-cell-select"
                              value={row.subtype || ''}
                              onChange={(e) => updateRow(index, { subtype: e.target.value })}
                              aria-label={`Row ${index + 1} subtype`}
                            >
                              <option value="">—</option>
                              {subtypes.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              className="import-cell-input"
                              value={row.name}
                              onChange={(e) => updateRow(index, { name: e.target.value })}
                              placeholder="Name"
                              aria-label={`Row ${index + 1} name`}
                            />
                          </td>
                          <td>
                            <input
                              className="import-cell-input import-cell-mono"
                              value={row.assetTag}
                              onChange={(e) => updateRow(index, { assetTag: e.target.value })}
                              placeholder="Old #"
                            />
                          </td>
                          <td>
                            <input
                              className="import-cell-input import-cell-mono"
                              value={row.newPropertyNumber}
                              onChange={(e) => updateRow(index, { newPropertyNumber: e.target.value })}
                              placeholder="New #"
                            />
                          </td>
                          <td>
                            <input
                              className="import-cell-input import-cell-mono"
                              value={row.serialNumber}
                              onChange={(e) => updateRow(index, { serialNumber: e.target.value })}
                              placeholder="S/N"
                            />
                          </td>
                          <td>
                            <select
                              className="import-cell-select"
                              value={row.status}
                              onChange={(e) => updateRow(index, { status: e.target.value })}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_LABELS[s]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              className="import-cell-input import-cell-num"
                              type="number"
                              min="1900"
                              max="2099"
                              value={row.yearOfAcquisition}
                              onChange={(e) => updateRow(index, { yearOfAcquisition: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="import-cell-input import-cell-num"
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.value}
                              onChange={(e) => updateRow(index, { value: e.target.value })}
                              title="PHP"
                            />
                          </td>
                          <td>
                            <input
                              className="import-cell-input"
                              value={row.issuedTo}
                              onChange={(e) => updateRow(index, { issuedTo: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="import-cell-input"
                              value={row.location}
                              onChange={(e) => updateRow(index, { location: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="import-cell-input import-cell-num"
                              type="number"
                              min="0"
                              value={row.quantityPerPropertyCard}
                              onChange={(e) => updateRow(index, { quantityPerPropertyCard: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="import-cell-input import-cell-num"
                              type="number"
                              min="0"
                              value={row.quantityPerPhysicalCount}
                              onChange={(e) => updateRow(index, { quantityPerPhysicalCount: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="import-cell-input"
                              value={row.notes}
                              onChange={(e) => updateRow(index, { notes: e.target.value })}
                              placeholder="Remarks"
                            />
                          </td>
                          <td className="import-col-del import-sticky-right">
                            <button
                              type="button"
                              className="btn-icon danger import-row-del"
                              title={`Remove row ${index + 1}`}
                              onClick={() => removeRow(index)}
                            >
                              <IconTrash />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={draftRows ? handleClear : onClose}>
            {draftRows ? 'Clear' : 'Cancel'}
          </button>
          {draftRows && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={importing || !canImport}
              title={
                !canImport && draftRows.length > 0
                  ? missingNpnRowNums.length
                    ? 'Fill in New # on every row'
                    : importDuplicateIssues.length
                      ? 'Fix duplicate property numbers or serials listed above'
                      : undefined
                  : undefined
              }
            >
              {importing ? 'Importing…' : `Import ${draftRows.length} asset${draftRows.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
