import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { User } from 'lucide-react'
import { formatDate, formatTime, getStatusBadge } from '../utils/helpers'

export default function ProfilStaf() {
  const { user } = useAuth()
  const [staff, setStaff] = useState<any>(null)
  const [recentBreaks, setRecentBreaks] = useState<any[]>([])
  const [stats, setStats] = useState({ attendance: 0, late: 0, breaks: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role === 'admin') { setLoading(false); return }
    const fetchProfile = async () => {
      const { data: s } = await supabase.from('staff').select('*, roles(*)').eq('id', user.staffId).single()
      if (s) setStaff(s)
      const { data: breaks } = await supabase.from('break_records').select('*').eq('staff_id', user.staffId).order('start_time', { ascending: false }).limit(10)
      if (breaks) setRecentBreaks(breaks)
      const { count: attendance } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('staff_id', user.staffId)
      const { count: late } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('staff_id', user.staffId).eq('status', 'LATE')
      const { count: totalBreaks } = await supabase.from('break_records').select('*', { count: 'exact', head: true }).eq('staff_id', user.staffId)
      setStats({ attendance: attendance || 0, late: late || 0, breaks: totalBreaks || 0 })
      setLoading(false)
    }
    fetchProfile()
  }, [user])

  if (!user || user.role === 'admin') return <div className="text-center py-12 text-secondary">Halaman ini hanya untuk staff.</div>
  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl p-6 border border-custom text-center">
        <div className="w-20 h-20 rounded-full bg-accent-indigo/20 flex items-center justify-center mx-auto mb-4">
          <User size={36} className="text-accent-indigo" />
        </div>
        <h1 className="text-2xl font-bold">{staff?.name}</h1>
        <p className="text-secondary">{staff?.roles?.name}</p>
        <p className="text-xs text-secondary mt-2">Bergabung {staff?.created_at ? formatDate(staff.created_at) : '-'}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 border border-custom text-center">
          <p className="text-2xl font-bold text-accent-green">{stats.attendance}</p>
          <p className="text-xs text-secondary">Total Hadir</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-custom text-center">
          <p className="text-2xl font-bold text-accent-red">{stats.late}</p>
          <p className="text-xs text-secondary">Terlambat</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-custom text-center">
          <p className="text-2xl font-bold text-accent-indigo">{stats.breaks}</p>
          <p className="text-xs text-secondary">Total Izin</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-custom">
        <h2 className="text-lg font-bold mb-4">Riwayat Izin Terbaru</h2>
        <div className="space-y-2">
          {recentBreaks.map(b => (
            <div key={b.id} className="flex items-center justify-between p-3 bg-secondary rounded-xl">
              <div>
                <p className="text-sm font-medium capitalize">{b.break_type}</p>
                <p className="text-xs text-secondary">{formatTime(b.start_time)}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(b.status)}`}>{b.status}</span>
            </div>
          ))}
          {!recentBreaks.length && <p className="text-secondary text-center py-4">Belum ada riwayat izin</p>}
        </div>
      </div>
    </div>
  )
}
