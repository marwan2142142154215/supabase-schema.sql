import { createContext, useContext, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface AuthUser {
  id: string
  name: string
  role: 'staff' | 'admin'
  staffId?: string
}

interface AuthContextType {
  user: AuthUser | null
  login: (name: string, password: string) => Promise<boolean>
  adminLogin: (password: string) => Promise<boolean>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = sessionStorage.getItem('nanastoto_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = async (name: string, password: string): Promise<boolean> => {
    if (password !== '123456') return false
    const { data } = await supabase
      .from('staff')
      .select('id, name')
      .ilike('name', name.trim())
      .eq('active', true)
      .single()
    if (!data) return false
    const authUser: AuthUser = { id: data.id, name: data.name, role: 'staff', staffId: data.id }
    setUser(authUser)
    sessionStorage.setItem('nanastoto_user', JSON.stringify(authUser))
    return true
  }

  const adminLogin = async (password: string): Promise<boolean> => {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'admin_password')
      .single()
    const adminPass = data?.value || 'nasdes'
    if (password !== adminPass) return false
    const authUser: AuthUser = { id: 'admin', name: 'Admin', role: 'admin' }
    setUser(authUser)
    sessionStorage.setItem('nanastoto_user', JSON.stringify(authUser))
    return true
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('nanastoto_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, adminLogin, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
