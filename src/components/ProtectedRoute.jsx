import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

export function ProtectedRoute({ children }) {
  const { user, userRegion, userRole, loading } = useAuth()
  // Wait until auth AND profile (region + role) are resolved before rendering
  if (loading || (user && (userRegion === null || userRole === null))) return <div className="auth-loading">Loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

export function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="auth-loading">Loading...</div>
  return user ? <Navigate to="/" replace /> : children
}
