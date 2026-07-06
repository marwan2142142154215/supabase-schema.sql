import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { PermissionKey } from '../lib/permissions'

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
  login: (name: string, password: string) => Promise<{ success: boolean; error?: string }>
  adminLogin: (password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAdmin: boolean
  canAccess: (permission: PermissionKey) => boolean
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchPermissions(roleId: string): Promise<PermissionKey[]> {
  const { data: perms } = await supabase
    .from('role_permissions')
    .select('permission_key')
    .eq('role_id', roleId)
  return (perms?.map((p: any) => p.permission_key as PermissionKey)) || []
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = sessionStorage.getItem('nanastoto_user')
    return stored ? JSON.parse(stored) : null
  })
  const [permissions, setPermissions] = useState<PermissionKey[]>(() => {
    const stored = sessionStorage.getItem('nanastoto_permissions')
    return stored ? JSON.parse(stored) : []
  })

  const refreshPermissions = async () => {
    if (!user) { setPermissions([]); return }
    const perms = await fetchPermissions(user.roleId)
    setPermissions(perms)
    sessionStorage.setItem('nanastoto_permissions', JSON.stringify(perms))
  }

  useEffect(() => {
    if (user) refreshPermissions()
  }, [user?.roleId])

  const login = async (name: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const hardcoded: Record<string, { password: string; name: string; roleName: string; roleId?: string }> = {
      'dessy': { password: '123desy', name: 'dessy', roleName: 'LEADER' },
    }
    const hc = hardcoded[name.trim().toLowerCase()]
    if (hc) {
      if (password !== hc.password) return { success: false, error: 'Password salah!' }
      const { data: roleData } = await supabase.from('roles').select('id').eq('name', hc.roleName).single()
      const roleId = roleData?.id || '00000000-0000-0000-0000-000000000000'
      const authUser: AuthUser = { id: roleId, name: hc.name, roleId, roleName: hc.roleName, staffId: roleId }
      setUser(authUser)
      sessionStorage.setItem('nanastoto_user', JSON.stringify(authUser))
      const perms = await fetchPermissions(roleId)
      setPermissions(perms)
      sessionStorage.setItem('nanastoto_permissions', JSON.stringify(perms))
      return { success: true }
    }

    const { data, error } = await supabase
      .from('staff')
      .select('id, name, password, role_id, roles!inner(name)')
      .ilike('name', name.trim())
      .eq('active', true)
      .single()
    if (!data || error) return { success: false, error: 'Nama tidak terdaftar!' }
    const staffData = data as any
    if (staffData.password && password !== staffData.password) return { success: false, error: 'Password salah!' }
    if (!staffData.password && password !== '123456') return { success: false, error: 'Password salah!' }
    const roleData = staffData as any
    const authUser: AuthUser = {
      id: data.id,
      name: data.name,
      roleId: data.role_id,
      roleName: roleData.roles?.name || 'Unknown',
      staffId: data.id,
    }
    setUser(authUser)
    sessionStorage.setItem('nanastoto_user', JSON.stringify(authUser))
    const perms = await fetchPermissions(data.role_id)
    setPermissions(perms)
    sessionStorage.setItem('nanastoto_permissions', JSON.stringify(perms))
    return { success: true }
  }

  const adminLogin = async (password: string): Promise<{ success: boolean; error?: string }> => {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'admin_password')
      .single()
    const adminPass = data?.value || 'nasdes'
    if (password !== adminPass) return { success: false, error: 'Password salah!' }
    setUser(null)
    setPermissions([])
    sessionStorage.removeItem('nanastoto_user')
    sessionStorage.removeItem('nanastoto_permissions')
    return { success: true }
  }

  const logout = () => {
    setUser(null)
    setPermissions([])
    sessionStorage.removeItem('nanastoto_user')
    sessionStorage.removeItem('nanastoto_permissions')
  }

  const canAccess = (permission: PermissionKey) => {
    return permissions.includes(permission)
  }

  return (
    <AuthContext.Provider value={{ user, permissions, login, adminLogin, logout, isAdmin: user?.roleName === 'LEADER', canAccess, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
