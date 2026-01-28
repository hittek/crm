import { useState, useEffect, useCallback } from 'react'
import Icons from '../ui/Icons'
import { Avatar } from '../ui/Avatar'
import { StatusChip, PriorityChip, Chip } from '../ui/Chip'
import { InlineEdit, InlineTextarea } from '../ui/InlineEdit'
import { Spinner } from '../ui/Spinner'
import { Modal, ConfirmDialog } from '../ui/Modal'
import ActivityTimeline from './ActivityTimeline'
import TaskForm from '../tasks/TaskForm'
import { getFullName, formatPhone, formatCurrency, formatSmartDate } from '../../lib/utils'
import { useContactStatuses, useOrganization } from '../../lib/SettingsContext'
import { useAuth } from '../../lib/AuthContext'

export default function ContactDetail({ contactId, onClose, onUpdate, onDelete, showBackButton = false }) {
  const contactStatuses = useContactStatuses()
  const organization = useOrganization()
  const currency = organization?.currency || 'USD'
  const { user, permissions } = useAuth()
  const [contact, setContact] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('activity')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Check if current user can delete this contact
  const canDelete = contact && (
    permissions?.isManager || // Managers and admins can delete anything
    contact.ownerId === user?.id || // Owner can delete
    contact.createdBy === user?.name || contact.createdBy === user?.email // Creator can delete
  )

  const fetchContact = useCallback(async () => {
    if (!contactId) return
    
    setIsLoading(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}`)
      const data = await res.json()
      setContact(data)
    } catch (error) {
      console.error('Error fetching contact:', error)
    }
    setIsLoading(false)
  }, [contactId])

  useEffect(() => {
    fetchContact()
  }, [fetchContact])

  const updateField = async (field, value) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const updated = await res.json()
      setContact(updated)
      onUpdate?.(updated)
    } catch (error) {
      console.error('Error updating contact:', error)
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    try {
      await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
      onDelete?.(contactId)
      onClose()
    } catch (error) {
      console.error('Error deleting contact:', error)
    }
  }

  if (isLoading || !contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white border-l border-gray-200">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white lg:border-l border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 lg:gap-4">
            {showBackButton && (
              <button
                onClick={onClose}
                className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                aria-label="Back to list"
              >
                <Icons.arrowLeft className="w-5 h-5" />
              </button>
            )}
            <Avatar 
              firstName={contact.firstName} 
              lastName={contact.lastName}
              src={contact.avatar}
              size="lg"
            />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                <InlineEdit
                  value={getFullName(contact.firstName, contact.lastName)}
                  onSave={(value) => {
                    const [firstName, ...rest] = value.split(' ')
                    const lastName = rest.join(' ')
                    updateField('firstName', firstName)
                    if (lastName) updateField('lastName', lastName)
                  }}
                  placeholder="Nombre"
                />
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <InlineEdit
                  value={contact.role}
                  onSave={(value) => updateField('role', value)}
                  placeholder="Puesto"
                  className="text-sm text-gray-600"
                />
                {contact.company && (
                  <>
                    <span className="text-gray-400">en</span>
                    <InlineEdit
                      value={contact.company}
                      onSave={(value) => updateField('company', value)}
                      placeholder="Empresa"
                      className="text-sm text-gray-600 font-medium"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isSaving && <Spinner size="sm" />}
            <select
              value={contact.status}
              onChange={(e) => updateField('status', e.target.value)}
              className="input py-1 px-2 text-sm w-auto"
            >
              {contactStatuses.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                aria-label="Delete contact"
              >
                <Icons.delete className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="btn-ghost btn-sm">
              <Icons.close className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mt-4">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="btn-secondary btn-sm">
              <Icons.mail className="w-4 h-4 mr-1" />
              Email
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="btn-secondary btn-sm">
              <Icons.phone className="w-4 h-4 mr-1" />
              Llamar
            </a>
          )}
          <button 
            onClick={() => setShowTaskForm(true)}
            className="btn-secondary btn-sm"
          >
            <Icons.calendar className="w-4 h-4 mr-1" />
            Agendar
          </button>
        </div>
      </div>

      {/* Contact info */}
      <div className="px-4 lg:px-6 py-4 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
          <InlineEdit
            value={contact.email}
            onSave={(value) => updateField('email', value)}
            placeholder="email@ejemplo.com"
            type="email"
            className="block mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Teléfono</label>
          <InlineEdit
            value={contact.phone}
            onSave={(value) => updateField('phone', value)}
            placeholder="+52 (555) 000-0000"
            type="tel"
            className="block mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Móvil</label>
          <InlineEdit
            value={contact.mobile}
            onSave={(value) => updateField('mobile', value)}
            placeholder="+52 (555) 000-0000"
            type="tel"
            className="block mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Empresa</label>
          <InlineEdit
            value={contact.company}
            onSave={(value) => updateField('company', value)}
            placeholder="Nombre de empresa"
            className="block mt-1"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'activity', label: 'Actividad', count: contact._count?.activities },
          { id: 'deals', label: 'Oportunidades', count: contact._count?.deals },
          { id: 'tasks', label: 'Tareas', count: contact._count?.tasks },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'activity' && (
          <ActivityTimeline 
            contactId={contactId} 
            activities={contact.activities} 
            onActivityAdded={fetchContact}
          />
        )}

        {activeTab === 'deals' && (
          <div className="p-4">
            {contact.deals?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Icons.deals className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No hay oportunidades asociadas</p>
                <button className="btn-primary btn-sm mt-4">
                  <Icons.add className="w-4 h-4 mr-1" />
                  Crear oportunidad
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {contact.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{deal.title}</h4>
                      <StatusChip status={deal.stage} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{formatCurrency(deal.value, currency)}</span>
                      {deal.expectedClose && (
                        <span>Cierre: {formatSmartDate(deal.expectedClose)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="p-4">
            {contact.tasks?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Icons.tasks className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No hay tareas pendientes</p>
                <button className="btn-primary btn-sm mt-4">
                  <Icons.add className="w-4 h-4 mr-1" />
                  Crear tarea
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {contact.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-500">
                        {task.dueDate ? formatSmartDate(task.dueDate) : 'Sin fecha'}
                      </p>
                    </div>
                    <PriorityChip priority={task.priority} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Eliminar contacto"
        message={`¿Estás seguro de que deseas eliminar a ${getFullName(contact.firstName, contact.lastName)}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />

      {/* Task/Meeting form */}
      <TaskForm
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onSave={() => {
          setShowTaskForm(false)
          fetchContact() // Refresh to show new task
        }}
        contactId={contactId}
        task={{ type: 'meeting' }} // Pre-select meeting type
      />
    </div>
  )
}
