import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { Users, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

export default function ShiftSummary() {
  const [summary, setSummary] = useState({ totalAttendance: 0, totalBreaks: 0, complianceRate: 0, activeCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { count: attendance } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('date', today)
      const { data: breaks } = await supabase.from('break_records').select('status').eq('date', today)
      const totalBreaks = breaks?.length || 0
      const onTime = breaks?.filter(b => b.status === 'ON_TIME').length || 0
      const compliance = totalBreaks > 0 ? Math.round((onTime / totalBreaks) * 100) : 100
      const { count: active } = await supabase.from('break_records').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE')
      setSummary({ totalAttendance: attendance || 0, totalBreaks, complianceRate: compliance, activeCount: active || 0 })
      setLoading(false)
    }
    fetch()
    const sub = supabase.channel('shift-summary').on('postgres_changes', { event: '*', schema: 'public' }, fetch).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shift Summary</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-custom">
          <Users size={24} className="text-accent-indigo mb-2" />
          <p className="text-3xl font-bold">{summary.totalAttendance}</p>
          <p className="text-sm text-secondary">Total Absensi</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-custom">
          <Clock size={24} className="text-accent-orange mb-2" />
          <p className="text-3xl font-bold">{summary.totalBreaks}</p>
          <p className="text-sm text-secondary">Total Izin</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-custom">
          <CheckCircle size={24} className="text-accent-green mb-2" />
          <p className="text-3xl font-bold">{summary.complianceRate}%</p>
          <p className="text-sm text-secondary">Kepatuhan</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-custom">
          <AlertTriangle size={24} className="text-accent-orange mb-2" />
          <p className="text-3xl font-bold">{summary.activeCount}</p>
          <p className="text-sm text-secondary">Sedang Izin</p>
        </div>
      </div>
    </div>
  )
}
