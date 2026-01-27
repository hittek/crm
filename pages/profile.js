import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Icons from '../components/ui/Icons'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../lib/AuthContext'
import { useI18n, SUPPORTED_LOCALES } from '../lib/i18n'

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

// Build locales list from supported locales
const LOCALES = Object.entries(SUPPORTED_LOCALES).map(([code, config]) => ({
  value: code,
  label: config.name,
}))

export default function ProfilePage() {
  const { user: authUser, refreshUser, isLoading: authLoading } = useAuth()
  const { t, setLocale } = useI18n()
  const fileInputRef = useRef(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState(null)
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    avatar: '',
    timezone: 'America/Mexico_City',
    locale: 'es-MX',
  })
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswordSection, setShowPasswordSection] = useState(false)

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/auth/profile')
        const data = await res.json()
        
        if (data.id) {
          setProfile({
            name: data.name || '',
            email: data.email || '',
            avatar: data.avatar || '',
            timezone: data.timezone || 'America/Mexico_City',
            locale: data.locale || 'es-MX',
          })
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        setMessage({ type: 'error', text: 'Error al cargar perfil' })
      }
      setIsLoading(false)
    }
    
    if (!authLoading) {
      fetchProfile()
    }
  }, [authLoading])

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }))
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Por favor selecciona una imagen válida' })
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'La imagen debe ser menor a 2MB' })
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result
      handleProfileChange('avatar', base64)
    }
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    handleProfileChange('avatar', '')
  }

  const saveProfile = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const updateData = {
        name: profile.name,
        avatar: profile.avatar,
        timezone: profile.timezone,
        locale: profile.locale,
      }

      // Add password if changing
      if (showPasswordSection && passwordForm.newPassword) {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          setMessage({ type: 'error', text: t('profile.passwordsDoNotMatch') })
          setIsSaving(false)
          return
        }
        
        if (passwordForm.newPassword.length < 6) {
          setMessage({ type: 'error', text: t('profile.passwordTooShort') })
          setIsSaving(false)
          return
        }

        updateData.currentPassword = passwordForm.currentPassword
        updateData.newPassword = passwordForm.newPassword
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t('errors.generic'))
      }

      // Update the locale in i18n context immediately
      setLocale(profile.locale)

      setMessage({ type: 'success', text: t('profile.profileUpdated') })
      
      // Clear password form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setShowPasswordSection(false)
      
      // Refresh user in auth context
      await refreshUser()
      
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: error.message || t('errors.generic') })
    }
    
    setIsSaving(false)
  }

  if (isLoading || authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{t('profile.title')} | CRM</title>
      </Head>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
            <p className="mt-1 text-gray-500">{t('profile.subtitle')}</p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Profile Form */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Avatar Section */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.photo')}</h2>
              
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div 
                    className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-gray-200 hover:border-primary-400 transition-colors"
                    onClick={handleAvatarClick}
                  >
                    {profile.avatar ? (
                      <img 
                        src={profile.avatar} 
                        alt={profile.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-gray-400">
                        {profile.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleAvatarClick}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-700 transition-colors"
                  >
                    <Icons.edit className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">
                    {t('profile.photoHint')}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    {t('profile.photoFormats')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAvatarClick}
                      className="btn-secondary text-sm"
                    >
                      <Icons.upload className="w-4 h-4 mr-1" />
                      {t('profile.uploadImage')}
                    </button>
                    {profile.avatar && (
                      <button
                        onClick={removeAvatar}
                        className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                      >
                        <Icons.trash className="w-4 h-4 mr-1" />
                        {t('profile.removeImage')}
                      </button>
                    )}
                  </div>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            {/* Basic Info Section */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.basicInfo')}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.fullName')}
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    className="input-field"
                    placeholder={t('profile.namePlaceholder')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.emailLabel')}
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {t('profile.emailHint')}
                  </p>
                </div>
              </div>
            </div>

            {/* Preferences Section */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.preferences')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.timezone')}
                  </label>
                  <select
                    value={profile.timezone}
                    onChange={(e) => handleProfileChange('timezone', e.target.value)}
                    className="input-field"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.language')}
                  </label>
                  <select
                    value={profile.locale}
                    onChange={(e) => handleProfileChange('locale', e.target.value)}
                    className="input-field"
                  >
                    {LOCALES.map(loc => (
                      <option key={loc.value} value={loc.value}>{loc.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('profile.changePassword')}</h2>
                <button
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {showPasswordSection ? t('common.cancel') : t('profile.changePassword')}
                </button>
              </div>
              
              {showPasswordSection && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.currentPassword')}
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      className="input-field"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.newPassword')}
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      className="input-field"
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {t('profile.passwordMinLength')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.confirmPassword')}
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      className="input-field"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="p-6 bg-gray-50 flex justify-end">
              <button
                onClick={saveProfile}
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Icons.save className="w-4 h-4 mr-2" />
                    {t('profile.saveChanges')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Icons.user className="w-5 h-5 text-gray-400" />
              <div>
                <span className="font-medium">{t('profile.role')}: </span>
                <span className="capitalize">{authUser?.role || 'Usuario'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
