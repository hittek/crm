/**
 * components/reports/ReportBuilder.js
 *
 * AI-powered report builder: plain-language prompt → Recharts preview → save.
 */
import { useState } from 'react'
import ReportRunner from './ReportRunner'
import Icons from '../ui/Icons'
import { Spinner } from '../ui/Spinner'

const EXAMPLE_PROMPTS = [
  'Negocios ganados este mes por etapa y valor total',
  'Tareas vencidas por prioridad y contactos nuevos esta semana',
  'Conversaciones abiertas por canal y tiempo de respuesta',
]

export default function ReportBuilder({ onSaved }) {
  const [prompt,   setPrompt]   = useState('')
  const [building, setBuilding] = useState(false)
  const [running,  setRunning]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [result,   setResult]   = useState(null)   // { name, description, definition, tokensUsed }
  const [widgets,  setWidgets]  = useState(null)
  const [error,    setError]    = useState(null)

  async function handleBuild() {
    if (!prompt.trim()) return
    setBuilding(true)
    setError(null)
    setResult(null)
    setWidgets(null)

    try {
      // 1. Build definition via Claude
      const buildRes = await fetch('/api/reports/build', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt }),
      })
      const buildData = await buildRes.json()
      if (!buildRes.ok) throw new Error(buildData.error || 'Error al construir el reporte')

      setResult(buildData)
      setBuilding(false)
      setRunning(true)

      // 2. Preview run against live DB
      const runRes = await fetch('/api/reports/preview/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ definition: buildData.definition, name: buildData.name }),
      })
      const runData = await runRes.json()
      if (!runRes.ok) throw new Error(runData.error || 'Error al ejecutar la vista previa')

      setWidgets(runData.widgets)
    } catch (err) {
      setError(err.message)
    } finally {
      setBuilding(false)
      setRunning(false)
    }
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/reports/build', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt, save: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      onSaved?.(data)
      // Reset after save
      setPrompt('')
      setResult(null)
      setWidgets(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const isLoading = building || running

  return (
    <div className="space-y-6">
      {/* Prompt input */}
      <div className="card p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Describe el reporte que necesitas
        </label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleBuild() }}
          placeholder="Ej. Muéstrame los negocios ganados este mes por etapa, tareas vencidas y conversaciones abiertas por canal"
          rows={3}
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                     disabled:bg-gray-50 disabled:text-gray-400 resize-none"
        />

        {/* Example prompts */}
        <div className="flex flex-wrap gap-2 mt-2">
          {EXAMPLE_PROMPTS.map(ex => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              disabled={isLoading}
              className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">⌘+Enter para generar</p>
          <button
            onClick={handleBuild}
            disabled={!prompt.trim() || isLoading}
            className="btn-primary flex items-center gap-2"
          >
            {isLoading ? <Spinner size="sm" /> : <Icons.reports size={16} />}
            {building ? 'Generando...' : running ? 'Ejecutando...' : 'Generar reporte'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Meta info */}
      {result && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">{result.name}</h3>
            {result.description && (
              <p className="text-sm text-gray-500 mt-0.5">{result.description}</p>
            )}
            <div className="flex gap-3 mt-1">
              {result.tokensUsed && (
                <span className="text-xs text-gray-400">{result.tokensUsed.toLocaleString()} tokens</span>
              )}
              {result.definition?.widgets && (
                <span className="text-xs text-gray-400">{result.definition.widgets.length} widgets</span>
              )}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !widgets}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap"
          >
            {saving ? <Spinner size="sm" /> : <Icons.save size={16} />}
            {saving ? 'Guardando...' : 'Guardar reporte'}
          </button>
        </div>
      )}

      {/* Preview */}
      <ReportRunner
        widgets={widgets}
        loading={running}
        emptyText={result && !running ? 'Sin datos disponibles para esta definición.' : undefined}
      />
    </div>
  )
}
