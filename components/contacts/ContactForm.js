import { useState } from 'react'
import { Modal } from '../ui/Modal'
import Icons from '../ui/Icons'
import { useContactStatuses } from '../../lib/SettingsContext'

export default function ContactForm({ isOpen, onClose, onSave, contact = null }) {
  const contactStatuses = useContactStatuses()
  const [formData, setFormData] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    mobile: contact?.mobile || '',
    company: contact?.company || '',
    role: contact?.role || '',
    address: contact?.address || '',
    city: contact?.city || '',
    state: contact?.state || '',
    country: contact?.country || 'México',
    status: contact?.status || 'active',
    source: contact?.source || '',
    notes: contact?.notes || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const newErrors = {}
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido'
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const url = contact ? `/api/contacts/${contact.id}` : '/api/contacts'
      const method = contact ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (!res.ok) throw new Error('Error saving contact')
      
      const saved = await res.json()
      onSave(saved)
      onClose()
    } catch (error) {
      console.error('Error saving contact:', error)
      setErrors({ submit: 'Error al guardar el contacto' })
    }
    setIsSubmitting(false)
  }

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: null })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contact ? 'Editar contacto' : 'Nuevo contacto'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          {/* Basic fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className={`input ${errors.firstName ? 'input-error' : ''}`}
              placeholder="Juan"
              autoFocus
            />
            {errors.firstName && (
              <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className="input"
              placeholder="Pérez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="juan@empresa.com"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="input"
              placeholder="+52 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empresa
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              className="input"
              placeholder="Empresa S.A. de C.V."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Puesto
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="input"
              placeholder="Director de Ventas"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="input"
            >
              {contactStatuses.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Origen
            </label>
            <select
              value={formData.source}
              onChange={(e) => handleChange('source', e.target.value)}
              className="input"
            >
              <option value="">Seleccionar...</option>
              <option value="referral">Referido</option>
              <option value="website">Sitio web</option>
              <option value="cold-call">Llamada en frío</option>
              <option value="event">Evento</option>
              <option value="social">Redes sociales</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>

        {/* More fields toggle */}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-4"
        >
          {showMore ? <Icons.chevronDown className="w-4 h-4" /> : <Icons.chevronRight className="w-4 h-4" />}
          {showMore ? 'Menos campos' : 'Más campos'}
        </button>

        {/* Additional fields */}
        {showMore && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Móvil
              </label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => handleChange('mobile', e.target.value)}
                className="input"
                placeholder="+52 (555) 987-6543"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="input"
                placeholder="Av. Reforma 123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="input"
                placeholder="Ciudad de México"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="input"
                placeholder="CDMX"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="Notas adicionales sobre este contacto..."
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {errors.submit && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {errors.submit}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Guardando...' : contact ? 'Guardar cambios' : 'Crear contacto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
