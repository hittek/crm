/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { I18nProvider, useI18n, getTranslations, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../lib/i18n'
import esTranslations from '../lib/i18n/translations/es'
import enTranslations from '../lib/i18n/translations/en'

// Mock the AuthContext
jest.mock('../lib/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}))

// Wrapper component for testing hooks
const wrapper = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
)

// Save original navigator.language
const originalNavigatorLanguage = navigator.language

describe('i18n System', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Mock navigator.language to Spanish
    Object.defineProperty(navigator, 'language', {
      value: 'es-MX',
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Restore original navigator.language
    Object.defineProperty(navigator, 'language', {
      value: originalNavigatorLanguage,
      writable: true,
      configurable: true,
    })
  })

  describe('SUPPORTED_LOCALES', () => {
    it('should have Spanish and English locales', () => {
      expect(SUPPORTED_LOCALES['es-MX']).toBeDefined()
      expect(SUPPORTED_LOCALES['en-US']).toBeDefined()
    })

    it('should have correct names for locales', () => {
      expect(SUPPORTED_LOCALES['es-MX'].name).toBe('Español (México)')
      expect(SUPPORTED_LOCALES['en-US'].name).toBe('English (US)')
      expect(SUPPORTED_LOCALES['en-GB'].name).toBe('English (UK)')
      expect(SUPPORTED_LOCALES['es-ES'].name).toBe('Español (España)')
    })

    it('should have translations for all locales', () => {
      Object.values(SUPPORTED_LOCALES).forEach((locale) => {
        expect(locale.translations).toBeDefined()
      })
    })
  })

  describe('DEFAULT_LOCALE', () => {
    it('should be Spanish Mexico', () => {
      expect(DEFAULT_LOCALE).toBe('es-MX')
    })
  })

  describe('getTranslations', () => {
    it('should return Spanish translations for es-MX', () => {
      const translations = getTranslations('es-MX')
      expect(translations).toBe(esTranslations)
    })

    it('should return English translations for en-US', () => {
      const translations = getTranslations('en-US')
      expect(translations).toBe(enTranslations)
    })

    it('should fallback to Spanish for unknown locale', () => {
      const translations = getTranslations('fr-FR')
      expect(translations).toBe(esTranslations)
    })
  })

  describe('useI18n hook', () => {
    it('should return the i18n context', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })

      expect(result.current).toHaveProperty('locale')
      expect(result.current).toHaveProperty('setLocale')
      expect(result.current).toHaveProperty('t')
      expect(result.current).toHaveProperty('translations')
      expect(result.current).toHaveProperty('isSpanish')
      expect(result.current).toHaveProperty('isEnglish')
    })

    it('should default to Spanish locale', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })

      expect(result.current.locale).toBe('es-MX')
      expect(result.current.isSpanish).toBe(true)
      expect(result.current.isEnglish).toBe(false)
    })

    it('should translate keys correctly in Spanish', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })

      expect(result.current.t('common.save')).toBe('Guardar')
      expect(result.current.t('common.cancel')).toBe('Cancelar')
      expect(result.current.t('nav.contacts')).toBe('Contactos')
      expect(result.current.t('profile.title')).toBe('Mi Perfil')
    })

    it('should change locale correctly', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })

      act(() => {
        result.current.setLocale('en-US')
      })

      expect(result.current.locale).toBe('en-US')
      expect(result.current.isEnglish).toBe(true)
      expect(result.current.isSpanish).toBe(false)
    })

    it('should translate keys in English after locale change', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })

      act(() => {
        result.current.setLocale('en-US')
      })

      expect(result.current.t('common.save')).toBe('Save')
      expect(result.current.t('common.cancel')).toBe('Cancel')
      expect(result.current.t('nav.contacts')).toBe('Contacts')
      expect(result.current.t('profile.title')).toBe('My Profile')
    })

    it('should store locale in localStorage', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })

      act(() => {
        result.current.setLocale('en-US')
      })

      expect(localStorage.getItem('crm_locale')).toBe('en-US')
    })

    it('should return the key for missing translations', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })

      const key = 'nonexistent.key'
      expect(result.current.t(key)).toBe(key)
    })

    it('should interpolate parameters in translations', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })

      // Test with contacts count
      expect(result.current.t('contacts.contactCount', { count: 5 })).toBe('5 contacto')
      expect(result.current.t('contacts.contactCountPlural', { count: 5 })).toBe('5 contactos')
    })

    it('should not change locale for unsupported locales', () => {
      const { result } = renderHook(() => useI18n(), { wrapper })

      act(() => {
        result.current.setLocale('fr-FR')
      })

      // Should remain Spanish (default)
      expect(result.current.locale).toBe('es-MX')
    })
  })

  describe('Spanish translations', () => {
    it('should have all required sections', () => {
      expect(esTranslations.common).toBeDefined()
      expect(esTranslations.nav).toBeDefined()
      expect(esTranslations.auth).toBeDefined()
      expect(esTranslations.profile).toBeDefined()
      expect(esTranslations.contacts).toBeDefined()
      expect(esTranslations.deals).toBeDefined()
      expect(esTranslations.tasks).toBeDefined()
      expect(esTranslations.reports).toBeDefined()
      expect(esTranslations.settings).toBeDefined()
      expect(esTranslations.search).toBeDefined()
      expect(esTranslations.errors).toBeDefined()
    })

    it('should have navigation items in Spanish', () => {
      expect(esTranslations.nav.contacts).toBe('Contactos')
      expect(esTranslations.nav.pipeline).toBe('Pipeline')
      expect(esTranslations.nav.tasks).toBe('Tareas')
      expect(esTranslations.nav.reports).toBe('Reportes')
      expect(esTranslations.nav.settings).toBe('Configuración')
      expect(esTranslations.nav.profile).toBe('Mi Perfil')
      expect(esTranslations.nav.logout).toBe('Cerrar Sesión')
    })

    it('should have profile section in Spanish', () => {
      expect(esTranslations.profile.title).toBe('Mi Perfil')
      expect(esTranslations.profile.saveChanges).toBe('Guardar cambios')
      expect(esTranslations.profile.changePassword).toBe('Cambiar Contraseña')
    })
  })

  describe('English translations', () => {
    it('should have all required sections', () => {
      expect(enTranslations.common).toBeDefined()
      expect(enTranslations.nav).toBeDefined()
      expect(enTranslations.auth).toBeDefined()
      expect(enTranslations.profile).toBeDefined()
      expect(enTranslations.contacts).toBeDefined()
      expect(enTranslations.deals).toBeDefined()
      expect(enTranslations.tasks).toBeDefined()
      expect(enTranslations.reports).toBeDefined()
      expect(enTranslations.settings).toBeDefined()
      expect(enTranslations.search).toBeDefined()
      expect(enTranslations.errors).toBeDefined()
    })

    it('should have navigation items in English', () => {
      expect(enTranslations.nav.contacts).toBe('Contacts')
      expect(enTranslations.nav.pipeline).toBe('Pipeline')
      expect(enTranslations.nav.tasks).toBe('Tasks')
      expect(enTranslations.nav.reports).toBe('Reports')
      expect(enTranslations.nav.settings).toBe('Settings')
      expect(enTranslations.nav.profile).toBe('My Profile')
      expect(enTranslations.nav.logout).toBe('Log Out')
    })

    it('should have profile section in English', () => {
      expect(enTranslations.profile.title).toBe('My Profile')
      expect(enTranslations.profile.saveChanges).toBe('Save changes')
      expect(enTranslations.profile.changePassword).toBe('Change Password')
    })
  })

  describe('Translation parity', () => {
    it('should have the same keys in both languages', () => {
      // Helper to get all keys from an object
      const getKeys = (obj, prefix = '') => {
        let keys = []
        for (const key in obj) {
          const fullKey = prefix ? `${prefix}.${key}` : key
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys = keys.concat(getKeys(obj[key], fullKey))
          } else {
            keys.push(fullKey)
          }
        }
        return keys.sort()
      }

      const esKeys = getKeys(esTranslations)
      const enKeys = getKeys(enTranslations)

      expect(esKeys).toEqual(enKeys)
    })
  })
})
