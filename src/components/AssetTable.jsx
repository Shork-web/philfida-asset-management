import { useMemo, useState } from 'react'
import { TYPE_OPTIONS, TYPE_LABELS, STATUS_OPTIONS, STATUS_LABELS, formatPHP, getAssetLifeInfo, ASSET_LIFE_YEARS } from '../lib/constants'
import StatusBadge from './StatusBadge'
import { IconEye, IconEdit, IconTrash, IconX, IconQrCode } from './Icons'
import AssetQRModal from './AssetQRModal'

function formatLifeIndicator(info) {
  if (!info) return null
  const { age, yearsLeft, forReplacement } = info
  const ageStr = `${age} yr${age !== 1 ? 's' : ''} in service`
  if (forReplacement) {
    return { primary: `${ageStr} · ⚠ For Replacement`, over: null }
  }
  return { primary: ageStr, yearsLeft: yearsLeft > 0 ? `${yearsLeft} yr${yearsLeft !== 1 ? 's' : ''} left` : null }
}

const SORT_FIELDS = [
  { key: 'assetTag', label: 'Old Property Number' },
  { key: 'newPropertyNumber', label: 'New Property Number' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'issuedTo', label: 'Issued To' },
  { key: 'location', label: 'Location' },
  { key: 'value', label: 'Total Value' },
  { key: 'yearOfAcquisition', label: 'Year of Acquisition' },
]

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function IconSortAsc() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 8 4-4 4 4" /><path d="M7 4v16" />
      <path d="M13 12h8" /><path d="M13 16h6" /><path d="M13 20h4" />
    </svg>
  )
}

function IconSortDesc() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 16 4 4 4-4" /><path d="M7 4v16" />
      <path d="M13 12h8" /><path d="M13 8h6" /><path d="M13 4h4" />
    </svg>
  )
}

export default function AssetTable({ assets, loading, onEdit, onDelete, onBulkDelete, emptyMessage, hideStatusFilter, readonly, selectedIds: controlledSelectedIds, onSelectionChange }) {
  const [viewingAsset, setViewingAsset] = useState(null)
  const [qrAsset, setQrAsset] = useState(null)
  const [internalSelectedIds, setInternalSelectedIds] = useState(new Set())
  const selectedIds = controlledSelectedIds ?? internalSelectedIds
  const setSelectedIds = onSelectionChange ?? setInternalSelectedIds
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const clearFilters = () => {
    setSearch('')
    setFilterType('')
    setFilterStatus('')
    setSortField('')
    setSortDir('asc')
  }

  const hasFilters = search || filterType || filterStatus || sortField

  const filtered = useMemo(() => {
    let list = [...assets]

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.assetTag.toLowerCase().includes(q) ||
          (a.newPropertyNumber && a.newPropertyNumber.toLowerCase().includes(q)) ||
          a.name.toLowerCase().includes(q) ||
          (a.serialNumber && a.serialNumber.toLowerCase().includes(q)) ||
          (a.issuedTo && a.issuedTo.toLowerCase().includes(q)) ||
          (a.location && a.location.toLowerCase().includes(q)) ||
          (a.subtype && a.subtype.toLowerCase().includes(q)),
      )
    }

    if (filterType) {
      list = list.filter((a) => a.type === filterType)
    }

    if (filterStatus) {
      list = list.filter((a) => a.status === filterStatus)
    }

    if (sortField) {
      list.sort((a, b) => {
        let va = a[sortField]
        let vb = b[sortField]
        if (va == null) va = ''
        if (vb == null) vb = ''
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va
        }
        const sa = String(va).toLowerCase()
        const sb = String(vb).toLowerCase()
        if (sa < sb) return sortDir === 'asc' ? -1 : 1
        if (sa > sb) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }

    return list
  }, [assets, search, filterType, filterStatus, sortField, sortDir])

  const statusOptionsToShow = hideStatusFilter ? [] : STATUS_OPTIONS

  const showBulk = !readonly && onBulkDelete
  const selectedCount = selectedIds.size
  const filteredIds = useMemo(() => new Set(filtered.map((a) => a.id)), [filtered])
  const allSelected = filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id))
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map((a) => a.id)))
  }
  const handleBulkDelete = () => {
    const toDelete = filtered.filter((a) => selectedIds.has(a.id))
    if (toDelete.length && onBulkDelete) {
      onBulkDelete(toDelete)
      setSelectedIds(new Set())
    }
  }

  return (
    <>
      <div className="table-toolbar">
        <div className="search-box">
          <IconSearch />
          <input
            type="text"
            placeholder="Search by property no., name, serial, issued to, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="toolbar-filters">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>

          {statusOptionsToShow.length > 0 && (
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {statusOptionsToShow.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          )}

          <select
            value={sortField ? `${sortField}-${sortDir}` : ''}
            onChange={(e) => {
              if (!e.target.value) {
                setSortField('')
                setSortDir('asc')
              } else {
                const [f, d] = e.target.value.split('-')
                setSortField(f)
                setSortDir(d)
              }
            }}
          >
            <option value="">Default Sort</option>
            {SORT_FIELDS.map((sf) => (
              <optgroup key={sf.key} label={sf.label}>
                <option value={`${sf.key}-asc`}>{sf.label} (A-Z / Low-High)</option>
                <option value={`${sf.key}-desc`}>{sf.label} (Z-A / High-Low)</option>
              </optgroup>
            ))}
          </select>

          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters} type="button">
              Clear
            </button>
          )}
        </div>
      </div>

      {hasFilters && (
        <p className="result-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''} found</p>
      )}

      {showBulk && selectedCount > 0 && (
        <div className="bulk-action-bar">
          <span className="bulk-action-count">{selectedCount} selected</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {showBulk && (
                <th className="bulk-th">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    title="Select all"
                  />
                </th>
              )}
              <th className="sortable-th" onClick={() => toggleSort('assetTag')}>
                Old Property No. {sortField === 'assetTag' && (sortDir === 'asc' ? <IconSortAsc /> : <IconSortDesc />)}
              </th>
              <th className="sortable-th" onClick={() => toggleSort('newPropertyNumber')}>
                New Property No. {sortField === 'newPropertyNumber' && (sortDir === 'asc' ? <IconSortAsc /> : <IconSortDesc />)}
              </th>
              <th className="sortable-th" onClick={() => toggleSort('name')}>
                Name {sortField === 'name' && (sortDir === 'asc' ? <IconSortAsc /> : <IconSortDesc />)}
              </th>
              <th className="sortable-th" onClick={() => toggleSort('type')}>
                Type {sortField === 'type' && (sortDir === 'asc' ? <IconSortAsc /> : <IconSortDesc />)}
              </th>
              <th className="sortable-th" onClick={() => toggleSort('status')}>
                Status {sortField === 'status' && (sortDir === 'asc' ? <IconSortAsc /> : <IconSortDesc />)}
              </th>
              <th className="sortable-th" onClick={() => toggleSort('issuedTo')}>
                Issued To {sortField === 'issuedTo' && (sortDir === 'asc' ? <IconSortAsc /> : <IconSortDesc />)}
              </th>
              <th className="sortable-th" onClick={() => toggleSort('location')}>
                Location {sortField === 'location' && (sortDir === 'asc' ? <IconSortAsc /> : <IconSortDesc />)}
              </th>
              <th className="sortable-th" onClick={() => toggleSort('value')}>
                Total Value {sortField === 'value' && (sortDir === 'asc' ? <IconSortAsc /> : <IconSortDesc />)}
              </th>
              <th style={{ width: readonly ? 90 : 130 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={showBulk ? 10 : 9} className="empty-state">
                  {hasFilters ? 'No assets match your filters.' : (emptyMessage || 'No assets found.')}
                </td>
              </tr>
            )}
            {filtered.map((asset) => {
              const lifeInfo = getAssetLifeInfo(asset.yearOfAcquisition)
              const lifeIndicator = formatLifeIndicator(lifeInfo)
              const forReplacement = lifeInfo?.forReplacement ?? false
              return (
              <tr key={asset.id} className={forReplacement ? 'row-for-replacement' : ''}>
                {showBulk && (
                  <td className="bulk-td">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(asset.id)}
                      onChange={() => toggleSelect(asset.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                <td><strong style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{asset.assetTag}</strong></td>
                <td>
                  {asset.newPropertyNumber
                    ? <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{asset.newPropertyNumber}</strong>
                    : <span style={{ color: 'var(--color-gray-400)' }}>-</span>}
                </td>
                <td>
                  <span className="asset-name">{asset.name}</span>
                  {asset.serialNumber && <><br /><span className="asset-serial">S/N: {asset.serialNumber}</span></>}
                  {lifeIndicator && (
                    <>
                      <br />
                      <span className={`life-indicator ${forReplacement ? 'life-indicator-over' : ''}`}>
                        {lifeIndicator.primary}
                        {lifeIndicator.yearsLeft && <span className="life-years-left"> · {lifeIndicator.yearsLeft}</span>}
                        {lifeIndicator.over && <span className="life-years-over"> · {lifeIndicator.over}</span>}
                      </span>
                    </>
                  )}
                </td>
                <td>
                  <span>{TYPE_LABELS[asset.type] || asset.type}</span>
                  {asset.subtype && <><br /><span className="asset-serial">{asset.subtype}</span></>}
                </td>
                <td><StatusBadge status={asset.status} /></td>
                <td>{asset.issuedTo || <span style={{ color: 'var(--color-gray-400)' }}>-</span>}</td>
                <td>{asset.location || <span style={{ color: 'var(--color-gray-400)' }}>-</span>}</td>
                <td>{formatPHP(asset.value)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn-icon" title="View details" onClick={() => setViewingAsset(asset)}>
                      <IconEye />
                    </button>
                    <button className="btn-icon" title="QR Code" onClick={() => setQrAsset(asset)}>
                      <IconQrCode />
                    </button>
                    {!readonly && (
                      <>
                        <button className="btn-icon" title="Edit" onClick={() => onEdit(asset)}>
                          <IconEdit />
                        </button>
                        <button className="btn-icon danger" title="Delete" onClick={() => onDelete(asset)}>
                          <IconTrash />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {viewingAsset && (
        <div className="overlay" onMouseDown={() => setViewingAsset(null)}>
          <div className="modal asset-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Asset Details</h3>
              {getAssetLifeInfo(viewingAsset.yearOfAcquisition)?.forReplacement && (
                <span className="replacement-badge-lg">⚠ For Replacement</span>
              )}
              <button className="btn-icon" onClick={() => setViewingAsset(null)} type="button"><IconX /></button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Old Property Number</span>
                  <span className="detail-value mono">{viewingAsset.assetTag}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">New Property Number</span>
                  <span className="detail-value mono">{viewingAsset.newPropertyNumber || <span className="text-muted">N/A</span>}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{viewingAsset.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Serial Number</span>
                  <span className="detail-value">{viewingAsset.serialNumber || <span className="text-muted">N/A</span>}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{TYPE_LABELS[viewingAsset.type] || viewingAsset.type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Subtype</span>
                  <span className="detail-value">{viewingAsset.subtype || <span className="text-muted">N/A</span>}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value"><StatusBadge status={viewingAsset.status} /></span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Year of Acquisition & Service Life</span>
                  <span className="detail-value">
                    {viewingAsset.yearOfAcquisition ? (
                      (() => {
                        const info = getAssetLifeInfo(viewingAsset.yearOfAcquisition)
                        if (!info) return <span className="text-muted">N/A</span>
                        const { age, yearsLeft, forReplacement } = info
                        const LIFE = ASSET_LIFE_YEARS
                        return (
                          <>
                            {viewingAsset.yearOfAcquisition}
                            <span className="detail-life-info">
                              {' · '}{age} yr{age !== 1 ? 's' : ''} in service
                              {forReplacement
                                ? <> · <strong style={{ color: '#991b1b' }}>For Replacement</strong></>
                                : <> · {yearsLeft} yr{yearsLeft !== 1 ? 's' : ''} left before 5-yr life</>}
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
                  <span className="detail-value">{viewingAsset.issuedTo || <span className="text-muted">Unissued</span>}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">{viewingAsset.location || <span className="text-muted">N/A</span>}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Value</span>
                  <span className="detail-value">{formatPHP(viewingAsset.value)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Qty Per Property Card</span>
                  <span className="detail-value">{viewingAsset.quantityPerPropertyCard ?? <span className="text-muted">N/A</span>}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Qty Per Physical Count</span>
                  <span className="detail-value">{viewingAsset.quantityPerPhysicalCount ?? <span className="text-muted">N/A</span>}</span>
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
              <button type="button" className="btn btn-ghost" onClick={() => setViewingAsset(null)}>Close</button>
              <button type="button" className="btn btn-ghost" onClick={() => setQrAsset(viewingAsset)}>
                <IconQrCode /> QR Code
              </button>
              {!readonly && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => { setViewingAsset(null); onEdit(viewingAsset); }}
                >
                  <IconEdit /> Edit Asset
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {qrAsset && (
        <AssetQRModal asset={qrAsset} onClose={() => setQrAsset(null)} />
      )}
    </>
  )
}
