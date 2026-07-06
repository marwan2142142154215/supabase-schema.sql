import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatTime, formatTimeShort } from '../utils/helpers'
import CameraModal from '../components/CameraModal'

export default function Izin() {
  const [staffList, setStaffList] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [config, setConfig] = useState<any>({})
  const [selectedStaff, setSelectedStaff] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [staffRole, setStaffRole] = useState('')
  const [staffId, setStaffId] = useState('')
  const [showCameraStart, setShowCameraStart] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeBreaks, setActiveBreaks] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = useCallback(async () => {
    const [staffRes, rolesRes, configRes, breaksRes] = await Promise.all([
      supabase.from('staff').select('*, roles(*)').eq('active', true).order('name'),
      supabase.from('roles').select('*'),
      supabase.from('system_config').select('key, value'),
      supabase.from('break_records').select('*, staff(name, roles(name))').eq('status', 'ACTIVE').order('start_time'),
    ])
    if (staffRes.data) setStaffList(staffRes.data)
    if (rolesRes.data) setRoles(rolesRes.data)
    if (configRes.data) {
      const cfg: any = {}
      configRes.data.forEach((c: any) => cfg[c.key] = c.value)
      setConfig(cfg)
    }
    if (breaksRes.data) setActiveBreaks(breaksRes.data)
  }, [])

  useEffect(() => { fetchData(); const sub = supabase.channel('izin').on('postgres_changes', { event: '*', schema: 'public', table: 'break_records' }, fetchData).subscribe(); return () => { supabase.removeChannel(sub) } }, [fetchData])

  const breakDurations = config.break_durations || { keluar: 15, meal: 8 }

  const breakTypes = [
    { value: 'keluar', label: `Izin Keluar (${breakDurations.keluar || 15} menit)`, icon: Clock },
    { value: 'meal', label: `Makan (${breakDurations.meal || 8} menit)`, icon: Clock },
  ]

  const handleStaffSelect = (name: string) => {
    setSelectedStaff(name)
    const staff = staffList.find(s => s.name.toLowerCase() === name.toLowerCase())
    if (staff) { setStaffRole(staff.roles?.name || ''); setStaffId(staff.id) }
  }

  const handleStartBreak = async (photoUrl: string | null) => {
    setShowCameraStart(false)
    if (!selectedStaff || !selectedType) { toast.error('Pilih staff dan jenis izin!'); return }
    setLoading(true)
    try {
      const tolerance = config.late_tolerance_seconds || 59
      const duration = breakDurations[selectedType] || 15

      const existingActive = activeBreaks.find(b => b.staff_id === staffId)
      if (existingActive) { toast.error('Staff ini sudah dalam izin aktif!'); setLoading(false); return }

      const role = roles.find(r => r.id === staffList.find(s => s.id === staffId)?.role_id)
      if (role) {
        const concurrent = activeBreaks.filter(b => {
          const s = staffList.find(st => st.id === b.staff_id)
          return s?.role_id === role.id
        }).length
        if (concurrent >= role.max_concurrent) { toast.error(`Slot ${role.name} penuh! Tunggu yang lain masuk.`); setLoading(false); return }
      }

      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: usage } = await supabase.from('daily_usage').select('*').eq('staff_id', staffId).eq('date', today).single()
      const quotaKey = selectedType === 'keluar' ? 'quota_break_long_per_day' : 'quota_break_short_per_day'
      const countKey = selectedType === 'keluar' ? 'break_long_count' : 'break_short_count'
      const quota = role?.[quotaKey] ?? 4
      const used = usage?.[countKey] ?? 0
      if (used >= quota) { toast.error(`Jatah ${selectedType === 'keluar' ? 'izin keluar' : 'makan'} hari ini habis!`); setLoading(false); return }

      let lat: number | null = null, lng: number | null = null
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 }))
        lat = pos.coords.latitude; lng = pos.coords.longitude
      } catch {}

      let uploadedPhotoUrl = null
      if (photoUrl) {
        const blob = await (await fetch(photoUrl)).blob()
        const fileName = `${staffId}_${Date.now()}_break.jpg`
        const { data: upload } = await supabase.storage.from('nanastoto-photos').upload(`breaks/${today}/${fileName}`, blob, { contentType: 'image/jpeg' })
        if (upload) {
          const { data: { publicUrl } } = supabase.storage.from('nanastoto-photos').getPublicUrl(upload.path)
          uploadedPhotoUrl = publicUrl
        }
      }

      const startTime = new Date()
      const deadline = new Date(startTime.getTime() + (duration * 60 * 1000) + (tolerance * 1000)).toISOString()

      await supabase.from('break_records').insert({
        staff_id: staffId,
        break_type: selectedType,
        start_time: startTime.toISOString(),
        deadline: deadline,
        duration_minutes: duration,
        date: today,
        status: 'ACTIVE',
        photo_start_url: uploadedPhotoUrl,
        latitude_start: lat, longitude_start: lng,
      })

      await supabase.from('daily_usage').upsert(
        { staff_id: staffId, date: today, [countKey]: used + 1 },
        { onConflict: 'staff_id, date' }
      )

      toast.success('Izin dimulai!')
      setSelectedStaff(''); setSelectedType(''); setStaffRole(''); setStaffId(''); setSearchTerm('')
      fetchData()
    } catch (err: any) { toast.error(err.message || 'Gagal memulai izin') }
    finally { setLoading(false) }
  }

  const handleReturn = async (breakRecord: any) => {
    setLoading(true)
    try {
      const returnTime = new Date()
      let isLate = false
      let overtimeSeconds = 0
      if (breakRecord.deadline) {
        const deadline = new Date(breakRecord.deadline)
        isLate = returnTime > deadline
        overtimeSeconds = isLate ? Math.floor((returnTime.getTime() - deadline.getTime()) / 1000) : 0
      }

      await supabase.from('break_records').update({
        return_time: returnTime.toISOString(),
        status: isLate ? 'LATE' : 'ON_TIME',
        overtime_seconds: overtimeSeconds,
      }).eq('id', breakRecord.id)

      toast.success(`${breakRecord.staff?.name} kembali ${isLate ? 'TERLAMBAT' : 'TEPAT WAKTU'}`)
      fetchData()
    } catch (err: any) { toast.error(err.message || 'Gagal') }
    finally { setLoading(false) }
  }

  const handleEmergencyStop = async (breakRecord: any) => {
    if (!confirm(`Emergency stop untuk ${breakRecord.staff?.name}?`)) return
    setLoading(true)
    try {
      await supabase.from('break_records').update({ status: 'FORCE_STOPPED', return_time: new Date().toISOString() }).eq('id', breakRecord.id)
      toast(`${breakRecord.staff?.name} dihentikan paksa!`, { icon: '🚨' })
      fetchData()
    } catch (err: any) { toast.error(err.message || 'Gagal') }
    finally { setLoading(false) }
  }

  const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Izin</h1>

      <div className="bg-card rounded-2xl p-6 border border-custom">
        <h2 className="text-lg font-bold mb-4">Izin Baru</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-secondary block mb-1">Nama Staff</label>
            <input type="text" placeholder="Cari nama..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-secondary border border-custom rounded-xl px-4 py-2.5 text-white outline-none focus:border-accent-indigo" />
            {searchTerm && (
              <div className="mt-1 bg-secondary border border-custom rounded-xl max-h-40 overflow-y-auto">
                {filteredStaff.map(s => (
                  <button key={s.id} onClick={() => { handleStaffSelect(s.name); setSearchTerm('') }}
                    className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm">{s.name} - {s.roles?.name}</button>
                ))}
              </div>
            )}
            {selectedStaff && <p className="text-sm text-accent-green mt-1">✓ {selectedStaff} ({staffRole})</p>}
          </div>
          <div>
            <label className="text-sm text-secondary block mb-1">Jenis Izin</label>
            <div className="grid grid-cols-2 gap-2">
              {breakTypes.map(t => (
                <button key={t.value} onClick={() => setSelectedType(t.value)}
                  className={`p-4 rounded-xl border text-sm font-medium transition-all ${selectedType === t.value ? 'bg-accent-indigo/20 border-accent-indigo text-accent-indigo' : 'bg-secondary border-custom text-secondary hover:text-white'}`}>
                  <t.icon size={22} className="mx-auto mb-2" />{t.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { if (selectedStaff && selectedType) setShowCameraStart(true); else toast.error('Pilih staff dan jenis!') }}
            disabled={loading}
            className="w-full bg-accent-green hover:bg-accent-green/80 text-white rounded-2xl py-4 font-semibold transition-all disabled:opacity-50">
            {loading ? 'Memproses...' : 'MULAI IZIN'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold">Izin Aktif ({activeBreaks.length})</h2>
        {activeBreaks.map(b => {
          const hasDeadline = !!b.deadline
          const remaining = hasDeadline ? new Date(b.deadline).getTime() - Date.now() : Infinity
          const expired = hasDeadline && remaining <= 0
          const urgent = hasDeadline && remaining > 0 && remaining < 120000
          return (
            <div key={b.id} className={`rounded-2xl p-5 border transition-all ${expired ? 'bg-accent-red/10 border-accent-red/30' : urgent ? 'bg-accent-orange/10 border-accent-orange/30' : 'bg-card border-custom'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-lg">{b.staff?.name}</p>
                  <p className="text-sm text-secondary">{b.staff?.roles?.name} • {b.break_type === 'keluar' ? 'IZIN KELUAR' : 'MAKAN'}</p>
                  <p className="text-xs text-secondary mt-1">{formatTime(b.start_time)} - {formatTimeShort(b.deadline)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-mono font-bold ${expired ? 'text-accent-red animate-pulse' : urgent ? 'text-accent-orange' : 'text-accent-indigo'}`}>
                    {expired ? '-' : ''}{Math.floor(Math.abs(remaining) / 60000)}:{String(Math.floor(Math.abs(remaining) / 1000) % 60).padStart(2, '0')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleReturn(b)} disabled={loading} className="flex-1 bg-accent-green hover:bg-accent-green/80 text-white rounded-xl py-2 text-sm font-semibold">KEMBALI</button>
                <button onClick={() => handleEmergencyStop(b)} disabled={loading} className="px-3 bg-accent-red/20 text-accent-red rounded-xl text-xs hover:bg-accent-red/30">🚨</button>
              </div>
            </div>
          )
        })}
        {!activeBreaks.length && <p className="text-center text-secondary py-6">Tidak ada izin aktif</p>}
      </div>

      {showCameraStart && <CameraModal onCapture={handleStartBreak} onClose={() => setShowCameraStart(false)} optional />}
    </div>
  )
}
