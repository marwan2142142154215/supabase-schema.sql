import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

export default function AnalitikKehadiran() {
  const [period, setPeriod] = useState(7)
  const [trendData, setTrendData] = useState<any[]>([])
  const [hourlyData, setHourlyData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const from = format(subDays(new Date(), period), 'yyyy-MM-dd')
      const to = format(new Date(), 'yyyy-MM-dd')

      const { data: records } = await supabase.from('attendance_records').select('check_in_time, status, date').gte('date', from).lte('date', to).order('date')
      if (!records) return

      const trend: Record<string, any> = {}
      records.forEach(r => {
        if (!trend[r.date]) trend[r.date] = { date: r.date, ON_TIME: 0, LATE: 0 }
        trend[r.date][r.status as string]++
      })
      setTrendData(Object.values(trend))

      const hourly: Record<string, any> = {}
      records.forEach(r => {
        const hour = new Date(r.check_in_time).getHours().toString().padStart(2, '0') + ':00'
        if (!hourly[hour]) hourly[hour] = { hour, total: 0 }
        hourly[hour].total++
      })
      setHourlyData(Object.values(hourly).sort((a: any, b: any) => a.hour.localeCompare(b.hour)))
    }
    fetchData()
  }, [period])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analitik Kehadiran</h1>
      <select value={period} onChange={(e) => setPeriod(+e.target.value)} className="bg-secondary border border-custom rounded-xl px-4 py-2.5 text-white">
        <option value={7}>7 Hari</option><option value={14}>14 Hari</option><option value={30}>30 Hari</option>
      </select>

      <div className="bg-card rounded-2xl p-4 border border-custom">
        <h2 className="text-lg font-bold mb-4">Tren Kehadiran</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="onTime" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
              <linearGradient id="late" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip contentStyle={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
            <Area type="monotone" dataKey="ON_TIME" stroke="#22c55e" fill="url(#onTime)" />
            <Area type="monotone" dataKey="LATE" stroke="#ef4444" fill="url(#late)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-2xl p-4 border border-custom">
        <h2 className="text-lg font-bold mb-4">Jam Sibuk Check-in</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip contentStyle={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
            <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
