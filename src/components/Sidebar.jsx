import { NavLink } from 'react-router-dom'
import { IconDashboard, IconCheckCircle, IconAlertTriangle, IconChevronLeft, IconCreditCard, IconQrCode, IconUsers } from './Icons'
import { useAuth } from '../lib/useAuth'
import philfidaLogo from '../assets/PhilFIDA_Logo.png'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: IconDashboard },
  { to: '/serviceable', label: 'Serviceable Assets', icon: IconCheckCircle },
  { to: '/unserviceable', label: 'Unserviceable Assets', icon: IconAlertTriangle },
  { to: '/subscriptions', label: 'Subscriptions', icon: IconCreditCard },
  { to: '/scan', label: 'Scan QR', icon: IconQrCode, adminOnly: true },
  { to: '/users', label: 'User Management', icon: IconUsers, superAdminOnly: true },
]

function regionLabel(userRegion) {
  if (!userRegion || userRegion === 'all') return 'All Regions'
  return `Region ${userRegion}`
}

export default function Sidebar({ collapsed, onToggle }) {
  const { userRegion, userRole } = useAuth()
  const isViewer = userRole === 'viewer'
  const isSuperAdmin = userRegion === 'all'
  const canAccessScanQR = !isViewer

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-brand">
        <img className="sidebar-logo" src={philfidaLogo} alt="PhilFIDA Logo" />
        {!collapsed && (
          <div className="sidebar-brand-text">
            <span className="sidebar-title">PhilFIDA</span>
            <span className="sidebar-region">{regionLabel(userRegion)}</span>
            {isViewer && (
              <span className="sidebar-viewer-badge">View Only</span>
            )}
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.filter((item) => {
          if (item.superAdminOnly) return isSuperAdmin
          if (item.adminOnly) return canAccessScanQR
          return true
        }).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && <span>PhilFIDA Asset Management By: PDO R7</span>}
        <button
          className={`sidebar-toggle${collapsed ? ' rotated' : ''}`}
          onClick={onToggle}
          type="button"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <IconChevronLeft />
        </button>
      </div>
    </aside>
  )
}
