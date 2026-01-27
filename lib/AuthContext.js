import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'

const AuthContext = createContext(null)

// Role hierarchy for RBAC checks
const ROLE_HIERARCHY = {
  admin: 3,
  manager: 2,
  user: 1,
}

// Pages that don't require authentication
const PUBLIC_PAGES = ['/login']

export function AuthProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check authentication status on mount
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      
      if (data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error('Auth check error:', err)
      setUser(null)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Redirect to login if not authenticated (for protected pages)
  useEffect(() => {
    if (!isLoading && !user && !PUBLIC_PAGES.includes(router.pathname)) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`)
    }
  }, [isLoading, user, router])

  // Login function
  const login = useCallback(async (email, password) => {
    setError(null)
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión')
        return { success: false, error: data.error }
      }
      
      setUser(data.user)
      return { success: true, user: data.user }
    } catch (err) {
      const errorMsg = 'Error de conexión'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (err) {
      console.error('Logout error:', err)
    }
    
    setUser(null)
    router.push('/login')
  }, [router])

  // Check if user has minimum required role
  const hasMinRole = useCallback((requiredRole) => {
    if (!user) return false
    return (ROLE_HIERARCHY[user.role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
  }, [user])

  // Permission checks
  const permissions = {
    canManageSettings: user && hasMinRole('admin'),
    canManageUsers: user && hasMinRole('admin'),
    canViewAllData: user && hasMinRole('manager'),
    canAssignTasks: user && hasMinRole('manager'),
    isAdmin: user?.role === 'admin',
    isManager: user && hasMinRole('manager'),
  }

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await checkAuth()
  }, [checkAuth])

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
    hasMinRole,
    permissions,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook to protect pages that require authentication
export function useRequireAuth(requiredRole = null) {
  const { user, isLoading, hasMinRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`)
      } else if (requiredRole && !hasMinRole(requiredRole)) {
        router.push('/')
      }
    }
  }, [user, isLoading, hasMinRole, requiredRole, router])

  return {
    isAuthorized: !isLoading && user && (!requiredRole || hasMinRole(requiredRole)),
    isLoading,
    user,
  }
}
