import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import Icons from '../ui/Icons'
import { useDealStages } from '../../lib/SettingsContext'

export default function DealForm({ isOpen, onClose, onSave, deal = null, contacts = [] }) {
  const dealStages = useDealStages()
  const [formData, setFormData] = useState({
    title: deal?.title || '',
    value: deal?.value || '',
    currency: deal?.currency || 'USD',
    stage: deal?.stage || 'lead',
    probability: deal?.probability || 10,
    expectedClose: deal?.expectedClose 
      ? new Date(deal.expectedClose).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    contactId: deal?.contactId || '',
    description: deal?.description || '',
    priority: deal?.priority || 'medium',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [searchContacts, setSearchContacts] = useState([])

  const validate = () => {
    const newErrors = {}
    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido'
    }
    if (formData.value && isNaN(parseFloat(formData.value))) {
      newErrors.value = 'Valor inválido'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const url = deal ? `/api/deals/${deal.id}` : '/api/deals'
      const method = deal ? 'PUT' : 'POST'
      
      const data = {
        ...formData,
        value: parseFloat(formData.value) || 0,
        probability: parseInt(formData.probability),
        contactId: formData.contactId ? parseInt(formData.contactId) : null,
        expectedClose: formData.expectedClose ? new Date(formData.expectedClose) : null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!res.ok) throw new Error('Error saving deal')
      
      const saved = await res.json()
      onSave(saved)
      onClose()
    } catch (error) {
      console.error('Error saving deal:', error)
      setErrors({ submit: 'Error al guardar la oportunidad' })
    }
    setIsSubmitting(false)
  }

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
    
    // Auto-update probability based on stage
    if (field === 'stage') {
      const stage = dealStages.find(s => s.id === value)
      if (stage) {
        setFormData(prev => ({ ...prev, [field]: value, probability: stage.probability }))
      }
    }
    
    if (errors[field]) {
      setErrors({ ...errors, [field]: null })
    }
  }

  // Search contacts
  const searchForContacts = async (query) => {
    if (query.length < 2) {
      setSearchContacts([])
      return
    }
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSearchContacts(data.contacts || [])
    } catch (error) {
      console.error('Error searching contacts:', error)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={deal ? 'Editar oportunidad' : 'Nueva oportunidad'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`input ${errors.title ? 'input-error' : ''}`}
              placeholder="Ej: Licencia Enterprise para Acme Corp"
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Value and Currency */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor
              </label>
              <input
                type="number"
                value={formData.value}
                onChange={(e) => handleChange('value', e.target.value)}
                className={`input ${errors.value ? 'input-error' : ''}`}
                placeholder="0"
                min="0"
                step="100"
              />
              {errors.value && (
                <p className="text-xs text-red-500 mt-1">{errors.value}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moneda
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="input"
              >
                <option value="USD">USD</option>
                <option value="MXN">MXN</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Stage and Probability */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Etapa
              </label>
              <select
                value={formData.stage}
                onChange={(e) => handleChange('stage', e.target.value)}
                className="input"
              >
                {dealStages.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Probabilidad: {formData.probability}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => handleChange('probability', e.target.value)}
                className="w-full mt-2"
              />
            </div>
          </div>

          {/* Expected Close and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de cierre esperada
              </label>
              <input
                type="date"
                value={formData.expectedClose}
                onChange={(e) => handleChange('expectedClose', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="input"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contacto asociado
            </label>
            <input
              type="text"
              placeholder="Buscar contacto..."
              onChange={(e) => searchForContacts(e.target.value)}
              className="input mb-2"
            />
            {searchContacts.length > 0 && (
              <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                {searchContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => {
                      handleChange('contactId', contact.id)
                      setSearchContacts([])
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Icons.user className="w-4 h-4 text-gray-400" />
                    {contact.firstName} {contact.lastName}
                    {contact.company && (
                      <span className="text-gray-400">• {contact.company}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {formData.contactId && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mt-2">
                <Icons.user className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Contacto seleccionado: #{formData.contactId}</span>
                <button
                  type="button"
                  onClick={() => handleChange('contactId', '')}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  <Icons.close className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Detalles de la oportunidad..."
            />
          </div>
        </div>

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
            {isSubmitting ? 'Guardando...' : deal ? 'Guardar cambios' : 'Crear oportunidad'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
