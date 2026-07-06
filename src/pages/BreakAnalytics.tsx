import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#f97316']

export default function BreakAnalytics() {
  const [period, setPeriod] = useState(7)
  const [breakData, setBreakData] = useState<any[]>([])
  const [roleData, setRoleData] = useState<any[]>([])
  const [avgDuration, setAvgDuration] = useState(0)

  useEffect(() => {
    const fetch = async () => {
      const from = format(subDays(new Date(), period), 'yyyy-MM-dd')
      const { data: breaks } = await supabase.from('break_records').select('break_type, duration_minutes, overtime_seconds, status, staff_id').gte('date', from)
      if (!breaks) return

      const byType: Record<string, number> = {}
      breaks.forEach(b => { byType[b.break_type] = (byType[b.break_type] || 0) + 1 })
      setBreakData(Object.entries(byType).map(([name, value]) => ({ name, value })))

      const total = breaks.reduce((sum, b) => sum + b.duration_minutes, 0)
      setAvgDuration(breaks.length ? Math.round(total / breaks.length) : 0)

      const { data: staffRows } = await supabase.from('staff').select('id, roles(name)')
      if (staffRows) {
        const roleBreaks: Record<string, number> = {}
        breaks.forEach(b => {
          const s: any = staffRows.find((st: any) => st.id === b.staff_id)
          const role = s?.roles?.name || 'Unknown'
          roleBreaks[role] = (roleBreaks[role] || 0) + 1
        })
        setRoleData(Object.entries(roleBreaks).map(([name, value]) => ({ name, value })))
      }
    }
    fetch()
  }, [period])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Break Analytics</h1>
      <select value={period} onChange={(e) => setPeriod(+e.target.value)} className="bg-secondary border border-custom rounded-xl px-4 py-2.5 text-white">
        <option value={7}>7 Hari</option><option value={14}>14 Hari</option><option value={30}>30 Hari</option>
      </select>
      <div className="bg-card rounded-2xl p-4 border border-custom">
        <p className="text-lg font-bold mb-1">Rata-rata Durasi</p>
        <p className="text-4xl font-bold text-accent-indigo">{avgDuration} <span className="text-lg text-secondary">menit</span></p>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-4 border border-custom">
          <h2 className="text-lg font-bold mb-4">Berdasarkan Jenis</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={breakData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {breakData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-custom">
          <h2 className="text-lg font-bold mb-4">Berdasarkan Role</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={roleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
