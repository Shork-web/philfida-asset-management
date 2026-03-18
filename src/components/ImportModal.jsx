import { useState, useRef } from 'react'
import { parseAssetsFromExcel } from '../lib/importExcel'
import { createAsset } from '../lib/api'
import { IconX, IconUpload } from './Icons'
import { formatPHP } from '../lib/constants'

export default function ImportModal({ userRegion, onClose, onImported, toast }) {
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setParsed(null)
    try {
      const buffer = await file.arrayBuffer()
      const { assets, errors } = await parseAssetsFromExcel(buffer)
      if (errors?.length) {
        setError(errors[0])
        return
      }
      if (!assets?.length) {
        setError('No valid rows found. Check that the file uses the expected column names.')
        return
      }
      setParsed(assets)
    } catch (err) {
      setError(err.message || 'Could not read file. Use the export template format.')
    }
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!parsed?.length) return
    setImporting(true)
    let success = 0
    let failed = 0
    for (const asset of parsed) {
      try {
        await createAsset({
          ...asset,
          region: userRegion && userRegion !== 'all' ? userRegion : null,
        })
        success++
      } catch (err) {
        failed++
        console.error('Import row failed:', asset, err)
      }
    }
    setImporting(false)
    if (success > 0) {
      toast(`Imported ${success} asset${success !== 1 ? 's' : ''}`, 'success')
      onImported()
      onClose()
    }
    if (failed > 0) {
      toast(`${failed} row${failed !== 1 ? 's' : ''} failed to import`, 'error')
    }
  }

  const handleClear = () => {
    setParsed(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal import-modal" style={{ maxWidth: 640 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Import Assets</h3>
          <button className="btn-icon" onClick={onClose} type="button"><IconX /></button>
        </div>
        <div className="modal-body">
          <p className="import-hint">
            Upload an Excel file with the export template format. Only columns present in the template will be imported:
            ARTICLE, DESCRIPTION, OLD PROPERTY NUMBER, NEW PROPERTY NUMBER, YEAR OF ACQ., TOTAL VALUE, ISSUED TO, LOCATION, QUANTITY per PROPERTY CARD, QUANTITY per PHYSICAL COUNT, REMARKS.
          </p>

          <div className="import-upload">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="import-file-input"
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconUpload /> Choose Excel file
            </button>
          </div>

          {error && <div className="import-error">{error}</div>}

          {parsed && parsed.length > 0 && (
            <div className="import-preview">
              <h4>Preview ({parsed.length} row{parsed.length !== 1 ? 's' : ''})</h4>
              <div className="import-preview-table-wrap">
                <table className="import-preview-table">
                  <thead>
                    <tr>
                      <th>ARTICLE</th>
                      <th>DESCRIPTION</th>
                      <th>OLD PROP</th>
                      <th>VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 10).map((a, i) => (
                      <tr key={i}>
                        <td>{a.subtype || a.type || '—'}</td>
                        <td title={a.name}>{(a.name || '').slice(0, 40)}{(a.name?.length > 40 ? '…' : '')}</td>
                        <td>{a.assetTag || '—'}</td>
                        <td>{formatPHP(a.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.length > 10 && (
                <p className="import-preview-more">… and {parsed.length - 10} more</p>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={parsed ? handleClear : onClose}>
            {parsed ? 'Clear' : 'Cancel'}
          </button>
          {parsed && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? 'Importing…' : `Import ${parsed.length} asset${parsed.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
