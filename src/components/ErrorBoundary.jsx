import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App error:', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || ''
      const isFirebase = msg.includes('Firebase') || msg.includes('VITE_FIREBASE')
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
            <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
              {isFirebase ? 'Configuration needed' : 'Something went wrong'}
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1rem', lineHeight: 1.5 }}>
              {isFirebase
                ? 'Firebase is not configured for this environment. If you deployed to Vercel, add VITE_FIREBASE_* and (optionally) VITE_SIGNUP_MASTER_KEY in Project Settings → Environment Variables, then redeploy.'
                : msg || 'An unexpected error occurred. Try refreshing the page.'}
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
    return this.props.children
  }
}
