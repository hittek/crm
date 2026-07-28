import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Dashboard from '../components/reports/Dashboard'
import ReportRunner from '../components/reports/ReportRunner'
import ReportBuilder from '../components/reports/ReportBuilder'
import Icons from '../components/ui/Icons'
import { Spinner } from '../components/ui/Spinner'
import { useI18n } from '../lib/i18n'

// ─── Schedule picker ────────────────────────────────────────────────────────

const TZ_OPTIONS = [
  'America/Mexico_City',
  'America/Monterrey',
  'America/Tijuana',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Bogota',
  'America/Lima',
]

function ScheduleEditor({ report, onSaved }) {
  const [hour, setHour]   = useState(report.schedule ? JSON.parse(report.schedule).hour : 8)
  const [tz,   setTz]     = useState(report.schedule ? JSON.parse(report.schedule).timezone : 'America/Mexico_City')
  const [enabled, setEn]  = useState(!!report.schedule)
  const [saving,  setSav] = useState(false)
  const { t } = useI18n()

  async function save() {
    setSav(true)
    const schedule = enabled ? { frequency: 'daily', hour, timezone: tz } : null
    await fetch(`/api/reports/${report.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ schedule }),
    })
    setSav(false)
    onSaved?.()
  }

  return (
    <div className="border-t border-gray-100 pt-3 mt-3 space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox" checked={enabled}
          onChange={e => setEn(e.target.checked)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">{t('reports.scheduleDaily')}</span>
      </label>

      {enabled && (
        <div className="flex gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{t('reports.scheduleHour')}</label>
            <select value={hour} onChange={e => setHour(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded px-2 py-1">
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2,'0')}:00</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Zona horaria</label>
            <select value={tz} onChange={e => setTz(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1">
              {TZ_OPTIONS.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </div>
      )}

      <button onClick={save} disabled={saving}
              className="btn-secondary text-xs flex items-center gap-1">
        {saving ? <Spinner size="sm" /> : <Icons.save size={13} />}
        Guardar horario
      </button>
    </div>
  )
}

// ─── Report card ─────────────────────────────────────────────────────────────

function ReportCard({ report, onDelete, onRefresh }) {
  const { t } = useI18n()
  const [expanded,  setExpanded]  = useState(false)
  const [schedule,  setSchedule]  = useState(false)
  const [running,   setRunning]   = useState(false)
  const [widgets,   setWidgets]   = useState(null)
  const [runError,  setRunError]  = useState(null)
  const [deleting,  setDeleting]  = useState(false)

  const sched = report.schedule ? JSON.parse(report.schedule) : null

  async function run() {
    setExpanded(true)
    setRunning(true)
    setRunError(null)
    setWidgets(null)
    try {
      const res  = await fetch(`/api/reports/${report.id}/run`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setWidgets(data.widgets)
    } catch (err) {
      setRunError(err.message)
    } finally {
      setRunning(false)
    }
  }

  async function del() {
    if (!confirm(t('reports.confirmDelete'))) return
    setDeleting(true)
    await fetch(`/api/reports/${report.id}`, { method: 'DELETE' })
    onDelete(report.id)
  }

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{report.name}</h3>
            {report.isBuiltIn && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {t('reports.builtIn')}
              </span>
            )}
            {sched && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Icons.clock size={11} />
                {String(sched.hour).padStart(2,'0')}:00
              </span>
            )}
          </div>
          {report.description && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{report.description}</p>
          )}
          {report.lastRun && (
            <p className="text-xs text-gray-400 mt-1">
              {t('reports.lastRun')}: {new Date(report.lastRun.deliveredAt || report.lastRun.createdAt).toLocaleDateString('es-MX')}
              {' · '}<span className={report.lastRun.status === 'delivered' ? 'text-green-600' : 'text-red-500'}>
                {report.lastRun.status}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={run} disabled={running}
                  className="btn-primary text-xs flex items-center gap-1 py-1.5 px-3">
            {running ? <Spinner size="sm" /> : <Icons.reports size={13} />}
            {t('reports.runReport')}
          </button>
          <button onClick={() => setSchedule(s => !s)}
                  className="btn-secondary text-xs py-1.5 px-2">
            <Icons.clock size={14} />
          </button>
          {!report.isBuiltIn && (
            <button onClick={del} disabled={deleting}
                    className="btn-secondary text-xs py-1.5 px-2 hover:text-red-600">
              {deleting ? <Spinner size="sm" /> : <Icons.trash size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Schedule editor */}
      {schedule && (
        <div className="px-4 pb-4">
          <ScheduleEditor report={report} onSaved={onRefresh} />
        </div>
      )}

      {/* Run result */}
      {expanded && (
        <div className="border-t border-gray-100 p-4">
          <ReportRunner widgets={widgets} loading={running} error={runError} />
        </div>
      )}
    </div>
  )
}

// ─── Mis Reportes tab ────────────────────────────────────────────────────────

function MyReports({ onNewReport }) {
  const { t } = useI18n()
  const [reports, setReports] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/reports')
      const data = await res.json()
      setReports(Array.isArray(data) ? data : [])
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = id => setReports(prev => prev.filter(r => r.id !== id))

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  }

  if (!reports?.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Icons.reports size={40} className="mx-auto mb-3 text-gray-300" />
        <p>{t('reports.noReports')}</p>
        <button onClick={onNewReport} className="btn-primary mt-4">
          {t('reports.createReport')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map(r => (
        <ReportCard key={r.id} report={r} onDelete={handleDelete} onRefresh={load} />
      ))}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

const TABS = ['dashboard', 'myReports', 'createReport']

export default function ReportsPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSaved() {
    setRefreshKey(k => k + 1)
    setTab('myReports')
  }

  return (
    <>
      <Head><title>{t('reports.title')} | CRM</title></Head>

      <div className="flex-1 overflow-y-auto">
        {/* Tab bar */}
        <div className="border-b border-gray-200 px-4 lg:px-6 bg-white sticky top-0 z-10">
          <nav className="flex gap-1 -mb-px">
            {TABS.map(key => {
              const labels = {
                dashboard:    t('reports.dashboard'),
                myReports:    t('reports.myReports'),
                createReport: t('reports.createReport'),
              }
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${tab === key
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  {labels[key]}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-4 lg:p-6">
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'myReports' && (
            <MyReports key={refreshKey} onNewReport={() => setTab('createReport')} />
          )}
          {tab === 'createReport' && (
            <ReportBuilder onSaved={handleSaved} />
          )}
        </div>
      </div>
    </>
  )
}
