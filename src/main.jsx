import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './lib/AuthProvider'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ServiceableAssets from './pages/ServiceableAssets.jsx'
import UnserviceableAssets from './pages/UnserviceableAssets.jsx'
import Subscriptions from './pages/Subscriptions.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="serviceable" element={<ServiceableAssets />} />
            <Route path="unserviceable" element={<UnserviceableAssets />} />
            <Route path="subscriptions" element={<Subscriptions />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
