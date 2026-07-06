import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { formatTime, getStatusBadge } from '../utils/helpers'
import { Search, Download } from 'lucide-react'

export default function Riwayat() {
  const [tab, setTab] = useState<'attendance' | 'break'>('attendance')
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [breakRecords, setBreakRecords] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState({ from: format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') })
  const [page, setPage] = useState(0)
  const pageSize = 20

  useEffect(() => {
    const fetchData = async () => {
      if (tab === 'attendance') {
        let query = supabase.from('attendance_records').select('*, staff(name, roles(name)), shifts(name)').gte('date', dateRange.from).lte('date', dateRange.to).order('check_in_time', { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1)
        if (search) query = query.ilike('staff.name', `%${search}%`)
        const { data } = await query
        if (data) setAttendanceRecords(data)
      } else {
        let query = supabase.from('break_records').select('*, staff(name, roles(name))').gte('date', dateRange.from).lte('date', dateRange.to).order('start_time', { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1)
        if (search) query = query.ilike('staff.name', `%${search}%`)
        const { data } = await query
        if (data) setBreakRecords(data)
      }
    }
    fetchData()
  }, [tab, search, dateRange, page])

  const exportCSV = () => {
    const records = tab === 'attendance' ? attendanceRecords : breakRecords
    if (!records.length) return
    const headers = tab === 'attendance' ? ['Nama', 'Role', 'Shift', 'Jam Masuk', 'Status', 'Tanggal'] : ['Nama', 'Role', 'Jenis', 'Mulai', 'Deadline', 'Kembali', 'Durasi', 'Overtime', 'Status', 'Tanggal']
    const rows = records.map(r => {
      if (tab === 'attendance') return [r.staff?.name, r.staff?.roles?.name, r.shifts?.name, formatTime(r.check_in_time), r.status, r.date]
      const dur = r.return_time ? Math.floor((new Date(r.return_time).getTime() - new Date(r.start_time).getTime()) / 60000) : '-'
      return [r.staff?.name, r.staff?.roles?.name, r.break_type, formatTime(r.start_time), formatTime(r.deadline), r.return_time ? formatTime(r.return_time) : '-', dur, r.overtime_seconds ? `${r.overtime_seconds}s` : '-', r.status, r.date]
    })
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${tab}_history.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Riwayat</h1>
      <div className="flex gap-2">
        <button onClick={() => { setTab('attendance'); setPage(0) }} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'attendance' ? 'bg-accent-indigo text-white' : 'bg-card text-secondary hover:text-white'}`}>Absensi</button>
        <button onClick={() => { setTab('break'); setPage(0) }} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'break' ? 'bg-accent-indigo text-white' : 'bg-card text-secondary hover:text-white'}`}>Izin</button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input type="date" value={dateRange.from} onChange={(e) => setDateRange(p => ({ ...p, from: e.target.value }))} className="bg-secondary border border-custom rounded-xl px-3 py-2 text-sm text-white" />
        <input type="date" value={dateRange.to} onChange={(e) => setDateRange(p => ({ ...p, to: e.target.value }))} className="bg-secondary border border-custom rounded-xl px-3 py-2 text-sm text-white" />
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input type="text" placeholder="Cari nama..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-secondary border border-custom rounded-xl pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-accent-indigo" />
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-2 bg-accent-indigo/20 text-accent-indigo rounded-xl text-sm hover:bg-accent-indigo/30"><Download size={16} /> CSV</button>
      </div>

      <div className="bg-card rounded-2xl border border-custom overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-secondary border-b border-custom">
              {tab === 'attendance' ? (
                <><th className="text-left p-3">Nama</th><th className="text-left p-3">Role</th><th className="text-left p-3">Shift</th><th className="text-left p-3">Jam</th><th className="text-left p-3">Status</th><th className="text-left p-3">Tanggal</th></>
              ) : (
                <><th className="text-left p-3">Nama</th><th className="text-left p-3">Jenis</th><th className="text-left p-3">Mulai</th><th className="text-left p-3">Kembali</th><th className="text-left p-3">Durasi</th><th className="text-left p-3">Status</th><th className="text-left p-3">Tanggal</th></>
              )}
            </tr>
          </thead>
          <tbody>
            {(tab === 'attendance' ? attendanceRecords : breakRecords).map(r => (
              <tr key={r.id} className="border-b border-custom/50 hover:bg-white/5">
                {tab === 'attendance' ? (
                  <><td className="p-3">{r.staff?.name}</td><td className="p-3 text-secondary">{r.staff?.roles?.name}</td><td className="p-3">{r.shifts?.name}</td><td className="p-3">{formatTime(r.check_in_time)}</td><td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(r.status)}`}>{r.status}</span></td><td className="p-3 text-secondary">{r.date}</td></>
                ) : (
                  <><td className="p-3">{r.staff?.name}</td><td className="p-3 text-secondary">{r.break_type}</td><td className="p-3">{formatTime(r.start_time)}</td><td className="p-3">{r.return_time ? formatTime(r.return_time) : '-'}</td><td className="p-3">{r.return_time ? `${Math.floor((new Date(r.return_time).getTime() - new Date(r.start_time).getTime()) / 60000)}m` : '-'}</td><td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(r.status)}`}>{r.status}</span></td><td className="p-3 text-secondary">{r.date}</td></>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 bg-card rounded-xl text-sm disabled:opacity-50">Prev</button>
        <span className="px-4 py-2 text-secondary text-sm">Halaman {page + 1}</span>
        <button onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-card rounded-xl text-sm">Next</button>
      </div>
    </div>
  )
}
