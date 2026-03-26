import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { fetchAssets, fetchStats } from '../lib/api'
import { formatPHP } from '../lib/constants'
import AssetTable from '../components/AssetTable'
import AssetFormModal from '../components/AssetFormModal'
import DeleteConfirm from '../components/DeleteConfirm'
import BulkDeleteConfirm from '../components/BulkDeleteConfirm'
import { useToasts } from '../lib/useToasts'
import { ToastContainer } from '../components/Toasts'
import { IconPlus, IconRefresh, IconDownload, IconUpload, IconTrash } from '../components/Icons'
import ExportModal from '../components/ExportModal'
import ImportModal from '../components/ImportModal'

export default function Dashboard() {
  const { userRegion, userRole } = useAuth() || {}
  const isViewer = userRole === 'viewer'
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [configError, setConfigError] = useState(null)
  const [stats, setStats] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [deletingAsset, setDeletingAsset] = useState(null)
  const [bulkDeletingAssets, setBulkDeletingAssets] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showExport, setShowExport] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const { toasts, push: toast } = useToasts()

  const load = useCallback(async () => {
    setLoading(true)
    setConfigError(null)
    try {
      const [assetData, statsData] = await Promise.all([
        fetchAssets(userRegion ?? 'all'),
        fetchStats(userRegion ?? 'all'),
      ])
      setAssets(assetData)
      setStats(statsData)
    } catch (err) {
      const msg = err?.message?.includes('Firebase is not configured')
        ? 'Firebase not configured. Add VITE_FIREBASE_* to .env (see .env.example)'
        : err?.message || 'Could not load assets.'
      setConfigError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast, userRegion])

  useEffect(() => { load() }, [load])

  const assigned = stats?.byStatus?.ASSIGNED ?? 0
  const spare = stats?.byStatus?.SPARE ?? 0
  const obsolete = stats?.byStatus?.OBSOLETE ?? 0

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Overview of all Assets and quick actions.
            {userRegion && (
              <span className={`region-badge${userRegion === 'all' ? ' region-badge-admin' : ''}`}>
                {userRegion === 'all' ? 'Admin — All Regions' : `Region ${userRegion}`}
              </span>
            )}
          </p>
        </div>
        {!isViewer && (
          <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setBulkDeletingAssets(assets.filter((a) => selectedIds.has(a.id)))}
              disabled={selectedIds.size === 0}
            >
              <IconTrash /> Bulk Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </button>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <IconPlus /> Add Asset
            </button>
          </div>
        )}
      </header>

      <section className="stats">
        <article className="stat-card primary">
          <div className="stat-icon-ring primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
          </div>
          <div className="stat-text">
            <p className="stat-label">Total Assets</p>
            <strong className="stat-value">{stats?.total ?? 0}</strong>
          </div>
        </article>
        <article className="stat-card success">
          <div className="stat-icon-ring success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m16 11 2 2 4-4" /></svg>
          </div>
          <div className="stat-text">
            <p className="stat-label">Assigned</p>
            <strong className="stat-value">{assigned}</strong>
          </div>
        </article>
        <article className="stat-card warning">
          <div className="stat-icon-ring warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
          </div>
          <div className="stat-text">
            <p className="stat-label">Spare / In Storage</p>
            <strong className="stat-value">{spare}</strong>
          </div>
        </article>
        <article className="stat-card danger">
          <div className="stat-icon-ring danger">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
          </div>
          <div className="stat-text">
            <p className="stat-label">Obsolete / Disposal</p>
            <strong className="stat-value">{obsolete}</strong>
          </div>
        </article>
        <article className="stat-card accent">
          <div className="stat-icon-ring accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <div className="stat-text">
            <p className="stat-label">Total Value</p>
            <strong className="stat-value">{formatPHP(stats?.totalValue ?? 0)}</strong>
          </div>
        </article>
      </section>

      {configError && (
        <div className="config-error">
          <p>{configError}</p>
        </div>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2>All Assets</h2>
          <div className="panel-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowImport(true)}
            >
              <IconUpload /> Import
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowExport(true)}
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
          onBulkDelete={!isViewer ? setBulkDeletingAssets : undefined}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyMessage='No assets yet. Click "Add Asset" to create one.'
          readonly={isViewer}
        />
      </section>

      {!isViewer && showForm && (
        <AssetFormModal
          asset={null}
          userRegion={userRegion}
          existingAssets={assets}
          onClose={() => setShowForm(false)}
          onSaved={load}
          toast={toast}
        />
      )}
      {!isViewer && editingAsset && (
        <AssetFormModal
          asset={editingAsset}
          userRegion={userRegion}
          existingAssets={assets}
          onClose={() => setEditingAsset(null)}
          onSaved={load}
          toast={toast}
        />
      )}
      {!isViewer && deletingAsset && <DeleteConfirm asset={deletingAsset} onClose={() => setDeletingAsset(null)} onDeleted={load} toast={toast} />}
      {!isViewer && bulkDeletingAssets && (
        <BulkDeleteConfirm
          assets={bulkDeletingAssets}
          onClose={() => { setBulkDeletingAssets(null); setSelectedIds(new Set()) }}
          onDeleted={() => { load(); setSelectedIds(new Set()) }}
          toast={toast}
        />
      )}
      {showExport && (
        <ExportModal assets={assets} userRegion={userRegion} onClose={() => setShowExport(false)} />
      )}
      {showImport && !isViewer && (
        <ImportModal
          userRegion={userRegion}
          existingAssets={assets}
          onClose={() => setShowImport(false)}
          onImported={load}
          toast={toast}
        />
      )}
      <ToastContainer toasts={toasts} />
    </>
  )
}
