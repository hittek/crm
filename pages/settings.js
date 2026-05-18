import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Icons from '../components/ui/Icons'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../lib/AuthContext'
import { useModalClose } from '../components/ui/Modal'
import { FiCheck, FiArrowRight } from 'react-icons/fi'
import { useI18n } from '../lib/i18n'

const COLOR_MAP = {
  gray: '#6B7280',
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  green: '#22C55E',
  teal: '#14B8A6',
  blue: '#3B82F6',
  indigo: '#6366F1',
  purple: '#A855F7',
  pink: '#EC4899',
}

const getColorHex = (colorId) => {
  // If it's already a hex color, return it
  if (colorId && colorId.startsWith('#')) return colorId
  return COLOR_MAP[colorId] || '#6B7280'
}

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Tijuana', label: 'Tijuana (GMT-8)' },
  { value: 'America/Cancun', label: 'Cancún (GMT-5)' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Lima', label: 'Lima (GMT-5)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-4)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
]

const CURRENCIES = [
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'USD', label: 'USD - Dólar Americano' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'COP', label: 'COP - Peso Colombiano' },
  { value: 'ARS', label: 'ARS - Peso Argentino' },
  { value: 'CLP', label: 'CLP - Peso Chileno' },
  { value: 'PEN', label: 'PEN - Sol Peruano' },
]

const DATE_FORMATS = [
  { value: 'dd/MM/yyyy', label: 'DD/MM/AAAA' },
  { value: 'MM/dd/yyyy', label: 'MM/DD/AAAA' },
  { value: 'yyyy-MM-dd', label: 'AAAA-MM-DD' },
]

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState('general')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  // Billing tab state
  const [billing, setBilling] = useState(null)
  const [isBillingLoading, setIsBillingLoading] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(null)
  const [billingMessage, setBillingMessage] = useState(null)
  const [invoices, setInvoices] = useState(null)
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false)
  const [isPortalLoading, setIsPortalLoading] = useState(false)
  
  // Sync activeTab with URL query parameter
  useEffect(() => {
    const { tab, success, canceled } = router.query
    if (tab && typeof tab === 'string') {
      setActiveTab(tab)
    }
    if (success) {
      setBillingMessage({ type: 'success', text: t('billing.subscriptionActivated') })
      router.replace({ pathname: '/settings', query: { tab: 'billing' } }, undefined, { shallow: true })
    }
    if (canceled) {
      setBillingMessage({ type: 'info', text: t('billing.paymentCanceled') })
      router.replace({ pathname: '/settings', query: { tab: 'billing' } }, undefined, { shallow: true })
    }
  }, [router.query])

  // Update URL when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    router.replace({ pathname: '/settings', query: { tab: tabId } }, undefined, { shallow: true })
  }
  
  // Settings state
  const [organization, setOrganization] = useState({
    name: 'Mi CRM',
    logo: null,
    primaryColor: '#4F46E5',
    secondaryColor: '#7c3aed',
    timezone: 'America/Mexico_City',
    currency: 'MXN',
    dateFormat: 'dd/MM/yyyy',
    customDomain: '',
  })
  const [logoUploading, setLogoUploading] = useState(false)
  
  const [dealStages, setDealStages] = useState([])
  const [contactStatuses, setContactStatuses] = useState([])
  const [notifications, setNotifications] = useState({
    taskReminders: true,
    newContacts: true,
    dealsWon: true,
    emailEnabled: true,
    dealUpdates: true,
    dailyDigest: false,
  })
  
  // User management state
  const [users, setUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    isActive: true,
  })
  
  // Get current user from auth context
  const { user: currentUser, permissions, isLoading: authLoading } = useAuth()
  const isAdmin = permissions?.canManageSettings

  // Redirect non-admin users away from settings page
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/contacts')
    }
  }, [authLoading, isAdmin, router])

  const tabs = [
    { id: 'general', label: t('settings.general'), icon: Icons.settings },
    { id: 'users', label: t('settings.users'), icon: Icons.contacts, adminOnly: true },
    { id: 'pipeline', label: t('settings.pipeline'), icon: Icons.trending },
    { id: 'contacts', label: t('settings.contacts'), icon: Icons.contacts },
    { id: 'notifications', label: t('settings.notifications'), icon: Icons.bell },
    { id: 'integrations', label: t('settings.integrations'), icon: Icons.link },
    { id: 'billing', label: t('billing.plan'), icon: Icons.creditCard, adminOnly: true },
  ].filter(tab => !tab.adminOnly || isAdmin)

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        
        if (data.organization) setOrganization(data.organization)
        if (data.dealStages) setDealStages(data.dealStages)
        if (data.contactStatuses) setContactStatuses(data.contactStatuses)
        if (data.notifications) setNotifications(data.notifications)
      } catch (error) {
        console.error('Error fetching settings:', error)
      }
      setIsLoading(false)
    }
    fetchSettings()
  }, [])

  // Save settings
  const saveSettings = useCallback(async (key, value) => {
    if (!isAdmin) {
      setSaveMessage({ type: 'error', text: t('errors.unauthorized') })
      return
    }
    
    setIsSaving(true)
    setSaveMessage(null)
    
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      
      if (res.ok) {
        setSaveMessage({ type: 'success', text: t('settings.changesSaved') })
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        throw new Error('Error saving')
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: t('common.error') })
    }
    setIsSaving(false)
  }, [isAdmin])

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data.data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
    setIsLoadingUsers(false)
  }, [])

  // Load users when switching to users tab
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    }
  }, [activeTab, fetchUsers])

  // Load billing when switching to billing tab
  useEffect(() => {
    if (activeTab === 'billing' && !billing) {
      setIsBillingLoading(true)
      fetch('/api/billing/status')
        .then((r) => r.json())
        .then((d) => { setBilling(d); setIsBillingLoading(false) })
        .catch(() => setIsBillingLoading(false))
    }
  }, [activeTab, billing])

  // Load invoices alongside billing status
  useEffect(() => {
    if (activeTab === 'billing' && invoices === null) {
      setIsInvoicesLoading(true)
      fetch('/api/billing/invoices')
        .then((r) => r.json())
        .then((d) => { setInvoices(d.invoices ?? []); setIsInvoicesLoading(false) })
        .catch(() => { setInvoices([]); setIsInvoicesLoading(false) })
    }
  }, [activeTab, invoices])

  // Open Stripe Customer Portal
  const handlePortal = async () => {
    setIsPortalLoading(true)
    setBillingMessage(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setBillingMessage({ type: 'error', text: data.error || t('billing.portalError') })
      }
    } catch {
      setBillingMessage({ type: 'error', text: t('errors.networkError') })
    } finally {
      setIsPortalLoading(false)
    }
  }

  // Handle plan upgrade from settings
  const handleUpgrade = async (plan) => {
    setIsUpgrading(plan)
    setBillingMessage(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setBillingMessage({ type: 'error', text: data.error || t('billing.checkoutError') })
      }
    } catch {
      setBillingMessage({ type: 'error', text: t('errors.networkError') })
    } finally {
      setIsUpgrading(null)
    }
  }

  // User management handlers
  const openUserModal = (user = null) => {
    if (user) {
      setEditingUser(user)
      setUserForm({
        name: user.name,
        email: user.email,
        password: '', // Don't show existing password
        role: user.role,
        isActive: user.isActive,
      })
    } else {
      setEditingUser(null)
      setUserForm({
        name: '',
        email: '',
        password: '',
        role: 'user',
        isActive: true,
      })
    }
    setShowUserModal(true)
  }

  const closeUserModal = () => {
    setShowUserModal(false)
    setEditingUser(null)
    setUserForm({ name: '', email: '', password: '', role: 'user', isActive: true })
  }
  useModalClose(() => { if (showUserModal) closeUserModal() })

  const saveUser = async () => {
    if (!userForm.name || !userForm.email) {
      setSaveMessage({ type: 'error', text: t('users.nameEmailRequired') })
      return
    }

    // Require password for new users
    if (!editingUser && !userForm.password) {
      setSaveMessage({ type: 'error', text: t('users.passwordRequired') })
      return
    }

    // Password minimum length
    if (userForm.password && userForm.password.length < 6) {
      setSaveMessage({ type: 'error', text: t('users.passwordTooShort') })
      return
    }

    setIsSaving(true)
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'
      
      // Only include password if provided
      const payload = { ...userForm }
      if (!payload.password) {
        delete payload.password
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSaveMessage({ type: 'success', text: editingUser ? t('users.updated') : t('users.created') })
        closeUserModal()
        fetchUsers()
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        const error = await res.json()
        setSaveMessage({ type: 'error', text: error.error || t('users.saveError') })
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: t('users.saveError') })
    }
    setIsSaving(false)
  }

  const deleteUser = async (user) => {
    if (!confirm(t('users.confirmDeactivate', { name: user.name }))) return

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setSaveMessage({ type: 'success', text: t('users.deactivated') })
        fetchUsers()
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage({ type: 'error', text: data.error || t('users.deactivateError') })
        setTimeout(() => setSaveMessage(null), 5000)
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: t('users.deactivateError') })
    }
  }

  // Deal stages handlers
  const addDealStage = () => {
    const newId = `stage_${Date.now()}`
    setDealStages([
      ...dealStages.filter(s => s.id !== 'won' && s.id !== 'lost'),
      { id: newId, label: 'Nueva etapa', color: 'gray', probability: 50 },
      ...dealStages.filter(s => s.id === 'won' || s.id === 'lost'),
    ])
  }

  const updateDealStage = (index, field, value) => {
    const updated = [...dealStages]
    updated[index] = { ...updated[index], [field]: value }
    setDealStages(updated)
  }

  const removeDealStage = (index) => {
    const stage = dealStages[index]
    // Don't allow removing won/lost
    if (stage.id === 'won' || stage.id === 'lost') return
    setDealStages(dealStages.filter((_, i) => i !== index))
  }

  const moveDealStage = (index, direction) => {
    const stage = dealStages[index]
    if (stage.id === 'won' || stage.id === 'lost') return
    
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= dealStages.length - 2) return
    
    const updated = [...dealStages]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setDealStages(updated)
  }

  // Contact statuses handlers
  const addContactStatus = () => {
    const newId = `status_${Date.now()}`
    setContactStatuses([
      ...contactStatuses,
      { id: newId, label: 'Nuevo estado', color: 'gray' },
    ])
  }

  const updateContactStatus = (index, field, value) => {
    const updated = [...contactStatuses]
    updated[index] = { ...updated[index], [field]: value }
    setContactStatuses(updated)
  }

  const removeContactStatus = (index) => {
    if (contactStatuses.length <= 1) return
    setContactStatuses(contactStatuses.filter((_, i) => i !== index))
  }

  // Show loading while checking auth or redirecting non-admin users
  if (authLoading || !isAdmin || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{t('nav.settings')} | CRM</title>
      </Head>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Settings Sidebar */}
        <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 hidden lg:block">{t('settings.title')}</h2>
          <nav className="flex lg:flex-col gap-1 lg:gap-0 lg:space-y-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {/* Save Message */}
          {saveMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              saveMessage.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {saveMessage.text}
            </div>
          )}

          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="max-w-2xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">{t('settings.generalSettings')}</h3>
              
              {/* Logo Upload */}
              <div className="card mb-6">
                <div className="card-header">
                  <h4 className="font-medium text-gray-900">Branding</h4>
                </div>
                <div className="card-body">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                        {organization.logo ? (
                          <img src={organization.logo} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                        ) : (
                          <Icons.image className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('settingsExt.orgLogo')}
                      </label>
                      <p className="text-sm text-gray-500 mb-3">
                        {t('settingsExt.orgLogoHint')}
                      </p>
                      <div className="flex gap-2">
                        <label className={`btn btn-secondary cursor-pointer ${logoUploading ? 'opacity-50' : ''}`}>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={logoUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              setLogoUploading(true)
                              try {
                                const res = await fetch(
                                  `/api/settings/upload-logo?filename=logo`,
                                  {
                                    method: 'POST',
                                    headers: { 'Content-Type': file.type },
                                    body: file,
                                  }
                                )
                                const data = await res.json()
                                if (data.url) {
                                  setOrganization({ ...organization, logo: data.url })
                                }
                              } finally {
                                setLogoUploading(false)
                              }
                            }}
                          />
                          {logoUploading ? t('settingsExt.uploading') : t('settingsExt.uploadLogo')}
                        </label>
                        {organization.logo && (
                          <button
                            onClick={() => setOrganization({ ...organization, logo: null })}
                            className="btn btn-secondary text-red-600 hover:text-red-700"
                          >
                            {t('common.delete')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.organizationName')}
                    </label>
                    <input
                      type="text"
                      className="input max-w-md"
                      value={organization.name}
                      onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                      placeholder="Mi Empresa"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settingsExt.primaryColor')}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={organization.primaryColor}
                        onChange={(e) => setOrganization({ ...organization, primaryColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={organization.primaryColor}
                        onChange={(e) => setOrganization({ ...organization, primaryColor: e.target.value })}
                        className="input w-32"
                        placeholder="#4F46E5"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settingsExt.secondaryColor')}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      {t('settingsExt.secondaryColorHint')}
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={organization.secondaryColor || '#7c3aed'}
                        onChange={(e) => setOrganization({ ...organization, secondaryColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={organization.secondaryColor || '#7c3aed'}
                        onChange={(e) => setOrganization({ ...organization, secondaryColor: e.target.value })}
                        className="input w-32"
                        placeholder="#7c3aed"
                      />
                    </div>
                    {/* Live preview */}
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <span
                        className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                        style={{ backgroundColor: organization.secondaryColor || '#7c3aed' }}
                      >
                        Botón secundario
                      </span>
                      <span
                        className="text-xs px-3 py-1.5 rounded-lg font-medium border"
                        style={{
                          color: organization.secondaryColor || '#7c3aed',
                          borderColor: organization.secondaryColor || '#7c3aed',
                          backgroundColor: `${organization.secondaryColor || '#7c3aed'}15`,
                        }}
                      >
                        Badge / Acento
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: organization.primaryColor || '#2563eb' }}
                        />
                        Principal
                        <span
                          className="inline-block w-3 h-3 rounded-full ml-1"
                          style={{ backgroundColor: organization.secondaryColor || '#7c3aed' }}
                        />
                        Secundario
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settingsExt.customDomain')}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      {t('settingsExt.customDomainHint')}
                    </p>
                    <input
                      type="text"
                      className="input max-w-md"
                      value={organization.customDomain || ''}
                      onChange={(e) => setOrganization({ ...organization, customDomain: e.target.value })}
                      placeholder="crm.miempresa.com"
                    />
                  </div>
                </div>
              </div>

              {/* Regional Settings */}
              <div className="card">
                <div className="card-header">
                  <h4 className="font-medium text-gray-900">{t('settingsExt.regionalSettings')}</h4>
                </div>
                <div className="card-body space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.currency')}
                    </label>
                    <select
                      className="input max-w-md"
                      value={organization.currency}
                      onChange={(e) => setOrganization({ ...organization, currency: e.target.value })}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.timezone')}
                    </label>
                    <select
                      className="input max-w-md"
                      value={organization.timezone}
                      onChange={(e) => setOrganization({ ...organization, timezone: e.target.value })}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.dateFormat')}
                    </label>
                    <select
                      className="input max-w-md"
                      value={organization.dateFormat}
                      onChange={(e) => setOrganization({ ...organization, dateFormat: e.target.value })}
                    >
                      {DATE_FORMATS.map((df) => (
                        <option key={df.value} value={df.value}>{df.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => saveSettings('organization', organization)}
                  disabled={isSaving || !isAdmin}
                  className="btn btn-primary"
                >
                  {isSaving ? t('common.saving') : t('settings.saveChanges')}
                </button>
              </div>
            </div>
          )}

          {/* Users Settings - Admin Only */}
          {activeTab === 'users' && isAdmin && (
            <div className="max-w-4xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{t('settings.users')}</h3>
                  <p className="text-gray-500">{t('settingsExt.usersSubtitle')}</p>
                </div>
                <button
                  onClick={() => openUserModal()}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Icons.plus className="w-4 h-4" />
                  {t('users.newUser')}
                </button>
              </div>

              {/* Role Legend */}
              <div className="card mb-6">
                <div className="card-body">
                  <h4 className="font-medium text-gray-900 mb-3">{t('settingsExt.rolesAndPermissions')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-red-50 rounded-lg">
                      <span className="font-medium text-red-700">{t('roles.admin')}</span>
                      <p className="text-red-600 mt-1">{t('roles.adminDesc')}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium text-blue-700">{t('roles.manager')}</span>
                      <p className="text-blue-600 mt-1">{t('roles.managerDesc')}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">{t('roles.user')}</span>
                      <p className="text-gray-600 mt-1">{t('roles.userDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Users List */}
              <div className="card">
                <div className="card-header">
                  <h4 className="font-medium text-gray-900">{t('settings.users')} ({users.length})</h4>
                </div>
                <div className="divide-y divide-gray-200">
                  {isLoadingUsers ? (
                    <div className="p-8 text-center">
                      <Spinner />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {t('users.empty')}
                    </div>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                            user.role === 'admin' ? 'bg-red-500' : user.role === 'manager' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{user.name}</span>
                              {!user.isActive && (
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{t('users.inactive')}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            user.role === 'admin' 
                              ? 'bg-red-100 text-red-700' 
                              : user.role === 'manager' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.role === 'admin' ? t('roles.admin') : user.role === 'manager' ? t('roles.manager') : t('roles.user')}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openUserModal(user)}
                              className="text-gray-400 hover:text-gray-600"
                              title={t('common.edit')}
                            >
                              <Icons.edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteUser(user)}
                              className="text-gray-400 hover:text-red-600"
                              title={t('users.deactivate')}
                            >
                              <Icons.trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* User Modal */}
              {showUserModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeUserModal}>
                  <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {editingUser ? t('users.editUser') : t('users.newUser')}
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('common.name')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="input w-full"
                          value={userForm.name}
                          onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                          placeholder="Nombre completo"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          className="input w-full"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('auth.password')} {!editingUser && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="password"
                          className="input w-full"
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                          placeholder={editingUser ? t('users.passwordKeepEmpty') : t('users.passwordMin')}
                        />
                        {editingUser && (
                          <p className="text-xs text-gray-500 mt-1">
                            {t('users.passwordKeepEmptyHint')}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('common.role')}
                        </label>
                        <select
                          className="input w-full"
                          value={userForm.role}
                          onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        >
                          <option value="user">{t('roles.user')}</option>
                          <option value="manager">Manager</option>
                          <option value="admin">{t('roles.admin')}</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="userActive"
                          checked={userForm.isActive}
                          onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor="userActive" className="text-sm text-gray-700">
                          {t('users.activeUser')}
                        </label>
                      </div>
                    </div>
                    <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                      <button
                        onClick={closeUserModal}
                        className="btn btn-secondary"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={saveUser}
                        disabled={isSaving}
                        className="btn btn-primary"
                      >
                        {isSaving ? t('common.saving') : editingUser ? t('users.update') : t('users.create')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pipeline Settings */}
          {activeTab === 'pipeline' && (
            <div className="max-w-2xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('settings.pipelineSettings')}</h3>
              <p className="text-gray-500 mb-6">
                {t('settingsExt.pipelineHint')}
              </p>
              
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{t('settings.pipelineStages')}</h4>
                  <button
                    onClick={addDealStage}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <Icons.plus className="w-4 h-4" />
                    {t('settings.addStage')}
                  </button>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    {dealStages.map((stage, index) => {
                      const isTerminal = stage.id === 'won' || stage.id === 'lost'
                      return (
                        <div
                          key={stage.id}
                          data-testid="deal-stage"
                          className={`p-3 rounded-lg ${
                            isTerminal ? 'bg-gray-100' : 'bg-gray-50'
                          }`}
                        >
                          {/* Main row: reorder + color + label + delete */}
                          <div className="flex items-center gap-2">
                            {!isTerminal ? (
                              <div className="flex flex-col shrink-0">
                                <button
                                  onClick={() => moveDealStage(index, -1)}
                                  className="text-gray-400 hover:text-gray-600"
                                  disabled={index === 0}
                                >
                                  <Icons.chevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => moveDealStage(index, 1)}
                                  className="text-gray-400 hover:text-gray-600"
                                  disabled={index >= dealStages.length - 3}
                                >
                                  <Icons.chevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="w-4 shrink-0" />
                            )}

                            {/* Color picker */}
                            <input
                              type="color"
                              value={getColorHex(stage.color)}
                              onChange={(e) => updateDealStage(index, 'color', e.target.value)}
                              className={`color-picker-circle shrink-0 ${isTerminal ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={isTerminal}
                            />

                            <input
                              type="text"
                              className={`flex-1 min-w-0 bg-transparent border-none text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1 ${
                                isTerminal ? 'cursor-not-allowed' : ''
                              }`}
                              value={stage.label}
                              onChange={(e) => updateDealStage(index, 'label', e.target.value)}
                              disabled={isTerminal}
                            />

                            {!isTerminal ? (
                              <button
                                onClick={() => removeDealStage(index)}
                                className="text-gray-400 hover:text-red-500 shrink-0"
                              >
                                <Icons.trash className="w-4 h-4" />
                              </button>
                            ) : (
                              <div className="w-4 shrink-0" />
                            )}
                          </div>

                          {/* Probability row (below on all sizes) */}
                          <div className="mt-2 flex items-center gap-2 pl-10">
                            <span className="text-xs text-gray-500">{t('settingsExt.probability')}</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className={`w-14 text-sm text-center bg-white border border-gray-200 rounded px-2 py-1 ${
                                isTerminal ? 'cursor-not-allowed bg-gray-100' : ''
                              }`}
                              value={stage.probability}
                              onChange={(e) => updateDealStage(index, 'probability', parseInt(e.target.value) || 0)}
                              disabled={isTerminal}
                            />
                            <span className="text-xs text-gray-500">%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <p className="mt-4 text-xs text-gray-500">
                    {t('settingsExt.fixedStagesNote')}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => saveSettings('dealStages', dealStages)}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  {isSaving ? t('common.saving') : t('settings.saveChanges')}
                </button>
              </div>
            </div>
          )}

          {/* Contact Statuses Settings */}
          {activeTab === 'contacts' && (
            <div className="max-w-2xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('settings.contactStatuses')}</h3>
              <p className="text-gray-500 mb-6">
                {t('settingsExt.contactStatusesHint')}
              </p>
              
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{t('settings.availableStatuses')}</h4>
                  <button
                    onClick={addContactStatus}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <Icons.plus className="w-4 h-4" />
                    {t('settings.addStatus')}
                  </button>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    {contactStatuses.map((status, index) => (
                      <div
                        key={status.id}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                      >
                        {/* Color picker */}
                        <input
                          type="color"
                          value={getColorHex(status.color)}
                          onChange={(e) => updateContactStatus(index, 'color', e.target.value)}
                          className="color-picker-circle"
                        />

                        <input
                          type="text"
                          className="flex-1 bg-transparent border-none text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
                          value={status.label}
                          onChange={(e) => updateContactStatus(index, 'label', e.target.value)}
                        />

                        <button
                          onClick={() => removeContactStatus(index)}
                          className="text-gray-400 hover:text-red-500"
                          disabled={contactStatuses.length <= 1}
                        >
                          <Icons.trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => saveSettings('contactStatuses', contactStatuses)}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  {isSaving ? t('common.saving') : t('settings.saveChanges')}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">{t('settings.notifications')}</h3>

              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="space-y-4">
                  {[
                    { key: 'taskReminders', label: t('settings.taskReminders'), description: t('settingsExt.taskRemindersDesc') },
                    { key: 'newContacts', label: t('settingsExt.newContacts'), description: t('settingsExt.newContactsDesc') },
                    { key: 'dealsWon', label: t('settingsExt.dealsWon'), description: t('settingsExt.dealsWonDesc') },
                    { key: 'dealUpdates', label: t('settings.dealUpdates'), description: t('settingsExt.dealUpdatesDesc') },
                    { key: 'dailyDigest', label: t('settingsExt.dailyDigest'), description: t('settingsExt.dailyDigestDesc') },
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500">{description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={notifications[key] ?? false}
                          onChange={(e) => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => saveSettings('notifications', notifications)}
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? t('common.saving') : t('settings.saveChanges')}
                </button>
              </div>
            </div>
          )}

          {/* Integrations Settings */}
          {activeTab === 'integrations' && (
            <div className="max-w-2xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">{t('settings.integrations')}</h3>
              
              <div className="space-y-4">
                {/* Google Calendar */}
                <div className="card p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg shadow flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Google Calendar</p>
                        <p className="text-sm text-gray-500">{t('integrations.googleCalendarDesc')}</p>
                      </div>
                    </div>
                    <button className="btn btn-secondary">
                      {t('integrations.connect')}
                    </button>
                  </div>
                </div>

                {/* Slack */}
                <div className="card p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg shadow flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24">
                          <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
                          <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
                          <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
                          <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Slack</p>
                        <p className="text-sm text-gray-500">{t('integrations.slackDesc')}</p>
                      </div>
                    </div>
                    <button className="btn btn-secondary">
                      {t('integrations.connect')}
                    </button>
                  </div>
                </div>

                {/* Zapier */}
                <div className="card p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg shadow flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24">
                          <path fill="#FF4A00" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.438h-3.563V4.875h-4v3.563H6.438v4H10v3.562h4v-3.562h3.562v-4z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Zapier</p>
                        <p className="text-sm text-gray-500">{t('integrations.zapierDesc')}</p>
                      </div>
                    </div>
                    <button className="btn btn-secondary">
                      {t('integrations.connect')}
                    </button>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="card p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg shadow flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24">
                          <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">WhatsApp Business</p>
                        <p className="text-sm text-gray-500">{t('integrations.whatsappDesc')}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                      {t('common.comingSoon')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Plan y Facturación tab ───────────────────────────────────────── */}
          {activeTab === 'billing' && (
            <div className="max-w-2xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">{t('billing.title')}</h3>

              {billingMessage && (
                <div className={`mb-5 p-4 rounded-xl text-sm flex items-center gap-3 ${
                  billingMessage.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : billingMessage.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  <FiCheck className="w-4 h-4 shrink-0" />
                  {billingMessage.text}
                </div>
              )}

              {isBillingLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
              ) : billing ? (
                <>
                  {/* Current plan */}
                  <BillingCurrentPlan billing={billing} />

                  {/* Upgrade options */}
                  {billing.plan !== 'enterprise' && (
                    <div className="mt-8">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">
                        {billing.plan === 'trial'
                          ? t('billing.choosePlan')
                          : t('billing.changePlan')}
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {billing.plan !== 'starter' && billing.plan !== 'pro' && (
                          <PlanCard
                            id="starter"
                            name="Starter"
                            price="$499"
                            period="/mes MXN"
                            features={['500 contactos', '500 negocios', '5 usuarios', '1 chatbot IA', 'Soporte prioritario']}
                            highlight={false}
                            onUpgrade={handleUpgrade}
                            isUpgrading={isUpgrading}
                          />
                        )}
                        {billing.plan !== 'pro' && (
                          <PlanCard
                            id="pro"
                            name="Pro"
                            price="$1,299"
                            period="/mes MXN"
                            features={['5,000 contactos', '5,000 negocios', '20 usuarios', '3 chatbots IA', 'Soporte dedicado', 'White-label']}
                            highlight={true}
                            onUpgrade={handleUpgrade}
                            isUpgrading={isUpgrading}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {billing.plan === 'enterprise' && (
                    <p className="mt-6 text-sm text-gray-500">
                      {t('billing.enterpriseContact')}
                    </p>
                  )}

                  {/* ── Payment method & portal ─────────────────────────── */}
                  {billing.stripeCustomerId && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                      <h4 className="text-base font-semibold text-gray-900 mb-1">{t('billing.paymentMethod')}</h4>
                      <p className="text-sm text-gray-500 mb-4">
                        {t('billing.paymentMethodHint')}
                      </p>
                      <button
                        onClick={handlePortal}
                        disabled={isPortalLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-60"
                      >
                        {isPortalLoading ? <Spinner size="sm" /> : <Icons.creditCard className="w-4 h-4" />}
                        {t('billing.managePaymentMethod')}
                      </button>
                    </div>
                  )}

                  {/* ── Invoice history ──────────────────────────────────── */}
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">{t('billing.invoiceHistory')}</h4>
                    <InvoiceHistory invoices={invoices} isLoading={isInvoicesLoading} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">{t('billing.loadError')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Billing sub-components ────────────────────────────────────────────────────

const PLAN_LABELS = {
  trial:      { name: 'Prueba gratuita', color: 'gray' },
  starter:    { name: 'Starter',         color: 'blue' },
  pro:        { name: 'Pro',             color: 'indigo' },
  enterprise: { name: 'Enterprise',      color: 'purple' },
}

const STATUS_LABELS = {
  trialing:  { label: 'En prueba',     color: 'yellow' },
  active:    { label: 'Activo',        color: 'green' },
  past_due:  { label: 'Pago atrasado', color: 'red' },
  canceled:  { label: 'Cancelado',     color: 'gray' },
  suspended: { label: 'Suspendido',    color: 'red' },
}

function BillingCurrentPlan({ billing }) {
  const plan       = billing?.plan ?? 'trial'
  const status     = billing?.planStatus ?? 'trialing'
  const trialEndsAt = billing?.trialEndsAt
  const planInfo   = PLAN_LABELS[plan] ?? PLAN_LABELS.trial
  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.trialing

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt) - Date.now()) / 86400000))
    : null

  const statusColors = {
    green:  'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red:    'bg-red-100 text-red-700',
    gray:   'bg-gray-100 text-gray-600',
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-gray-500 mb-1">Plan actual</p>
          <p className="text-2xl font-bold text-gray-900">{planInfo.name}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[statusInfo.color] ?? statusColors.gray}`}>
          {statusInfo.label}
        </span>
      </div>

      {trialEndsAt && status === 'trialing' && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${
          trialDaysLeft <= 3 ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
        }`}>
          {plan === 'trial' ? (
            // Free trial — no plan committed yet
            <>
              {trialDaysLeft > 0
                ? `Tu período de prueba termina en ${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''}.`
                : 'Tu período de prueba ha terminado.'}
              {' '}Elige un plan para continuar.
            </>
          ) : (
            // Paid plan in Stripe trial period — already committed
            <>
              {trialDaysLeft > 0
                ? `Tu plan ${PLAN_LABELS[plan]?.name ?? plan} inicia en ${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''}. No se realizará ningún cargo hasta entonces.`
                : `Tu plan ${PLAN_LABELS[plan]?.name ?? plan} inicia hoy.`}
            </>
          )}
        </div>
      )}

      {status === 'past_due' && (
        <div className="mt-3 p-3 rounded-lg text-sm bg-red-50 text-red-700">
          Hay un problema con tu pago. Actualiza tu método de pago para evitar suspensión.
        </div>
      )}

      {status === 'active' && plan !== 'enterprise' && (
        <p className="mt-3 text-xs text-gray-400">
          Usa el portal de facturación de abajo para gestionar tu suscripción.
        </p>
      )}
    </div>
  )
}

function PlanCard({ id, name, price, period, features, highlight, onUpgrade, isUpgrading }) {
  return (
    <div className={`relative bg-white rounded-2xl border p-5 flex flex-col ${
      highlight
        ? 'border-indigo-500 shadow-md shadow-indigo-100 ring-1 ring-indigo-500'
        : 'border-gray-200'
    }`}>
      {highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white bg-indigo-600 px-3 py-1 rounded-full">
          Más popular
        </span>
      )}
      <div className="mb-4">
        <p className="font-semibold text-gray-900 mb-1">{name}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">{price}</span>
          <span className="text-sm text-gray-400">{period}</span>
        </div>
      </div>
      <ul className="space-y-2 mb-5 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
            <FiCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />{f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onUpgrade(id)}
        disabled={!!isUpgrading}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors ${
          highlight
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60'
            : 'border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-60'
        }`}
      >
        {isUpgrading === id ? <Spinner size="sm" /> : <>Actualizar a {name} <FiArrowRight className="w-3.5 h-3.5" /></>}
      </button>
    </div>
  )
}

const STATUS_INVOICE_LABELS = {
  paid:           { label: 'Pagado',     color: 'green' },
  open:           { label: 'Pendiente',  color: 'yellow' },
  draft:          { label: 'Borrador',   color: 'gray' },
  uncollectible:  { label: 'Incobrable', color: 'red' },
  void:           { label: 'Anulado',    color: 'gray' },
}

function InvoiceHistory({ invoices, isLoading }) {
  const statusColors = {
    green:  'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red:    'bg-red-100 text-red-700',
    gray:   'bg-gray-100 text-gray-500',
  }

  if (isLoading) {
    return <div className="flex justify-center py-6"><Spinner /></div>
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        <Icons.creditCard className="w-8 h-8 mx-auto mb-2 text-gray-200" />
        No hay pagos registrados aún.
      </div>
    )
  }

  const fmt = (cents, currency) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency?.toUpperCase() ?? 'MXN',
    }).format(cents / 100)

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-100">
            <th className="text-left font-medium pb-2 pr-4">Fecha</th>
            <th className="text-left font-medium pb-2 pr-4">Factura</th>
            <th className="text-right font-medium pb-2 pr-4">Monto</th>
            <th className="text-left font-medium pb-2 pr-4">Estado</th>
            <th className="text-right font-medium pb-2">PDF</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {invoices.map((inv) => {
            const info = STATUS_INVOICE_LABELS[inv.status] ?? { label: inv.status, color: 'gray' }
            const date = new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
              .format(new Date(inv.date * 1000))
            return (
              <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5 pr-4 text-gray-600 whitespace-nowrap">{date}</td>
                <td className="py-2.5 pr-4 text-gray-500 font-mono text-xs">{inv.number ?? inv.id.slice(-8)}</td>
                <td className="py-2.5 pr-4 text-right font-semibold text-gray-900 whitespace-nowrap">
                  {fmt(inv.amount, inv.currency)}
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[info.color]}`}>
                    {info.label}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  {inv.pdfUrl ? (
                    <a
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 transition-colors text-xs font-medium"
                    >
                      Descargar
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
