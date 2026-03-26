import { useMemo, useState } from 'react'
import {
  SERVICEABLE_STATUSES,
  UNSERVICEABLE_STATUSES,
  TYPE_OPTIONS,
  TYPE_LABELS,
} from '../lib/constants'
import { exportAssetsToExcel } from '../lib/exportExcel'
import { IconX, IconDownload } from './Icons'

const SCOPE_CHOICES = [
  { id: 'all', label: 'All assets' },
  { id: 'serviceable', label: 'Serviceable' },
  { id: 'unserviceable', label: 'Unserviceable / Obsolete' },
]

const TYPE_CHOICES = [{ id: 'all', label: 'All types' }, ...TYPE_OPTIONS.map((key) => ({ id: key, label: TYPE_LABELS[key] || key }))]

function matchesScope(asset, scopeId) {
  if (scopeId === 'all') return true
  if (scopeId === 'serviceable') return SERVICEABLE_STATUSES.includes(asset.status)
  return UNSERVICEABLE_STATUSES.includes(asset.status)
}

function matchesType(asset, typeKey) {
  if (typeKey === 'all') return true
  return asset.type === typeKey
}

function filterAssets(assets, scopeId, typeKey) {
  return assets.filter((a) => matchesScope(a, scopeId) && matchesType(a, typeKey))
}

function buildExportFilename(scopeId, typeKey, userRegion) {
  const scopePart =
    scopeId === 'all' ? 'All' : scopeId === 'serviceable' ? 'Serviceable' : 'Unserviceable'
  const typePart = typeKey === 'all' ? 'AllTypes' : typeKey
  const regionSegment =
    userRegion === 'all'
      ? 'MasterFile'
      : userRegion
        ? `Region${String(userRegion).replace(/[^a-zA-Z0-9]/g, '')}`
        : 'Export'
  return `PhilFIDA_${regionSegment}_${scopePart}_${typePart}`
}

export default function ExportModal({ assets, onClose, userRegion }) {
  const [scopeId, setScopeId] = useState('all')
  const [typeKey, setTypeKey] = useState('all')

  const filtered = useMemo(
    () => filterAssets(assets, scopeId, typeKey),
    [assets, scopeId, typeKey],
  )

  const scopeCounts = useMemo(() => {
    return SCOPE_CHOICES.map((c) => ({
      ...c,
      count: filterAssets(assets, c.id, typeKey).length,
    }))
  }, [assets, typeKey])

  const typeCounts = useMemo(() => {
    return TYPE_CHOICES.map((c) => ({
      ...c,
      count: filterAssets(assets, scopeId, c.id).length,
    }))
  }, [assets, scopeId])

  const handleExport = async () => {
    if (filtered.length === 0) return
    await exportAssetsToExcel(filtered, buildExportFilename(scopeId, typeKey, userRegion))
    onClose()
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal export-modal" style={{ maxWidth: 480 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Export to Excel</h3>
          <button className="btn-icon" onClick={onClose} type="button">
            <IconX />
          </button>
        </div>
        <div className="modal-body">
          <p className="export-modal-hint">
            Choose a <strong>scope</strong> and an <strong>asset type</strong> (both apply together), then export.
          </p>

          <p className="export-section-label">Scope</p>
          <div className="export-options export-options-compact">
            {scopeCounts.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`export-option-btn${scopeId === opt.id ? ' is-selected' : ''}`}
                onClick={() => setScopeId(opt.id)}
                disabled={opt.count === 0 && scopeId !== opt.id}
                title={opt.count === 0 ? 'No assets match the current type filter' : undefined}
              >
                <span className="export-option-label">{opt.label}</span>
                <span className="export-option-count">{opt.count}</span>
              </button>
            ))}
          </div>

          <p className="export-section-label">Asset type</p>
          <div className="export-options export-options-scroll">
            {typeCounts.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`export-option-btn${typeKey === opt.id ? ' is-selected' : ''}`}
                onClick={() => setTypeKey(opt.id)}
                disabled={opt.count === 0 && typeKey !== opt.id}
                title={opt.count === 0 ? 'No assets match the current scope filter' : undefined}
              >
                <span className="export-option-label">{opt.label}</span>
                <span className="export-option-count">{opt.count}</span>
              </button>
            ))}
          </div>

          <p className="export-summary" role="status">
            <strong>{filtered.length}</strong> asset{filtered.length !== 1 ? 's' : ''} will be exported
            {filtered.length === 0 && ' — adjust scope or type'}
            .
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            <IconDownload /> Export
          </button>
        </div>
      </div>
    </div>
  )
}
