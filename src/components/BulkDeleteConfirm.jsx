import { useState } from 'react'
import { deleteAsset } from '../lib/api'
import { IconX } from './Icons'

export default function BulkDeleteConfirm({ assets, onClose, onDeleted, toast }) {
  const [deleting, setDeleting] = useState(false)

  const onConfirm = async () => {
    setDeleting(true)
    let success = 0
    let failed = 0
    for (const asset of assets) {
      try {
        await deleteAsset(asset.id)
        success++
      } catch (err) {
        failed++
      }
    }
    setDeleting(false)
    if (success > 0) {
      toast(`Deleted ${success} asset${success !== 1 ? 's' : ''}`, 'success')
      onDeleted()
      onClose()
    }
    if (failed > 0) {
      toast(`${failed} asset${failed !== 1 ? 's' : ''} could not be deleted`, 'error')
    }
  }

  const count = assets.length

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Bulk Delete</h3>
          <button className="btn-icon" onClick={onClose} type="button"><IconX /></button>
        </div>
        <div className="confirm-body">
          <p>Are you sure you want to delete <strong>{count} asset{count !== 1 ? 's' : ''}</strong>?</p>
          <p className="confirm-sub">This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : `Delete ${count} asset${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
