import { useMemo } from 'react'
import { SERVICEABLE_STATUSES, UNSERVICEABLE_STATUSES } from '../lib/constants'
import { exportAssetsToExcel } from '../lib/exportExcel'
import { IconX, IconDownload } from './Icons'

const EXPORT_OPTIONS = [
  { id: 'all', label: 'All Assets', filename: 'PhilFIDA7_All_Assets', filter: (a) => true },
  { id: 'serviceable', label: 'Serviceable Assets', filename: 'PhilFIDA7_Serviceable_Assets', filter: (a) => SERVICEABLE_STATUSES.includes(a.status) },
  { id: 'unserviceable', label: 'Unserviceable / Obsolete', filename: 'PhilFIDA7_Unserviceable_Assets', filter: (a) => UNSERVICEABLE_STATUSES.includes(a.status) },
]

export default function ExportModal({ assets, onClose }) {
  const optionCounts = useMemo(() => {
    return EXPORT_OPTIONS.map((opt) => ({
      ...opt,
      count: assets.filter(opt.filter).length,
    }))
  }, [assets])

  const handleExport = async (option) => {
    const filtered = assets.filter(option.filter)
    if (filtered.length === 0) return
    await exportAssetsToExcel(filtered, option.filename)
    onClose()
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal export-modal" style={{ maxWidth: 420 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Export to Excel</h3>
          <button className="btn-icon" onClick={onClose} type="button"><IconX /></button>
        </div>
        <div className="modal-body">
          <p className="export-modal-hint">Choose what to export:</p>
          <div className="export-options">
            {optionCounts.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="export-option-btn"
                onClick={() => handleExport(opt)}
                disabled={opt.count === 0}
              >
                <span className="export-option-label">{opt.label}</span>
                <span className="export-option-count">{opt.count} asset{opt.count !== 1 ? 's' : ''}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
