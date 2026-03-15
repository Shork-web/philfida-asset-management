import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

export function ProtectedRoute({ children }) {
  const { user, userRegion, loading } = useAuth()
  // Wait until both auth AND region profile are resolved before rendering
  if (loading || (user && userRegion === null)) return <div className="auth-loading">Loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

export function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="auth-loading">Loading...</div>
  return user ? <Navigate to="/" replace /> : children
}
