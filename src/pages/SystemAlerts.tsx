import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { AlertTriangle, Info, XCircle, RefreshCw } from 'lucide-react'

export default function SystemAlerts() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetch = async () => {
      let query = supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50)
      if (filter !== 'all') query = query.eq('action', filter)
      const { data } = await query
      if (data) setAlerts(data)
    }
    fetch()
    const sub = supabase.channel('system-alerts').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_logs' }, (payload) => {
      setAlerts(prev => [payload.new as any, ...prev].slice(0, 50))
    }).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [filter])

  const getIcon = (action: string) => {
    if (action.includes('error') || action.includes('emergency')) return <XCircle size={16} className="text-accent-red" />
    if (action.includes('warning')) return <AlertTriangle size={16} className="text-accent-orange" />
    if (action.includes('reset') || action.includes('cleanup')) return <RefreshCw size={16} className="text-accent-indigo" />
    return <Info size={16} className="text-accent-green" />
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Alerts</h1>
      <div className="flex gap-2 flex-wrap">
        {['all', 'error', 'warning', 'reset', 'emergency', 'login', 'cleanup'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-xl text-sm ${filter === f ? 'bg-accent-indigo text-white' : 'bg-card text-secondary hover:text-white'}`}>{f}</button>
        ))}
      </div>
      <div className="space-y-2">
        {alerts.map(a => (
          <div key={a.id} className="bg-card rounded-xl p-4 border border-custom flex items-start gap-3">
            <div className="mt-0.5">{getIcon(a.action)}</div>
            <div className="flex-1">
              <p className="text-sm font-medium">{a.action}</p>
              <p className="text-xs text-secondary">{a.details ? JSON.stringify(a.details) : '-'}</p>
              <p className="text-xs text-secondary mt-1">{format(new Date(a.created_at), 'dd/MM/yy HH:mm:ss')} • {a.triggered_by}</p>
            </div>
          </div>
        ))}
        {!alerts.length && <p className="text-center py-8 text-secondary">Tidak ada alerts</p>}
      </div>
    </div>
  )
}
