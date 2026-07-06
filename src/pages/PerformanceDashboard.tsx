import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { supabase } from '../lib/supabase'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function PerformanceDashboard() {
  const [period, setPeriod] = useState(7)
  const [consistencyData, setConsistencyData] = useState<any[]>([])
  const [breakPatternData, setBreakPatternData] = useState<any[]>([])

  useEffect(() => {
    const fetch = async () => {
      const from = format(subDays(new Date(), period), 'yyyy-MM-dd')
      const to = format(new Date(), 'yyyy-MM-dd')
      const { data: attendance } = await supabase.from('attendance_records').select('staff_id, date, status').gte('date', from).lte('date', to).order('date')
      const { data: breaks } = await supabase.from('break_records').select('staff_id, date, break_type, status').gte('date', from).lte('date', to)
      if (!attendance || !breaks) return

      const daily: Record<string, any> = {}
      attendance.forEach(a => {
        if (!daily[a.date]) daily[a.date] = { date: a.date, hadir: 0, tepat: 0 }
        daily[a.date].hadir++
        if (a.status === 'ON_TIME') daily[a.date].tepat++
      })
      setConsistencyData(Object.values(daily))

      const breakDaily: Record<string, any> = {}
      breaks.forEach(b => {
        if (!breakDaily[b.date]) breakDaily[b.date] = { date: b.date, total: 0, onTime: 0 }
        breakDaily[b.date].total++
        if (b.status === 'ON_TIME') breakDaily[b.date].onTime++
      })
      setBreakPatternData(Object.values(breakDaily))
    }
    fetch()
  }, [period])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Performance Dashboard</h1>
      <select value={period} onChange={(e) => setPeriod(+e.target.value)} className="bg-secondary border border-custom rounded-xl px-4 py-2.5 text-white">
        <option value={7}>7 Hari</option><option value={14}>14 Hari</option><option value={30}>30 Hari</option>
      </select>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-4 border border-custom">
          <h2 className="text-lg font-bold mb-4">Konsistensi Kehadiran</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={consistencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              <Bar dataKey="hadir" fill="#6366f1" radius={[4, 4, 0, 0]} name="Hadir" />
              <Bar dataKey="tepat" fill="#22c55e" radius={[4, 4, 0, 0]} name="Tepat Waktu" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-custom">
          <h2 className="text-lg font-bold mb-4">Pola Break</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={breakPatternData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              <Line type="monotone" dataKey="total" stroke="#f59e0b" name="Total Break" />
              <Line type="monotone" dataKey="onTime" stroke="#22c55e" name="Tepat Waktu" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
