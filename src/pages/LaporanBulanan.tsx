import { useState, useEffect } from 'react'
import { format, endOfMonth } from 'date-fns'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function LaporanBulanan() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const [year, m] = month.split('-')
      const from = `${year}-${m}-01`
      const to = format(endOfMonth(new Date(+year, +m - 1)), 'yyyy-MM-dd')

      const { data: staffRows } = await supabase.from('staff').select('id, name, roles(name)').eq('active', true)
      if (!staffRows) { setLoading(false); return }

      const result: any[] = []
      for (const row of staffRows) {
        const s = row as any
        const { count: attendance } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('staff_id', s.id).gte('date', from).lte('date', to)
        const { count: late } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('staff_id', s.id).eq('status', 'LATE').gte('date', from).lte('date', to)
        const { count: totalBreaks } = await supabase.from('break_records').select('*', { count: 'exact', head: true }).eq('staff_id', s.id).gte('date', from).lte('date', to)
        const { count: lateBreaks } = await supabase.from('break_records').select('*', { count: 'exact', head: true }).eq('staff_id', s.id).eq('status', 'LATE').gte('date', from).lte('date', to)
        result.push({ name: s.name, role: s.roles?.name, attendance: attendance || 0, late: late || 0, breaks: totalBreaks || 0, lateBreaks: lateBreaks || 0 })
      }
      setData(result)
      setLoading(false)
    }
    fetchData()
  }, [month])

  const chartData = data.map(d => ({ name: d.name, Hadir: d.attendance, Terlambat: d.late }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan Bulanan</h1>
      <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-secondary border border-custom rounded-xl px-4 py-2.5 text-white" />
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="bg-card rounded-2xl p-4 border border-custom">
            <h2 className="text-lg font-bold mb-4">Grafik Kehadiran</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Bar dataKey="Hadir" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Terlambat" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-2xl border border-custom overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-secondary border-b border-custom">
                  <th className="text-left p-3">Nama</th><th className="text-left p-3">Role</th><th className="text-center p-3">Hadir</th><th className="text-center p-3">Terlambat</th><th className="text-center p-3">Izin</th><th className="text-center p-3">Telat Izin</th>
                </tr>
              </thead>
              <tbody>
                {data.map(d => (
                  <tr key={d.name} className="border-b border-custom/50 hover:bg-white/5">
                    <td className="p-3">{d.name}</td><td className="p-3 text-secondary">{d.role}</td>
                    <td className="p-3 text-center text-accent-green">{d.attendance}</td>
                    <td className="p-3 text-center text-accent-red">{d.late}</td>
                    <td className="p-3 text-center">{d.breaks}</td>
                    <td className="p-3 text-center text-accent-orange">{d.lateBreaks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
