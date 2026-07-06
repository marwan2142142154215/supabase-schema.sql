import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home, Camera, LogOut, Monitor, History,
  FileText, User, BookOpen, BarChart3, LayoutDashboard, Bell,
  Users, Coffee, Repeat, Activity, AlertTriangle, Gauge,
  Shield, MessageSquare, LogIn, LogOut as LogOutIcon
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import LoginModal from './LoginModal'
import type { PermissionKey } from '../lib/permissions'

interface MenuItem {
  path: string
  label: string
  icon: any
  requiredPermission?: PermissionKey
}

const allMenuItems: MenuItem[] = [
  { path: '/', label: 'Beranda', icon: Home },
  { path: '/absensi', label: 'Absensi', icon: Camera },
  { path: '/izin', label: 'Izin', icon: LogOut },
  { path: '/monitor', label: 'Monitor', icon: Monitor, requiredPermission: 'view_monitor' },
  { path: '/riwayat', label: 'Riwayat', icon: History, requiredPermission: 'view_all_history' },
  { path: '/laporan-bulanan', label: 'Laporan Bulanan', icon: FileText, requiredPermission: 'view_reports' },
  { path: '/profil-staf', label: 'Profil Staf', icon: User },
  { path: '/manajemen-peraturan', label: 'Peraturan', icon: BookOpen, requiredPermission: 'manage_regulations' },
  { path: '/analitik-kehadiran', label: 'Analitik', icon: BarChart3, requiredPermission: 'view_analytics' },
  { path: '/shift-summary', label: 'Shift Summary', icon: LayoutDashboard, requiredPermission: 'view_shift_summary' },
  { path: '/system-alerts', label: 'System Alerts', icon: Bell, requiredPermission: 'view_system_alerts' },
  { path: '/staff-directory', label: 'Staff Directory', icon: Users, requiredPermission: 'view_staff_directory' },
  { path: '/break-analytics', label: 'Break Analytics', icon: Coffee, requiredPermission: 'view_break_analytics' },
  { path: '/shift-handover', label: 'Shift Handover', icon: Repeat, requiredPermission: 'view_shift_handover' },
  { path: '/performance-dashboard', label: 'Performance', icon: Activity, requiredPermission: 'view_performance_dashboard' },
  { path: '/emergency-logs', label: 'Emergency Logs', icon: AlertTriangle, requiredPermission: 'view_emergency_logs' },
  { path: '/quota-overview', label: 'Quota Overview', icon: Gauge, requiredPermission: 'view_quota_overview' },
  { path: '/master-panel', label: 'Master Panel', icon: Shield, requiredPermission: 'access_master_panel' },
  { path: '/chat-nanastoto', label: 'Chat', icon: MessageSquare, requiredPermission: 'access_chat' },
]

export default function Sidebar() {
  const { user, canAccess, logout } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const menuItems = allMenuItems.filter(item => {
    if (!item.requiredPermission) return true
    return canAccess(item.requiredPermission)
  })

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-64 bg-secondary border-r border-custom hidden lg:flex flex-col z-50">
        <div className="p-6 border-b border-custom">
          <h1 className="text-2xl font-bold text-accent-indigo">NANASTOTO</h1>
          {user ? (
            <div className="mt-1">
              <p className="text-sm text-white">{user.name}</p>
              <p className="text-xs text-secondary">{user.roleName}</p>
            </div>
          ) : (
            <p className="text-xs text-secondary mt-1">Belum login</p>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {user && menuItems.map((item) => (
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
        <div className="p-4 border-t border-custom space-y-2">
          {user ? (
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-accent-red hover:bg-accent-red/10 transition-all">
              <LogOutIcon size={16} /> Logout
            </button>
          ) : (
            <button onClick={() => setLoginOpen(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-accent-indigo/20 text-accent-indigo hover:bg-accent-indigo/30 transition-all">
              <LogIn size={16} /> Login
            </button>
          )}
          <p className="text-xs text-secondary text-center">© 2025 NANASTOTO</p>
        </div>
      </aside>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
