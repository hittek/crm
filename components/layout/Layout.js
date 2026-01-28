import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Icons from '../ui/Icons'
import GlobalSearch from './GlobalSearch'
import QuickAddMenu from './QuickAddMenu'
import NotificationBell from './NotificationBell'
import { useOrganization } from '../../lib/SettingsContext'
import { useAuth } from '../../lib/AuthContext'
import { useI18n } from '../../lib/i18n'

export default function Layout({ children }) {
  const router = useRouter()
  const organization = useOrganization()
  const { user, logout, permissions } = useAuth()
  const { t } = useI18n()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [router.pathname])

  // Navigation items using translations
  const baseNavigation = [
    { name: t('nav.contacts'), href: '/', icon: Icons.contacts },
    { name: t('nav.pipeline'), href: '/deals', icon: Icons.deals },
    { name: t('nav.tasks'), href: '/tasks', icon: Icons.tasks },
    { name: t('nav.reports'), href: '/reports', icon: Icons.reports },
    { name: t('nav.settings'), href: '/settings', icon: Icons.settings, adminOnly: true },
  ]

  // Filter navigation based on user role - hide admin-only items for regular users
  const navigation = baseNavigation.filter(item => !item.adminOnly || permissions?.canManageSettings)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          e.target.blur()
        }
        return
      }

      // Global shortcuts
      if (e.key === '/') {
        e.preventDefault()
        setIsSearchOpen(true)
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setIsAddMenuOpen(true)
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2">
            {organization.logo ? (
              <img 
                src={organization.logo} 
                alt={organization.name} 
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: organization.primaryColor || '#2563eb' }}
              >
                <span className="text-white font-bold text-sm">
                  {organization.name?.charAt(0) || 'C'}
                </span>
              </div>
            )}
            <span className="text-lg font-semibold text-gray-900">{organization.name || 'CRM'}</span>
          </Link>
        </div>

        {/* Search trigger */}
        <div className="px-4 py-4">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Icons.search className="w-4 h-4" />
            <span>{t('common.search')}</span>
            <kbd className="ml-auto text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200">
              /
            </kbd>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = router.pathname === item.href || 
              (item.href !== '/' && router.pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Quick add button */}
        <div className="p-4 border-t border-gray-200 flex items-center gap-2">
          <button
            onClick={() => setIsAddMenuOpen(true)}
            className="flex-1 btn-primary"
          >
            <Icons.add className="w-4 h-4 mr-2" />
            {t('nav.quickAdd')}
            <kbd className="ml-auto text-xs bg-primary-700 px-1.5 py-0.5 rounded">
              N
            </kbd>
          </button>
          <NotificationBell />
        </div>

        {/* User menu */}
        <div className="p-4 border-t border-gray-200 relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span className="text-sm font-medium text-primary-700">
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Usuario'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
            </div>
            <Icons.chevronRight className="w-4 h-4 text-gray-400 transform rotate-90" />
          </button>
          
          {/* User dropdown menu */}
          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500">{t('nav.connectedAs')}</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{user?.role || 'usuario'}</p>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Icons.user className="w-4 h-4" />
                  {t('nav.profile')}
                </Link>
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    logout()
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Icons.logout className="w-4 h-4" />
                  {t('nav.logout')}
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            aria-label="Open menu"
          >
            <Icons.menu className="w-6 h-6" />
          </button>
          <span className="text-lg font-semibold text-gray-900">{organization.name || 'CRM'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <Icons.search className="w-5 h-5" />
            </button>
            <NotificationBell />
          </div>
        </div>
        {children}
      </main>

      {/* Global search modal */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Quick add menu */}
      <QuickAddMenu
        isOpen={isAddMenuOpen}
        onClose={() => setIsAddMenuOpen(false)}
      />
    </div>
  )
}
