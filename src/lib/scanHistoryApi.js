import {
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getDb, SCAN_HISTORY_COLLECTION } from './firebase'

const QUERY_LIMIT = 100
const DELETE_CHUNK = 450

/**
 * @param {string} uid
 * @param {{ oldPropertyNumber?: string|null, newPropertyNumber?: string|null, assetId?: string|null }} data
 */
export async function addScanHistoryEntry(uid, data) {
  if (!uid) return
  const db = getDb()
  await addDoc(collection(db, SCAN_HISTORY_COLLECTION), {
    userId: uid,
    oldPropertyNumber: data.oldPropertyNumber ?? null,
    newPropertyNumber: data.newPropertyNumber ?? null,
    assetId: data.assetId ?? null,
    createdAt: serverTimestamp(),
  })
}

function docToEntry(docSnap) {
  const d = docSnap.data()
  let time = new Date()
  const ca = d.createdAt
  if (ca instanceof Timestamp) time = ca.toDate()
  else if (ca?.toDate) time = ca.toDate()
  return {
    id: docSnap.id,
    oldPropertyNumber: d.oldPropertyNumber ?? null,
    newPropertyNumber: d.newPropertyNumber ?? null,
    assetId: d.assetId ?? null,
    time,
  }
}

/**
 * @param {string} uid
 * @param {(entries: ReturnType<typeof docToEntry>[]) => void} onNext
 * @param {(err: Error) => void} [onError]
 */
export function subscribeToScanHistory(uid, onNext, onError) {
  if (!uid) {
    onNext([])
    return () => {}
  }
  const db = getDb()
  const q = query(
    collection(db, SCAN_HISTORY_COLLECTION),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(QUERY_LIMIT),
  )
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => docToEntry(d))),
    (err) => onError?.(err),
  )
}

/** Deletes all scan history documents for this user (e.g. Clear all). */
export async function clearScanHistoryForUser(uid) {
  if (!uid) return
  const db = getDb()
  const base = query(
    collection(db, SCAN_HISTORY_COLLECTION),
    where('userId', '==', uid),
    limit(DELETE_CHUNK),
  )
  // Repeat until no docs left (handles >500 by chunking).
  for (;;) {
    const snap = await getDocs(base)
    if (snap.empty) break
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}
