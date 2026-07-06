import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { Coffee, Utensils, Droplets } from 'lucide-react'

export default function QuotaOverview() {
  const [staffData, setStaffData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: staff } = await supabase.from('staff').select('*, roles(*)').eq('active', true)
      if (!staff) { setLoading(false); return }
      const { data: usage } = await supabase.from('daily_usage').select('*').eq('date', today)
      const result = staff.map(s => {
        const u = usage?.find((d: any) => d.staff_id === s.id)
        return {
          name: s.name,
          role: s.roles?.name,
          breakLong: { used: u?.break_long_count || 0, quota: s.roles?.quota_break_long_per_day || 4 },
          breakShort: { used: u?.break_short_count || 0, quota: s.roles?.quota_break_short_per_day || 3 },
          toilet: { used: u?.toilet_count || 0, quota: s.roles?.quota_toilet_per_day ?? -1 },
        }
      })
      setStaffData(result)
      setLoading(false)
    }
    fetch()
    const sub = supabase.channel('quota').on('postgres_changes', { event: '*', schema: 'public', table: 'daily_usage' }, fetch).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Quota Overview</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-secondary border-b border-custom">
              <th className="text-left p-3">Staff</th>
              <th className="text-left p-3">Role</th>
              <th className="text-center p-3"><Coffee size={14} className="inline" /> Izin Panjang</th>
              <th className="text-center p-3"><Utensils size={14} className="inline" /> Izin Makan</th>
              <th className="text-center p-3"><Droplets size={14} className="inline" /> Toilet</th>
            </tr>
          </thead>
          <tbody>
            {staffData.map(s => (
              <tr key={s.name} className="border-b border-custom/50 hover:bg-white/5">
                <td className="p-3">{s.name}</td>
                <td className="p-3 text-secondary">{s.role}</td>
                <td className="p-3 text-center">
                  <span className={`font-semibold ${s.breakLong.used >= s.breakLong.quota ? 'text-accent-red' : 'text-accent-green'}`}>
                    {s.breakLong.used}/{s.breakLong.quota}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span className={`font-semibold ${s.breakShort.used >= s.breakShort.quota ? 'text-accent-red' : 'text-accent-green'}`}>
                    {s.breakShort.used}/{s.breakShort.quota}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span className="font-semibold text-accent-indigo">
                    {s.toilet.quota === -1 ? `${s.toilet.used}/∞` : `${s.toilet.used}/${s.toilet.quota}`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
