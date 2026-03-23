import { useState } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { createAsset, updateAsset, getAssetDuplicateMessages } from '../lib/api'
import { STATUS_OPTIONS, STATUS_LABELS, TYPE_OPTIONS, TYPE_LABELS, SUBTYPE_OPTIONS, EMPTY_FORM } from '../lib/constants'
import { IconX } from './Icons'

function formatIssuedHistoryDate(iso) {
  if (!iso) return ''
  try {
    const d = parseISO(iso)
    return isValid(d) ? format(d, 'MMM d, yyyy h:mm a') : iso
  } catch {
    return iso
  }
}

function FormSection({ title, children, columns = 2 }) {
  return (
    <div className="af-section">
      <p className="af-section-title">{title}</p>
      <div className="af-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {children}
      </div>
    </div>
  )
}

export default function AssetFormModal({ asset, userRegion, existingAssets = [], onClose, onSaved, toast }) {
  const isEdit = Boolean(asset)
  const [form, setForm] = useState(
    asset
      ? {
          assetTag: asset.assetTag,
          newPropertyNumber: asset.newPropertyNumber || '',
          name: asset.name,
          description: asset.description || '',
          type: asset.type,
          subtype: asset.subtype || '',
          status: asset.status,
          serialNumber: asset.serialNumber || '',
          issuedTo: asset.issuedTo || '',
          location: asset.location || '',
          yearOfAcquisition: asset.yearOfAcquisition != null ? String(asset.yearOfAcquisition) : '',
          value: asset.value != null ? String(asset.value) : '',
          quantityPerPropertyCard: asset.quantityPerPropertyCard != null ? String(asset.quantityPerPropertyCard) : '',
          quantityPerPhysicalCount: asset.quantityPerPhysicalCount != null ? String(asset.quantityPerPhysicalCount) : '',
          notes: asset.notes || '',
        }
      : { ...EMPTY_FORM },
  )
  const [saving, setSaving] = useState(false)

  const subtypes = SUBTYPE_OPTIONS[form.type] || []

  const onChange = (e) => {
    const { name, value } = e.target
    if (name === 'type') {
      const newSubtypes = SUBTYPE_OPTIONS[value] || []
      setForm((prev) => ({
        ...prev,
        type: value,
        subtype: newSubtypes.length > 0 ? newSubtypes[0] : '',
      }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      assetTag: form.assetTag.trim() || null,
      newPropertyNumber: form.newPropertyNumber.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      subtype: form.subtype || null,
      status: form.status,
      serialNumber: form.serialNumber.trim() || null,
      issuedTo: form.issuedTo.trim() || null,
      location: form.location.trim() || null,
      yearOfAcquisition: form.yearOfAcquisition ? Number(form.yearOfAcquisition) : null,
      value: form.value ? Number(form.value) : null,
      quantityPerPropertyCard: form.quantityPerPropertyCard ? Number(form.quantityPerPropertyCard) : null,
      quantityPerPhysicalCount: form.quantityPerPhysicalCount ? Number(form.quantityPerPhysicalCount) : null,
      notes: form.notes.trim() || null,
      ...(isEdit ? {} : { region: userRegion && userRegion !== 'all' ? userRegion : null }),
    }

    const dupMsgs = getAssetDuplicateMessages(payload, existingAssets, isEdit ? asset.id : undefined)
    if (dupMsgs.length > 0) {
      toast(
        dupMsgs.length === 1
          ? dupMsgs[0]
          : `Duplicate entries:\n${dupMsgs.map((m) => `• ${m}`).join('\n')}`,
        'error',
      )
      setSaving(false)
      return
    }

    try {
      if (isEdit) {
        await updateAsset(asset.id, payload)
        toast(`"${payload.name}" updated`, 'success')
      } else {
        await createAsset(payload)
        toast(`"${payload.name}" created`, 'success')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast(err.message || 'Could not save asset.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isEdit ? 'Edit Asset' : 'New Asset'}</h3>
          <button className="btn-icon" onClick={onClose} type="button"><IconX /></button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="modal-body">

            {/* ── Property Numbers ── */}
            <FormSection title="Property Numbers" columns={2}>
              <div className="form-group">
                <label htmlFor="af-assetTag">Old Property Number <span className="af-optional">Optional</span></label>
                <input id="af-assetTag" name="assetTag" placeholder="e.g. 19225-1469" value={form.assetTag} onChange={onChange} />
              </div>
              <div className="form-group">
                <label htmlFor="af-newPropertyNumber">New Property Number <span className="af-required">*</span></label>
                <input id="af-newPropertyNumber" name="newPropertyNumber" placeholder="e.g. 2024-0042" value={form.newPropertyNumber} onChange={onChange} required />
              </div>
            </FormSection>

            {/* ── Asset Identity ── */}
            <FormSection title="Asset Details" columns={3}>
              <div className="form-group af-span-2">
                <label htmlFor="af-name">Name <span className="af-required">*</span></label>
                <input id="af-name" name="name" placeholder="e.g. HP EliteBook 840" value={form.name} onChange={onChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="af-serial">Serial Number <span className="af-optional">Optional</span></label>
                <input id="af-serial" name="serialNumber" placeholder="e.g. SN-00123" value={form.serialNumber} onChange={onChange} />
              </div>
              <div className="form-group af-span-3">
                <label htmlFor="af-description">Description <span className="af-optional">Optional</span></label>
                <textarea id="af-description" name="description" rows="2" placeholder="e.g. RAM size, storage size, and other specs..." value={form.description} onChange={onChange} />
              </div>
              <div className="form-group">
                <label htmlFor="af-type">Type</label>
                <select id="af-type" name="type" value={form.type} onChange={onChange}>
                  {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="af-subtype">Subtype</label>
                <select id="af-subtype" name="subtype" value={form.subtype} onChange={onChange}>
                  <option value="">— Select —</option>
                  {subtypes.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="af-status">Status</label>
                <select id="af-status" name="status" value={form.status} onChange={onChange}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            </FormSection>

            {/* ── Acquisition & Assignment ── */}
            <FormSection title="Acquisition & Assignment" columns={2}>
              <div className="form-group">
                <label htmlFor="af-year">Year of Acquisition</label>
                <input
                  id="af-year"
                  name="yearOfAcquisition"
                  type="number"
                  min="1900"
                  max="2099"
                  placeholder={String(new Date().getFullYear())}
                  value={form.yearOfAcquisition}
                  onChange={onChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="af-value">Total Value (PHP)</label>
                <input id="af-value" name="value" type="number" step="0.01" min="0" placeholder="0.00" value={form.value} onChange={onChange} />
              </div>
              <div className="form-group">
                <label htmlFor="af-issuedTo">Issued To</label>
                <input id="af-issuedTo" name="issuedTo" placeholder="Person name" value={form.issuedTo} onChange={onChange} />
              </div>
              <div className="form-group">
                <label htmlFor="af-location">Location</label>
                <input id="af-location" name="location" placeholder="Office / room / building" value={form.location} onChange={onChange} />
              </div>
            </FormSection>

            {/* ── Quantities ── */}
            <FormSection title="Quantities" columns={2}>
              <div className="form-group">
                <label htmlFor="af-qtyPropCard">Quantity Per Property Card</label>
                <input id="af-qtyPropCard" name="quantityPerPropertyCard" type="number" min="0" placeholder="0" value={form.quantityPerPropertyCard} onChange={onChange} />
              </div>
              <div className="form-group">
                <label htmlFor="af-qtyPhysCount">Quantity Per Physical Count</label>
                <input id="af-qtyPhysCount" name="quantityPerPhysicalCount" type="number" min="0" placeholder="0" value={form.quantityPerPhysicalCount} onChange={onChange} />
              </div>
            </FormSection>

            {/* ── Remarks ── */}
            <div className="af-section">
              <p className="af-section-title">Remarks</p>
              <div className="form-group">
                <textarea id="af-notes" name="notes" rows="2" placeholder="e.g. POOR condition, good condition, bad condition" value={form.notes} onChange={onChange} />
              </div>
            </div>

            {/* ── Issued to history (read-only; updated when Issued to changes on save) ── */}
            <div className="af-section">
              <p className="af-section-title">Issued to history</p>
              {!isEdit && (
                <p className="af-history-empty">
                  After this asset is saved, each time you change <strong>Issued to</strong> and save, the previous name is
                  recorded here (newest first).
                </p>
              )}
              {isEdit && (!asset.issuedToHistory || asset.issuedToHistory.length === 0) && (
                <p className="af-history-empty">
                  No previous assignees yet. When you change <strong>Issued to</strong> from a non-empty name and save, the
                  prior name will appear here.
                </p>
              )}
              {isEdit && asset.issuedToHistory && asset.issuedToHistory.length > 0 && (
                <ul className="af-issued-history-list">
                  {asset.issuedToHistory.map((entry, idx) => (
                    <li key={`${entry.name}-${entry.changedAt}-${idx}`} className="af-issued-history-item">
                      <span className="af-issued-history-name">{entry.name}</span>
                      <span className="af-issued-history-meta">
                        {entry.changedAt ? formatIssuedHistoryDate(entry.changedAt) : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
