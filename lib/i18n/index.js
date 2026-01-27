// i18n (Internationalization) Context and Hook
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '../AuthContext'
import esTranslations from './translations/es'
import enTranslations from './translations/en'

// Supported locales
export const SUPPORTED_LOCALES = {
  'es-MX': { code: 'es-MX', name: 'Español (México)', translations: esTranslations },
  'es-ES': { code: 'es-ES', name: 'Español (España)', translations: esTranslations },
  'es-AR': { code: 'es-AR', name: 'Español (Argentina)', translations: esTranslations },
  'es-CO': { code: 'es-CO', name: 'Español (Colombia)', translations: esTranslations },
  'en-US': { code: 'en-US', name: 'English (US)', translations: enTranslations },
  'en-GB': { code: 'en-GB', name: 'English (UK)', translations: enTranslations },
}

// Default locale
export const DEFAULT_LOCALE = 'es-MX'

// Get translations for a locale
function getTranslations(locale) {
  const localeConfig = SUPPORTED_LOCALES[locale]
  if (localeConfig) {
    return localeConfig.translations
  }
  // Fallback to Spanish
  return esTranslations
}

// Create the context
const I18nContext = createContext(null)

// Provider component
export function I18nProvider({ children }) {
  const { user } = useAuth()
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE)
  const [translations, setTranslations] = useState(esTranslations)

  // Update locale when user changes or on initial load
  useEffect(() => {
    // Priority: user preference > localStorage > browser language > default
    let newLocale = DEFAULT_LOCALE

    if (user?.locale && SUPPORTED_LOCALES[user.locale]) {
      newLocale = user.locale
    } else if (typeof window !== 'undefined') {
      const storedLocale = localStorage.getItem('crm_locale')
      if (storedLocale && SUPPORTED_LOCALES[storedLocale]) {
        newLocale = storedLocale
      } else {
        // Try to detect from browser
        const browserLang = navigator.language
        if (SUPPORTED_LOCALES[browserLang]) {
          newLocale = browserLang
        } else if (browserLang.startsWith('es')) {
          newLocale = 'es-MX'
        } else if (browserLang.startsWith('en')) {
          newLocale = 'en-US'
        }
      }
    }

    setLocaleState(newLocale)
    setTranslations(getTranslations(newLocale))
  }, [user?.locale])

  // Set locale function
  const setLocale = useCallback((newLocale) => {
    if (SUPPORTED_LOCALES[newLocale]) {
      setLocaleState(newLocale)
      setTranslations(getTranslations(newLocale))
      if (typeof window !== 'undefined') {
        localStorage.setItem('crm_locale', newLocale)
      }
    }
  }, [])

  // Translation function with interpolation support
  const t = useCallback((key, params = {}) => {
    // Split key by dots to navigate nested object
    const keys = key.split('.')
    let value = translations

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Key not found, return the key itself
        console.warn(`Translation key not found: ${key}`)
        return key
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation key "${key}" does not point to a string`)
      return key
    }

    // Replace placeholders like {count}, {name}, etc.
    let result = value
    for (const [param, val] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), String(val))
    }

    return result
  }, [translations])

  // Check if current locale is Spanish-based
  const isSpanish = locale.startsWith('es')

  // Check if current locale is English-based
  const isEnglish = locale.startsWith('en')

  const value = {
    locale,
    setLocale,
    t,
    translations,
    isSpanish,
    isEnglish,
    supportedLocales: SUPPORTED_LOCALES,
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

// Hook to use i18n
export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Export for testing
export { getTranslations }
