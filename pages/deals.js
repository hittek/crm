import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Pipeline from '../components/deals/Pipeline'
import DealForm from '../components/deals/DealForm'
import { useI18n } from '../lib/i18n'

export default function DealsPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // DealForm handles the API call itself and calls onSave with the saved deal
  // This callback just updates local state: close form, trigger refresh
  const handleFormSubmit = useCallback((savedDeal) => {
    setShowForm(false)
    setEditingDeal(null)
    setRefreshKey(prev => prev + 1)
  }, [])

  const handleNewDeal = useCallback(() => {
    setEditingDeal(null)
    setShowForm(true)
  }, [])

  // Auto-open form when navigated here via quick-add (?new=deal)
  useEffect(() => {
    if (router.query.new === 'deal') {
      handleNewDeal()
      router.replace({ pathname: '/deals' }, undefined, { shallow: true })
    }
  }, [router.query.new, handleNewDeal, router])

  // Listen for global add deal event
  useEffect(() => {
    const handleAddDeal = () => handleNewDeal()
    window.addEventListener('add:deal', handleAddDeal)
    return () => window.removeEventListener('add:deal', handleAddDeal)
  }, [handleNewDeal])

  return (
    <>
      <Head>
        <title>{t('nav.pipeline')} | CRM</title>
      </Head>

      <div className="flex h-full">
        <Pipeline
          key={refreshKey}
          onNewDeal={handleNewDeal}
        />
      </div>

      {showForm && (
        <DealForm
          isOpen={showForm}
          deal={editingDeal}
          onSave={handleFormSubmit}
          onClose={() => {
            setShowForm(false)
            setEditingDeal(null)
          }}
        />
      )}
    </>
  )
}
