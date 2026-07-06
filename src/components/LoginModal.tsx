import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogIn, X, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

interface LoginModalProps {
  open: boolean
  onClose: () => void
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const { login, adminLogin } = useAuth()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  if (!open) return null

  const handleLogin = async () => {
    if (isAdmin) {
      if (!password) { toast.error('Masukkan password!'); return }
      setLoading(true)
      const res = await adminLogin(password)
      setLoading(false)
      if (res.success) { toast.success('Login admin berhasil!'); onClose() }
      else toast.error(res.error || 'Gagal')
      return
    }

    if (!name || !password) { toast.error('Isi nama dan password!'); return }
    setLoading(true)
    const res = await login(name, password)
    setLoading(false)
    if (res.success) { toast.success(`Selamat datang, ${name}!`); onClose(); setName(''); setPassword('') }
    else toast.error(res.error || 'Gagal login')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-custom rounded-3xl p-8 w-full max-w-md mx-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-secondary hover:text-white"><X size={20} /></button>
        <h2 className="text-2xl font-bold text-center mb-2 text-accent-indigo">NANASTOTO</h2>
        <p className="text-sm text-secondary text-center mb-6">
          {isAdmin ? 'Login Admin / LEADER' : 'Login Staff'}
        </p>
        <div className="space-y-4">
          {!isAdmin && (
            <div>
              <label className="text-sm text-secondary block mb-1">Nama Staff</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Masukkan nama..."
                className="w-full bg-secondary border border-custom rounded-xl px-4 py-2.5 text-white outline-none focus:border-accent-indigo" />
            </div>
          )}
          <div>
            <label className="text-sm text-secondary block mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder={isAdmin ? 'Password Admin' : 'Default: 123456'}
              className="w-full bg-secondary border border-custom rounded-xl px-4 py-2.5 text-white outline-none focus:border-accent-indigo" />
          </div>
          <button onClick={handleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent-indigo hover:bg-accent-indigo/80 text-white rounded-xl py-3 font-semibold transition-all disabled:opacity-50">
            <LogIn size={18} /> {loading ? 'Memproses...' : isAdmin ? 'Login Admin' : 'Login Staff'}
          </button>
          <button onClick={() => { setIsAdmin(!isAdmin); setName('') }}
            className="w-full text-xs text-secondary hover:text-accent-indigo transition-colors flex items-center justify-center gap-1">
            <Shield size={14} /> {isAdmin ? 'Login sebagai Staff' : 'Login sebagai Admin/LEADER'}
          </button>
        </div>
      </div>
    </div>
  )
}
