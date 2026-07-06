import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { formatTime, formatTimeShort } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function Monitor() {
  const [isMobile, setIsMobile] = useState(false)
  const [activeBreaks, setActiveBreaks] = useState<any[]>([])
  const [recentReturns, setRecentReturns] = useState<any[]>([])
  const [roleSummary, setRoleSummary] = useState<any[]>([])
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const check = () => {
      const ua = navigator.userAgent.toLowerCase()
      const mobile = /mobile|android|iphone|ipad|ipod/i.test(ua) || window.innerWidth < 768
      setIsMobile(mobile)
    }
    check()
    window.addEventListener('resize', check)
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => { window.removeEventListener('resize', check); clearInterval(t) }
  }, [])

  const fetchData = useCallback(async () => {
    const { data: breaks } = await supabase.from('break_records').select('*, staff(name, roles(name))').eq('status', 'ACTIVE').order('start_time')
    if (breaks) setActiveBreaks(breaks)
    const { data: returns } = await supabase.from('break_records').select('*, staff(name)').in('status', ['ON_TIME', 'LATE', 'FORCE_STOPPED']).order('return_time', { ascending: false }).limit(5)
    if (returns) setRecentReturns(returns)
    const { data: roles } = await supabase.from('roles').select('id, name')
    if (roles) {
      const summary = []
      for (const role of roles) {
        const { data: staffs } = await supabase.from('staff').select('id').eq('role_id', role.id).eq('active', true)
        if (staffs?.length) {
          const { count } = await supabase.from('break_records').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE').in('staff_id', staffs.map(s => s.id))
          summary.push({ ...role, outside: count || 0 })
        }
      }
      setRoleSummary(summary)
    }
  }, [])

  useEffect(() => { fetchData(); const sub = supabase.channel('monitor').on('postgres_changes', { event: '*', schema: 'public' }, fetchData).subscribe(); return () => { supabase.removeChannel(sub) } }, [fetchData])

  const handleStopAll = async () => {
    const c1 = confirm('Hentikan SEMUA izin aktif?')
    if (!c1) return
    const input = prompt('Ketik KONFIRMASI untuk melanjutkan:')
    if (input !== 'KONFIRMASI') { toast.error('Konfirmasi gagal'); return }
    for (const b of activeBreaks) {
      await supabase.from('break_records').update({ status: 'FORCE_STOPPED', return_time: new Date().toISOString() }).eq('id', b.id)
    }
    toast.success('Semua izin dihentikan!')
    fetchData()
  }

  if (isMobile) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🖥️</div>
          <h2 className="text-xl font-bold mb-2">Halaman Monitor</h2>
          <p className="text-secondary">Halaman Monitor hanya tersedia di browser PC/Desktop. Buka di komputer untuk mengakses halaman ini.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          LIVE MONITOR <span className="w-2 h-2 bg-accent-red rounded-full animate-pulse" />
        </h1>
        <div className="text-3xl font-mono font-bold">{format(time, 'HH:mm:ss')}</div>
      </div>

      {activeBreaks.length > 0 && (
        <button onClick={handleStopAll} className="w-full bg-accent-red hover:bg-accent-red/80 text-white rounded-2xl py-4 font-bold text-lg transition-all">
          HENTIKAN SEMUA IZIN AKTIF ({activeBreaks.length})
        </button>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-3">
          <h2 className="font-bold text-lg">Izin Aktif</h2>
          {activeBreaks.map(b => {
            const remaining = new Date(b.deadline).getTime() - Date.now()
            const expired = remaining <= 0
            return (
              <div key={b.id} className={`rounded-xl p-4 border ${expired ? 'bg-accent-red/10 border-accent-red/50' : 'bg-card border-custom'}`}>
                <p className="font-bold">{b.staff?.name} <span className="text-sm font-normal text-secondary">- {b.staff?.roles?.name}</span></p>
                <p className="text-sm text-secondary">{b.break_type} • {formatTime(b.start_time)} - {formatTimeShort(b.deadline)}</p>
                <p className={`text-xl font-mono font-bold ${expired ? 'text-accent-red animate-pulse' : 'text-accent-indigo'}`}>
                  {expired ? '-' : ''}{Math.floor(Math.abs(remaining) / 60000)}:{String(Math.floor(Math.abs(remaining) / 1000) % 60).padStart(2, '0')}
                </p>
              </div>
            )
          })}
          {!activeBreaks.length && <p className="text-secondary text-center py-8">Tidak ada izin aktif</p>}
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl p-4 border border-custom">
            <h3 className="font-bold mb-3">Per Role</h3>
            {roleSummary.map(r => (
              <div key={r.id} className="flex justify-between text-sm py-1">
                <span>{r.name}</span>
                <span className="text-accent-orange font-bold">{r.outside}</span>
              </div>
            ))}
          </div>
          <div className="bg-card rounded-xl p-4 border border-custom">
            <h3 className="font-bold mb-3">Terbaru Kembali</h3>
            {recentReturns.map(r => (
              <div key={r.id} className="text-sm py-1 border-b border-custom/50 last:border-0">
                <span className="font-medium">{r.staff?.name}</span>
                <span className="text-secondary ml-2">{r.status}</span>
                <span className="text-xs text-secondary block">{r.return_time ? formatTime(r.return_time) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
