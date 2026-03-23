import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { fetchAssets } from '../lib/api'
import { SERVICEABLE_STATUSES, formatPHP } from '../lib/constants'
import AssetTable from '../components/AssetTable'
import AssetFormModal from '../components/AssetFormModal'
import DeleteConfirm from '../components/DeleteConfirm'
import BulkDeleteConfirm from '../components/BulkDeleteConfirm'
import { useToasts } from '../lib/useToasts'
import { ToastContainer } from '../components/Toasts'
import { IconRefresh, IconDownload, IconTrash } from '../components/Icons'
import ExportModal from '../components/ExportModal'

export default function ServiceableAssets() {
  const { userRegion, userRole } = useAuth() || {}
  const isViewer = userRole === 'viewer'
  const [allAssets, setAllAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingAsset, setEditingAsset] = useState(null)
  const [deletingAsset, setDeletingAsset] = useState(null)
  const [bulkDeletingAssets, setBulkDeletingAssets] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showExport, setShowExport] = useState(false)
  const { toasts, push: toast } = useToasts()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAllAssets(await fetchAssets(userRegion ?? 'all'))
    } catch {
      toast('Could not load assets.', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast, userRegion])

  useEffect(() => { load() }, [load])

  const assets = useMemo(
    () => allAssets.filter((a) => SERVICEABLE_STATUSES.includes(a.status)),
    [allAssets],
  )

  const totalValue = useMemo(() => assets.reduce((s, a) => s + (a.value ?? 0), 0), [assets])
  const assignedCount = useMemo(() => assets.filter((a) => a.status === 'ASSIGNED').length, [assets])
  const spareCount = useMemo(() => assets.filter((a) => a.status === 'SPARE').length, [assets])

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Serviceable Assets</h1>
          <p>Assets that are currently assigned or available as spares.</p>
        </div>
      </header>

      <section className="stats">
        <article className="stat-card primary">
          <p className="stat-label">Serviceable</p>
          <strong className="stat-value">{assets.length}</strong>
        </article>
        <article className="stat-card success">
          <p className="stat-label">Assigned</p>
          <strong className="stat-value">{assignedCount}</strong>
        </article>
        <article className="stat-card warning">
          <p className="stat-label">Spare / In Storage</p>
          <strong className="stat-value">{spareCount}</strong>
        </article>
        <article className="stat-card">
          <p className="stat-label">Total Value</p>
          <strong className="stat-value" style={{ fontSize: '1.15rem' }}>{formatPHP(totalValue)}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Serviceable Assets</h2>
          <div className="panel-actions">
            {!isViewer && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setBulkDeletingAssets(assets.filter((a) => selectedIds.has(a.id)))}
                disabled={selectedIds.size === 0}
              >
                <IconTrash /> Bulk Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </button>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowExport(true)}
              disabled={allAssets.length === 0}
            >
              <IconDownload /> Export
            </button>
            <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
              <IconRefresh /> Refresh
            </button>
          </div>
        </div>
        <AssetTable
          assets={assets}
          loading={loading}
          onEdit={setEditingAsset}
          onDelete={setDeletingAsset}
          onBulkDelete={!isViewer ? setBulkDeletingAssets : undefined}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyMessage="No serviceable assets found."
          readonly={isViewer}
        />
      </section>

      {!isViewer && editingAsset && (
        <AssetFormModal
          asset={editingAsset}
          userRegion={userRegion}
          existingAssets={allAssets}
          onClose={() => setEditingAsset(null)}
          onSaved={load}
          toast={toast}
        />
      )}
      {!isViewer && deletingAsset && <DeleteConfirm asset={deletingAsset} onClose={() => setDeletingAsset(null)} onDeleted={load} toast={toast} />}
      {!isViewer && bulkDeletingAssets && (
        <BulkDeleteConfirm assets={bulkDeletingAssets} onClose={() => { setBulkDeletingAssets(null); setSelectedIds(new Set()) }} onDeleted={() => { load(); setSelectedIds(new Set()) }} toast={toast} />
      )}
      {showExport && <ExportModal assets={allAssets} onClose={() => setShowExport(false)} />}
      <ToastContainer toasts={toasts} />
    </>
  )
}
