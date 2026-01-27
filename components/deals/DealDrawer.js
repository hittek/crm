import { useState, useEffect } from 'react'
import { Drawer, ConfirmDialog } from '../ui/Modal'
import Icons from '../ui/Icons'
import { Avatar } from '../ui/Avatar'
import { StatusChip, PriorityChip } from '../ui/Chip'
import { InlineEdit, InlineTextarea } from '../ui/InlineEdit'
import ActivityTimeline from '../contacts/ActivityTimeline'
import { formatCurrency, formatSmartDate, formatDate } from '../../lib/utils'
import { useDealStages, useOrganization } from '../../lib/SettingsContext'
import { useAuth } from '../../lib/AuthContext'

export default function DealDrawer({ deal, isOpen, onClose, onUpdate, onDelete }) {
  const [localDeal, setLocalDeal] = useState(deal)
  const [activeTab, setActiveTab] = useState('details')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { user, permissions } = useAuth()
  const organization = useOrganization()
  const currency = organization?.currency || 'USD'

  // Check if current user can delete this deal
  const canDelete = localDeal && (
    permissions?.isManager || // Managers and admins can delete anything
    localDeal.ownerId === user?.id || // Owner can delete
    localDeal.createdBy === user?.name || localDeal.createdBy === user?.email // Creator can delete
  )

  useEffect(() => {
    setLocalDeal(deal)
  }, [deal])

  const updateField = async (field, value) => {
    if (!localDeal) return
    
    setIsSaving(true)
    const updated = { ...localDeal, [field]: value }
    setLocalDeal(updated)

    try {
      const res = await fetch(`/api/deals/${localDeal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const data = await res.json()
      onUpdate?.(data)
    } catch (error) {
      console.error('Error updating deal:', error)
      setLocalDeal(deal) // Revert on error
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    try {
      await fetch(`/api/deals/${localDeal.id}`, { method: 'DELETE' })
      onDelete?.(localDeal.id)
    } catch (error) {
      console.error('Error deleting deal:', error)
    }
  }

  const dealStages = useDealStages()

  if (!localDeal) return null

  const currentStage = dealStages.find(s => s.id === localDeal.stage)

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} title="" width="xl">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  <InlineEdit
                    value={localDeal.title}
                    onSave={(value) => updateField('title', value)}
                    placeholder="Título de la oportunidad"
                  />
                </h2>
                {localDeal.contact && (
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar 
                      firstName={localDeal.contact.firstName}
                      lastName={localDeal.contact.lastName}
                      size="sm"
                    />
                    <span className="text-sm text-gray-600">
                      {localDeal.contact.firstName} {localDeal.contact.lastName}
                      {localDeal.contact.company && ` • ${localDeal.contact.company}`}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isSaving && <span className="text-xs text-gray-500">Guardando...</span>}
                {canDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                  >
                    <Icons.delete className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Value and stage */}
            <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Valor</label>
                <div className="text-2xl font-bold text-gray-900">
                  <InlineEdit
                    value={localDeal.value?.toString() || '0'}
                    onSave={(value) => updateField('value', parseFloat(value) || 0)}
                    placeholder="0"
                    type="number"
                  />
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    {localDeal.currency}
                  </span>
                </div>
              </div>
              
              <div className="border-l border-gray-200 pl-6">
                <label className="text-xs font-medium text-gray-500 uppercase">Etapa</label>
                <select
                  value={localDeal.stage}
                  onChange={(e) => updateField('stage', e.target.value)}
                  className="block mt-1 input py-1 px-2 text-sm w-auto"
                >
                  {dealStages.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="border-l border-gray-200 pl-6">
                <label className="text-xs font-medium text-gray-500 uppercase">Probabilidad</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={localDeal.probability}
                    onChange={(e) => updateField('probability', parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm font-medium">{localDeal.probability}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stage progress */}
          <div className="flex items-center gap-1">
            {dealStages.filter(s => !['won', 'lost'].includes(s.id)).map((stage, index) => {
              const isActive = stage.id === localDeal.stage
              const isPast = dealStages.findIndex(s => s.id === localDeal.stage) > index
              
              return (
                <button
                  key={stage.id}
                  onClick={() => updateField('stage', stage.id)}
                  className={`flex-1 py-2 text-xs font-medium text-center rounded transition-colors ${
                    isActive 
                      ? 'bg-primary-600 text-white' 
                      : isPast 
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {stage.label}
                </button>
              )
            })}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {[
              { id: 'details', label: 'Detalles' },
              { id: 'activity', label: 'Actividad' },
              { id: 'tasks', label: 'Tareas' },
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
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Fecha de cierre esperada</label>
                  <input
                    type="date"
                    value={localDeal.expectedClose ? formatDate(localDeal.expectedClose, 'yyyy-MM-dd') : ''}
                    onChange={(e) => updateField('expectedClose', e.target.value ? new Date(e.target.value) : null)}
                    className="input mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Prioridad</label>
                  <select
                    value={localDeal.priority}
                    onChange={(e) => updateField('priority', e.target.value)}
                    className="input mt-1"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Propietario</label>
                  <InlineEdit
                    value={localDeal.owner}
                    onSave={(value) => updateField('owner', value)}
                    placeholder="Asignar propietario"
                    className="block mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Descripción</label>
                <InlineTextarea
                  value={localDeal.description}
                  onSave={(value) => updateField('description', value)}
                  placeholder="Agregar descripción..."
                  className="mt-1"
                />
              </div>

              {localDeal.stage === 'lost' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Razón de pérdida</label>
                  <InlineTextarea
                    value={localDeal.lostReason}
                    onSave={(value) => updateField('lostReason', value)}
                    placeholder="¿Por qué se perdió esta oportunidad?"
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <ActivityTimeline
              dealId={localDeal.id}
              contactId={localDeal.contactId}
              activities={localDeal.activities || []}
              onActivityAdded={() => {
                // Refetch deal to get new activities
              }}
            />
          )}

          {activeTab === 'tasks' && (
            <div className="text-center py-8 text-gray-500">
              <Icons.tasks className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No hay tareas asociadas</p>
              <button className="btn-primary btn-sm mt-4">
                <Icons.add className="w-4 h-4 mr-1" />
                Crear tarea
              </button>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={() => updateField('stage', 'won')}
              className="btn-success flex-1"
            >
              <Icons.check className="w-4 h-4 mr-2" />
              Marcar como ganado
            </button>
            <button
              onClick={() => updateField('stage', 'lost')}
              className="btn-secondary flex-1"
            >
              <Icons.close className="w-4 h-4 mr-2" />
              Marcar como perdido
            </button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Eliminar oportunidad"
        message={`¿Estás seguro de que deseas eliminar "${localDeal.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  )
}
