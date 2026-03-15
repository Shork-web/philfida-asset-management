import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
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

/**
 * Get all user profiles — Super Admin only.
 * @returns {Promise<Array<{ uid: string, region: string, role: string, displayName: string|null, email: string|null, updatedAt: any }>>}
 */
export async function getAllUsers() {
  const db = getDb()
  const snap = await getDocs(collection(db, USERS_COLLECTION))
  return snap.docs.map((d) => ({
    uid: d.id,
    region: d.data().region ?? 'all',
    role: d.data().role ?? 'admin',
    displayName: d.data().displayName ?? null,
    email: d.data().email ?? null,
    updatedAt: d.data().updatedAt ?? null,
  }))
}

/**
 * Update a user's role and/or region — Super Admin only.
 * @param {string} uid
 * @param {{ role?: string, region?: string }} updates
 */
export async function updateUserProfileAdmin(uid, updates) {
  if (!uid) return
  const db = getDb()
  const ref = doc(db, USERS_COLLECTION, uid)
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() })
}

/**
 * Delete a user's Firestore profile — Super Admin only.
 * This effectively blocks the user from the app (the auth account remains
 * but AuthProvider will sign them out when no profile is found).
 * @param {string} uid
 */
export async function deleteUserDocument(uid) {
  if (!uid) return
  const db = getDb()
  await deleteDoc(doc(db, USERS_COLLECTION, uid))
}
