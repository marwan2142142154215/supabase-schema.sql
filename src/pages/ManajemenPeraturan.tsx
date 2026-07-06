import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ManajemenPeraturan() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('regulations').select('content').order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => { if (data) setContent(data.content); setLoading(false) })
  }, [])

  const handleSave = async () => {
    if (!content.trim()) { toast.error('Isi peraturan tidak boleh kosong'); return }
    await supabase.from('regulations').insert({ content: content.trim() })
    toast.success('Peraturan berhasil diperbarui!')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Manajemen Peraturan</h1>
      <div className="bg-card rounded-2xl p-6 border border-custom">
        <label className="text-sm text-secondary block mb-2">Isi Peraturan Kantor</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          className="w-full bg-secondary border border-custom rounded-xl p-4 text-white min-h-[200px] outline-none focus:border-accent-indigo resize-y"
          placeholder="Tulis peraturan kantor di sini..." />
        <div className="mt-4 p-4 bg-secondary rounded-xl border border-custom">
          <p className="text-xs text-secondary mb-1">Preview:</p>
          <p className="text-sm">{content || 'Belum ada peraturan'}</p>
        </div>
        <button onClick={handleSave} disabled={loading} className="mt-4 flex items-center gap-2 px-6 py-3 bg-accent-indigo hover:bg-accent-indigo/80 text-white rounded-xl font-semibold transition-all">
          <Save size={18} /> Simpan Peraturan
        </button>
      </div>
    </div>
  )
}
