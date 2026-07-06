import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Send, Clock, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatTime } from '../utils/helpers'

export default function ShiftHandover() {
  const { user } = useAuth()
  const [notes, setNotes] = useState('')
  const [handovers, setHandovers] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [selectedShift, setSelectedShift] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('shifts').select('*').eq('active', true).then(({ data }) => { if (data) setShifts(data) })
    const fetch = async () => {
      const { data } = await supabase.from('shift_handover').select('*').order('created_at', { ascending: false }).limit(20)
      if (data) setHandovers(data)
    }
    fetch()
    const sub = supabase.channel('handover').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shift_handover' }, (payload) => {
      setHandovers(prev => [payload.new as any, ...prev].slice(0, 20))
    }).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const submit = async () => {
    if (!notes.trim() || !selectedShift) { toast.error('Isi catatan dan pilih shift!'); return }
    setLoading(true)
    await supabase.from('shift_handover').insert({
      staff_id: user?.staffId || 'unknown',
      staff_name: user?.name || 'Unknown',
      notes: notes.trim(),
      shift_name: shifts.find(s => s.id === selectedShift)?.name || '',
    })
    toast.success('Catatan handover terkirim!')
    setNotes('')
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shift Handover</h1>
      <div className="bg-card rounded-2xl p-6 border border-custom">
        <div className="space-y-4">
          <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)} className="w-full bg-secondary border border-custom rounded-xl px-4 py-2.5 text-white">
            <option value="">Pilih Shift</option>
            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tulis catatan untuk shift selanjutnya..." className="w-full bg-secondary border border-custom rounded-xl p-4 text-white min-h-[120px] outline-none focus:border-accent-indigo resize-y" />
          <button onClick={submit} disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-accent-indigo hover:bg-accent-indigo/80 text-white rounded-xl font-semibold transition-all"><Send size={18} /> Kirim Catatan</button>
        </div>
      </div>
      <div className="space-y-3">
        {handovers.map(h => (
          <div key={h.id} className="bg-card rounded-xl p-4 border border-custom">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-indigo/20 flex items-center justify-center shrink-0"><User size={16} className="text-accent-indigo" /></div>
              <div>
                <p className="font-medium text-sm">{h.staff_name} <span className="text-xs text-secondary">• {h.shift_name}</span></p>
                <p className="text-sm text-secondary mt-1">{h.notes}</p>
                <p className="text-xs text-secondary mt-2"><Clock size={12} className="inline mr-1" />{formatTime(h.created_at)}</p>
              </div>
            </div>
          </div>
        ))}
        {!handovers.length && <p className="text-center py-8 text-secondary">Belum ada catatan handover</p>}
      </div>
    </div>
  )
}
