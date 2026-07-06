import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { securityGuard } from '../lib/security'
import toast from 'react-hot-toast'
import {
  Shield, LayoutDashboard, Users, Clock, Timer, UserCog, AlertTriangle, BookOpen,
  MessageSquare, Image, History, LogOut, Save, Plus, ToggleLeft, ToggleRight
} from 'lucide-react'
import { formatTime } from '../utils/helpers'

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'staff', label: 'Manajemen Staff', icon: Users },
  { id: 'shifts', label: 'Pengaturan Shift', icon: Clock },
  { id: 'durations', label: 'Durasi Izin', icon: Timer },
  { id: 'roles', label: 'Role & Kuota', icon: UserCog },
  { id: 'emergency', label: 'Emergency & Reset', icon: AlertTriangle },
  { id: 'regulations', label: 'Peraturan', icon: BookOpen },
  { id: 'telegram', label: 'Integrasi Telegram', icon: MessageSquare },
  { id: 'appearance', label: 'Tampilan', icon: Image },
  { id: 'security', label: 'Keamanan', icon: Shield },
  { id: 'photos', label: 'Manajemen Foto', icon: Image },
  { id: 'logs', label: 'Riwayat & Log', icon: History },
]

export default function MasterPanel() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [password, setPassword] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)
  const [lockout, setLockout] = useState(0)
  const [attempts, setAttempts] = useState(0)

  // Data states
  const [staffList, setStaffList] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [config, setConfig] = useState<any>({})
  const [activeBreaks, setActiveBreaks] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])

  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffRole, setNewStaffRole] = useState('')
  const [editStaff, setEditStaff] = useState<any>(null)

  const [newShiftName, setNewShiftName] = useState('')
  const [newShiftCutoff, setNewShiftCutoff] = useState('')

  const [toiletDur, setToiletDur] = useState(15)
  const [smokingDur, setSmokingDur] = useState(15)
  const [mealDur, setMealDur] = useState(8)
  const [tolerance, setTolerance] = useState(59)

  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleMax, setNewRoleMax] = useState(1)
  const [newRoleLong, setNewRoleLong] = useState(4)
  const [newRoleShort, setNewRoleShort] = useState(3)
  const [newRoleToilet, setNewRoleToilet] = useState(-1)

  const [regContent, setRegContent] = useState('')

  const [tgToken, setTgToken] = useState('')
  const [tgChatId, setTgChatId] = useState('')
  const [tgEnabled, setTgEnabled] = useState(false)

  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  const fetchAll = useCallback(async () => {
    const [sRes, rRes, shRes, cRes, bRes, lRes, regRes] = await Promise.all([
      supabase.from('staff').select('*, roles(name)').order('name'),
      supabase.from('roles').select('*').order('name'),
      supabase.from('shifts').select('*').order('name'),
      supabase.from('system_config').select('key, value'),
      supabase.from('break_records').select('*, staff(name, roles(name))').eq('status', 'ACTIVE'),
      supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('regulations').select('content').order('created_at', { ascending: false }).limit(1).single(),
    ])
    if (sRes.data) setStaffList(sRes.data)
    if (rRes.data) setRoles(rRes.data)
    if (shRes.data) setShifts(shRes.data)
    if (cRes.data) { const cfg: any = {}; cRes.data.forEach((c: any) => cfg[c.key] = c.value); setConfig(cfg); setTgEnabled(cfg.telegram_enabled || false); setTgToken(cfg.telegram_bot_token || ''); setTgChatId(cfg.telegram_chat_id || '') }
    if (bRes.data) setActiveBreaks(bRes.data)
    if (lRes.data) setLogs(lRes.data)
    if (regRes.data) setRegContent(regRes.data.content)
    const durs = cRes.data?.find((c: any) => c.key === 'break_durations')?.value || { toilet: 15, smoking: 15, meal: 8 }
    setToiletDur(durs.toilet); setSmokingDur(durs.smoking); setMealDur(durs.meal)
    setTolerance(cRes.data?.find((c: any) => c.key === 'late_tolerance_seconds')?.value || 59)
  }, [])

  useEffect(() => {
    if (!isAuthed) return
    fetchAll()
    const sub = supabase.channel('master-panel').on('postgres_changes', { event: '*', schema: 'public' }, fetchAll).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [isAuthed, fetchAll])

  const handleLogin = async () => {
    if (Date.now() < lockout) { toast.error(`Tunggu ${Math.ceil((lockout - Date.now()) / 1000)} detik`); return }
    if (password === (config.admin_password || 'nasdes')) {
      setIsAuthed(true); setAttempts(0); securityGuard.recordSuccessfulLogin('master-panel')
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      securityGuard.recordFailedLogin('master-panel')
      if (newAttempts >= 5) { setLockout(Date.now() + 300000); toast.error('Terlalu banyak gagal! Lockout 5 menit.') }
      else toast.error('Password salah!')
    }
  }

  const handleStaffAdd = async () => {
    if (!newStaffName.trim() || !newStaffRole) { toast.error('Lengkapi data!'); return }
    const { data: exist } = await supabase.from('staff').select('id').ilike('name', newStaffName.trim()).single()
    if (exist) { toast.error('Nama sudah terdaftar!'); return }
    await supabase.from('staff').insert({ name: newStaffName.trim(), role_id: newStaffRole })
    toast.success('Staff ditambahkan!'); setNewStaffName(''); setNewStaffRole(''); fetchAll()
  }

  const handleStaffToggle = async (id: string, active: boolean) => {
    await supabase.from('staff').update({ active: !active }).eq('id', id)
    toast.success('Status staff diubah!'); fetchAll()
  }

  const handleStaffEdit = async () => {
    if (!editStaff) return
    await supabase.from('staff').update({ name: editStaff.name, role_id: editStaff.role_id }).eq('id', editStaff.id)
    toast.success('Staff diperbarui!'); setEditStaff(null); fetchAll()
  }

  const handleShiftAdd = async () => {
    if (!newShiftName.trim() || !newShiftCutoff) { toast.error('Lengkapi data!'); return }
    await supabase.from('shifts').insert({ name: newShiftName.trim(), cutoff_time: newShiftCutoff })
    toast.success('Shift ditambahkan!'); setNewShiftName(''); setNewShiftCutoff(''); fetchAll()
  }

  const handleShiftToggle = async (id: string, active: boolean) => {
    await supabase.from('shifts').update({ active: !active }).eq('id', id)
    toast.success('Shift diubah!'); fetchAll()
  }

  const handleDurSave = async () => {
    await supabase.from('system_config').upsert({ key: 'break_durations', value: { toilet: toiletDur, smoking: smokingDur, meal: mealDur } }, { onConflict: 'key' })
    await supabase.from('system_config').upsert({ key: 'late_tolerance_seconds', value: tolerance }, { onConflict: 'key' })
    toast.success('Durasi diperbarui!'); fetchAll()
  }

  const handleRoleAdd = async () => {
    if (!newRoleName.trim()) { toast.error('Nama role wajib!'); return }
    await supabase.from('roles').insert({
      name: newRoleName.trim(), max_concurrent: newRoleMax,
      quota_break_long_per_day: newRoleLong, quota_break_short_per_day: newRoleShort,
      quota_toilet_per_day: newRoleToilet,
    })
    toast.success('Role ditambahkan!'); setNewRoleName(''); fetchAll()
  }

  const handleEmergencyStop = async (id: string) => {
    await supabase.from('break_records').update({ status: 'FORCE_STOPPED', return_time: new Date().toISOString() }).eq('id', id)
    toast('Emergency Stop!', { icon: '🚨' }); fetchAll()
  }

  const handleStopAll = async () => {
    const c = confirm('Hentikan SEMUA izin aktif?')
    if (!c) return
    const input = prompt('Ketik KONFIRMASI:')
    if (input !== 'KONFIRMASI') { toast.error('Konfirmasi gagal'); return }
    for (const b of activeBreaks) {
      await supabase.from('break_records').update({ status: 'FORCE_STOPPED', return_time: new Date().toISOString() }).eq('id', b.id)
    }
    toast.success('Semua izin dihentikan!'); fetchAll()
  }

  const handleRegSave = async () => {
    await supabase.from('regulations').insert({ content: regContent.trim() })
    toast.success('Peraturan diperbarui!'); fetchAll()
  }

  const handleTgSave = async () => {
    await supabase.from('system_config').upsert({ key: 'telegram_bot_token', value: tgToken }, { onConflict: 'key' })
    await supabase.from('system_config').upsert({ key: 'telegram_chat_id', value: tgChatId }, { onConflict: 'key' })
    await supabase.from('system_config').upsert({ key: 'telegram_enabled', value: tgEnabled }, { onConflict: 'key' })
    toast.success('Integrasi Telegram disimpan!'); fetchAll()
  }

  const handlePassChange = async () => {
    if (oldPass !== (config.admin_password || 'nasdes')) { toast.error('Password lama salah!'); return }
    if (newPass.length < 6) { toast.error('Minimal 6 karakter!'); return }
    if (newPass !== confirmPass) { toast.error('Konfirmasi tidak cocok!'); return }
    await supabase.from('system_config').upsert({ key: 'admin_password', value: newPass }, { onConflict: 'key' })
    toast.success('Password diubah!'); setOldPass(''); setNewPass(''); setConfirmPass('')
  }

  const handleLogout = () => { setIsAuthed(false); logout(); navigate('/') }

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="bg-secondary rounded-2xl p-8 border border-custom max-w-sm w-full">
          <div className="text-center mb-6">
            <Shield size={40} className="mx-auto text-accent-indigo mb-2" />
            <h1 className="text-2xl font-bold text-accent-indigo">NANASTOTO</h1>
            <p className="text-secondary text-sm">Master Panel</p>
          </div>
          <div className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="Password Admin"
              className="w-full bg-primary border border-custom rounded-xl px-4 py-2.5 text-white outline-none focus:border-accent-indigo" />
            {lockout > Date.now() && (
              <p className="text-accent-red text-sm text-center">Lockout: {Math.ceil((lockout - Date.now()) / 1000)}s</p>
            )}
            <button onClick={handleLogin} className="w-full bg-accent-indigo hover:bg-accent-indigo/80 text-white rounded-xl py-3 font-semibold">LOGIN</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-primary">
      <aside className="w-64 bg-secondary border-r border-custom fixed h-full overflow-y-auto z-40">
        <div className="p-4 border-b border-custom">
          <h2 className="font-bold text-accent-indigo">NANASTOTO</h2>
          <p className="text-xs text-secondary">Master Panel</p>
        </div>
        <nav className="p-2 space-y-0.5">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${activeSection === s.id ? 'bg-accent-indigo/20 text-accent-indigo' : 'text-secondary hover:text-white hover:bg-white/5'}`}>
              <s.icon size={16} />{s.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-custom">
          <button onClick={handleLogout} className="flex items-center gap-2 text-accent-red text-sm hover:bg-accent-red/10 w-full px-3 py-2 rounded-xl">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-6">
        {/* DASHBOARD */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Dashboard Admin</h1>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-card rounded-2xl p-5 border border-custom">
                <p className="text-3xl font-bold text-accent-indigo">{staffList.filter(s => s.active).length}</p>
                <p className="text-sm text-secondary">Staff Aktif</p>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-custom">
                <p className="text-3xl font-bold text-accent-orange">{activeBreaks.length}</p>
                <p className="text-sm text-secondary">Sedang Izin</p>
              </div>
              <div className="bg-card rounded-2xl p-5 border border-custom">
                <p className="text-3xl font-bold text-accent-green">{(staffList.length - activeBreaks.length)}</p>
                <p className="text-sm text-secondary">Tersedia</p>
              </div>
            </div>
          </div>
        )}

        {/* STAFF MANAGEMENT */}
        {activeSection === 'staff' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Manajemen Staff</h1>
            <div className="bg-card rounded-2xl p-4 border border-custom">
              <h2 className="font-bold mb-3">Tambah Staff Baru</h2>
              <div className="flex gap-2">
                <input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Nama Staff" className="flex-1 bg-secondary border border-custom rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-accent-indigo" />
                <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value)} className="bg-secondary border border-custom rounded-xl px-4 py-2 text-sm text-white">
                  <option value="">Pilih Role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button onClick={handleStaffAdd} className="px-4 py-2 bg-accent-indigo rounded-xl text-sm font-semibold flex items-center gap-1"><Plus size={16} /> Tambah</button>
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-custom overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-secondary border-b border-custom"><th className="text-left p-3">Nama</th><th className="text-left p-3">Role</th><th className="text-left p-3">Status</th><th className="text-left p-3">Aksi</th></tr></thead>
                <tbody>
                  {staffList.map(s => (
                    <tr key={s.id} className="border-b border-custom/50 hover:bg-white/5">
                      <td className="p-3">{editStaff?.id === s.id ? <input value={editStaff.name} onChange={(e) => setEditStaff({ ...editStaff, name: e.target.value })} className="bg-secondary border border-custom rounded px-2 py-1 text-white text-sm" /> : s.name}</td>
                      <td className="p-3">{editStaff?.id === s.id ? <select value={editStaff.role_id} onChange={(e) => setEditStaff({ ...editStaff, role_id: e.target.value })} className="bg-secondary border border-custom rounded px-2 py-1 text-white text-sm">{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select> : (s.roles?.name || '-')}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${s.active ? 'bg-accent-green/20 text-accent-green' : 'bg-gray-500/20 text-gray-400'}`}>{s.active ? 'Aktif' : 'Nonaktif'}</span></td>
                      <td className="p-3 flex gap-1">
                        {editStaff?.id === s.id ? (
                          <><button onClick={handleStaffEdit} className="px-2 py-1 bg-accent-green rounded-lg text-xs">Simpan</button><button onClick={() => setEditStaff(null)} className="px-2 py-1 bg-card rounded-lg text-xs">Batal</button></>
                        ) : (
                          <><button onClick={() => setEditStaff({ id: s.id, name: s.name, role_id: s.role_id })} className="px-2 py-1 bg-accent-indigo/20 text-accent-indigo rounded-lg text-xs">Edit</button><button onClick={() => handleStaffToggle(s.id, s.active)} className="px-2 py-1 bg-card rounded-lg text-xs">{s.active ? 'Nonaktifkan' : 'Aktifkan'}</button></>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SHIFTS */}
        {activeSection === 'shifts' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Pengaturan Shift</h1>
            <div className="bg-card rounded-2xl p-4 border border-custom">
              <div className="flex gap-2">
                <input value={newShiftName} onChange={(e) => setNewShiftName(e.target.value)} placeholder="Nama Shift" className="bg-secondary border border-custom rounded-xl px-4 py-2 text-sm text-white" />
                <input type="time" value={newShiftCutoff} onChange={(e) => setNewShiftCutoff(e.target.value)} className="bg-secondary border border-custom rounded-xl px-4 py-2 text-sm text-white" />
                <button onClick={handleShiftAdd} className="px-4 py-2 bg-accent-indigo rounded-xl text-sm"><Plus size={16} /></button>
              </div>
            </div>
            <div className="space-y-2">
              {shifts.map(s => (
                <div key={s.id} className="bg-card rounded-xl p-4 border border-custom flex items-center justify-between">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-secondary">Cutoff: {s.cutoff_time}</p>
                  </div>
                  <button onClick={() => handleShiftToggle(s.id, s.active)} className={`p-2 rounded-lg ${s.active ? 'text-accent-green' : 'text-gray-500'}`}>
                    {s.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DURATIONS */}
        {activeSection === 'durations' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Durasi Izin</h1>
            <div className="bg-card rounded-2xl p-6 border border-custom space-y-4">
              {[
                { label: 'Toilet', val: toiletDur, set: setToiletDur },
                { label: 'Merokok', val: smokingDur, set: setSmokingDur },
                { label: 'Makan', val: mealDur, set: setMealDur },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4">
                  <label className="w-24 text-sm">{item.label} (menit)</label>
                  <button onClick={() => item.set(Math.max(1, item.val - 1))} className="w-8 h-8 rounded-lg bg-secondary border border-custom text-white">-</button>
                  <span className="w-12 text-center font-bold">{item.val}</span>
                  <button onClick={() => item.set(Math.min(120, item.val + 1))} className="w-8 h-8 rounded-lg bg-secondary border border-custom text-white">+</button>
                </div>
              ))}
              <div className="flex items-center gap-4">
                <label className="w-24 text-sm">Toleransi (detik)</label>
                <input type="number" value={tolerance} onChange={(e) => setTolerance(+e.target.value)} className="w-20 bg-secondary border border-custom rounded-xl px-3 py-2 text-sm text-white text-center" />
              </div>
              <button onClick={handleDurSave} className="px-6 py-3 bg-accent-indigo rounded-xl font-semibold flex items-center gap-2"><Save size={16} /> Simpan</button>
            </div>
          </div>
        )}

        {/* ROLES */}
        {activeSection === 'roles' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Role & Kuota</h1>
            <div className="bg-card rounded-2xl p-4 border border-custom space-y-3">
              <div className="grid grid-cols-6 gap-2">
                <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Nama Role" className="bg-secondary border border-custom rounded-xl px-3 py-2 text-sm text-white" />
                <input type="number" value={newRoleMax} onChange={(e) => setNewRoleMax(+e.target.value)} placeholder="Maks Bersamaan" className="bg-secondary border border-custom rounded-xl px-3 py-2 text-sm text-white" />
                <input type="number" value={newRoleLong} onChange={(e) => setNewRoleLong(+e.target.value)} placeholder="Kuota Panjang" className="bg-secondary border border-custom rounded-xl px-3 py-2 text-sm text-white" />
                <input type="number" value={newRoleShort} onChange={(e) => setNewRoleShort(+e.target.value)} placeholder="Kuota Makan" className="bg-secondary border border-custom rounded-xl px-3 py-2 text-sm text-white" />
                <input type="number" value={newRoleToilet} onChange={(e) => setNewRoleToilet(+e.target.value)} placeholder="Kuota Toilet" className="bg-secondary border border-custom rounded-xl px-3 py-2 text-sm text-white" />
                <button onClick={handleRoleAdd} className="px-3 py-2 bg-accent-indigo rounded-xl text-sm"><Plus size={16} /></button>
              </div>
            </div>
            <div className="space-y-2">
              {roles.map(r => (
                <div key={r.id} className="bg-card rounded-xl p-4 border border-custom">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-secondary">Maks: {r.max_concurrent} | Panjang: {r.quota_break_long_per_day}x | Makan: {r.quota_break_short_per_day}x | Toilet: {r.quota_toilet_per_day === -1 ? 'Unlimited' : r.quota_toilet_per_day + 'x'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMERGENCY */}
        {activeSection === 'emergency' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Emergency & Reset</h1>
            {activeBreaks.length > 0 && (
              <div className="space-y-2">
                {activeBreaks.map(b => (
                  <div key={b.id} className="bg-card rounded-xl p-4 border border-custom flex items-center justify-between">
                    <div><p className="font-medium">{b.staff?.name} <span className="text-sm text-secondary">- {b.break_type}</span></p></div>
                    <button onClick={() => handleEmergencyStop(b.id)} className="px-3 py-1.5 bg-accent-red/20 text-accent-red rounded-xl text-sm">Emergency Stop</button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleStopAll} className="w-full py-4 bg-accent-red hover:bg-accent-red/80 text-white rounded-2xl font-bold text-lg">MATIKAN SEMUA IZIN AKTIF</button>
          </div>
        )}

        {/* REGULATIONS */}
        {activeSection === 'regulations' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Peraturan Kantor</h1>
            <textarea value={regContent} onChange={(e) => setRegContent(e.target.value)} className="w-full bg-secondary border border-custom rounded-xl p-4 text-white min-h-[200px] outline-none focus:border-accent-indigo" />
            <button onClick={handleRegSave} className="px-6 py-3 bg-accent-indigo rounded-xl font-semibold"><Save size={16} className="inline mr-2" /> Simpan</button>
          </div>
        )}

        {/* TELEGRAM */}
        {activeSection === 'telegram' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Integrasi Telegram</h1>
            <div className="bg-card rounded-2xl p-6 border border-custom space-y-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={tgEnabled} onChange={(e) => setTgEnabled(e.target.checked)} className="w-4 h-4 accent-accent-indigo" />
                <span className="text-sm">Aktifkan Notifikasi Telegram</span>
              </label>
              <input value={tgToken} onChange={(e) => setTgToken(e.target.value)} placeholder="Bot Token" className="w-full bg-secondary border border-custom rounded-xl px-4 py-2.5 text-sm text-white" />
              <input value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} placeholder="Chat ID" className="w-full bg-secondary border border-custom rounded-xl px-4 py-2.5 text-sm text-white" />
              <button onClick={handleTgSave} className="px-6 py-3 bg-accent-indigo rounded-xl font-semibold"><Save size={16} className="inline mr-2" /> Simpan</button>
            </div>
          </div>
        )}

        {/* SECURITY */}
        {activeSection === 'security' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Keamanan</h1>
            <div className="bg-card rounded-2xl p-6 border border-custom space-y-4">
              <input type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} placeholder="Password Lama" className="w-full bg-secondary border border-custom rounded-xl px-4 py-2.5 text-sm text-white" />
              <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Password Baru (min 6 karakter)" className="w-full bg-secondary border border-custom rounded-xl px-4 py-2.5 text-sm text-white" />
              <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Konfirmasi Password Baru" className="w-full bg-secondary border border-custom rounded-xl px-4 py-2.5 text-sm text-white" />
              <button onClick={handlePassChange} className="px-6 py-3 bg-accent-indigo rounded-xl font-semibold">Ganti Password</button>
            </div>
          </div>
        )}

        {/* LOGS */}
        {activeSection === 'logs' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Log Sistem</h1>
            <div className="space-y-2">
              {logs.map(l => (
                <div key={l.id} className="bg-card rounded-xl p-3 border border-custom text-sm">
                  <p className="font-medium">{l.action}</p>
                  <p className="text-xs text-secondary">{l.details ? JSON.stringify(l.details) : '-'} • {l.triggered_by} • {l.created_at ? formatTime(l.created_at) : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PLACEHOLDER SECTIONS */}
        {(activeSection === 'appearance' || activeSection === 'photos') && (
          <div className="text-center py-12 text-secondary">
            <p>Fitur {activeSection === 'appearance' ? 'Tampilan' : 'Manajemen Foto'} akan segera hadir.</p>
          </div>
        )}
      </main>
    </div>
  )
}
