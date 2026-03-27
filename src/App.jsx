import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import UserMenu from './components/UserMenu'
import MissingNewPropertyNumberFab from './components/MissingNewPropertyNumberFab'
import { useAuth } from './lib/useAuth'
import { useInactivityLogout } from './lib/useInactivityLogout'
import './App.css'

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()

  useInactivityLogout(logout, Boolean(user))

  return (
    <div className={`layout${collapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="main-wrapper">
        <header className="top-bar">
          <div className="top-bar-left" />
          <UserMenu />
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <MissingNewPropertyNumberFab />
      </div>
    </div>
  )
}
