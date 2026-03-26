/** Max Firestore document id length we accept in a QR payload. */
const MAX_ID_LEN = 256

/**
 * Canonical site URL for public asset links (production QR codes).
 * Set in `.env` so printed codes work even if someone generated them from a different host.
 * Falls back to `window.location.origin` in the browser when unset.
 */
export function getPublicAppBaseUrl() {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim().replace(/\/+$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return ''
}

/**
 * Public read-only page path (short to keep QR compact): `/a/{assetId}`
 * @param {Object} asset - Asset object (must have id)
 * @returns {string} Absolute URL or '' if base URL is unknown
 */
export function getAssetPublicPageUrl(asset) {
  if (!asset?.id) return ''
  const base = getPublicAppBaseUrl()
  if (!base) return ''
  return `${base}/a/${encodeURIComponent(asset.id)}`
}

/**
 * QR contents: public URL when a base URL is known, otherwise compact JSON (v2).
 * External scanners opening the URL see the public asset page (`/a/:id`).
 * @param {Object} asset - Asset object (must have id)
 * @returns {string}
 */
export function getAssetQRPayload(asset) {
  if (!asset?.id) return ''
  const url = getAssetPublicPageUrl(asset)
  if (url) return url
  return JSON.stringify({ v: 2, id: asset.id })
}

/**
 * Extract Firestore asset id from a public asset URL (any origin).
 * @param {string} raw
 * @returns {string|null}
 */
export function extractAssetIdFromPublicUrl(raw) {
  if (!raw || typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t) return null
  try {
    const u = new URL(t)
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length >= 2 && parts[parts.length - 2] === 'a') {
      const id = decodeURIComponent(parts[parts.length - 1])
      if (id && id.length <= MAX_ID_LEN) return id
    }
  } catch {
    // not a full URL
  }
  const m = t.match(/(?:^|[/:])a\/([^/?#]+)/)
  if (m) {
    const id = decodeURIComponent(m[1])
    if (id && id.length <= MAX_ID_LEN) return id
  }
  return null
}

/**
 * Parses a scanned QR string. Returns asset-like object if valid PhilFIDA asset payload, else null.
 * Supports public URL (`.../a/{id}`), v2 JSON, and legacy v1 snapshot JSON.
 * @param {string} raw - Raw string from QR scan
 * @returns {{ id: string, v: number, ... } | null}
 */
export function parseAssetQRPayload(raw) {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()

  if (trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed)
      if (!data || typeof data !== 'object') return null
      const id = typeof data.id === 'string' ? data.id.trim() : ''
      if (!id || id.length > MAX_ID_LEN) return null
      if (data.v === 2) return { v: 2, id }
      if (data.v === 1) return { ...data, id }
    } catch {
      /* fall through — try URL */
    }
  }

  const fromUrl = extractAssetIdFromPublicUrl(trimmed)
  if (fromUrl) return { v: 2, id: fromUrl }

  return null
}
