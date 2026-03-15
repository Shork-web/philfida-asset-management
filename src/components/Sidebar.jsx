import { NavLink } from 'react-router-dom'
import { IconDashboard, IconCheckCircle, IconAlertTriangle, IconChevronLeft, IconCreditCard } from './Icons'
import { useAuth } from '../lib/useAuth'
import philfidaLogo from '../assets/PhilFIDA_Logo.png'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: IconDashboard },
  { to: '/serviceable', label: 'Serviceable Assets', icon: IconCheckCircle },
  { to: '/unserviceable', label: 'Unserviceable Assets', icon: IconAlertTriangle },
  { to: '/subscriptions', label: 'Subscriptions', icon: IconCreditCard },
]

function regionLabel(userRegion) {
  if (!userRegion || userRegion === 'all') return 'All Regions'
  return `Region ${userRegion}`
}

export default function Sidebar({ collapsed, onToggle }) {
  const { userRegion } = useAuth()

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-brand">
        <img className="sidebar-logo" src={philfidaLogo} alt="PhilFIDA Logo" />
        {!collapsed && (
          <div className="sidebar-brand-text">
            <span className="sidebar-title">PhilFIDA</span>
            <span className="sidebar-region">{regionLabel(userRegion)}</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
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
        {!collapsed && <span>PhilFIDA Asset Management V1.5</span>}
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
