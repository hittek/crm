import { useState, useEffect } from 'react'
import Icons from '../ui/Icons'
import { Spinner } from '../ui/Spinner'
import { formatCurrency, formatRelative, getFullName } from '../../lib/utils'
import { Avatar } from '../ui/Avatar'
import { useDealStages, useOrganization } from '../../lib/SettingsContext'
import { Modal } from '../ui/Modal'

export default function Dashboard() {
  const dealStages = useDealStages()
  const organization = useOrganization()
  const currency = organization?.currency || 'USD'
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [allActivities, setAllActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/reports/dashboard')
        const dashboardData = await res.json()
        setData(dashboardData)
      } catch (error) {
        console.error('Error fetching dashboard:', error)
      }
      setIsLoading(false)
    }

    fetchDashboard()
  }, [])

  const handleShowAllActivities = async () => {
    setShowAllActivities(true)
    setLoadingActivities(true)
    try {
      // Fetch more activities from audit log
      const res = await fetch('/api/audit?limit=50')
      const auditData = await res.json()
      setAllActivities(auditData.data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
    setLoadingActivities(false)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Error cargando datos
      </div>
    )
  }

  const stageColors = {
    lead: 'bg-gray-500',
    qualified: 'bg-blue-500',
    proposal: 'bg-indigo-500',
    negotiation: 'bg-purple-500',
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6">Reportes</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {/* Pipeline Value */}
        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Pipeline Total</span>
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Icons.trending className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.pipeline.totalValue, currency)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {data.pipeline.totalDeals} oportunidades activas
          </p>
        </div>

        {/* Won This Month */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Ganado este mes</span>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Icons.check className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.performance.wonThisMonth.value, currency)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">
              {data.performance.wonThisMonth.count} negocios
            </span>
            {data.performance.wonLastMonth.value > 0 && (
              <span className={`text-xs font-medium ${
                data.performance.wonThisMonth.value >= data.performance.wonLastMonth.value
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {data.performance.wonThisMonth.value >= data.performance.wonLastMonth.value ? '↑' : '↓'}
                {Math.abs(Math.round((data.performance.wonThisMonth.value / data.performance.wonLastMonth.value - 1) * 100))}%
              </span>
            )}
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Tasa de conversión</span>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Icons.reports className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data.performance.conversionRate}%
          </p>
          <p className="text-sm text-gray-500 mt-1">
            De oportunidades cerradas
          </p>
        </div>

        {/* New Contacts */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Nuevos contactos</span>
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Icons.contacts className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data.contacts.newThisWeek}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Esta semana • {data.contacts.total} total
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Pipeline by Stage */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Pipeline por etapa</h3>
          </div>
          <div className="card-body">
            {data.pipeline.byStage.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay datos de pipeline</p>
            ) : (
              <div className="space-y-4">
                {data.pipeline.byStage.map((stage) => {
                  const stageInfo = dealStages.find(s => s.id === stage.stage)
                  const percentage = data.pipeline.totalValue > 0 
                    ? (stage._sum.value / data.pipeline.totalValue) * 100 
                    : 0

                  return (
                    <div key={stage.stage} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-gray-700">
                        {stageInfo?.label || stage.stage}
                      </div>
                      <div className="flex-1">
                        <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                          <div
                            className={`h-full ${stageColors[stage.stage] || 'bg-gray-500'} rounded-lg transition-all`}
                            style={{ width: `${Math.max(percentage, 2)}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-24 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(stage._sum.value || 0, currency)}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({stage._count})
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tasks Overview */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Tareas</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Icons.clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{data.tasks.pending}</p>
                    <p className="text-sm text-gray-500">Pendientes</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Icons.alert className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{data.tasks.overdue}</p>
                    <p className="text-sm text-gray-500">Vencidas</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Icons.check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{data.tasks.completedThisWeek}</p>
                    <p className="text-sm text-gray-500">Completadas esta semana</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card lg:col-span-3">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Actividad reciente</h3>
            <button 
              onClick={handleShowAllActivities}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Ver todo
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay actividad reciente</p>
            ) : (
              data.recentActivities.map((activity) => (
                <div key={activity.id} className="px-6 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'email' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'call' ? 'bg-green-100 text-green-600' :
                    activity.type === 'meeting' ? 'bg-purple-100 text-purple-600' :
                    activity.type === 'note' ? 'bg-yellow-100 text-yellow-600' :
                    activity.type === 'task_completed' || activity.type === 'completed' ? 'bg-green-100 text-green-600' :
                    activity.type === 'deal_updated' || activity.type === 'stage_changed' ? 'bg-indigo-100 text-indigo-600' :
                    activity.type === 'login' || activity.type === 'logout' ? 'bg-gray-100 text-gray-600' :
                    activity.type === 'created' ? 'bg-green-100 text-green-600' :
                    activity.type === 'updated' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'deleted' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {activity.type === 'email' && <Icons.mail className="w-5 h-5" />}
                    {activity.type === 'call' && <Icons.phone className="w-5 h-5" />}
                    {activity.type === 'meeting' && <Icons.calendar className="w-5 h-5" />}
                    {activity.type === 'note' && <Icons.note className="w-5 h-5" />}
                    {(activity.type === 'task_completed' || activity.type === 'completed') && <Icons.check className="w-5 h-5" />}
                    {(activity.type === 'deal_updated' || activity.type === 'stage_changed') && <Icons.trending className="w-5 h-5" />}
                    {(activity.type === 'login' || activity.type === 'logout') && <Icons.user className="w-5 h-5" />}
                    {activity.type === 'created' && <Icons.plus className="w-5 h-5" />}
                    {activity.type === 'updated' && <Icons.edit className="w-5 h-5" />}
                    {activity.type === 'deleted' && <Icons.trash className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {activity.userName && (
                        <span className="text-xs text-gray-500">
                          por {activity.userName}
                        </span>
                      )}
                      {activity.contact && (
                        <span className="text-xs text-gray-500">
                          {activity.userName ? '• ' : ''}{getFullName(activity.contact.firstName, activity.contact.lastName)}
                        </span>
                      )}
                      {activity.deal && (
                        <span className="text-xs text-gray-500">
                          • {activity.deal.title}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatRelative(activity.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* All Activities Modal */}
      <Modal
        isOpen={showAllActivities}
        onClose={() => setShowAllActivities(false)}
        title="Historial de actividades"
        size="lg"
      >
        <div className="max-h-[60vh] overflow-y-auto">
          {loadingActivities ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : allActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay actividades registradas</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {allActivities.map((activity) => (
                <div key={activity.id} className="py-4 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.action === 'created' ? 'bg-green-100 text-green-600' :
                    activity.action === 'updated' ? 'bg-blue-100 text-blue-600' :
                    activity.action === 'deleted' ? 'bg-red-100 text-red-600' :
                    activity.action === 'completed' ? 'bg-purple-100 text-purple-600' :
                    activity.action === 'stage_changed' ? 'bg-indigo-100 text-indigo-600' :
                    activity.action === 'assigned' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {activity.action === 'created' && <Icons.plus className="w-5 h-5" />}
                    {activity.action === 'updated' && <Icons.edit className="w-5 h-5" />}
                    {activity.action === 'deleted' && <Icons.trash className="w-5 h-5" />}
                    {activity.action === 'completed' && <Icons.check className="w-5 h-5" />}
                    {activity.action === 'stage_changed' && <Icons.trending className="w-5 h-5" />}
                    {activity.action === 'assigned' && <Icons.contacts className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.entityName || activity.entity}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {activity.action === 'created' && 'Creado'}
                      {activity.action === 'updated' && 'Actualizado'}
                      {activity.action === 'deleted' && 'Eliminado'}
                      {activity.action === 'completed' && 'Completado'}
                      {activity.action === 'stage_changed' && `Movido a ${activity.details?.newStage || 'nueva etapa'}`}
                      {activity.action === 'assigned' && `Asignado a ${activity.details?.newAssignee || 'usuario'}`}
                      {' • '}
                      <span className="capitalize">{activity.entity}</span>
                    </p>
                    {activity.userName && (
                      <p className="text-xs text-gray-400 mt-1">
                        Por: {activity.userName}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatRelative(activity.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
