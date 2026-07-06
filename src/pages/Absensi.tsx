import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatTime, getStatusBadge } from '../utils/helpers'
import CameraModal from '../components/CameraModal'

export default function Absensi() {
  const [time, setTime] = useState(new Date())
  const [staffList, setStaffList] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [selectedShift, setSelectedShift] = useState('')
  const [staffRole, setStaffRole] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [loading, setLoading] = useState(false)
  const [todayRecords, setTodayRecords] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])

  const fetchData = useCallback(async () => {
    const { data: staff } = await supabase.from('staff').select('*, roles(name)').eq('active', true).order('name')
    if (staff) setStaffList(staff)
    const { data: sh } = await supabase.from('shifts').select('*').eq('active', true)
    if (sh) setShifts(sh)
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data: recs } = await supabase.from('attendance_records').select('*, staff(name), shifts(name)').eq('date', today).order('check_in_time', { ascending: false })
    if (recs) setTodayRecords(recs)
  }, [])

  useEffect(() => { fetchData(); const sub = supabase.channel('absensi').on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, fetchData).subscribe(); return () => { supabase.removeChannel(sub) } }, [fetchData])

  const handleStaffSelect = (name: string) => {
    setSelectedStaff(name)
    const staff = staffList.find(s => s.name.toLowerCase() === name.toLowerCase())
    if (staff) setStaffRole(staff.roles?.name || '')
  }

  const handleCapture = async (photoDataUrl: string | null) => {
    setShowCamera(false)
    if (!selectedStaff || !selectedShift) { toast.error('Pilih staff dan shift!'); return }
    setLoading(true)
    try {
      let lat: number | null = null, lng: number | null = null
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
        })
        lat = pos.coords.latitude; lng = pos.coords.longitude
      } catch {} 

      let photoUrl = null
      if (photoDataUrl) {
        const blob = await (await fetch(photoDataUrl)).blob()
        const staff = staffList.find(s => s.name.toLowerCase() === selectedStaff.toLowerCase())
        const fileName = `${staff?.id}_${Date.now()}_attendance.jpg`
        const { data: upload } = await supabase.storage.from('nanastoto-photos').upload(`attendance/${format(new Date(), 'yyyy-MM-dd')}/${fileName}`, blob, { contentType: 'image/jpeg' })
        if (upload) {
          const { data: { publicUrl } } = supabase.storage.from('nanastoto-photos').getPublicUrl(upload.path)
          photoUrl = publicUrl
        }
      }

      const shift = shifts.find(s => s.id === selectedShift)
      const cutoff = shift?.cutoff_time || '00:00'
      const now = format(new Date(), 'HH:mm:ss')
      const isLate = now > cutoff
      const today = format(new Date(), 'yyyy-MM-dd')
      const staff = staffList.find(s => s.name.toLowerCase() === selectedStaff.toLowerCase())

      const { error } = await supabase.from('attendance_records').insert({
        staff_id: staff?.id,
        shift_id: selectedShift,
        check_in_time: new Date().toISOString(),
        date: today,
        status: isLate ? 'LATE' : 'ON_TIME',
        photo_url: photoUrl,
        latitude: lat,
        longitude: lng,
      })
      if (error) throw error
      toast.success(`Absensi berhasil! Status: ${isLate ? 'TELAT' : 'TEPAT WAKTU'}`)
      setSelectedStaff(''); setSelectedShift(''); setStaffRole('')
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal absensi')
    } finally { setLoading(false) }
  }

  const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl font-mono font-bold text-accent-indigo">{format(time, 'HH:mm:ss')}</div>
        <p className="text-secondary">{format(time, 'EEEE, dd MMMM yyyy', { locale: id })}</p>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-custom">
        <h2 className="text-xl font-bold mb-4">Form Absensi</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-secondary block mb-1">Nama Staff</label>
            <input type="text" placeholder="Cari nama staff..." value={searchTerm}
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
            <label className="text-sm text-secondary block mb-1">Shift</label>
            <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full bg-secondary border border-custom rounded-xl px-4 py-2.5 text-white outline-none focus:border-accent-indigo">
              <option value="">Pilih Shift</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name} (batas: {s.cutoff_time})</option>)}
            </select>
          </div>
          <button onClick={() => { if (selectedStaff && selectedShift) setShowCamera(true); else toast.error('Pilih staff dan shift!') }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent-indigo hover:bg-accent-indigo/80 text-white rounded-2xl py-4 font-semibold transition-all disabled:opacity-50">
            <Camera size={22} /> {loading ? 'Memproses...' : 'AMBIL FOTO & CHECK IN'}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-custom">
        <h3 className="text-lg font-bold mb-4">Absensi Hari Ini</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-secondary border-b border-custom">
                <th className="text-left py-2 px-2">Nama</th>
                <th className="text-left py-2 px-2">Shift</th>
                <th className="text-left py-2 px-2">Jam</th>
                <th className="text-left py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {todayRecords.map(r => (
                <tr key={r.id} className="border-b border-custom/50 hover:bg-white/5">
                  <td className="py-2 px-2">{r.staff?.name}</td>
                  <td className="py-2 px-2">{r.shifts?.name}</td>
                  <td className="py-2 px-2">{formatTime(r.check_in_time)}</td>
                  <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(r.status)}`}>{r.status}</span></td>
                </tr>
              ))}
              {!todayRecords.length && <tr><td colSpan={4} className="text-center py-4 text-secondary">Belum ada absensi hari ini</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showCamera && <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
    </div>
  )
}
