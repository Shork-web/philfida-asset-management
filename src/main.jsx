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
import ForReplacementAssets from './pages/ForReplacementAssets.jsx'
import Duplicates from './pages/Duplicates.jsx'
import Subscriptions from './pages/Subscriptions.jsx'
import ScanQR from './pages/ScanQR.jsx'
import UserManagement from './pages/UserManagement.jsx'
import PublicAssetView from './pages/PublicAssetView.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/a/:assetId" element={<PublicAssetView />} />
          {/* Same scanner as /scan but no login — uses public Firestore get on assets/{id} */}
          <Route path="/qr" element={<ScanQR />} />
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
            <Route path="for-replacement" element={<ForReplacementAssets />} />
            <Route path="duplicates" element={<Duplicates />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="scan" element={<ScanQR />} />
            <Route path="users" element={<UserManagement />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
