import { NavLink } from 'react-router-dom'
import {
  Home, Camera, LogOut, Monitor, History,
  FileText, User, BookOpen, BarChart3, LayoutDashboard, Bell,
  Users, Coffee, Repeat, Activity, AlertTriangle, Gauge,
  Shield
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const menuItems = [
  { path: '/', label: 'Beranda', icon: Home },
  { path: '/absensi', label: 'Absensi', icon: Camera },
  { path: '/izin', label: 'Izin Keluar', icon: LogOut },
  { path: '/monitor', label: 'Monitor', icon: Monitor },
  { path: '/riwayat', label: 'Riwayat', icon: History },
  { path: '/laporan-bulanan', label: 'Laporan Bulanan', icon: FileText },
  { path: '/profil-staf', label: 'Profil Staf', icon: User },
  { path: '/manajemen-peraturan', label: 'Peraturan', icon: BookOpen },
  { path: '/analitik-kehadiran', label: 'Analitik', icon: BarChart3 },
  { path: '/shift-summary', label: 'Shift Summary', icon: LayoutDashboard },
  { path: '/system-alerts', label: 'System Alerts', icon: Bell },
  { path: '/staff-directory', label: 'Staff Directory', icon: Users },
  { path: '/break-analytics', label: 'Break Analytics', icon: Coffee },
  { path: '/shift-handover', label: 'Shift Handover', icon: Repeat },
  { path: '/performance-dashboard', label: 'Performance', icon: Activity },
  { path: '/emergency-logs', label: 'Emergency Logs', icon: AlertTriangle },
  { path: '/quota-overview', label: 'Quota Overview', icon: Gauge },
  { path: '/master-panel', label: 'Master Panel', icon: Shield },
]

export default function Sidebar() {
  const { user } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-secondary border-r border-custom hidden lg:flex flex-col z-50">
      <div className="p-6 border-b border-custom">
        <h1 className="text-2xl font-bold text-accent-indigo">NANASTOTO</h1>
        {user && (
          <p className="text-sm text-secondary mt-1">
            {user.role === 'admin' ? 'Administrator' : user.name}
          </p>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon size={18} />
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-custom">
        <p className="text-xs text-secondary text-center">© 2025 NANASTOTO</p>
      </div>
    </aside>
  )
}
