import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { getFirebaseAuth } from './firebase'
import { AuthContext } from './authContext'
import { getUserProfile } from './userProfile'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRegion, setUserRegion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [configError, setConfigError] = useState(null)

  useEffect(() => {
    try {
      const auth = getFirebaseAuth()
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser)
        if (firebaseUser) {
          try {
            const profile = await getUserProfile(firebaseUser.uid)
            const region = profile?.region ?? '7'
            if (!profile) {
              console.warn(
                '[Auth] No user profile found for', firebaseUser.uid,
                '— defaulting to region 7. If this is unexpected, check Firestore rules for the /users collection.'
              )
            }
            setUserRegion(region)
          } catch (profileErr) {
            console.error(
              '[Auth] Failed to read user profile — Firestore /users rules may not be deployed.',
              profileErr?.message
            )
            setUserRegion('7')
          }
        } else {
          setUserRegion(null)
        }
        setLoading(false)
      })
      return unsubscribe
    } catch (err) {
      setConfigError(err?.message || 'Firebase is not configured.')
      setLoading(false)
    }
  }, [])

  const logout = async () => {
    try {
      await signOut(getFirebaseAuth())
    } catch {
      // ignore if auth not configured
    }
  }

  if (configError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#f5f7f4',
          color: '#1f2937',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Configuration needed</h1>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1rem', lineHeight: 1.5 }}>
            Firebase is not configured for this environment. If you deployed to Vercel, add{' '}
            <strong>VITE_FIREBASE_API_KEY</strong>, <strong>VITE_FIREBASE_AUTH_DOMAIN</strong>,{' '}
            <strong>VITE_FIREBASE_PROJECT_ID</strong>, <strong>VITE_FIREBASE_STORAGE_BUCKET</strong>,{' '}
            <strong>VITE_FIREBASE_MESSAGING_SENDER_ID</strong>, and <strong>VITE_FIREBASE_APP_ID</strong> in
            Project Settings → Environment Variables, then redeploy. Optionally add <strong>VITE_SIGNUP_MASTER_KEY</strong> for email sign-up.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              background: '#166534',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, userRegion, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
