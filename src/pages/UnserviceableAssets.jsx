import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { fetchAssets } from '../lib/api'
import { UNSERVICEABLE_STATUSES, formatPHP } from '../lib/constants'
import AssetTable from '../components/AssetTable'
import AssetFormModal from '../components/AssetFormModal'
import DeleteConfirm from '../components/DeleteConfirm'
import { useToasts } from '../lib/useToasts'
import { ToastContainer } from '../components/Toasts'
import { IconRefresh, IconDownload } from '../components/Icons'
import { exportAssetsToExcel } from '../lib/exportExcel'

export default function UnserviceableAssets() {
  const { userRegion, userRole } = useAuth() || {}
  const isViewer = userRole === 'viewer'
  const [allAssets, setAllAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingAsset, setEditingAsset] = useState(null)
  const [deletingAsset, setDeletingAsset] = useState(null)
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
    () => allAssets.filter((a) => UNSERVICEABLE_STATUSES.includes(a.status)),
    [allAssets],
  )

  const totalValue = useMemo(() => assets.reduce((s, a) => s + (a.value ?? 0), 0), [assets])

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Unserviceable Assets</h1>
          <p>Assets marked as obsolete or scheduled for disposal.</p>
        </div>
      </header>

      <section className="stats">
        <article className="stat-card danger">
          <p className="stat-label">Unserviceable</p>
          <strong className="stat-value">{assets.length}</strong>
        </article>
        <article className="stat-card">
          <p className="stat-label">Total Value</p>
          <strong className="stat-value" style={{ fontSize: '1.15rem' }}>{formatPHP(totalValue)}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Unserviceable Assets</h2>
          <div className="panel-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => exportAssetsToExcel(assets, 'PhilFIDA7_Unserviceable_Assets')}
              disabled={assets.length === 0}
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
          emptyMessage="No unserviceable assets found."
          readonly={isViewer}
        />
      </section>

      {!isViewer && editingAsset && <AssetFormModal asset={editingAsset} userRegion={userRegion} onClose={() => setEditingAsset(null)} onSaved={load} toast={toast} />}
      {!isViewer && deletingAsset && <DeleteConfirm asset={deletingAsset} onClose={() => setDeletingAsset(null)} onDeleted={load} toast={toast} />}
      <ToastContainer toasts={toasts} />
    </>
  )
}
