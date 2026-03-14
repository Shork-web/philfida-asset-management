import { useState } from 'react'
import { deleteAsset } from '../lib/api'
import { IconX } from './Icons'

export default function DeleteConfirm({ asset, onClose, onDeleted, toast }) {
  const [deleting, setDeleting] = useState(false)

  const onConfirm = async () => {
    setDeleting(true)
    try {
      await deleteAsset(asset.id)
      toast(`"${asset.name}" deleted`, 'success')
      onDeleted()
      onClose()
    } catch (err) {
      toast(err.response?.data?.message || 'Could not delete asset.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Delete Asset</h3>
          <button className="btn-icon" onClick={onClose} type="button"><IconX /></button>
        </div>
        <div className="confirm-body">
          <p>Are you sure you want to delete <strong>{asset.name}</strong>?</p>
          <p className="confirm-sub">Tag: {asset.assetTag} &middot; This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
