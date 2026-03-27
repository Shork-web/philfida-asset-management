import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'

function sortByCreatedAtDesc(docs) {
  return [...docs].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tb - ta
  })
}
import { getDb, ASSETS_COLLECTION } from './firebase'

const ISSUED_TO_HISTORY_MAX = 50

/** @param {unknown} raw */
function normalizeIssuedAt(raw) {
  if (raw == null || raw === '') return null
  if (typeof raw === 'string') {
    const m = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/)
    return m ? m[1] : null
  }
  if (raw instanceof Timestamp) {
    const d = raw.toDate()
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    return `${y}-${mo}-${da}`
  }
  if (raw && typeof raw.toDate === 'function') {
    const d = raw.toDate()
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    return `${y}-${mo}-${da}`
  }
  return null
}

/**
 * @param {unknown} raw
 * @returns {{ name: string, changedAt: string, issuedAt: string|null }[]}
 */
export function normalizeIssuedToHistory(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue
    const name = typeof e.name === 'string' ? e.name.trim() : ''
    if (!name) continue
    let changedAt = ''
    const ca = e.changedAt
    if (ca instanceof Timestamp) changedAt = ca.toDate().toISOString()
    else if (typeof ca === 'string') changedAt = ca
    else if (ca && typeof ca.toDate === 'function') changedAt = ca.toDate().toISOString()
    out.push({ name, changedAt, issuedAt: normalizeIssuedAt(e.issuedAt) })
  }
  return out
}

function toAssetData(docSnap) {
  if (!docSnap.exists()) return null
  const d = docSnap.data()
  return {
    id: docSnap.id,
    assetTag: d.assetTag ?? '',
    newPropertyNumber: d.newPropertyNumber ?? null,
    name: d.name ?? '',
    description: d.description ?? null,
    type: d.type ?? 'ICT_EQUIPMENT',
    subtype: d.subtype ?? null,
    status: d.status ?? 'SPARE',
    serialNumber: d.serialNumber ?? null,
    issuedTo: d.issuedTo ?? null,
    issuedAt: normalizeIssuedAt(d.issuedAt),
    issuedToHistory: normalizeIssuedToHistory(d.issuedToHistory),
    location: d.location ?? null,
    yearOfAcquisition: d.yearOfAcquisition ?? null,
    value: d.value ?? null,
    quantityPerPropertyCard: d.quantityPerPropertyCard ?? null,
    quantityPerPhysicalCount: d.quantityPerPhysicalCount ?? null,
    notes: d.notes ?? null,
    region: d.region ?? null,
    createdAt: fromTimestamp(d.createdAt),
    updatedAt: fromTimestamp(d.updatedAt),
  }
}

function fromTimestamp(ts) {
  if (ts instanceof Timestamp) return ts.toDate().toISOString()
  if (ts?.toDate) return ts.toDate().toISOString()
  return ts ?? null
}

/** Normalize for duplicate comparison (trim + lowercase). */
export function normalizeAssetIdentifier(value) {
  if (value == null || value === '') return ''
  return String(value).trim().toLowerCase()
}

/**
 * Detect duplicate serial / old (assetTag) / new property numbers vs existing assets.
 * @param {{ newPropertyNumber?: string|null, assetTag?: string|null, serialNumber?: string|null }} payload
 * @param {Array<{ id: string, name?: string, newPropertyNumber?: string|null, assetTag?: string|null, serialNumber?: string|null }>} existingAssets
 * @param {string} [excludeId] - When editing, skip this document id
 * @returns {string[]} Human-readable messages (empty if no conflicts)
 */
export function getAssetDuplicateMessages(payload, existingAssets, excludeId) {
  const npn = normalizeAssetIdentifier(payload.newPropertyNumber)
  const oldPn = normalizeAssetIdentifier(payload.assetTag)
  const sn = normalizeAssetIdentifier(payload.serialNumber)

  const messages = []
  const seen = new Set()

  for (const other of existingAssets || []) {
    if (!other?.id || (excludeId && other.id === excludeId)) continue

    if (npn && normalizeAssetIdentifier(other.newPropertyNumber) === npn) {
      const key = `npn:${npn}`
      if (!seen.has(key)) {
        seen.add(key)
        const label = other.name || 'another asset'
        const disp = other.newPropertyNumber || npn
        messages.push(
          `New Property Number "${payload.newPropertyNumber?.trim() || disp}" is already assigned to "${label}" (New Prop: ${disp}).`,
        )
      }
    }
    if (oldPn && normalizeAssetIdentifier(other.assetTag) === oldPn) {
      const key = `old:${oldPn}`
      if (!seen.has(key)) {
        seen.add(key)
        const label = other.name || 'another asset'
        const disp = other.assetTag || oldPn
        messages.push(
          `Old Property Number "${payload.assetTag?.trim() || disp}" is already assigned to "${label}".`,
        )
      }
    }
    if (sn && normalizeAssetIdentifier(other.serialNumber) === sn) {
      const key = `sn:${sn}`
      if (!seen.has(key)) {
        seen.add(key)
        const label = other.name || 'another asset'
        const disp = other.serialNumber || sn
        messages.push(
          `Serial Number "${payload.serialNumber?.trim() || disp}" is already used by "${label}".`,
        )
      }
    }
  }

  return messages
}

const DUPLICATE_FIELD_META = [
  { key: 'newPropertyNumber', label: 'New Property Number' },
  { key: 'assetTag', label: 'Old Property Number' },
  { key: 'serialNumber', label: 'Serial Number' },
]

const DUPLICATE_FIELD_ORDER = { newPropertyNumber: 0, assetTag: 1, serialNumber: 2 }

/**
 * Groups assets that share the same normalized new property number, old property number, or serial.
 * @param {Array<Record<string, unknown>>} assets
 * @returns {Array<{ id: string, field: string, fieldLabel: string, displayValue: string, assets: object[] }>}
 */
export function findAssetDuplicateGroups(assets) {
  const groups = []
  for (const meta of DUPLICATE_FIELD_META) {
    /** @type {Map<string, { displayValue: string, items: object[] }>} */
    const map = new Map()
    for (const a of assets || []) {
      const norm = normalizeAssetIdentifier(a[meta.key])
      if (!norm) continue
      let bucket = map.get(norm)
      if (!bucket) {
        bucket = { displayValue: String(a[meta.key] ?? '').trim() || norm, items: [] }
        map.set(norm, bucket)
      }
      bucket.items.push(a)
    }
    for (const [norm, bucket] of map) {
      if (bucket.items.length > 1) {
        groups.push({
          id: `${meta.key}:${norm}`,
          field: meta.key,
          fieldLabel: meta.label,
          displayValue: bucket.displayValue,
          assets: [...bucket.items],
        })
      }
    }
  }
  groups.sort((ga, gb) => {
    const oa = DUPLICATE_FIELD_ORDER[ga.field] ?? 99
    const ob = DUPLICATE_FIELD_ORDER[gb.field] ?? 99
    if (oa !== ob) return oa - ob
    return String(ga.displayValue).localeCompare(String(gb.displayValue), undefined, { numeric: true })
  })
  return groups
}

/**
 * Unique asset document ids that appear in at least one duplicate group.
 * @param {ReturnType<typeof findAssetDuplicateGroups>} groups
 */
export function getUniqueAssetIdsInDuplicateGroups(groups) {
  const ids = new Set()
  for (const g of groups) {
    for (const a of g.assets) {
      if (a?.id) ids.add(a.id)
    }
  }
  return ids
}

function mapAssetDocumentSnapshot(docSnap) {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    ...data,
    value: data.value ?? null,
    serialNumber: data.serialNumber ?? null,
    assignedTo: data.assignedTo ?? null,
    purchaseDate: data.purchaseDate ?? null,
    notes: data.notes ?? null,
    issuedAt: normalizeIssuedAt(data.issuedAt),
    issuedToHistory: normalizeIssuedToHistory(data.issuedToHistory),
    region: data.region ?? null,
    createdAt: fromTimestamp(data.createdAt),
    updatedAt: fromTimestamp(data.updatedAt),
  }
}

function buildAssetsQuery(region) {
  const db = getDb()
  const col = collection(db, ASSETS_COLLECTION)
  const useRegion = region && region !== 'all'
  const q = useRegion
    ? query(col, where('region', '==', region))
    : query(col, orderBy('createdAt', 'desc'))
  return { q, useRegion }
}

/**
 * @param {string | null} [region] - User's region from profile. Use 'all' or null to fetch every asset.
 */
export async function fetchAssets(region) {
  const { q, useRegion } = buildAssetsQuery(region)
  const snapshot = await getDocs(q)
  const rows = snapshot.docs.map((d) => mapAssetDocumentSnapshot(d))
  return useRegion ? sortByCreatedAtDesc(rows) : rows
}

/**
 * Live updates when any client (same or other device) changes assets in Firestore.
 * @param {string | null} [region]
 * @param {{ onNext: (assets: object[]) => void, onError?: (err: Error) => void }} callbacks
 * @returns {() => void} unsubscribe
 */
export function subscribeToAssets(region, callbacks) {
  const { onNext, onError } = callbacks
  const { q, useRegion } = buildAssetsQuery(region)
  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => mapAssetDocumentSnapshot(d))
      onNext(useRegion ? sortByCreatedAtDesc(rows) : rows)
    },
    (err) => {
      onError?.(err)
    },
  )
}

/** Stats derived from the same asset list shape as fetchAssets / subscribeToAssets. */
export function computeAssetStats(assets) {
  const total = assets.length
  const byStatus = {}
  const byType = {}
  let totalValue = 0

  for (const a of assets) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1
    byType[a.type] = (byType[a.type] || 0) + 1
    totalValue += a.value ?? 0
  }

  return { total, byStatus, byType, totalValue }
}

/**
 * @param {string | null} [region] - Same as fetchAssets; stats are computed from region-filtered assets.
 */
export async function fetchStats(region) {
  const assets = await fetchAssets(region)
  return computeAssetStats(assets)
}

/**
 * Latest asset from Firestore by document id (e.g. after scanning a QR that encodes id).
 * @param {string} id
 */
export async function fetchAssetById(id) {
  if (!id) return null
  const db = getDb()
  const ref = doc(db, ASSETS_COLLECTION, id)
  const snap = await getDoc(ref)
  return toAssetData(snap)
}

export async function createAsset(payload) {
  const db = getDb()
  const col = collection(db, ASSETS_COLLECTION)
  const docRef = await addDoc(col, {
    assetTag: payload.assetTag,
    newPropertyNumber: payload.newPropertyNumber ?? null,
    name: payload.name,
    description: payload.description ?? null,
    type: payload.type,
    subtype: payload.subtype ?? null,
    status: payload.status ?? 'SPARE',
    serialNumber: payload.serialNumber ?? null,
    issuedTo: payload.issuedTo ?? null,
    issuedAt: normalizeIssuedAt(payload.issuedAt),
    issuedToHistory: [],
    location: payload.location ?? null,
    yearOfAcquisition: payload.yearOfAcquisition ?? null,
    value: payload.value ?? null,
    quantityPerPropertyCard: payload.quantityPerPropertyCard ?? null,
    quantityPerPhysicalCount: payload.quantityPerPhysicalCount ?? null,
    notes: payload.notes ?? null,
    region: payload.region ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  const snap = await getDoc(docRef)
  return toAssetData(snap)
}

export async function updateAsset(id, payload) {
  const db = getDb()
  const ref = doc(db, ASSETS_COLLECTION, id)
  const prevSnap = await getDoc(ref)
  if (!prevSnap.exists()) {
    throw new Error('Asset not found')
  }
  const prev = prevSnap.data()
  const prevIssued = String(prev.issuedTo ?? '').trim()
  const { issuedToHistory: _discardHistory, issuedAt: rawIssuedAt, ...rest } = payload
  const nextIssued = String(rest.issuedTo ?? '').trim()

  let history = normalizeIssuedToHistory(prev.issuedToHistory)
  if (prevIssued !== nextIssued && prevIssued !== '') {
    history = [
      {
        name: prevIssued,
        issuedAt: normalizeIssuedAt(prev.issuedAt),
        changedAt: new Date().toISOString(),
      },
      ...history,
    ].slice(0, ISSUED_TO_HISTORY_MAX)
  }

  await updateDoc(ref, {
    ...rest,
    issuedAt: normalizeIssuedAt(rawIssuedAt),
    issuedToHistory: history,
    updatedAt: serverTimestamp(),
  })
  const snap = await getDoc(ref)
  return toAssetData(snap)
}

export async function deleteAsset(id) {
  const db = getDb()
  const ref = doc(db, ASSETS_COLLECTION, id)
  await deleteDoc(ref)
}

