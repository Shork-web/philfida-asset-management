import { useState, useMemo } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { getFirebaseAuth } from '../lib/firebase'
import philfidaLogo from '../assets/PhilFIDA_Logo.png'

// Master key for sign-up gate (set in .env as VITE_SIGNUP_MASTER_KEY). If unset, email sign-up is disabled.
const MASTER_KEY = import.meta.env.VITE_SIGNUP_MASTER_KEY || ''

function validateEmail(value) {
  if (!value) return false
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(value.trim())
}

function getPasswordStrength(password) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  }
}

function isPasswordStrong(password) {
  const s = getPasswordStrength(password)
  return s.length && s.upper && s.lower && s.number && s.special
}

function friendlyError(code) {
  const map = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
    'auth/weak-password': 'Password does not meet the security requirements below.',
    'auth/too-many-requests': 'Too many attempts. Please try again later or reset your password.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Contact your administrator.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Popup was blocked. Allow popups for this site and try again.',
    'auth/cancelled-popup-request': 'Please complete the sign-in in the popup window.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method. Try signing in with email and password, or use the same method you used when you first signed up.',
    'auth/credential-already-in-use': 'This credential is already linked to another account.',
    'auth/unauthorized-domain': 'This domain is not allowed for sign-in. Add your site’s domain (e.g. your-app.vercel.app) in Firebase Console → Authentication → Settings → Authorized domains.',
  }
  return map[code] || `Something went wrong (${code || 'unknown'}). Please try again.`
}

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [masterKey, setMasterKey] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const passwordsMatch = !confirmPassword || password === confirmPassword
  const signUpAllowed = Boolean(MASTER_KEY.trim())

  const clearError = () => setError('')

  const onGoogleSignIn = async () => {
    setError('')
    if (isSignUp && signUpAllowed) {
      if (masterKey.trim() !== MASTER_KEY.trim()) {
        setError('Enter the master key below to create an account with Google.')
        return
      }
    }
    setGoogleLoading(true)
    try {
      const auth = getFirebaseAuth()
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setGoogleLoading(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isSignUp) {
      if (!signUpAllowed) {
        setError('Sign-up is not configured. Contact your administrator.')
        return
      }
      if (masterKey.trim() !== MASTER_KEY.trim()) {
        setError('Invalid master key. Contact your administrator.')
        return
      }
      if (!isPasswordStrong(password)) {
        setError('Please meet all password requirements below.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
      if (!validateEmail(email)) {
        setError('Please enter a valid email address.')
        return
      }
    }

    setLoading(true)
    try {
      const auth = getFirebaseAuth()
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() })
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  const onResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setResetLoading(true)
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), resetEmail.trim())
      setSuccess('Password reset link sent! Check your email inbox (and spam folder).')
      setResetEmail('')
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel-left">
        <svg className="auth-circuit-bg" viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M50 0v80h120v60" stroke="currentColor" strokeWidth="1.5" />
          <path d="M200 140v100h-80v60" stroke="currentColor" strokeWidth="1.5" />
          <path d="M120 300h160v80" stroke="currentColor" strokeWidth="1.5" />
          <path d="M350 0v160h-70v100" stroke="currentColor" strokeWidth="1.5" />
          <path d="M280 260h-60v120h100" stroke="currentColor" strokeWidth="1.5" />
          <path d="M0 200h50v120h80" stroke="currentColor" strokeWidth="1.5" />
          <path d="M130 320v80h-60v100" stroke="currentColor" strokeWidth="1.5" />
          <path d="M320 380v120h-140" stroke="currentColor" strokeWidth="1.5" />
          <path d="M70 500h100v100" stroke="currentColor" strokeWidth="1.5" />
          <path d="M250 460v80h100" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="50" cy="80" r="4" fill="currentColor" />
          <circle cx="200" cy="140" r="4" fill="currentColor" />
          <circle cx="170" cy="140" r="3" fill="currentColor" />
          <circle cx="120" cy="300" r="4" fill="currentColor" />
          <circle cx="280" cy="260" r="4" fill="currentColor" />
          <circle cx="350" cy="160" r="4" fill="currentColor" />
          <circle cx="130" cy="320" r="3" fill="currentColor" />
          <circle cx="280" cy="380" r="4" fill="currentColor" />
          <circle cx="320" cy="380" r="3" fill="currentColor" />
          <circle cx="70" cy="500" r="4" fill="currentColor" />
          <circle cx="250" cy="460" r="3" fill="currentColor" />
          <circle cx="180" cy="500" r="4" fill="currentColor" />
          <rect x="44" cy="192" y="194" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="274" y="374" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="164" y="454" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <div className="auth-panel-content">
          <img src={philfidaLogo} alt="PhilFIDA Logo" className="auth-logo" />
          <h1>PhilFIDA 7</h1>
          <p className="auth-tagline">Asset Management System</p>
          <div className="auth-divider" />
          <p className="auth-desc">
            Track, manage, and monitor every assets across your organization with ease.
          </p>
        </div>
        <p className="auth-panel-footer">Philippine Fiber Industry Development Authority — Region 7</p>
      </div>

      <div className="auth-panel-right">
        <div className="auth-form-wrapper">
          <div className="auth-form-header">
            <img src={philfidaLogo} alt="PhilFIDA" className="auth-mobile-logo" />
            <h2>{showReset ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome back'}</h2>
            <p>
              {showReset
                ? "Enter your email and we'll send a reset link"
                : isSignUp
                  ? 'Fill in the details to register'
                  : 'Sign in to continue to your dashboard'}
            </p>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          {showReset ? (
            <form className="auth-form" onSubmit={onResetPassword}>
              <div className="form-group">
                <label htmlFor="auth-reset-email">Email</label>
                <input
                  id="auth-reset-email"
                  type="email"
                  placeholder="you@email.com"
                  value={resetEmail}
                  onChange={(e) => { setResetEmail(e.target.value); clearError() }}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary auth-submit" disabled={resetLoading}>
                {resetLoading ? (
                  <>
                    <span className="auth-spinner" aria-hidden />
                    <span>Sending...</span>
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
              <p className="auth-switch">
                Remember your password?{' '}
                <button
                  type="button"
                  className="auth-switch-btn"
                  onClick={() => { setShowReset(false); setError(''); setSuccess('') }}
                >
                  Back to Sign In
                </button>
              </p>
            </form>
          ) : (
            <>
              {/* When signing up, require master key first (for both Google and email) */}
              {isSignUp && signUpAllowed && (
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label htmlFor="auth-master-key">Master Key (required for new accounts)</label>
                  <input
                    id="auth-master-key"
                    type="password"
                    placeholder="Enter master key from administrator"
                    value={masterKey}
                    onChange={(e) => { setMasterKey(e.target.value); clearError() }}
                    required
                    autoComplete="off"
                  />
                </div>
              )}

              {/* Google Sign-In — show for both sign-in and sign-up */}
              <div className="auth-social">
                <button
                  type="button"
                  className="auth-google-btn"
                  onClick={onGoogleSignIn}
                  disabled={googleLoading}
                  aria-label="Sign in with Google"
                >
                  {googleLoading ? (
                    <span className="auth-spinner" aria-hidden />
                  ) : (
                    <svg className="auth-google-icon" viewBox="0 0 24 24" aria-hidden>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  <span>{googleLoading ? 'Signing in...' : 'Continue with Google'}</span>
                </button>
              </div>

              <div className="auth-divider-line">
                <span>or continue with email</span>
              </div>

              <form className="auth-form" onSubmit={onSubmit}>
                {isSignUp && (
                  <div className="form-group">
                    <label htmlFor="auth-name">Full Name</label>
                    <input
                      id="auth-name"
                      type="text"
                      placeholder="Juan Dela Cruz"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="auth-email">Email</label>
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError() }}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auth-password">Password</label>
                  <div className="auth-password-wrap">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={isSignUp ? 'Create a strong password' : 'Enter password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={isSignUp ? 8 : 6}
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                  {isSignUp && (
                    <ul className="auth-password-requirements" aria-live="polite">
                      <li className={passwordStrength.length ? 'met' : ''}>At least 8 characters</li>
                      <li className={passwordStrength.upper ? 'met' : ''}>One uppercase letter</li>
                      <li className={passwordStrength.lower ? 'met' : ''}>One lowercase letter</li>
                      <li className={passwordStrength.number ? 'met' : ''}>One number</li>
                      <li className={passwordStrength.special ? 'met' : ''}>One special character (!@#$%^&* etc.)</li>
                    </ul>
                  )}
                  {!isSignUp && (
                    <button
                      type="button"
                      className="auth-forgot-btn"
                      onClick={() => { setShowReset(true); setError(''); setSuccess(''); setResetEmail(email) }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                {isSignUp && (
                  <div className="form-group">
                    <label htmlFor="auth-confirm-password">Confirm Password</label>
                    <div className="auth-password-wrap">
                      <input
                        id="auth-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); clearError() }}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                        )}
                      </button>
                    </div>
                    {confirmPassword && !passwordsMatch && (
                      <span className="auth-field-error">Passwords do not match</span>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary auth-submit"
                  disabled={loading || (isSignUp && (!isPasswordStrong(password) || !passwordsMatch))}
                >
                  {loading ? (
                    <>
                      <span className="auth-spinner" aria-hidden />
                      <span>Signing {isSignUp ? 'up' : 'in'}...</span>
                    </>
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In with Email'
                  )}
                </button>

                <p className="auth-switch">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                  {signUpAllowed || isSignUp ? (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="auth-switch-btn"
                        onClick={() => {
                          setIsSignUp((v) => !v)
                          setError('')
                          setSuccess('')
                          setMasterKey('')
                          setConfirmPassword('')
                          setShowPassword(false)
                          setShowConfirmPassword(false)
                        }}
                      >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                      </button>
                    </>
                  ) : (
                    ' Email sign-up is restricted. Use Google or contact your administrator.'
                  )}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
