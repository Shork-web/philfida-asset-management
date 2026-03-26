import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { findAssetDuplicateGroups, getUniqueAssetIdsInDuplicateGroups } from '../lib/api'
import { useAssetsSubscription } from '../lib/useAssetsSubscription'
import { TYPE_LABELS, formatPHP, getAssetLifeInfo, ASSET_LIFE_YEARS } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import AssetFormModal from '../components/AssetFormModal'
import AssetQRModal from '../components/AssetQRModal'
import DeleteConfirm from '../components/DeleteConfirm'
import { useToasts } from '../lib/useToasts'
import { ToastContainer } from '../components/Toasts'
import { IconRefresh, IconEdit, IconEye, IconX, IconQrCode, IconTrash } from '../components/Icons'

function formatLifeIndicator(info) {
  if (!info) return null
  const { age, yearsLeft, forReplacement } = info
  const ageStr = `${age} yr${age !== 1 ? 's' : ''} in service`
  if (forReplacement) {
    return { primary: `${ageStr} · ⚠ For Replacement`, yearsLeft: null }
  }
  return { primary: ageStr, yearsLeft: yearsLeft > 0 ? `${yearsLeft} yr${yearsLeft !== 1 ? 's' : ''} left` : null }
}

export default function Duplicates() {
  const { userRegion, userRole } = useAuth() || {}
  const isViewer = userRole === 'viewer'
  const { toasts, push: toast } = useToasts()
  const { assets, loading, manualRefresh } = useAssetsSubscription(userRegion, toast)
  const [editingAsset, setEditingAsset] = useState(null)
  const [deletingAsset, setDeletingAsset] = useState(null)
  const [viewingAsset, setViewingAsset] = useState(null)
  const [qrAsset, setQrAsset] = useState(null)

  const syncAfterMutation = useCallback(() => {}, [])

  const duplicateGroups = useMemo(
    () => findAssetDuplicateGroups(assets).filter((g) => g.field === 'assetTag'),
    [assets],
  )
  const affectedIds = useMemo(() => getUniqueAssetIdsInDuplicateGroups(duplicateGroups), [duplicateGroups])

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Duplicates</h1>
          <p>
            Assets that share the same old property number (case-insensitive match).
            {userRegion && (
              <span className={`region-badge${userRegion === 'all' ? ' region-badge-admin' : ''}`}>
                {userRegion === 'all' ? 'Admin — All Regions' : `Region ${userRegion}`}
              </span>
            )}
          </p>
        </div>
      </header>

      <section className="stats">
        <article className="stat-card warning">
          <p className="stat-label">Duplicate groups</p>
          <strong className="stat-value">{loading ? '—' : duplicateGroups.length}</strong>
        </article>
        <article className="stat-card danger">
          <p className="stat-label">Assets involved</p>
          <strong className="stat-value">{loading ? '—' : affectedIds.size}</strong>
        </article>
        <article className="stat-card">
          <p className="stat-label">Total assets scanned</p>
          <strong className="stat-value">{loading ? '—' : assets.length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Duplicate entries</h2>
          <div className="panel-actions">
            <button className="btn btn-ghost btn-sm" onClick={manualRefresh} disabled={loading}>
              <IconRefresh /> Refresh
            </button>
          </div>
        </div>

        {loading && <p className="panel-empty">Loading…</p>}

        {!loading && duplicateGroups.length === 0 && (
          <p className="panel-empty">No duplicate old property numbers found.</p>
        )}

        {!loading &&
          duplicateGroups.map((group) => (
            <article key={group.id} className="dup-group">
              <header className="dup-group-head">
                <span className="dup-badge dup-badge-old">Old Property Number</span>
                <strong className="dup-group-value" title={group.displayValue}>
                  {group.displayValue || '(empty)'}
                </strong>
                <span className="dup-group-count">{group.assets.length} records</span>
              </header>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Old property #</th>
                      <th>New property #</th>
                      <th>Serial</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Issued to</th>
                      <th>Location</th>
                      <th>Region</th>
                      <th>Value</th>
                      <th style={{ width: isViewer ? 90 : 168 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.assets.map((a) => {
                      const lifeInfo = getAssetLifeInfo(a.yearOfAcquisition)
                      const lifeIndicator = formatLifeIndicator(lifeInfo)
                      const forReplacement = lifeInfo?.forReplacement ?? false
                      return (
                        <tr key={a.id} className={forReplacement ? 'row-for-replacement' : ''}>
                          <td>
                            <span className="asset-name">{a.name || '—'}</span>
                            {a.serialNumber && (
                              <>
                                <br />
                                <span className="asset-serial">S/N: {a.serialNumber}</span>
                              </>
                            )}
                            {lifeIndicator && (
                              <>
                                <br />
                                <span className={`life-indicator ${forReplacement ? 'life-indicator-over' : ''}`}>
                                  {lifeIndicator.primary}
                                  {lifeIndicator.yearsLeft && (
                                    <span className="life-years-left"> · {lifeIndicator.yearsLeft}</span>
                                  )}
                                </span>
                              </>
                            )}
                          </td>
                          <td>
                            {a.assetTag ? (
                              <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{a.assetTag}</strong>
                            ) : (
                              <span style={{ color: 'var(--color-gray-400)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {a.newPropertyNumber ? (
                              <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{a.newPropertyNumber}</strong>
                            ) : (
                              <span style={{ color: 'var(--color-gray-400)' }}>—</span>
                            )}
                          </td>
                          <td>
                            {a.serialNumber ? (
                              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{a.serialNumber}</span>
                            ) : (
                              <span style={{ color: 'var(--color-gray-400)' }}>—</span>
                            )}
                          </td>
                          <td>
                            <span>{TYPE_LABELS[a.type] || a.type || '—'}</span>
                            {a.subtype && (
                              <>
                                <br />
                                <span className="asset-serial">{a.subtype}</span>
                              </>
                            )}
                          </td>
                          <td>
                            <StatusBadge status={a.status} />
                          </td>
                          <td>{a.issuedTo || <span style={{ color: 'var(--color-gray-400)' }}>—</span>}</td>
                          <td>{a.location || <span style={{ color: 'var(--color-gray-400)' }}>—</span>}</td>
                          <td>{a.region != null && a.region !== '' ? a.region : '—'}</td>
                          <td>{formatPHP(a.value)}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                type="button"
                                className="btn-icon"
                                title="View details"
                                onClick={() => setViewingAsset(a)}
                              >
                                <IconEye />
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                title="QR Code"
                                onClick={() => setQrAsset(a)}
                              >
                                <IconQrCode />
                              </button>
                              {!isViewer && (
                                <>
                                  <button
                                    type="button"
                                    className="btn-icon"
                                    title="Edit asset"
                                    onClick={() => setEditingAsset(a)}
                                  >
                                    <IconEdit />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-icon danger"
                                    title="Delete asset"
                                    onClick={() => setDeletingAsset(a)}
                                  >
                                    <IconTrash />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
      </section>

      {viewingAsset && (
        <div className="overlay" onMouseDown={() => setViewingAsset(null)}>
          <div className="modal asset-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Asset Details</h3>
              {getAssetLifeInfo(viewingAsset.yearOfAcquisition)?.forReplacement && (
                <span className="replacement-badge-lg">⚠ For Replacement</span>
              )}
              <button className="btn-icon" onClick={() => setViewingAsset(null)} type="button">
                <IconX />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Region</span>
                  <span className="detail-value">
                    {viewingAsset.region != null && viewingAsset.region !== ''
                      ? viewingAsset.region
                      : <span className="text-muted">N/A</span>}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Old Property Number</span>
                  <span className="detail-value mono">{viewingAsset.assetTag || <span className="text-muted">N/A</span>}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">New Property Number</span>
                  <span className="detail-value mono">
                    {viewingAsset.newPropertyNumber || <span className="text-muted">N/A</span>}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{viewingAsset.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Description</span>
                  <span className="detail-value">
                    {viewingAsset.description || <span className="text-muted">N/A</span>}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Serial Number</span>
                  <span className="detail-value">
                    {viewingAsset.serialNumber || <span className="text-muted">N/A</span>}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{TYPE_LABELS[viewingAsset.type] || viewingAsset.type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Subtype</span>
                  <span className="detail-value">
                    {viewingAsset.subtype || <span className="text-muted">N/A</span>}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    <StatusBadge status={viewingAsset.status} />
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Year of Acquisition & Service Life</span>
                  <span className="detail-value">
                    {viewingAsset.yearOfAcquisition ? (
                      (() => {
                        const info = getAssetLifeInfo(viewingAsset.yearOfAcquisition)
                        if (!info) return <span className="text-muted">N/A</span>
                        const { age, yearsLeft, forReplacement } = info
                        return (
                          <>
                            {viewingAsset.yearOfAcquisition}
                            <span className="detail-life-info">
                              {' · '}
                              {age} yr{age !== 1 ? 's' : ''} in service
                              {forReplacement ? (
                                <> · <strong style={{ color: '#991b1b' }}>For Replacement</strong></>
                              ) : (
                                <> · {yearsLeft} yr{yearsLeft !== 1 ? 's' : ''} left before {ASSET_LIFE_YEARS}-yr life</>
                              )}
                            </span>
                          </>
                        )
                      })()
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Issued To</span>
                  <span className="detail-value">
                    {viewingAsset.issuedTo || <span className="text-muted">Unissued</span>}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">
                    {viewingAsset.location || <span className="text-muted">N/A</span>}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Value</span>
                  <span className="detail-value">{formatPHP(viewingAsset.value)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Qty Per Property Card</span>
                  <span className="detail-value">
                    {viewingAsset.quantityPerPropertyCard ?? <span className="text-muted">N/A</span>}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Qty Per Physical Count</span>
                  <span className="detail-value">
                    {viewingAsset.quantityPerPhysicalCount ?? <span className="text-muted">N/A</span>}
                  </span>
                </div>
              </div>
              <div className="detail-notes">
                <span className="detail-label">Notes</span>
                <div className="detail-notes-content">
                  {viewingAsset.notes || <span className="text-muted">No notes for this asset.</span>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setViewingAsset(null)}>
                Close
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setQrAsset(viewingAsset)}>
                <IconQrCode /> QR Code
              </button>
              {!isViewer && (
                <>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setDeletingAsset(viewingAsset)
                    }}
                  >
                    <IconTrash /> Delete
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setViewingAsset(null)
                      setEditingAsset(viewingAsset)
                    }}
                  >
                    <IconEdit /> Edit Asset
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {qrAsset && <AssetQRModal asset={qrAsset} onClose={() => setQrAsset(null)} />}

      {!isViewer && deletingAsset && (
        <DeleteConfirm
          asset={deletingAsset}
          onClose={() => setDeletingAsset(null)}
          onDeleted={() => {
            const id = deletingAsset.id
            setViewingAsset((v) => (v?.id === id ? null : v))
            setQrAsset((q) => (q?.id === id ? null : q))
            setEditingAsset((e) => (e?.id === id ? null : e))
          }}
          toast={toast}
        />
      )}

      {!isViewer && editingAsset && (
        <AssetFormModal
          asset={editingAsset}
          userRegion={userRegion}
          existingAssets={assets}
          onClose={() => setEditingAsset(null)}
          onSaved={syncAfterMutation}
          toast={toast}
        />
      )}
      <ToastContainer toasts={toasts} />
    </>
  )
}
