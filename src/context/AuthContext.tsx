import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { PermissionKey, ALL_PERMISSIONS } from '../lib/permissions'

interface AuthUser {
  id: string
  name: string
  roleId: string
  roleName: string
  staffId?: string
}

interface AuthContextType {
  user: AuthUser | null
  permissions: PermissionKey[]
  adminLogin: (password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAdmin: boolean
  canAccess: (permission: PermissionKey) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = sessionStorage.getItem('nanastoto_user')
    return stored ? JSON.parse(stored) : null
  })
  const [permissions, setPermissions] = useState<PermissionKey[]>(() => {
    const stored = sessionStorage.getItem('nanastoto_permissions')
    return stored ? JSON.parse(stored) : []
  })

  const adminLogin = async (password: string): Promise<{ success: boolean; error?: string }> => {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'admin_password')
      .single()
    const adminPass = data?.value || 'nasdes'
    if (password !== adminPass) return { success: false, error: 'Password salah!' }

    const authUser: AuthUser = { id: 'admin', name: 'Admin', roleId: 'admin', roleName: 'LEADER', staffId: 'admin' }
    setUser(authUser)
    sessionStorage.setItem('nanastoto_user', JSON.stringify(authUser))
    const perms = ALL_PERMISSIONS.map(p => p.key)
    setPermissions(perms)
    sessionStorage.setItem('nanastoto_permissions', JSON.stringify(perms))
    return { success: true }
  }

  const logout = () => {
    setUser(null)
    setPermissions([])
    sessionStorage.removeItem('nanastoto_user')
    sessionStorage.removeItem('nanastoto_permissions')
  }

  useEffect(() => {
    if (user && user.id === 'admin' && permissions.length === 0) {
      const perms = ALL_PERMISSIONS.map(p => p.key)
      setPermissions(perms)
      sessionStorage.setItem('nanastoto_permissions', JSON.stringify(perms))
    }
  }, [user])

  const canAccess = (permission: PermissionKey) => permissions.includes(permission)

  return (
    <AuthContext.Provider value={{ user, permissions, adminLogin, logout, isAdmin: user?.roleName === 'LEADER', canAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
