import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAssets, subscribeToAssets } from './api'

/**
 * Keeps asset list in sync across tabs/devices via Firestore onSnapshot.
 * @param {string | null | undefined} userRegion
 * @param {(msg: string, type?: string) => void} [toast]
 */
export function useAssetsSubscription(userRegion, toast) {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [configError, setConfigError] = useState(null)
  const toastRef = useRef(toast)
  toastRef.current = toast

  const region = userRegion ?? 'all'

  useEffect(() => {
    setLoading(true)
    setConfigError(null)
    const unsub = subscribeToAssets(region, {
      onNext: (rows) => {
        setAssets(rows)
        setLoading(false)
        setConfigError(null)
      },
      onError: (err) => {
        const msg = err?.message?.includes('Firebase is not configured')
          ? 'Firebase not configured. Add VITE_FIREBASE_* to .env (see .env.example)'
          : err?.message || 'Could not load assets.'
        setConfigError(msg)
        setLoading(false)
        toastRef.current?.(msg, 'error')
      },
    })
    return () => unsub()
  }, [region])

  const manualRefresh = useCallback(async () => {
    setLoading(true)
    try {
      setAssets(await fetchAssets(region))
      setConfigError(null)
    } catch (err) {
      const msg = err?.message || 'Could not refresh assets.'
      setConfigError(msg)
      toastRef.current?.(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [region])

  return { assets, loading, configError, manualRefresh }
}
