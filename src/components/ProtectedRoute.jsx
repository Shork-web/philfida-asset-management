import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="auth-loading">Loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

export function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="auth-loading">Loading...</div>
  return user ? <Navigate to="/" replace /> : children
}
