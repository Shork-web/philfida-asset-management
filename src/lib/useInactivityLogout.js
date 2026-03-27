import { useEffect, useRef, useCallback } from 'react'

const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutes
const WARN_BEFORE_MS = 60 * 1000      // warn 1 minute before logout
const RELOAD_INTENT_MS = 4000        // skip tab-close logout shortly after F5 / Ctrl+R

const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'keydown',
  'touchstart', 'touchmove', 'scroll', 'click',
]

function isReloadShortcut(e) {
  if (e.key === 'F5') return true
  const k = e.key?.toLowerCase?.()
  if (k === 'r' && (e.ctrlKey || e.metaKey)) return true
  return false
}

/**
 * Logs the user out after 30 minutes of inactivity.
 * Shows a 1-minute warning before signing out.
 * Best-effort sign-out when the tab is closed or the user leaves the app (pagehide);
 * keyboard refresh shortcuts are ignored so F5 / Ctrl+R do not always sign you out.
 *
 * @param {() => void | Promise<void>} logout - the auth logout function
 * @param {boolean} active - set to false when user is not authenticated (disables the hook)
 */
export function useInactivityLogout(logout, active) {
  const logoutRef = useRef(logout)

  const logoutTimer = useRef(null)
  const warnTimer = useRef(null)
  const warningToast = useRef(null)
  const reloadIntentUntil = useRef(0)

  const clearTimers = useCallback(() => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (warnTimer.current) clearTimeout(warnTimer.current)
    if (warningToast.current) {
      warningToast.current.remove()
      warningToast.current = null
    }
  }, [])

  const showWarning = useCallback(() => {
    if (warningToast.current) return
    const el = document.createElement('div')
    el.id = 'inactivity-warning'
    el.setAttribute('role', 'alert')
    el.innerHTML = `
      <span style="font-size:1.25rem">⏰</span>
      <div>
        <strong>Session expiring</strong>
        <p>You will be signed out in 1 minute due to inactivity.</p>
      </div>
    `
    Object.assign(el.style, {
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      background: '#fff',
      border: '1.5px solid #fbbf24',
      borderRadius: '10px',
      padding: '1rem 1.25rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
      maxWidth: '320px',
      fontSize: '0.88rem',
      lineHeight: '1.4',
      color: '#1f2937',
      animation: 'fadeIn 0.2s ease',
    })
    el.querySelector('strong').style.cssText = 'display:block;font-weight:700;margin-bottom:0.15rem;color:#92400e'
    el.querySelector('p').style.cssText = 'margin:0;color:#6b7280'
    document.body.appendChild(el)
    warningToast.current = el
  }, [])

  const resetTimers = useCallback(() => {
    clearTimers()
    warnTimer.current = setTimeout(showWarning, INACTIVITY_MS - WARN_BEFORE_MS)
    logoutTimer.current = setTimeout(() => {
      clearTimers()
      void logoutRef.current?.()
    }, INACTIVITY_MS)
  }, [clearTimers, showWarning])

  useEffect(() => {
    logoutRef.current = logout
  }, [logout])

  useEffect(() => {
    if (!active) {
      clearTimers()
      return
    }

    resetTimers()

    const onKeyCapture = (e) => {
      if (isReloadShortcut(e)) {
        reloadIntentUntil.current = Date.now() + RELOAD_INTENT_MS
      }
    }

    const onPageHide = (e) => {
      if (e.persisted) return
      if (Date.now() < reloadIntentUntil.current) return
      void logoutRef.current?.()
    }

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, resetTimers, { passive: true })
    )
    window.addEventListener('keydown', onKeyCapture, true)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, resetTimers)
      )
      window.removeEventListener('keydown', onKeyCapture, true)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [active, resetTimers, clearTimers])
}
