import { NavLink } from 'react-router-dom'
import { IconDashboard, IconCheckCircle, IconAlertTriangle, IconChevronLeft, IconCreditCard } from './Icons'
import philfidaLogo from '../assets/PhilFIDA_Logo.png'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: IconDashboard },
  { to: '/serviceable', label: 'Serviceable Assets', icon: IconCheckCircle },
  { to: '/unserviceable', label: 'Unserviceable Assets', icon: IconAlertTriangle },
  { to: '/subscriptions', label: 'Subscriptions', icon: IconCreditCard },
]

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-brand">
        <img className="sidebar-logo" src={philfidaLogo} alt="PhilFIDA Logo" />
        {!collapsed && <span className="sidebar-title">PhilFIDA 7</span>}
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
        {!collapsed && <span>PhilFIDA 7 Asset Management v1.0</span>}
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
