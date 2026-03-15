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
import { isSignUpEnabled, resolveRegionFromKey } from '../lib/regionKeys'
import { setUserProfile } from '../lib/userProfile'
import philfidaLogo from '../assets/PhilFIDA_Logo.png'

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim())
}

function getPasswordStrength(password) {
  return {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    lower:   /[a-z]/.test(password),
    number:  /\d/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  }
}

function strengthScore(s) {
  return Object.values(s).filter(Boolean).length
}

function isPasswordStrong(password) {
  const s = getPasswordStrength(password)
  return s.length && s.upper && s.lower && s.number && s.special
}

function friendlyError(code) {
  const map = {
    'auth/invalid-email':                          'Please enter a valid email address.',
    'auth/user-not-found':                         'No account found with this email.',
    'auth/wrong-password':                         'Incorrect password.',
    'auth/invalid-credential':                     'Invalid email or password.',
    'auth/email-already-in-use':                   'An account with this email already exists. Try signing in.',
    'auth/weak-password':                          'Password does not meet the security requirements.',
    'auth/too-many-requests':                      'Too many attempts. Try again later or reset your password.',
    'auth/operation-not-allowed':                  'This sign-in method is not enabled. Contact your administrator.',
    'auth/network-request-failed':                 'Network error. Check your internet connection.',
    'auth/popup-closed-by-user':                   'Sign-in was cancelled.',
    'auth/popup-blocked':                          'Popup was blocked. Allow popups for this site and try again.',
    'auth/cancelled-popup-request':                'Please complete the sign-in in the popup window.',
    'auth/account-exists-with-different-credential': 'An account exists with this email using a different method.',
    'auth/credential-already-in-use':              'This credential is already linked to another account.',
    'auth/unauthorized-domain':                    'This domain is not authorised for sign-in. Add it in Firebase Console → Authentication → Authorized domains.',
  }
  return map[code] || `Something went wrong (${code || 'unknown'}). Please try again.`
}

/* ── Icon helpers ── */
function IconEmail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function IconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  )
}
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  )
}
function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function IconEyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12 5 5L20 7" />
    </svg>
  )
}
function IconAlert() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
    </svg>
  )
}
function IconSuccess() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
    </svg>
  )
}

/* ── Labelled input with leading icon ── */
function InputField({ id, label, type = 'text', icon, value, onChange, placeholder, required, autoComplete, minLength, rightSlot }) {
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        {icon && <span className="auth-input-icon">{icon}</span>}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
          className={icon ? 'has-icon' : ''}
        />
        {rightSlot}
      </div>
    </div>
  )
}

/* ── Password strength bar ── */
function StrengthBar({ score }) {
  const labels = ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']
  const colours = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
  return (
    <div className="auth-strength">
      <div className="auth-strength-bars">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`auth-strength-bar ${i <= score ? 'filled' : ''}`}
            style={{ background: i <= score ? colours[score] : undefined }} />
        ))}
      </div>
      {score > 0 && <span className="auth-strength-label" style={{ color: colours[score] }}>{labels[score]}</span>}
    </div>
  )
}

export default function Login() {
  const [tab, setTab] = useState('signin') // 'signin' | 'signup'
  const [showReset, setShowReset] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [masterKey, setMasterKey] = useState('')
  const [showMasterKey, setShowMasterKey] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const [passwordFocused, setPasswordFocused] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const isSignUp = tab === 'signup'
  const signUpAllowed = isSignUpEnabled()
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const score = useMemo(() => strengthScore(passwordStrength), [passwordStrength])
  const passwordsMatch = !confirmPassword || password === confirmPassword
  const clearError = () => { setError(''); setSuccess('') }

  const switchTab = (t) => {
    setTab(t)
    setError('')
    setSuccess('')
    setMasterKey('')
    setShowMasterKey(false)
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setPassword('')
    setEmail('')
  }

  const openReset = () => {
    setShowReset(true)
    setResetEmail(email)
    setError('')
    setSuccess('')
  }

  const onGoogleSignIn = async () => {
    setError('')
    if (isSignUp && signUpAllowed) {
      const region = resolveRegionFromKey(masterKey)
      if (!region) {
        setError('Enter a valid master key for your region before signing up with Google.')
        return
      }
    }
    setGoogleLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(getFirebaseAuth(), provider)
      if (isSignUp && signUpAllowed && result?.user) {
        const region = resolveRegionFromKey(masterKey)
        if (region) {
          try {
            await setUserProfile(result.user.uid, {
              region,
              displayName: result.user.displayName ?? null,
              email: result.user.email ?? null,
            })
          } catch (profileErr) {
            console.error('Could not save user region profile:', profileErr?.message)
            setError(
              'Signed in with Google, but your region could not be saved — the Firestore security rules may not be deployed yet. ' +
              'Ask your administrator to publish the rules in Firebase Console → Firestore → Rules, then sign up again.'
            )
          }
        }
      }
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
      if (!signUpAllowed) { setError('Sign-up is not configured. Contact your administrator.'); return }
      const region = resolveRegionFromKey(masterKey)
      if (!region) { setError('Invalid master key for your region. Contact your administrator.'); return }
      if (!isPasswordStrong(password)) { setError('Please meet all password requirements.'); return }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return }
      if (!validateEmail(email)) { setError('Please enter a valid email address.'); return }
    }
    setLoading(true)
    try {
      if (isSignUp) {
        const region = resolveRegionFromKey(masterKey)
        const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)
        if (displayName.trim()) await updateProfile(cred.user, { displayName: displayName.trim() })
        if (region) {
          try {
            await setUserProfile(cred.user.uid, {
              region,
              displayName: displayName.trim() || null,
              email: cred.user.email ?? null,
            })
          } catch (profileErr) {
            // Profile write failed – likely Firestore rules not yet deployed.
            // Sign-up still succeeds but the user will default to region '7' until rules are live.
            console.error('Could not save user region profile:', profileErr?.message)
            setError(
              'Account created, but your region could not be saved — the Firestore security rules may not be deployed yet. ' +
              'Ask your administrator to publish the rules in Firebase Console → Firestore → Rules, then sign up again.'
            )
            return
          }
        }
      } else {
        await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)
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
      setSuccess('Reset link sent! Check your inbox (and spam folder).')
      setResetEmail('')
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setResetLoading(false)
    }
  }

  const eyeToggle = (show, setShow) => (
    <button type="button" className="auth-eye-btn" onClick={() => setShow(v => !v)}
      aria-label={show ? 'Hide' : 'Show'} tabIndex={-1}>
      {show ? <IconEyeOff /> : <IconEye />}
    </button>
  )

  return (
    <div className="auth-page">

      {/* ── Left branding panel ── */}
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
          <circle cx="120" cy="300" r="4" fill="currentColor" />
          <circle cx="280" cy="260" r="4" fill="currentColor" />
          <circle cx="350" cy="160" r="4" fill="currentColor" />
          <circle cx="280" cy="380" r="4" fill="currentColor" />
          <circle cx="70" cy="500" r="4" fill="currentColor" />
          <circle cx="250" cy="460" r="3" fill="currentColor" />
          <rect x="274" y="374" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <rect x="164" y="454" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        <div className="auth-panel-content">
          <div className="auth-logo-wrap">
            <img src={philfidaLogo} alt="PhilFIDA Logo" className="auth-logo" />
          </div>
          <h1>Philippine Fiber Industry Development Authority</h1>
          <p className="auth-tagline">Asset Management System</p>
          <div className="auth-divider" />

          <ul className="auth-features">
            <li>
              <span className="auth-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5L20 7" /></svg>
              </span>
              Track &amp; manage all physical assets
            </li>
            <li>
              <span className="auth-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5L20 7" /></svg>
              </span>
              Monitor service subscriptions
            </li>
            <li>
              <span className="auth-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5L20 7" /></svg>
              </span>
              Export reports to Excel
            </li>
          </ul>
        </div>

        <p className="auth-panel-footer">
          Philippine Fiber Industry Development Authority
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-panel-right">
        <div className="auth-card">

          {/* Mobile logo */}
          <img src={philfidaLogo} alt="PhilFIDA" className="auth-mobile-logo" />

          {showReset ? (
            <>
              <div className="auth-card-header">
                <h2>Reset Password</h2>
                <p>We'll send a reset link to your email</p>
              </div>

              {error && <div className="auth-alert auth-alert-error"><IconAlert />{error}</div>}
              {success && <div className="auth-alert auth-alert-success"><IconSuccess />{success}</div>}

              <form className="auth-form" onSubmit={onResetPassword}>
                <InputField
                  id="auth-reset-email" label="Email address" type="email"
                  icon={<IconEmail />} value={resetEmail}
                  onChange={(e) => { setResetEmail(e.target.value); clearError() }}
                  placeholder="you@email.com" required autoComplete="email"
                />
                <button type="submit" className="auth-submit-btn" disabled={resetLoading}>
                  {resetLoading ? <><span className="auth-spinner" />Sending...</> : 'Send Reset Link'}
                </button>
              </form>

              <button type="button" className="auth-back-btn" onClick={() => { setShowReset(false); setError(''); setSuccess('') }}>
                ← Back to Sign In
              </button>
            </>
          ) : (
            <>
              <div className="auth-card-header">
                <h2>{isSignUp ? 'Create Account' : 'Welcome back'}</h2>
                <p>{isSignUp ? 'Register to access the system' : 'Sign in to your dashboard'}</p>
              </div>

              {/* Tab switcher */}
              <div className="auth-tabs">
                <button type="button" className={`auth-tab ${tab === 'signin' ? 'active' : ''}`} onClick={() => switchTab('signin')}>Sign In</button>
                <button type="button" className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => switchTab('signup')}>Create Account</button>
              </div>

              {error && <div className="auth-alert auth-alert-error"><IconAlert />{error}</div>}
              {success && <div className="auth-alert auth-alert-success"><IconSuccess />{success}</div>}

              {/* Master key — shown at top on sign-up */}
              {isSignUp && signUpAllowed && (
                <InputField
                  id="auth-master-key"
                  label="Master Key"
                  type={showMasterKey ? 'text' : 'password'}
                  icon={<IconKey />}
                  value={masterKey}
                  onChange={(e) => { setMasterKey(e.target.value); clearError() }}
                  placeholder="Enter key provided by administrator"
                  required
                  autoComplete="off"
                  rightSlot={eyeToggle(showMasterKey, setShowMasterKey)}
                />
              )}

              {/* Google button */}
              <button type="button" className="auth-google-btn" onClick={onGoogleSignIn} disabled={googleLoading}>
                {googleLoading ? (
                  <span className="auth-spinner auth-spinner-dark" />
                ) : (
                  <svg className="auth-google-icon" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                <span>{googleLoading ? 'Connecting...' : `${isSignUp ? 'Sign up' : 'Sign in'} with Google`}</span>
              </button>

              <div className="auth-divider-line"><span>or use email</span></div>

              <form className="auth-form" onSubmit={onSubmit}>
                {isSignUp && (
                  <InputField
                    id="auth-name" label="Full Name" type="text"
                    icon={<IconUser />} value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Juan Dela Cruz" autoComplete="name"
                  />
                )}

                <InputField
                  id="auth-email" label="Email address" type="email"
                  icon={<IconEmail />} value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError() }}
                  placeholder="you@email.com" required autoComplete="email"
                />

                <div className="auth-field">
                  <div className="auth-label-row">
                    <label className="auth-label" htmlFor="auth-password">Password</label>
                    {!isSignUp && (
                      <button type="button" className="auth-forgot-btn" onClick={openReset}>
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><IconLock /></span>
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      placeholder={isSignUp ? 'Create a strong password' : 'Enter your password'}
                      required minLength={isSignUp ? 8 : 6}
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      className="has-icon"
                    />
                    {eyeToggle(showPassword, setShowPassword)}
                  </div>
                  {isSignUp && (passwordFocused || password) && (
                    <>
                      <StrengthBar score={score} />
                      <ul className="auth-req-list" aria-live="polite">
                        {[
                          [passwordStrength.length, 'At least 8 characters'],
                          [passwordStrength.upper,  'One uppercase letter'],
                          [passwordStrength.lower,  'One lowercase letter'],
                          [passwordStrength.number, 'One number'],
                          [passwordStrength.special, 'One special character (!@#$%^&* etc.)'],
                        ].map(([met, label]) => (
                          <li key={label} className={met ? 'met' : ''}>
                            <span className="auth-req-icon">{met ? '✓' : '○'}</span>
                            {label}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                {isSignUp && (
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-confirm">Confirm Password</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon"><IconLock /></span>
                      <input
                        id="auth-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); clearError() }}
                        placeholder="Re-enter your password" required
                        autoComplete="new-password" className="has-icon"
                      />
                      {eyeToggle(showConfirmPassword, setShowConfirmPassword)}
                    </div>
                    {confirmPassword && !passwordsMatch && (
                      <span className="auth-field-error">Passwords do not match</span>
                    )}
                  </div>
                )}

                <button
                  type="submit" className="auth-submit-btn"
                  disabled={loading || (isSignUp && (!isPasswordStrong(password) || !passwordsMatch))}
                >
                  {loading
                    ? <><span className="auth-spinner" />{isSignUp ? 'Creating account...' : 'Signing in...'}</>
                    : isSignUp ? 'Create Account' : 'Sign In'}
                </button>

                {!signUpAllowed && !isSignUp && (
                  <p className="auth-note">New account? Contact your administrator.</p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
