import { HashRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Absensi from './pages/Absensi'
import Izin from './pages/Izin'
import Monitor from './pages/Monitor'
import Riwayat from './pages/Riwayat'
import MasterPanel from './pages/MasterPanel'
import LaporanBulanan from './pages/LaporanBulanan'
import ProfilStaf from './pages/ProfilStaf'
import ManajemenPeraturan from './pages/ManajemenPeraturan'
import AnalitikKehadiran from './pages/AnalitikKehadiran'
import ShiftSummary from './pages/ShiftSummary'
import SystemAlerts from './pages/SystemAlerts'
import StaffDirectory from './pages/StaffDirectory'
import BreakAnalytics from './pages/BreakAnalytics'
import ShiftHandover from './pages/ShiftHandover'
import PerformanceDashboard from './pages/PerformanceDashboard'
import EmergencyLogs from './pages/EmergencyLogs'
import QuotaOverview from './pages/QuotaOverview'
import Chat from './pages/Chat'

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#12121a',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
            },
          }}
        />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/absensi" element={<Absensi />} />
            <Route path="/izin" element={<Izin />} />
            <Route path="/monitor" element={<Monitor />} />
            <Route path="/riwayat" element={<Riwayat />} />
            <Route path="/laporan-bulanan" element={<LaporanBulanan />} />
            <Route path="/profil-staf" element={<ProfilStaf />} />
            <Route path="/manajemen-peraturan" element={<ManajemenPeraturan />} />
            <Route path="/analitik-kehadiran" element={<AnalitikKehadiran />} />
            <Route path="/shift-summary" element={<ShiftSummary />} />
            <Route path="/system-alerts" element={<SystemAlerts />} />
            <Route path="/staff-directory" element={<StaffDirectory />} />
            <Route path="/break-analytics" element={<BreakAnalytics />} />
            <Route path="/shift-handover" element={<ShiftHandover />} />
            <Route path="/performance-dashboard" element={<PerformanceDashboard />} />
            <Route path="/emergency-logs" element={<EmergencyLogs />} />
            <Route path="/quota-overview" element={<QuotaOverview />} />
          </Route>
          <Route path="/master-panel" element={<MasterPanel />} />
          <Route path="/chat-nanastoto" element={<Chat />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
