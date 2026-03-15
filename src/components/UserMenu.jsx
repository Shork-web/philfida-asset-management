import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../lib/useAuth'
import { IconUser, IconLogout } from './Icons'

export default function UserMenu() {
  const { user, userRegion, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSignOut = () => {
    setOpen(false)
    setConfirmOpen(true)
  }

  const confirmSignOut = async () => {
    setConfirmOpen(false)
    await logout()
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : null

  return (
    <>
      <div className="user-menu" ref={menuRef}>
        <button
          className="user-menu-trigger"
          onClick={() => setOpen((v) => !v)}
          type="button"
          title={user?.displayName || user?.email}
        >
          {initials ? (
            <span className="user-avatar-initials">{initials}</span>
          ) : (
            <IconUser />
          )}
        </button>

        {open && (
          <div className="user-menu-dropdown">
            <div className="user-menu-info">
              <span className="user-menu-name">{user?.displayName || 'User'}</span>
              <span className="user-menu-email">{user?.email}</span>
              {userRegion && userRegion !== 'all' && (
                <span className="user-menu-region" title="Your data scope">Region {userRegion}</span>
              )}
            </div>
            <div className="user-menu-divider" />
            <button className="user-menu-item" onClick={handleSignOut} type="button">
              <IconLogout />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {confirmOpen && createPortal(
        <div className="signout-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="signout-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sign Out</h3>
            <p>Are you sure you want to sign out?</p>
            <div className="signout-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmSignOut}
                type="button"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
