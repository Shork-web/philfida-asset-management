import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getDb, USERS_COLLECTION } from './firebase'

/**
 * Get the current user's profile (region, role, etc.).
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<{ region: string, role: string } | null>}
 */
export async function getUserProfile(uid) {
  if (!uid) return null
  const db = getDb()
  const ref = doc(db, USERS_COLLECTION, uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    region: d.region ?? 'all',
    role: d.role ?? 'admin',
    displayName: d.displayName ?? null,
    email: d.email ?? null,
    updatedAt: d.updatedAt ?? null,
  }
}

/**
 * Set (or create) the user's profile.
 * @param {string} uid - Firebase Auth UID
 * @param {{ region: string, role?: string, displayName?: string, email?: string }} data
 */
export async function setUserProfile(uid, data) {
  if (!uid) return
  const db = getDb()
  const ref = doc(db, USERS_COLLECTION, uid)
  await setDoc(ref, {
    region: data.region ?? 'all',
    role: data.role ?? 'admin',
    ...(data.displayName != null && { displayName: data.displayName }),
    ...(data.email != null && { email: data.email }),
    updatedAt: serverTimestamp(),
  })
}
