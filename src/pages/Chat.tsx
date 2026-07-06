import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { encryptMessage, decryptMessage } from '../lib/encryption'
import { securityGuard, globalRateLimiter } from '../lib/security'
import { Send, Lock, Unlock, LogIn, User } from 'lucide-react'
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
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
    const fetchMessages = async () => {
      const { data } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(100)
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
    fetchMessages()
    const sub = supabase.channel('chat-messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
      const newMsg = payload.new as any
      if (newMsg.encrypted) {
        const text = await decryptMessage(newMsg.message, CHAT_KEY)
        setMessages(prev => [...prev, { ...newMsg, message: text || '[terenkripsi]' }])
      } else {
        setMessages(prev => [...prev, newMsg])
      }
    }).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [chatUser])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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
    setChatUser(null)
    sessionStorage.removeItem('nanastoto_chat_user')
    setLoginName('')
    setLoginPass('')
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatUser) return
    if (!globalRateLimiter.check('chat-send')) { toast.error('Terlalu cepat!'); return }
    setLoading(true)
    try {
      let finalMessage = newMessage.trim()
      let isEncrypted = encrypted
      if (encrypted) {
        finalMessage = await encryptMessage(finalMessage, CHAT_KEY)
      }
      securityGuard.logEvent('chat_message', `Pesan dari ${chatUser.name}`, 'low')
      await supabase.from('chat_messages').insert({
        sender_id: chatUser.id,
        sender_name: chatUser.name,
        message: finalMessage,
        encrypted: isEncrypted,
      })
      setNewMessage('')
    } catch (err: any) { toast.error('Gagal kirim pesan') }
    finally { setLoading(false) }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (!chatUser) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="bg-secondary rounded-2xl p-8 border border-custom max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-accent-indigo">NANASTOTO</h1>
            <p className="text-secondary mt-1">Chat Terenkripsi</p>
            <Lock size={32} className="mx-auto mt-3 text-accent-indigo" />
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-secondary block mb-1">Nama Staff</label>
              <input type="text" placeholder="Cari nama..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Default: 123456"
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
            <p className="text-xs text-secondary">Chat Terenkripsi End-to-End</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEncrypted(!encrypted)} className={`p-2 rounded-lg ${encrypted ? 'text-accent-green bg-accent-green/10' : 'text-secondary bg-card'}`}>
            {encrypted ? <Lock size={18} /> : <Unlock size={18} />}
          </button>
          <button onClick={handleLogout} className="px-3 py-1.5 bg-accent-red/20 text-accent-red rounded-xl text-xs hover:bg-accent-red/30">Logout</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === chatUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.sender_id === chatUser.id ? 'bg-accent-indigo/20 rounded-br-md' : 'bg-secondary rounded-bl-md'}`}>
              {m.sender_id !== chatUser.id && <p className="text-xs text-accent-indigo font-medium mb-1">{m.sender_name}</p>}
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
          <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyPress}
            placeholder="Ketik pesan..." rows={1}
            className="flex-1 bg-primary border border-custom rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-accent-indigo resize-none" />
          <button onClick={sendMessage} disabled={loading || !newMessage.trim()}
            className="w-11 h-11 rounded-xl bg-accent-indigo hover:bg-accent-indigo/80 text-white flex items-center justify-center disabled:opacity-50 transition-all">
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-secondary text-center mt-1">Pesan dienkripsi AES-256-GCM end-to-end</p>
      </div>
    </div>
  )
}
