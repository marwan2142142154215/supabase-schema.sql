import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AlertTriangle, Clock, Shield } from 'lucide-react'
import { formatTime } from '../utils/helpers'

export default function EmergencyLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('break_records').select('*, staff(name)').in('status', ['FORCE_STOPPED']).order('updated_at', { ascending: false }).limit(50)
      if (data) setLogs(data)
      setLoading(false)
    }
    fetch()
    const sub = supabase.channel('emergency-logs').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'break_records', filter: 'status=eq.FORCE_STOPPED' }, fetch).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="text-accent-red" /> Emergency Logs</h1>
      <div className="space-y-2">
        {logs.map(l => (
          <div key={l.id} className="bg-card rounded-xl p-4 border border-accent-red/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-red/20 flex items-center justify-center shrink-0"><Shield size={20} className="text-accent-red" /></div>
              <div>
                <p className="font-medium"><span className="text-accent-red">EMERGENCY STOP</span> — {l.staff?.name}</p>
                <p className="text-sm text-secondary mt-1">Izin {l.break_type} dihentikan paksa</p>
                <div className="flex gap-4 mt-2 text-xs text-secondary">
                  <span><Clock size={12} className="inline mr-1" />Mulai: {formatTime(l.start_time)}</span>
                  <span><Clock size={12} className="inline mr-1" />Dihentikan: {l.return_time ? formatTime(l.return_time) : '-'}</span>
                  <span><Clock size={12} className="inline mr-1" />Tanggal: {l.date}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!logs.length && <p className="text-center py-8 text-secondary">Belum ada emergency log</p>}
      </div>
    </div>
  )
}
