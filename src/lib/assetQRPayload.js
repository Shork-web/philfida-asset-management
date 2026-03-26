/** Max Firestore document id length we accept in a QR payload. */
const MAX_ID_LEN = 256

/**
 * Builds a small QR payload: only the Firestore document id.
 * Full details load after scan via Firestore by id; a tiny matrix scans more reliably.
 * @param {Object} asset - Asset object (must have id)
 * @returns {string} JSON string to encode in QR
 */
export function getAssetQRPayload(asset) {
  if (!asset?.id) return ''
  return JSON.stringify({ v: 2, id: asset.id })
}

/**
 * Parses a scanned QR string. Returns asset-like object if valid PhilFIDA asset payload, else null.
 * Supports v2 (id only) and legacy v1 (full snapshot embedded in QR).
 * @param {string} raw - Raw string from QR scan
 * @returns {{ id: string, v: number, ... } | null}
 */
export function parseAssetQRPayload(raw) {
  if (!raw || typeof raw !== 'string') return null
  try {
    const data = JSON.parse(raw.trim())
    if (!data || typeof data !== 'object') return null
    const id = typeof data.id === 'string' ? data.id.trim() : ''
    if (!id || id.length > MAX_ID_LEN) return null
    if (data.v === 2) return { v: 2, id }
    if (data.v === 1) return { ...data, id }
    return null
  } catch {
    return null
  }
}
