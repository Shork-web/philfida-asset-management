import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchSubscriptions, deleteSubscription,
  getComputedStatus, toMonthlyRate,
  CATEGORY_OPTIONS, CATEGORY_LABELS,
  BILLING_CYCLE_LABELS,
} from '../lib/subscriptionsApi'
import { formatPHP } from '../lib/constants'
import { useToasts } from '../lib/useToasts'
import { ToastContainer } from '../components/Toasts'
import SubscriptionFormModal from '../components/SubscriptionFormModal'
import { IconPlus, IconRefresh, IconEdit, IconTrash, IconX, IconCreditCard, IconCalendar, IconRepeat } from '../components/Icons'

/* ── Helpers ── */
function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

/* ── Status Badge ── */
function SubStatusBadge({ status }) {
  const cfg = {
    ACTIVE:         { cls: 'sub-badge-active',    label: 'Active' },
    EXPIRING_SOON:  { cls: 'sub-badge-expiring',  label: 'Expiring Soon' },
    EXPIRED:        { cls: 'sub-badge-expired',   label: 'Expired' },
    CANCELLED:      { cls: 'sub-badge-cancelled', label: 'Cancelled' },
  }
  const { cls, label } = cfg[status] ?? cfg.ACTIVE
  return <span className={`sub-badge ${cls}`}>{label}</span>
}

/* ── Category Badge ── */
function CategoryBadge({ category }) {
  return <span className="sub-category-badge">{CATEGORY_LABELS[category] ?? category}</span>
}

/* ── Renewal Cell ── */
function RenewalCell({ renewalDate, computedStatus }) {
  if (!renewalDate) return <span className="text-muted">—</span>
  const days = daysUntil(renewalDate)
  let hint = null
  if (computedStatus === 'EXPIRED') {
    hint = <span className="renewal-hint renewal-expired">Expired {Math.abs(days)}d ago</span>
  } else if (computedStatus === 'EXPIRING_SOON') {
    hint = <span className="renewal-hint renewal-soon">In {days} day{days !== 1 ? 's' : ''}</span>
  }
  return (
    <div className="renewal-cell">
      <span>{formatDate(renewalDate)}</span>
      {hint}
    </div>
  )
}

/* ── Delete Confirm Modal ── */
function DeleteSubConfirm({ subscription, onClose, onDeleted, toast }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteSubscription(subscription.id)
      toast(`"${subscription.name}" removed`, 'success')
      onDeleted()
      onClose()
    } catch (err) {
      toast(err.message || 'Could not delete subscription.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Remove Subscription</h3>
          <button className="btn-icon" onClick={onClose} type="button"><IconX /></button>
        </div>
        <div className="confirm-body">
          <p>Remove <strong>"{subscription.name}"</strong>?</p>
          <p className="confirm-sub">This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function Subscriptions() {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [configError, setConfigError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSub, setEditingSub] = useState(null)
  const [deletingSub, setDeletingSub] = useState(null)
  const [viewingSub, setViewingSub] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const { toasts, push: toast } = useToasts()

  const load = useCallback(async () => {
    setLoading(true)
    setConfigError(null)
    try {
      const data = await fetchSubscriptions()
      setSubs(data)
    } catch (err) {
      const msg = err?.message?.includes('Firebase is not configured')
        ? 'Firebase not configured. Add VITE_FIREBASE_* to .env'
        : err?.message || 'Could not load subscriptions.'
      setConfigError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  /* Enrich each subscription with its computed status */
  const enriched = useMemo(() =>
    subs.map((s) => ({ ...s, computedStatus: getComputedStatus(s) })),
    [subs],
  )

  /* Stats */
  const stats = useMemo(() => {
    const total = enriched.length
    const active = enriched.filter((s) => s.computedStatus === 'ACTIVE').length
    const expiringSoon = enriched.filter((s) => s.computedStatus === 'EXPIRING_SOON').length
    const expired = enriched.filter((s) => s.computedStatus === 'EXPIRED').length
    const monthlyTotal = enriched
      .filter((s) => s.computedStatus !== 'CANCELLED' && s.computedStatus !== 'EXPIRED')
      .reduce((sum, s) => sum + toMonthlyRate(s.cost, s.billingCycle), 0)
    return { total, active, expiringSoon, expired, monthlyTotal }
  }, [enriched])

  /* Filtered list */
  const filtered = useMemo(() => {
    let list = [...enriched]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.provider && s.provider.toLowerCase().includes(q)) ||
        (s.plan && s.plan.toLowerCase().includes(q)) ||
        (s.accountEmail && s.accountEmail.toLowerCase().includes(q)),
      )
    }
    if (filterCategory) list = list.filter((s) => s.category === filterCategory)
    if (filterStatus)   list = list.filter((s) => s.computedStatus === filterStatus)
    return list
  }, [enriched, search, filterCategory, filterStatus])

  const hasFilters = search || filterCategory || filterStatus

  const clearFilters = () => {
    setSearch('')
    setFilterCategory('')
    setFilterStatus('')
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Subscriptions</h1>
          <p>Track software, internet, and service subscriptions.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <IconPlus /> Add Subscription
        </button>
      </header>

      {/* ── Stats ── */}
      <section className="stats">
        <article className="stat-card primary">
          <div className="stat-icon-ring primary">
            <IconCreditCard />
          </div>
          <div className="stat-text">
            <p className="stat-label">Total</p>
            <strong className="stat-value">{stats.total}</strong>
          </div>
        </article>
        <article className="stat-card success">
          <div className="stat-icon-ring success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
          </div>
          <div className="stat-text">
            <p className="stat-label">Active</p>
            <strong className="stat-value">{stats.active}</strong>
          </div>
        </article>
        <article className="stat-card warning">
          <div className="stat-icon-ring warning">
            <IconCalendar />
          </div>
          <div className="stat-text">
            <p className="stat-label">Expiring Soon</p>
            <strong className="stat-value">{stats.expiringSoon}</strong>
          </div>
        </article>
        <article className="stat-card danger">
          <div className="stat-icon-ring danger">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
          </div>
          <div className="stat-text">
            <p className="stat-label">Expired</p>
            <strong className="stat-value">{stats.expired}</strong>
          </div>
        </article>
        <article className="stat-card accent">
          <div className="stat-icon-ring accent">
            <IconRepeat />
          </div>
          <div className="stat-text">
            <p className="stat-label">Est. Monthly Cost</p>
            <strong className="stat-value">{formatPHP(Math.round(stats.monthlyTotal))}</strong>
          </div>
        </article>
      </section>

      {configError && (
        <div className="config-error"><p>{configError}</p></div>
      )}

      {/* ── Table Panel ── */}
      <section className="panel">
        <div className="panel-header">
          <h2>All Subscriptions</h2>
          <div className="panel-actions">
            <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
              <IconRefresh /> Refresh
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              type="text"
              placeholder="Search by name, provider, plan, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="toolbar-filters">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRING_SOON">Expiring Soon</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters} type="button">Clear</button>
            )}
          </div>
        </div>

        {hasFilters && (
          <p className="result-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''} found</p>
        )}

        {/* Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subscription</th>
                <th>Category</th>
                <th>Plan</th>
                <th>Billing</th>
                <th>Cost</th>
                <th>Renewal Date</th>
                <th>Status</th>
                <th style={{ width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-state">
                    {hasFilters ? 'No subscriptions match your filters.' : 'No subscriptions yet. Click "Add Subscription" to create one.'}
                  </td>
                </tr>
              )}
              {filtered.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <span className="sub-name">{sub.name}</span>
                    {sub.provider && <><br /><span className="sub-provider">{sub.provider}</span></>}
                    {sub.seats && <><br /><span className="sub-provider">{sub.seats} seat{sub.seats !== 1 ? 's' : ''}</span></>}
                  </td>
                  <td><CategoryBadge category={sub.category} /></td>
                  <td>{sub.plan || <span className="text-muted">—</span>}</td>
                  <td>
                    <div className="billing-cell">
                      <IconRepeat />
                      <span>{BILLING_CYCLE_LABELS[sub.billingCycle]}</span>
                    </div>
                  </td>
                  <td>
                    <span className="sub-cost">{formatPHP(sub.cost)}</span>
                    {sub.cost && (
                      <><br /><span className="sub-provider">{formatPHP(Math.round(toMonthlyRate(sub.cost, sub.billingCycle)))}/mo</span></>
                    )}
                  </td>
                  <td>
                    <RenewalCell renewalDate={sub.renewalDate} computedStatus={sub.computedStatus} />
                  </td>
                  <td><SubStatusBadge status={sub.computedStatus} /></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" title="View details" onClick={() => setViewingSub(sub)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                      </button>
                      <button className="btn-icon" title="Edit" onClick={() => setEditingSub(sub)}>
                        <IconEdit />
                      </button>
                      <button className="btn-icon danger" title="Delete" onClick={() => setDeletingSub(sub)}>
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Detail Modal ── */}
      {viewingSub && (
        <div className="overlay" onMouseDown={() => setViewingSub(null)}>
          <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Subscription Details</h3>
              <button className="btn-icon" onClick={() => setViewingSub(null)} type="button"><IconX /></button>
            </div>
            <div className="modal-body">
              <div className="sub-detail-header">
                <div>
                  <h4 className="sub-detail-name">{viewingSub.name}</h4>
                  {viewingSub.provider && <p className="sub-detail-provider">{viewingSub.provider}</p>}
                </div>
                <SubStatusBadge status={viewingSub.computedStatus} />
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{CATEGORY_LABELS[viewingSub.category] ?? viewingSub.category}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Plan / Tier</span>
                  <span className="detail-value">{viewingSub.plan || <span className="text-muted">N/A</span>}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Billing Cycle</span>
                  <span className="detail-value">{BILLING_CYCLE_LABELS[viewingSub.billingCycle]}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Cost Per Cycle</span>
                  <span className="detail-value">{formatPHP(viewingSub.cost)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Monthly Equivalent</span>
                  <span className="detail-value">{formatPHP(Math.round(toMonthlyRate(viewingSub.cost, viewingSub.billingCycle)))}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Seats / Licenses</span>
                  <span className="detail-value">{viewingSub.seats ?? <span className="text-muted">N/A</span>}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Start Date</span>
                  <span className="detail-value">{formatDate(viewingSub.startDate) || <span className="text-muted">N/A</span>}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Renewal / Expiry</span>
                  <span className="detail-value">
                    <RenewalCell renewalDate={viewingSub.renewalDate} computedStatus={viewingSub.computedStatus} />
                  </span>
                </div>
                <div className="detail-item af-span-2">
                  <span className="detail-label">Account Email</span>
                  <span className="detail-value">{viewingSub.accountEmail || <span className="text-muted">N/A</span>}</span>
                </div>
              </div>
              {viewingSub.notes && (
                <div className="detail-notes">
                  <span className="detail-label">Notes</span>
                  <div className="detail-notes-content">{viewingSub.notes}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setViewingSub(null)}>Close</button>
              <button
                type="button" className="btn btn-primary"
                onClick={() => { setViewingSub(null); setEditingSub(viewingSub) }}
              >
                <IconEdit /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showForm && (
        <SubscriptionFormModal
          subscription={null}
          onClose={() => setShowForm(false)}
          onSaved={load}
          toast={toast}
        />
      )}
      {editingSub && (
        <SubscriptionFormModal
          subscription={editingSub}
          onClose={() => setEditingSub(null)}
          onSaved={load}
          toast={toast}
        />
      )}
      {deletingSub && (
        <DeleteSubConfirm
          subscription={deletingSub}
          onClose={() => setDeletingSub(null)}
          onDeleted={load}
          toast={toast}
        />
      )}
      <ToastContainer toasts={toasts} />
    </>
  )
}
