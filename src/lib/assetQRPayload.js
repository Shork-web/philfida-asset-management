/**
 * Builds a unique, machine-readable payload for an asset's QR code.
 * Contains all asset information so the QR is self-contained and unique per asset.
 * @param {Object} asset - Asset object (must have id)
 * @returns {string} JSON string to encode in QR
 */
export function getAssetQRPayload(asset) {
  if (!asset?.id) return ''
  const raw = {
    v: 1,
    id: asset.id,
    assetTag: asset.assetTag || undefined,
    newPropertyNumber: asset.newPropertyNumber || undefined,
    name: asset.name || undefined,
    type: asset.type || undefined,
    subtype: asset.subtype || undefined,
    status: asset.status || undefined,
    serialNumber: asset.serialNumber || undefined,
    issuedTo: asset.issuedTo || undefined,
    location: asset.location || undefined,
    yearOfAcquisition: asset.yearOfAcquisition || undefined,
    value: asset.value != null ? asset.value : undefined,
    quantityPerPropertyCard: asset.quantityPerPropertyCard != null ? asset.quantityPerPropertyCard : undefined,
    quantityPerPhysicalCount: asset.quantityPerPhysicalCount != null ? asset.quantityPerPhysicalCount : undefined,
    // Truncate notes to keep QR compact and scannable
    notes: asset.notes ? asset.notes.slice(0, 120) : undefined,
    region: asset.region || undefined,
  }
  // Strip undefined keys so the JSON string is as short as possible
  return JSON.stringify(raw, (_, val) => (val === undefined ? undefined : val))
}

/**
 * Parses a scanned QR string. Returns asset-like object if valid PhilFIDA asset payload, else null.
 * @param {string} raw - Raw string from QR scan
 * @returns {{ id: string, assetTag: string, name: string, ... } | null}
 */
export function parseAssetQRPayload(raw) {
  if (!raw || typeof raw !== 'string') return null
  try {
    const data = JSON.parse(raw.trim())
    if (data && data.v === 1 && data.id) return data
    return null
  } catch {
    return null
  }
}
