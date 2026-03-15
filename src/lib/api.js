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

function toAssetData(docSnap) {
  if (!docSnap.exists()) return null
  const d = docSnap.data()
  return {
    id: docSnap.id,
    assetTag: d.assetTag ?? '',
    newPropertyNumber: d.newPropertyNumber ?? null,
    name: d.name ?? '',
    type: d.type ?? 'ICT_EQUIPMENT',
    subtype: d.subtype ?? null,
    status: d.status ?? 'SPARE',
    serialNumber: d.serialNumber ?? null,
    issuedTo: d.issuedTo ?? null,
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

/**
 * @param {string | null} [region] - User's region from profile. Use 'all' or null to fetch every asset.
 */
export async function fetchAssets(region) {
  const db = getDb()
  const col = collection(db, ASSETS_COLLECTION)
  const useRegion = region && region !== 'all'

  // Use a simple single-field query when region-scoped to avoid composite index requirement.
  // Sort is applied in JS after fetching.
  const q = useRegion
    ? query(col, where('region', '==', region))
    : query(col, orderBy('createdAt', 'desc'))

  const snapshot = await getDocs(q)
  const rows = snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      value: data.value ?? null,
      serialNumber: data.serialNumber ?? null,
      assignedTo: data.assignedTo ?? null,
      purchaseDate: data.purchaseDate ?? null,
      notes: data.notes ?? null,
      region: data.region ?? null,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
    }
  })

  return useRegion ? sortByCreatedAtDesc(rows) : rows
}

/**
 * @param {string | null} [region] - Same as fetchAssets; stats are computed from region-filtered assets.
 */
export async function fetchStats(region) {
  const assets = await fetchAssets(region)
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

export async function createAsset(payload) {
  const db = getDb()
  const col = collection(db, ASSETS_COLLECTION)
  const docRef = await addDoc(col, {
    assetTag: payload.assetTag,
    newPropertyNumber: payload.newPropertyNumber ?? null,
    name: payload.name,
    type: payload.type,
    subtype: payload.subtype ?? null,
    status: payload.status ?? 'SPARE',
    serialNumber: payload.serialNumber ?? null,
    issuedTo: payload.issuedTo ?? null,
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
  await updateDoc(ref, {
    ...payload,
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

