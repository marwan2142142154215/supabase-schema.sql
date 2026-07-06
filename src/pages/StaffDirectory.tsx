import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, ToggleLeft, ToggleRight, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StaffDirectory() {
  const [staff, setStaff] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('staff').select('*, roles(name)').order('name')
      .then(({ data }) => { if (data) setStaff(data) })
    const sub = supabase.channel('staff-directory').on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
      supabase.from('staff').select('*, roles(name)').order('name').then(({ data }) => { if (data) setStaff(data) })
    }).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('staff').update({ active: !current }).eq('id', id)
    toast.success(`Staff ${current ? 'dinonaktifkan' : 'diaktifkan'}`)
  }

  const filtered = staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Staff Directory</h1>
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
        <input type="text" placeholder="Cari staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-secondary border border-custom rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-accent-indigo" />
      </div>
      <div className="grid gap-3">
        {filtered.map(s => (
          <div key={s.id} className="bg-card rounded-xl p-4 border border-custom flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-indigo/20 flex items-center justify-center"><User size={18} className="text-accent-indigo" /></div>
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-secondary">{s.roles?.name} • {s.active ? 'Aktif' : 'Nonaktif'}</p>
              </div>
            </div>
            <button onClick={() => toggleActive(s.id, s.active)} className={`p-2 rounded-lg ${s.active ? 'text-accent-green' : 'text-gray-500'}`}>
              {s.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
