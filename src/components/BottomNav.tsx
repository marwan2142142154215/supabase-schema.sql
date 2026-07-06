import { NavLink } from 'react-router-dom'
import { Home, Camera, LogOut, History, Grid } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Beranda', icon: Home },
  { path: '/absensi', label: 'Absensi', icon: Camera },
  { path: '/izin', label: 'Izin', icon: LogOut },
  { path: '/riwayat', label: 'Riwayat', icon: History },
  { path: '/chat-nanastoto', label: 'Chat', icon: Grid },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-custom flex lg:hidden z-50 safe-area-bottom">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-2 text-[10px] transition-colors ${
              isActive ? 'text-accent-indigo' : 'text-gray-500'
            }`
          }
        >
          <item.icon size={20} />
          <span className="mt-0.5">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
