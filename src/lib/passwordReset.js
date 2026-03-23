import { sendPasswordResetEmail } from 'firebase/auth'
import { getFirebaseAuth } from './firebase'

/**
 * Sends Firebase's password-reset email to the user. They follow the link to choose a new password.
 * Client-side only (no Admin SDK). The account must exist in Firebase Auth for this email.
 *
 * @param {string} email
 */
export async function sendPasswordResetToEmail(email) {
  const trimmed = (email || '').trim()
  if (!trimmed) {
    throw new Error('No email address is on file for this account.')
  }

  const auth = getFirebaseAuth()
  const actionCodeSettings =
    typeof window !== 'undefined'
      ? {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false,
        }
      : undefined

  try {
    await sendPasswordResetEmail(auth, trimmed, actionCodeSettings)
  } catch (err) {
    const code = err?.code
    if (code === 'auth/user-not-found') {
      throw new Error(
        'No Firebase login exists for this email. The profile may be out of sync — ask the user to sign up or fix the email in Firebase Console.',
      )
    }
    if (code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Wait a few minutes before trying again.')
    }
    if (code === 'auth/invalid-email') {
      throw new Error('Invalid email address.')
    }
    throw new Error(err?.message || 'Could not send reset email.')
  }
}
