import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Icons from '../ui/Icons'
import { StatusChip } from '../ui/Chip'
import { Avatar } from '../ui/Avatar'
import { Drawer } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { DealsEmptyState } from '../ui/EmptyState'
import DealDrawer from './DealDrawer'
import { formatCurrency, formatSmartDate } from '../../lib/utils'
import { useDealStages, useOrganization } from '../../lib/SettingsContext'

export default function Pipeline({ onNewDeal }) {
  const router = useRouter()
  const dealStages = useDealStages()
  const organization = useOrganization()
  const currency = organization?.currency || 'USD'
  const [deals, setDeals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [draggingDeal, setDraggingDeal] = useState(null)
  const [mobileViewMode, setMobileViewMode] = useState('list') // 'list' or 'board'
  const [selectedStageFilter, setSelectedStageFilter] = useState('all')

  const fetchDeals = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/deals?limit=100&sortBy=updatedAt&sortOrder=desc')
      const data = await res.json()
      setDeals(data.data)
    } catch (error) {
      console.error('Error fetching deals:', error)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  // Sync selectedDeal with URL query parameter
  useEffect(() => {
    const { id } = router.query
    if (id && deals.length > 0) {
      const dealId = parseInt(id)
      const deal = deals.find(d => d.id === dealId)
      if (deal) {
        setSelectedDeal(deal)
      } else {
        // Deal not in current list, fetch it directly
        fetch(`/api/deals/${dealId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) setSelectedDeal(data)
          })
          .catch(() => {})
      }
    }
  }, [router.query, deals])

  const handleDealSelect = useCallback((deal) => {
    setSelectedDeal(deal)
    router.replace({ pathname: '/deals', query: deal ? { id: deal.id } : {} }, undefined, { shallow: true })
  }, [router])

  const handleDealClose = useCallback(() => {
    setSelectedDeal(null)
    router.replace({ pathname: '/deals' }, undefined, { shallow: true })
  }, [router])

  const handleDragStart = (e, deal) => {
    setDraggingDeal(deal)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, stage) => {
    e.preventDefault()
    if (!draggingDeal || draggingDeal.stage === stage) {
      setDraggingDeal(null)
      return
    }

    // Optimistic update
    setDeals(prev => prev.map(d => 
      d.id === draggingDeal.id ? { ...d, stage } : d
    ))

    try {
      await fetch(`/api/deals/${draggingDeal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
    } catch (error) {
      console.error('Error updating deal:', error)
      fetchDeals() // Revert on error
    }
    
    setDraggingDeal(null)
  }

  const getStageDeals = (stageId) => {
    return deals.filter(d => d.stage === stageId)
  }

  const getStageTotal = (stageId) => {
    return getStageDeals(stageId).reduce((acc, d) => acc + d.value, 0)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (deals.length === 0) {
    return <DealsEmptyState onAdd={onNewDeal} />
  }

  // Filter out won/lost for main board
  const activeStages = dealStages.filter(s => !['won', 'lost'].includes(s.id))

  // Get filtered deals for mobile list view
  const getFilteredDeals = () => {
    if (selectedStageFilter === 'all') return deals
    return deals.filter(d => d.stage === selectedStageFilter)
  }

  // Mobile list view component
  const MobileListView = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">Pipeline</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileViewMode('board')}
              className={`p-2 rounded-lg ${mobileViewMode === 'board' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Vista tablero"
            >
              <Icons.columns className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileViewMode('list')}
              className={`p-2 rounded-lg ${mobileViewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Vista lista"
            >
              <Icons.list className="w-5 h-5" />
            </button>
            <button onClick={onNewDeal} className="btn-primary btn-sm">
              <Icons.add className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Stage filter pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
          <button
            onClick={() => setSelectedStageFilter('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedStageFilter === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({deals.length})
          </button>
          {dealStages.map((stage) => {
            const count = getStageDeals(stage.id).length
            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStageFilter(stage.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedStageFilter === stage.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {stage.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Deals List */}
      <div className="flex-1 overflow-y-auto">
        {getFilteredDeals().length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Icons.deals className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No hay oportunidades en esta etapa</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {getFilteredDeals().map((deal) => {
              const stage = dealStages.find(s => s.id === deal.stage)
              return (
                <button
                  key={deal.id}
                  onClick={() => handleDealSelect(deal)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-medium text-gray-900 truncate">{deal.title}</h3>
                      {deal.contact && (
                        <p className="text-sm text-gray-500 truncate">
                          {deal.contact.firstName} {deal.contact.lastName}
                          {deal.contact.company && ` • ${deal.contact.company}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-gray-900">{formatCurrency(deal.value, currency)}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        deal.stage === 'won' ? 'bg-green-100 text-green-700' :
                        deal.stage === 'lost' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {stage?.label || deal.stage}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {deal.expectedClose && (
                      <span className="flex items-center gap-1">
                        <Icons.calendar className="w-3 h-3" />
                        {formatSmartDate(deal.expectedClose)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: `hsl(${deal.probability * 1.2}, 70%, 50%)` }}
                      />
                      {deal.probability}%
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile: Show list or board based on toggle */}
      <div className="lg:hidden flex-1 flex flex-col">
        {mobileViewMode === 'list' ? (
          <MobileListView />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile board header */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">Pipeline</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileViewMode('board')}
                  className={`p-2 rounded-lg ${mobileViewMode === 'board' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <Icons.columns className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setMobileViewMode('list')}
                  className={`p-2 rounded-lg ${mobileViewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <Icons.list className="w-5 h-5" />
                </button>
                <button onClick={onNewDeal} className="btn-primary btn-sm">
                  <Icons.add className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Horizontal scrolling kanban for mobile board mode */}
            <div className="flex-1 overflow-x-auto p-4">
              <div className="flex gap-3 min-w-max pb-4">
                {activeStages.map((stage) => {
                  const stageDeals = getStageDeals(stage.id)
                  const stageTotal = getStageTotal(stage.id)
                  
                  return (
                    <div
                      key={stage.id}
                      className="kanban-column p-3 w-64"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, stage.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 text-sm">{stage.label}</h3>
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                            {stageDeals.length}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatCurrency(stageTotal, currency)}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {stageDeals.map((deal) => (
                          <div
                            key={deal.id}
                            onClick={() => handleDealSelect(deal)}
                            className="kanban-card"
                          >
                            <h4 className="font-medium text-gray-900 text-sm truncate mb-1">
                              {deal.title}
                            </h4>
                            <p className="text-base font-semibold text-gray-900 mb-1">
                              {formatCurrency(deal.value, currency)}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{deal.probability}%</span>
                              {deal.expectedClose && (
                                <span>{formatSmartDate(deal.expectedClose)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={onNewDeal}
                          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <Icons.add className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Original kanban view */}
      <div className="hidden lg:block flex-1 overflow-x-auto p-4 lg:p-6">
        <div className="flex gap-3 lg:gap-4 min-w-max pb-4">
          {activeStages.map((stage) => {
            const stageDeals = getStageDeals(stage.id)
            const stageTotal = getStageTotal(stage.id)
            
            return (
              <div
                key={stage.id}
                className="kanban-column p-3 w-64 lg:w-72"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{stage.label}</h3>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                      {stageDeals.length}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatCurrency(stageTotal, currency)}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal)}
                      onClick={() => handleDealSelect(deal)}
                      className={`kanban-card ${draggingDeal?.id === deal.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm truncate pr-2">
                          {deal.title}
                        </h4>
                        <button 
                          className="text-gray-400 hover:text-gray-600"
                          onClick={(e) => { e.stopPropagation(); handleDealSelect(deal) }}
                        >
                          <Icons.more className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <p className="text-lg font-semibold text-gray-900 mb-2">
                        {formatCurrency(deal.value, currency)}
                      </p>

                      {deal.contact && (
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar 
                            firstName={deal.contact.firstName}
                            lastName={deal.contact.lastName}
                            size="xs"
                          />
                          <span className="text-xs text-gray-600 truncate">
                            {deal.contact.firstName} {deal.contact.lastName}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        {deal.expectedClose && (
                          <span className="flex items-center gap-1">
                            <Icons.calendar className="w-3 h-3" />
                            {formatSmartDate(deal.expectedClose)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: `hsl(${deal.probability * 1.2}, 70%, 50%)` }}
                          />
                          {deal.probability}%
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Add card button */}
                  <button
                    onClick={onNewDeal}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Icons.add className="w-4 h-4" />
                    Agregar
                  </button>
                </div>
              </div>
            )
          })}

          {/* Won/Lost columns (collapsed) */}
          <div className="flex flex-col gap-4 min-w-[200px]">
            {['won', 'lost'].map((stageId) => {
              const stage = dealStages.find(s => s.id === stageId)
              const stageDeals = getStageDeals(stageId)
              const stageTotal = getStageTotal(stageId)
              
              return (
                <div
                  key={stageId}
                  className={`p-3 rounded-lg ${stageId === 'won' ? 'bg-green-50' : 'bg-red-50'}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stageId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusChip status={stageId} />
                      <span className="text-xs text-gray-500">{stageDeals.length}</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(stageTotal, currency)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Deal drawer */}
      <DealDrawer
        deal={selectedDeal}
        isOpen={!!selectedDeal}
        onClose={handleDealClose}
        onUpdate={(updated) => {
          setDeals(prev => prev.map(d => d.id === updated.id ? updated : d))
          setSelectedDeal(updated)
        }}
        onDelete={(id) => {
          setDeals(prev => prev.filter(d => d.id !== id))
          handleDealClose()
        }}
      />
    </>
  )
}
