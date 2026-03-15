import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore'
import { getDb } from './firebase'

const CONFIG_COLLECTION = 'config'
const SIGNUP_DOC_ID = 'signup'

/**
 * Returns true if the Super Admin key has already been used (one account created with it).
 */
export async function isSuperAdminKeyUsed() {
  const db = getDb()
  const ref = doc(db, CONFIG_COLLECTION, SIGNUP_DOC_ID)
  const snap = await getDoc(ref)
  return snap.exists() && snap.data()?.superAdminUsed === true
}

/**
 * Marks the Super Admin key as used. Call after creating the first Super Admin account.
 * Uses a transaction so only one sign-up can claim it.
 * @param {string} uid - Firebase Auth UID of the user who used the key
 * @returns {Promise<'ok' | 'already_used'>} - 'ok' if we marked it, 'already_used' if another request already did
 */
export async function markSuperAdminKeyUsed(uid) {
  const db = getDb()
  const ref = doc(db, CONFIG_COLLECTION, SIGNUP_DOC_ID)
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (snap.exists()) throw new Error('ALREADY_USED')
      tx.set(ref, {
        superAdminUsed: true,
        usedBy: uid,
        usedAt: serverTimestamp(),
      })
    })
    return 'ok'
  } catch (err) {
    if (err?.message === 'ALREADY_USED') return 'already_used'
    throw err
  }
}
