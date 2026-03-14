import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAssets } from '../lib/api'
import { SERVICEABLE_STATUSES, formatPHP } from '../lib/constants'
import AssetTable from '../components/AssetTable'
import AssetFormModal from '../components/AssetFormModal'
import DeleteConfirm from '../components/DeleteConfirm'
import { useToasts } from '../lib/useToasts'
import { ToastContainer } from '../components/Toasts'
import { IconRefresh, IconDownload } from '../components/Icons'
import { exportAssetsToExcel } from '../lib/exportExcel'

export default function ServiceableAssets() {
  const [allAssets, setAllAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingAsset, setEditingAsset] = useState(null)
  const [deletingAsset, setDeletingAsset] = useState(null)
  const { toasts, push: toast } = useToasts()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAllAssets(await fetchAssets())
    } catch {
      toast('Could not load assets.', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

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
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => exportAssetsToExcel(assets, 'PhilFIDA7_Serviceable_Assets')}
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
          emptyMessage="No serviceable assets found."
        />
      </section>

      {editingAsset && <AssetFormModal asset={editingAsset} onClose={() => setEditingAsset(null)} onSaved={load} toast={toast} />}
      {deletingAsset && <DeleteConfirm asset={deletingAsset} onClose={() => setDeletingAsset(null)} onDeleted={load} toast={toast} />}
      <ToastContainer toasts={toasts} />
    </>
  )
}
