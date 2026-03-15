import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { getAllUsers, updateUserProfileAdmin, deleteUserDocument } from '../lib/userProfile'
import { useToasts } from '../lib/useToasts'
import { ToastContainer } from '../components/Toasts'
import { IconRefresh, IconEdit, IconTrash, IconX, IconUser } from '../components/Icons'

const REGIONS = [
  { value: '1', label: 'Region 1' },
  { value: '2', label: 'Region 2' },
  { value: '3', label: 'Region 3' },
  { value: '4', label: 'Region 4' },
  { value: '5', label: 'Region 5' },
  { value: '6', label: 'Region 6' },
  { value: '7', label: 'Region 7' },
  { value: '8', label: 'Region 8' },
  { value: '9', label: 'Region 9' },
  { value: '10', label: 'Region 10' },
  { value: '11', label: 'Region 11' },
  { value: '12', label: 'Region 12' },
  { value: '13', label: 'Region 13' },
  { value: 'all', label: 'All Regions (Super Admin)' },
]

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
]

function regionLabel(r) {
  if (!r || r === 'all') return 'All Regions'
  return `Region ${r}`
}

function RoleBadge({ role }) {
  if (role === 'viewer') return <span className="um-badge um-badge-viewer">Viewer</span>
  if (role === 'admin') return <span className="um-badge um-badge-admin">Admin</span>
  return <span className="um-badge um-badge-other">{role}</span>
}

function RegionBadge({ region }) {
  if (region === 'all') {
    return <span className="um-badge um-badge-super-admin">Super Admin</span>
  }
  return <span className="um-badge um-badge-region">Region {region}</span>
}

function Initials({ name, email }) {
  const src = name || email || '?'
  const letters = src.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
  return <span className="um-avatar">{letters || '?'}</span>
}

/* ── Edit modal ── */
function EditModal({ user, currentUserId, onClose, onSave }) {
  const [role, setRole] = useState(user.role)
  const [region, setRegion] = useState(user.region)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(user.uid, { role, region })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const isSelf = user.uid === currentUserId

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit account</h2>
          <button type="button" className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="modal-body">
          <div className="um-edit-user-info">
            <Initials name={user.displayName} email={user.email} />
            <div>
              <p className="um-edit-name">{user.displayName || '(no name)'}</p>
              <p className="um-edit-email">{user.email || user.uid}</p>
            </div>
          </div>
          {isSelf && (
            <p className="um-self-warning">
              ⚠ You are editing your own account. Be careful not to remove your own admin access.
            </p>
          )}
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-control" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Region</label>
            <select className="form-control" value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Delete confirm modal ── */
function DeleteModal({ user, currentUserId, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)
  const isSelf = user.uid === currentUserId

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm(user.uid)
      onClose()
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={deleting ? () => {} : onClose}>
      <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Delete account</h2>
          <button type="button" className="modal-close" onClick={onClose} disabled={deleting}><IconX /></button>
        </div>
        <div className="modal-body">
          <div className="um-edit-user-info">
            <Initials name={user.displayName} email={user.email} />
            <div>
              <p className="um-edit-name">{user.displayName || '(no name)'}</p>
              <p className="um-edit-email">{user.email || user.uid}</p>
            </div>
          </div>
          {isSelf ? (
            <p className="um-delete-warning um-delete-warning-self">
              ⛔ You cannot delete your own account.
            </p>
          ) : (
            <p className="um-delete-warning">
              This will remove <strong>{user.displayName || user.email || 'this user'}</strong>'s
              access to the system. They will be signed out immediately on their next action.
              This cannot be undone.
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={deleting}>Cancel</button>
          <button
            type="button"
            className="btn btn-danger um-delete-btn"
            onClick={handleConfirm}
            disabled={deleting || isSelf}
          >
            {deleting ? (
              <>
                <span className="auth-spinner" />
                Deleting…
              </>
            ) : (
              'Delete account'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ── */
export default function UserManagement() {
  const { user, userRole, userRegion } = useAuth()
  const navigate = useNavigate()
  const { toasts, addToast, removeToast } = useToasts()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterRegion, setFilterRegion] = useState('all')

  const [editingUser, setEditingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)

  const isSuperAdmin = userRegion === 'all'

  // Redirect non-super-admins
  useEffect(() => {
    if (!isSuperAdmin) navigate('/', { replace: true })
  }, [isSuperAdmin, navigate])

  const loadUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const list = await getAllUsers()
      // Sort: super admins first, then by display name
      list.sort((a, b) => {
        if (a.region === 'all' && b.region !== 'all') return -1
        if (a.region !== 'all' && b.region === 'all') return 1
        return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '')
      })
      setUsers(list)
    } catch (err) {
      setError(err?.message || 'Failed to load users.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { if (isSuperAdmin) loadUsers() }, [isSuperAdmin, loadUsers])

  const handleSave = async (uid, updates) => {
    try {
      await updateUserProfileAdmin(uid, updates)
      addToast({ type: 'success', message: 'Account updated successfully.' })
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, ...updates } : u))
    } catch (err) {
      addToast({ type: 'error', message: err?.message || 'Failed to update account.' })
      throw err
    }
  }

  const handleDelete = async (uid) => {
    try {
      await deleteUserDocument(uid)
      addToast({ type: 'success', message: 'Account deleted.' })
      await loadUsers(true) // Silent refresh — no full-page loading spinner
      setDeletingUser(null) // Close modal after list has refreshed
    } catch (err) {
      addToast({ type: 'error', message: err?.message || 'Failed to delete account.' })
      throw err
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    const matchSearch = !q || (u.displayName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    const matchRole = filterRole === 'all' || u.role === filterRole
    const matchRegion = filterRegion === 'all' || u.region === filterRegion
    return matchSearch && matchRole && matchRegion
  })

  if (!isSuperAdmin) return null

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <header className="page-header">
        <div>
          <h1>User Management</h1>
          <p>View, edit roles, and remove accounts. Changes take effect immediately.</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-ghost" onClick={loadUsers} disabled={loading}>
            <IconRefresh /> Refresh
          </button>
        </div>
      </header>

      {/* ── Filters ── */}
      <div className="um-filters">
        <div className="um-search-wrap">
          <svg className="um-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="um-search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="um-search-clear" onClick={() => setSearch('')}><IconX /></button>
          )}
        </div>
        <select className="form-control um-filter-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="all">All Roles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select className="form-control um-filter-select" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
          <option value="all">All Regions</option>
          {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* ── Summary strip ── */}
      <div className="um-summary">
        <span className="um-summary-count">
          {loading ? '…' : `${filtered.length} of ${users.length}`} accounts
        </span>
        {(filterRole !== 'all' || filterRegion !== 'all' || search) && (
          <button type="button" className="um-clear-filters" onClick={() => { setSearch(''); setFilterRole('all'); setFilterRegion('all') }}>
            Clear filters
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {error && <p className="um-error">{error}</p>}

      {loading ? (
        <div className="um-loading">
          <span className="auth-spinner" />
          <span>Loading accounts…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="um-empty">
          <span className="um-empty-icon">
            <IconUser />
          </span>
          <p>{users.length === 0 ? 'No accounts found.' : 'No accounts match your filters.'}</p>
        </div>
      ) : (
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Region</th>
                <th>Role</th>
                <th>Last updated</th>
                <th className="um-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isSelf = u.uid === user?.uid
                const lastUpdated = u.updatedAt?.toDate?.()
                return (
                  <tr
                    key={u.uid}
                    className={`um-row-clickable${isSelf ? ' um-row-self' : ''}`}
                    onClick={() => setEditingUser(u)}
                  >
                    <td>
                      <div className="um-account-cell">
                        <Initials name={u.displayName} email={u.email} />
                        <div className="um-account-info">
                          <span className="um-account-name">
                            {u.displayName || <em className="um-no-name">No display name</em>}
                            {isSelf && <span className="um-you-badge">You</span>}
                          </span>
                          <span className="um-account-email">{u.email || u.uid}</span>
                        </div>
                      </div>
                    </td>
                    <td><RegionBadge region={u.region} /></td>
                    <td><RoleBadge role={u.role} /></td>
                    <td className="um-updated">
                      {lastUpdated
                        ? lastUpdated.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                        : <span className="um-dash">—</span>}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="um-actions">
                        <button
                          type="button"
                          className="btn-icon-sm"
                          title="Edit account"
                          onClick={() => setEditingUser(u)}
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-sm btn-icon-danger"
                          title={isSelf ? 'Cannot delete your own account' : 'Delete account'}
                          onClick={() => setDeletingUser(u)}
                          disabled={isSelf}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <EditModal
          user={editingUser}
          currentUserId={user?.uid}
          onClose={() => setEditingUser(null)}
          onSave={handleSave}
        />
      )}

      {deletingUser && (
        <DeleteModal
          user={deletingUser}
          currentUserId={user?.uid}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}
