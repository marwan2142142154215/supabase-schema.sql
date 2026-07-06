import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Camera, LogOut, Clock, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react'

export default function Home() {
  const { user, canAccess } = useAuth()
  const [time, setTime] = useState(new Date())
  const [stats, setStats] = useState({ outside: 0, attended: 0, late: 0, totalBreaks: 0 })
  const [roleStats, setRoleStats] = useState<any[]>([])
  const [regulations, setRegulations] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchStats = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const { count: outside } = await supabase.from('break_records').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE')
    const { count: attended } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('date', today)
    const { count: late } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'LATE')
    const { count: totalBreaks } = await supabase.from('break_records').select('*', { count: 'exact', head: true }).eq('date', today)
    setStats({ outside: outside || 0, attended: attended || 0, late: late || 0, totalBreaks: totalBreaks || 0 })
    const { data: roles } = await supabase.from('roles').select('id, name')
    if (roles) {
      const rStats: any[] = []
      for (const role of roles) {
        const { data: staffs } = await supabase.from('staff').select('id').eq('role_id', role.id).eq('active', true)
        if (staffs?.length) {
          const staffIds = staffs.map(s => s.id)
          const { count } = await supabase.from('break_records').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE').in('staff_id', staffIds)
          rStats.push({ ...role, outside: count || 0, total: staffs.length })
        }
      }
      setRoleStats(rStats)
    }
    const { data: reg } = await supabase.from('regulations').select('content').order('created_at', { ascending: false }).limit(1).single()
    if (reg) setRegulations(reg.content)
  }, [])

  useEffect(() => { fetchStats(); const sub = supabase.channel('home-stats').on('postgres_changes', { event: '*', schema: 'public' }, fetchStats).subscribe(); return () => { supabase.removeChannel(sub) } }, [fetchStats])

  const statCards = [
    { label: 'Sedang di Luar', value: stats.outside, icon: LogOut, color: 'text-accent-orange', bg: 'bg-accent-orange/10' },
    { label: 'Absensi Hari Ini', value: stats.attended, icon: CheckCircle, color: 'text-accent-green', bg: 'bg-accent-green/10' },
    { label: 'Terlambat', value: stats.late, icon: AlertTriangle, color: 'text-accent-red', bg: 'bg-accent-red/10' },
    { label: 'Total Izin', value: stats.totalBreaks, icon: Clock, color: 'text-accent-indigo', bg: 'bg-accent-indigo/10' },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-5xl lg:text-7xl font-bold tracking-wider text-accent-indigo mb-2">NANASTOTO</h1>
        <div className="text-4xl lg:text-6xl font-mono font-bold text-white mb-2">
          {format(time, 'HH:mm:ss')}
        </div>
        <p className="text-lg text-secondary">
          {format(time, 'EEEE, dd MMMM yyyy', { locale: id })}
        </p>
      </div>

      {regulations && (
        <div className="bg-accent-gold/10 border border-accent-gold/20 rounded-2xl p-4 text-sm text-accent-gold">
          📋 {regulations}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-2xl p-5 border border-white/5 backdrop-blur-md`}>
            <div className="flex items-center justify-between mb-3">
              <card.icon size={24} className={card.color} />
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
            <p className="text-sm text-secondary mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {roleStats.map((r) => (
          <div key={r.id} className="bg-card rounded-xl p-4 border border-custom">
            <p className="font-semibold text-sm">{r.name}</p>
            <p className="text-2xl font-bold text-accent-indigo">{r.outside}</p>
            <p className="text-xs text-secondary">/{r.total} staff</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button onClick={() => navigate('/absensi')} className="flex-1 flex items-center justify-center gap-2 bg-accent-indigo hover:bg-accent-indigo/80 text-white rounded-2xl py-4 font-semibold transition-all">
          <Camera size={22} /> Absensi
        </button>
        <button onClick={() => navigate('/izin')} className="flex-1 flex items-center justify-center gap-2 bg-accent-green hover:bg-accent-green/80 text-white rounded-2xl py-4 font-semibold transition-all">
          <LogOut size={22} /> Izin Keluar
        </button>
      </div>

      {user && canAccess('access_chat') && (
        <button onClick={() => navigate('/chat-nanastoto')}
          className="w-full flex items-center justify-center gap-2 bg-accent-indigo/10 hover:bg-accent-indigo/20 border border-accent-indigo/30 text-accent-indigo rounded-2xl py-4 font-semibold transition-all">
          <MessageSquare size={22} /> Buka Chat
        </button>
      )}
    </div>
  )
}
