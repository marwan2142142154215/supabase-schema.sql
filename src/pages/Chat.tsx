import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { encryptMessage, decryptMessage } from '../lib/encryption'
import { securityGuard, globalRateLimiter } from '../lib/security'
import { Send, Lock, Unlock, LogIn, User, Image, Plus, Users, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const CHAT_KEY = 'nanastoto-chat-secret-key-2025'
const DEFAULT_PASS = '123456'

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [encrypted, setEncrypted] = useState(true)
  const [loading, setLoading] = useState(false)
  const [chatUser, setChatUser] = useState<{ name: string; id: string } | null>(null)
  const [loginName, setLoginName] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [staffList, setStaffList] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const checkSession = sessionStorage.getItem('nanastoto_chat_user')
    if (checkSession) {
      try { setChatUser(JSON.parse(checkSession)) } catch {}
    }
    supabase.from('staff').select('id, name').eq('active', true).order('name').then(({ data }) => { if (data) setStaffList(data) })
  }, [])

  useEffect(() => {
    if (!chatUser) return
    fetchGroups()
    fetchMessages()
    const sub = supabase.channel('chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
        const newMsg = payload.new as any
        if (activeGroup && newMsg.group_id !== activeGroup) return
        if (!activeGroup && newMsg.group_id) return
        if (newMsg.encrypted) {
          const text = await decryptMessage(newMsg.message, CHAT_KEY)
          setMessages(prev => [...prev, { ...newMsg, message: text || '[terenkripsi]' }])
        } else {
          setMessages(prev => [...prev, newMsg])
        }
      }).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [chatUser, activeGroup])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchMessages = async () => {
    let query = supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(100)
    if (activeGroup) query = query.eq('group_id', activeGroup)
    else query = query.is('group_id', null)
    const { data } = await query
    if (data) {
      const decrypted = await Promise.all(data.map(async (m: any) => {
        if (m.encrypted) {
          const text = await decryptMessage(m.message, CHAT_KEY)
          return { ...m, message: text || '[terenkripsi]' }
        }
        return m
      }))
      setMessages(decrypted)
    }
  }

  const fetchGroups = async () => {
    const { data } = await supabase.from('chat_groups').select('*').order('name')
    if (data) setGroups(data)
  }

  const handleLogin = async () => {
    if (!globalRateLimiter.check('chat-login')) { toast.error('Terlalu banyak percobaan. Tunggu sebentar.'); return }
    if (loginPass !== DEFAULT_PASS) { toast.error('Password salah!'); return }
    const staff = staffList.find(s => s.name.toLowerCase() === loginName.toLowerCase())
    if (!staff) { toast.error('Nama tidak terdaftar!'); return }
    const chatUserData = { name: staff.name, id: staff.id }
    setChatUser(chatUserData)
    sessionStorage.setItem('nanastoto_chat_user', JSON.stringify(chatUserData))
    toast.success('Login berhasil!')
  }

  const handleLogout = () => {
    setChatUser(null); sessionStorage.removeItem('nanastoto_chat_user'); setLoginName(''); setLoginPass('')
  }

  const sendMessage = async () => {
    if ((!newMessage.trim() && !fileInputRef.current?.files?.length) || !chatUser) return
    if (!globalRateLimiter.check('chat-send')) { toast.error('Terlalu cepat!'); return }
    setLoading(true)
    try {
      let finalMessage = newMessage.trim() || '(file)'
      let isEncrypted = encrypted
      let fileUrl = null, fileType = null

      if (fileInputRef.current?.files?.length) {
        const file = fileInputRef.current.files[0]
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')
        if (!isImage && !isVideo) { toast.error('Hanya foto dan video!'); setLoading(false); return }
        fileType = isImage ? 'image' : 'video'
        const fileName = `${chatUser.id}_${Date.now()}_${file.name}`
        const { data: upload } = await supabase.storage.from('nanastoto-photos').upload(`chat/${fileName}`, file, { contentType: file.type })
        if (upload) {
          const { data: { publicUrl } } = supabase.storage.from('nanastoto-photos').getPublicUrl(upload.path)
          fileUrl = publicUrl
        }
      }

      if (encrypted && finalMessage !== '(file)') {
        finalMessage = await encryptMessage(finalMessage, CHAT_KEY)
      }

      securityGuard.logEvent('chat_message', `Pesan dari ${chatUser.name}`, 'low')
      await supabase.from('chat_messages').insert({
        sender_id: chatUser.id,
        sender_name: chatUser.name,
        message: finalMessage,
        encrypted: isEncrypted,
        file_url: fileUrl,
        file_type: fileType,
        group_id: activeGroup,
      })
      setNewMessage('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) { toast.error('Gagal kirim pesan') }
    finally { setLoading(false) }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) { toast.error('Nama grup wajib!'); return }
    const { data: group } = await supabase.from('chat_groups').insert({
      name: newGroupName.trim(),
      created_by: chatUser!.id,
    }).select().single()
    if (group) {
      await supabase.from('chat_group_members').insert(
        selectedMembers.map(staffId => ({ group_id: group.id, staff_id: staffId }))
      )
      toast.success('Grup dibuat!')
      setShowGroupModal(false); setNewGroupName(''); setSelectedMembers([])
      fetchGroups()
    }
  }

  const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (!chatUser) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="bg-secondary rounded-2xl p-8 border border-custom max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-accent-indigo">NANASTOTO</h1>
            <p className="text-secondary mt-1">Chat Staff</p>
            <Lock size={32} className="mx-auto mt-3 text-accent-indigo" />
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-secondary block mb-1">Nama Staff</label>
              <input type="text" placeholder="Cari nama..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-primary border border-custom rounded-xl px-4 py-2.5 text-white outline-none focus:border-accent-indigo" />
              {searchTerm && (
                <div className="mt-1 bg-primary border border-custom rounded-xl max-h-32 overflow-y-auto">
                  {filteredStaff.map(s => (
                    <button key={s.id} onClick={() => { setLoginName(s.name); setSearchTerm('') }}
                      className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm">{s.name}</button>
                  ))}
                </div>
              )}
              {loginName && <p className="text-xs text-accent-green mt-1">✓ {loginName}</p>}
            </div>
            <div>
              <label className="text-sm text-secondary block mb-1">Password</label>
              <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="Default: 123456"
                className="w-full bg-primary border border-custom rounded-xl px-4 py-2.5 text-white outline-none focus:border-accent-indigo" />
            </div>
            <button onClick={handleLogin} className="w-full flex items-center justify-center gap-2 bg-accent-indigo hover:bg-accent-indigo/80 text-white rounded-xl py-3 font-semibold transition-all">
              <LogIn size={18} /> Login ke Chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-primary">
      <div className="bg-secondary border-b border-custom px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-indigo/20 flex items-center justify-center"><User size={20} className="text-accent-indigo" /></div>
          <div>
            <p className="font-bold text-sm">{chatUser.name}</p>
            <p className="text-xs text-secondary">{activeGroup ? groups.find(g => g.id === activeGroup)?.name || 'Grup' : 'Chat Semua Staff'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGroupModal(true)} className="p-2 rounded-lg text-secondary hover:text-white hover:bg-white/5"><Plus size={18} /></button>
          <button onClick={() => setEncrypted(!encrypted)} className={`p-2 rounded-lg ${encrypted ? 'text-accent-green bg-accent-green/10' : 'text-secondary bg-card'}`}>
            {encrypted ? <Lock size={18} /> : <Unlock size={18} />}
          </button>
          <button onClick={handleLogout} className="px-3 py-1.5 bg-accent-red/20 text-accent-red rounded-xl text-xs hover:bg-accent-red/30">Logout</button>
        </div>
      </div>

      <div className="flex gap-2 px-4 py-2 bg-secondary/50 border-b border-custom overflow-x-auto">
        <button           onClick={() => setActiveGroup(null)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap ${!activeGroup ? 'bg-accent-indigo text-white' : 'bg-card text-secondary'}`}>
          <MessageCircle size={14} /> Semua
        </button>
        {groups.map(g => (
          <button key={g.id}             onClick={() => setActiveGroup(g.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap ${activeGroup === g.id ? 'bg-accent-indigo text-white' : 'bg-card text-secondary'}`}>
            <Users size={14} /> {g.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === chatUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.sender_id === chatUser.id ? 'bg-accent-indigo/20 rounded-br-md' : 'bg-secondary rounded-bl-md'}`}>
              {m.sender_id !== chatUser.id && <p className="text-xs text-accent-indigo font-medium mb-1">{m.sender_name}</p>}
              {m.file_url && m.file_type === 'image' && <img src={m.file_url} alt="foto" className="max-w-full rounded-lg mb-2 cursor-pointer" onClick={() => window.open(m.file_url!, '_blank')} />}
              {m.file_url && m.file_type === 'video' && <video src={m.file_url} controls className="max-w-full rounded-lg mb-2" />}
              <p className="text-sm">{m.message}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                {m.encrypted && <Lock size={10} className="text-accent-green" />}
                <span className="text-[10px] text-secondary">{format(new Date(m.created_at), 'HH:mm')}</span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-secondary border-t border-custom p-3">
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={() => {}} />
          <button onClick={() => fileInputRef.current?.click()} className="w-11 h-11 rounded-xl bg-card border border-custom text-secondary hover:text-white flex items-center justify-center">
            <Image size={18} />
          </button>
          <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyPress}
            placeholder="Ketik pesan..." rows={1}
            className="flex-1 bg-primary border border-custom rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-accent-indigo resize-none" />
          <button onClick={sendMessage} disabled={loading || (!newMessage.trim() && !fileInputRef.current?.files?.length)}
            className="w-11 h-11 rounded-xl bg-accent-indigo hover:bg-accent-indigo/80 text-white flex items-center justify-center disabled:opacity-50 transition-all">
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-secondary text-center mt-1">Pesan dienkripsi AES-256-GCM • Kirim foto/video</p>
      </div>

      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-secondary rounded-2xl p-6 border border-custom max-w-md w-full mx-4">
            <h3 className="font-bold text-lg mb-4">Buat Grup Chat</h3>
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Nama Grup"
              className="w-full bg-primary border border-custom rounded-xl px-4 py-2.5 text-white text-sm mb-4 outline-none focus:border-accent-indigo" />
            <p className="text-sm text-secondary mb-2">Pilih Anggota:</p>
            <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
              {staffList.filter(s => s.id !== chatUser.id).map(s => (
                <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={selectedMembers.includes(s.id)} onChange={() => {
                    setSelectedMembers(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])
                  }} className="accent-accent-indigo" />
                  <span className="text-sm">{s.name}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowGroupModal(false)} className="flex-1 px-4 py-2 bg-card rounded-xl text-sm">Batal</button>
              <button onClick={createGroup} className="flex-1 px-4 py-2 bg-accent-indigo rounded-xl text-sm font-semibold">Buat Grup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
