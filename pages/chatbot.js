import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'
import Icons from '../components/ui/Icons'
import UpgradeWall from '../components/ui/UpgradeWall'
import ChatPanel from '../components/chatbot/ChatPanel'
import { useAuth } from '../lib/AuthContext'
import { useModalClose } from '../components/ui/Modal'
import { useI18n } from '../lib/i18n'

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS = {
  empty:    { color: 'bg-gray-100 text-gray-500' },
  indexing: { color: 'bg-yellow-100 text-yellow-700' },
  ready:    { color: 'bg-green-100 text-green-700' },
  error:    { color: 'bg-red-100 text-red-700' },
}

const DOC_STATUS = {
  pending:    { color: 'text-gray-400' },
  processing: { color: 'text-yellow-600' },
  chunked:    { color: 'text-green-600' },
  indexed:    { color: 'text-green-700' },
  error:      { color: 'text-red-500' },
}

const DOC_ICONS = {
  pdf: Icons.fileText,
  url: Icons.globe,
  qa:  Icons.bookOpen,
}

function fmt(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status, className = '', t }) {
  const s = STATUS[status] ?? STATUS.empty
  const statusLabels = {
    empty:    'Vacío',
    indexing: t ? t('chatbot.indexing') : 'Indexando…',
    ready:    t ? t('chatbot.ready') : 'Listo',
    error:    t ? t('common.error') : 'Error',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color} ${className}`}>
      {statusLabels[status] ?? status}
    </span>
  )
}

function EmptyKBState({ onCreate, t }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
        <Icons.bot className="w-8 h-8 text-primary-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('chatbot.noKbs')}</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        {t('chatbot.noKbsDesc')}
      </p>
      <button onClick={onCreate} className="btn-primary">
        <Icons.plus className="w-4 h-4 mr-2" /> {t('chatbot.newKb')}
      </button>
    </div>
  )
}

function KBCard({ kb, isActive, onClick, onDelete, t }) {
  const s = STATUS[kb.status] ?? STATUS.empty
  return (
    <div
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? 'border-primary-400 bg-primary-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{kb.name}</p>
          {kb.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{kb.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {kb._count?.documents ?? 0} documento{kb._count?.documents !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={kb.status} t={t} />
          <button
            onClick={e => { e.stopPropagation(); onDelete(kb) }}
            className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
            title={t('common.delete')}
          >
            <Icons.delete className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentRow({ doc, onDelete, onRetry, t }) {
  const [expanded, setExpanded] = useState(false)
  const DocIcon = DOC_ICONS[doc.type] ?? Icons.fileText
  const ds = DOC_STATUS[doc.status] ?? DOC_STATUS.pending

  const docStatusLabels = {
    pending:    'Pendiente',
    processing: t ? t('chatbot.processing') : 'Procesando',
    chunked:    'Indexado',
    indexed:    'Indexado ✓',
    error:      t ? t('common.error') : 'Error',
  }
  const dsLabel = docStatusLabels[doc.status] ?? doc.status

  // Only show expand toggle when there's something to show
  const canExpand = doc.status === 'indexed' && (doc.answer || doc.content)

  // Preview text for URL/PDF: first 2000 chars of extracted content
  const previewText = doc.type !== 'qa' ? (doc.content ?? '').slice(0, 2000) : null
  const previewTruncated = doc.content && doc.content.length > 2000

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* Row header */}
      <div className="flex items-center gap-3 py-3 group">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <DocIcon className="w-4 h-4 text-gray-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
            <span className={`font-medium ${ds.color}`}>{dsLabel}</span>
            {doc.chunkCount > 0 && <span>· {doc.chunkCount} fragmentos</span>}
            {doc.fileSize > 0 && <span>· {fmt(doc.fileSize)}</span>}
            {doc.sourceUrl && (
              <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer"
                 className="hover:text-primary-500 flex items-center gap-0.5"
                 onClick={e => e.stopPropagation()}>
                <Icons.external className="w-3 h-3" /> ver
              </a>
            )}
            {doc.status === 'error' && doc.errorMessage && (
              <span className="text-red-400 truncate max-w-xs" title={doc.errorMessage}>
                {doc.errorMessage.slice(0, 60)}{doc.errorMessage.length > 60 ? '…' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canExpand && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title={expanded ? 'Ocultar contenido' : 'Ver contenido indexado'}            >
              <Icons.chevronDown className={`w-4 h-4 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            {doc.status === 'error' && onRetry && (
              <button
                onClick={() => onRetry(doc)}
                className="p-1.5 rounded hover:bg-yellow-50 hover:text-yellow-600 text-gray-400 transition-colors"
                title={t ? t('chatbot.retry') : 'Reintentar'}
              >
                <Icons.refresh className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDelete(doc)}
              className="p-1.5 rounded hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
              title={t ? t('common.delete') : 'Eliminar documento'}
            >
              <Icons.delete className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && canExpand && (
        <div className="mb-3 ml-11 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden text-xs">
          {doc.type === 'qa' ? (
            <div>
              <div className="px-3 py-2.5 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t ? t('chatbot.faqQuestion') : 'Pregunta'}</p>
                <p className="text-gray-800 leading-relaxed">{doc.title}</p>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t ? t('chatbot.faqAnswer') : 'Respuesta'}</p>
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{doc.answer}</p>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Contenido indexado</p>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">{previewText}</p>
              {previewTruncated && (
                <p className="mt-2 text-gray-400 italic">
                  … contenido truncado ({Math.round(doc.content.length / 1000)}k caracteres totales)
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add-document modal ────────────────────────────────────────────────────────

function AddDocumentModal({ kbId, onClose, onAdded }) {
  const { t } = useI18n()
  const [tab, setTab] = useState('pdf')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const fileRef = useRef(null)
  useModalClose(onClose)

  // PDF state
  const [pdfFile, setPdfFile]   = useState(null)
  const [pdfTitle, setPdfTitle] = useState('')

  // URL state
  const [url, setUrl]       = useState('')
  const [urlTitle, setUrlTitle] = useState('')

  // Q&A state
  const [question, setQuestion] = useState('')
  const [answer, setAnswer]     = useState('')

  async function submit() {
    setError('')
    setLoading(true)
    try {
      let resp

      if (tab === 'pdf') {
        if (!pdfFile) throw new Error('Selecciona un archivo PDF')
        const fd = new FormData()
        fd.append('type', 'pdf')
        fd.append('file', pdfFile)
        if (pdfTitle) fd.append('title', pdfTitle)
        resp = await fetch(`/api/chatbot/knowledge-bases/${kbId}/documents`, {
          method: 'POST', body: fd,
        })
      } else if (tab === 'url') {
        if (!url.trim()) throw new Error('Ingresa una URL válida')
        resp = await fetch(`/api/chatbot/knowledge-bases/${kbId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'url', url: url.trim(), title: urlTitle.trim() || undefined }),
        })
      } else {
        if (!question.trim() || !answer.trim()) throw new Error('Pregunta y respuesta son requeridas')
        resp = await fetch(`/api/chatbot/knowledge-bases/${kbId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'qa', question: question.trim(), answer: answer.trim() }),
        })
      }

      const data = await resp.json().catch(() => null)
      if (!resp.ok) throw new Error(data?.error || `Error del servidor (${resp.status})`)
      onAdded(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const TABS = [
    { id: 'pdf', label: 'PDF',    icon: Icons.fileText },
    { id: 'url', label: 'URL',    icon: Icons.globe },
    { id: 'qa',  label: 'Q&A',   icon: Icons.bookOpen },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">{t('chatbot.addDocument')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Icons.close className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 px-6 pt-4">
          {TABS.map(tab_ => (
            <button
              key={tab_.id}
              onClick={() => { setTab(tab_.id); setError('') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === tab_.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <tab_.icon className="w-3.5 h-3.5" /> {tab_.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3">
          {tab === 'pdf' && (
            <>
              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  pdfFile ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icons.upload className="w-7 h-7 mx-auto text-gray-400 mb-2" />
                {pdfFile ? (
                  <p className="text-sm font-medium text-primary-700">{pdfFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">Arrastra un PDF o haz clic</p>
                    <p className="text-xs text-gray-400 mt-1">Máximo 20 MB</p>                  </>
                )}
                <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                  onChange={e => setPdfFile(e.target.files?.[0] ?? null)} />
              </div>
              <input
                type="text"
                placeholder={t('chatbot.docTitle')}
                value={pdfTitle}
                onChange={e => setPdfTitle(e.target.value)}
                className="input"
              />
            </>
          )}

          {tab === 'url' && (
            <>
              <input
                type="url"
                placeholder={t('chatbot.urlPlaceholder')}
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="input"
              />
              <input
                type="text"
                placeholder={t('chatbot.docTitle')}
                value={urlTitle}
                onChange={e => setUrlTitle(e.target.value)}
                className="input"
              />
              <p className="text-xs text-gray-400">
                El texto de la página será extraído y fragmentado automáticamente.
              </p>
            </>
          )}

          {tab === 'qa' && (
            <>
              <input
                type="text"
                placeholder={t('chatbot.faqQuestion')}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                className="input"
              />
              <textarea
                rows={4}
                placeholder={t('chatbot.faqAnswer')}
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                className="input resize-none"
              />
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="btn-ghost" disabled={loading}>{t('common.cancel')}</button>
          <button onClick={submit} disabled={loading} className="btn-primary">
            {loading ? (
              <><Icons.refresh className="w-4 h-4 mr-2 animate-spin" /> {t('chatbot.processing')}…</>
            ) : (
              <><Icons.plus className="w-4 h-4 mr-2" /> {t('common.add')}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Create-KB modal ───────────────────────────────────────────────────────────

function CreateKBModal({ onClose, onCreate }) {
  const { t } = useI18n()
  const [name, setName]       = useState('')
  const [desc, setDesc]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  useModalClose(onClose)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es requerido'); return }
    setLoading(true); setError('')
    try {
      const resp = await fetch('/api/chatbot/knowledge-bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() || undefined }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Error al crear')
      onCreate(data)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{t('chatbot.newKb')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Icons.close className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-4 space-y-3">
          <input
            type="text"
            placeholder={t('chatbot.kbNamePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
            autoFocus
          />
          <textarea
            rows={3}
            placeholder={t('chatbot.kbDescPlaceholder')}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="input resize-none"
          />
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost" disabled={loading}>{t('common.cancel')}</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? t('chatbot.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ChatbotPage() {
  const { t } = useI18n()
  const { permissions, org, isLoading: authLoading } = useAuth()
  const canAccess = permissions?.canManageSettings // same gate as billing

  const [kbs, setKbs]                     = useState([])
  const [activeKb, setActiveKb]           = useState(null)
  const [documents, setDocuments]         = useState([])
  const [loadingKbs, setLoadingKbs]       = useState(true)
  const [loadingDocs, setLoadingDocs]     = useState(false)
  const [showCreate, setShowCreate]       = useState(false)
  const [showAddDoc, setShowAddDoc]       = useState(false)
  const [planBlocked, setPlanBlocked]     = useState(false)

  // Load knowledge bases
  const fetchKbs = useCallback(async () => {
    setLoadingKbs(true)
    try {
      const r = await fetch('/api/chatbot/knowledge-bases')
      if (r.status === 402) { setPlanBlocked(true); return }
      if (r.ok) setKbs(await r.json())
    } finally {
      setLoadingKbs(false)
    }
  }, [])

  useEffect(() => { if (!authLoading) fetchKbs() }, [authLoading, fetchKbs])

  // Load documents for active KB
  const fetchDocs = useCallback(async (kb) => {
    if (!kb) return
    setLoadingDocs(true)
    try {
      const r = await fetch(`/api/chatbot/knowledge-bases/${kb.id}/documents`)
      if (r.ok) setDocuments(await r.json())
    } finally {
      setLoadingDocs(false)
    }
  }, [])

  useEffect(() => { fetchDocs(activeKb) }, [activeKb, fetchDocs])

  // Poll every 3 s while any document is still processing
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'processing')
    if (!hasProcessing || !activeKb) return
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`/api/chatbot/knowledge-bases/${activeKb.id}/documents`)
        if (r.ok) {
          const updated = await r.json()
          setDocuments(updated)
          // Also refresh KB-level status (e.g. indexing → ready)
          const kr = await fetch(`/api/chatbot/knowledge-bases/${activeKb.id}`)
          if (kr.ok) {
            const kb = await kr.json()
            setKbs(prev => prev.map(k => k.id === kb.id ? kb : k))
            setActiveKb(kb)
          }
        }
      } catch { /* ignore transient errors */ }
    }, 3000)
    return () => clearInterval(timer)
  }, [documents, activeKb])

  function selectKb(kb) {
    setActiveKb(kb)
    setDocuments([])
  }

  async function deleteKb(kb) {
    if (!confirm(t('chatbot.deleteKbConfirm', { name: kb.name }))) return
    await fetch(`/api/chatbot/knowledge-bases/${kb.id}`, { method: 'DELETE' })
    setKbs(prev => prev.filter(k => k.id !== kb.id))
    if (activeKb?.id === kb.id) { setActiveKb(null); setDocuments([]) }
  }

  async function deleteDoc(doc) {
    if (!confirm(t('chatbot.deleteDocConfirm', { name: doc.title }))) return
    await fetch(`/api/chatbot/knowledge-bases/${activeKb.id}/documents/${doc.id}`, { method: 'DELETE' })
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
    // Refresh KB to update counts
    const r = await fetch(`/api/chatbot/knowledge-bases/${activeKb.id}`)
    if (r.ok) {
      const updated = await r.json()
      setKbs(prev => prev.map(k => k.id === updated.id ? updated : k))
      setActiveKb(updated)
    }
  }

  async function retryDoc(doc) {
    // Delete the failed doc and re-open the add modal pre-filled
    await fetch(`/api/chatbot/knowledge-bases/${activeKb.id}/documents/${doc.id}`, { method: 'DELETE' })
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
    setShowAddDoc(true)
  }

  if (authLoading) return null

  // Trial plan has knowledgeBases: 0 — show upgrade wall immediately without
  // waiting for a 402 from the API.
  const isChatbotBlocked = planBlocked || org?.planStatus === 'trialing'

  if (isChatbotBlocked) {
    return <UpgradeWall reason="feature_unavailable" />
  }

  // Mobile: show right panel when a KB is active
  const showDetail = !!activeKb

  return (
    <>
      <Head><title>{t('nav.chatbot')} | CRM</title></Head>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel: KB list ─────────────────────────────────────── */}
        <div className={`${showDetail ? 'hidden sm:flex' : 'flex'} sm:w-80 w-full shrink-0 border-r border-gray-200 bg-gray-50 flex-col`}>
          {/* Header */}
          <div className="px-4 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icons.bot className="w-5 h-5 text-primary-500" />
              <h1 className="text-sm font-semibold text-gray-900">{t('chatbot.kbTitle')}</h1>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="p-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-600 transition-colors"
              title={t('chatbot.newKb')}
            >
              <Icons.plus className="w-4 h-4" />
            </button>
          </div>

          {/* KB list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingKbs ? (
              <div className="py-8 flex justify-center">
                <Icons.refresh className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : kbs.length === 0 ? null : (
              kbs.map(kb => (
                <KBCard
                  key={kb.id}
                  kb={kb}
                  isActive={activeKb?.id === kb.id}
                  onClick={() => selectKb(kb)}
                  onDelete={deleteKb}
                  t={t}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: documents ──────────────────────────────────── */}
        <div className={`${showDetail ? 'flex' : 'hidden sm:flex'} flex-1 flex-col min-w-0 bg-white overflow-hidden`}>
          {!activeKb && !loadingKbs && kbs.length === 0 ? (
            <EmptyKBState onCreate={() => setShowCreate(true)} t={t} />
          ) : !activeKb ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              {t('chatbot.noKbs')}
            </div>
          ) : (
            <>
              {/* Mobile back button */}
              <button
                onClick={() => setActiveKb(null)}
                className="sm:hidden flex items-center gap-2 px-4 py-3 text-sm font-medium text-primary-600 border-b border-gray-200 hover:bg-gray-50 shrink-0"
              >
                <Icons.chevronLeft className="w-4 h-4" />
                {t('chatbot.kbTitle')}
              </button>

              {/* KB header */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{activeKb.name}</h2>
                    <StatusBadge status={activeKb.status} t={t} />
                  </div>
                  {activeKb.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{activeKb.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowAddDoc(true)}
                  className="btn-primary shrink-0"
                >
                  <Icons.plus className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{t('chatbot.addDocument')}</span>
                  <span className="sm:hidden">{t('common.add')}</span>
                </button>
              </div>

              {/* Documents */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                {loadingDocs ? (
                  <div className="py-8 flex justify-center">
                    <Icons.refresh className="w-5 h-5 text-gray-400 animate-spin" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="py-16 text-center">
                    <Icons.database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">{t('chatbot.noDocuments')}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {t('chatbot.noDocsDesc')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-400 mb-3">
                      {documents.length} fuente{documents.length !== 1 ? 's' : ''} ·{' '}
                      {documents.reduce((s, d) => s + (d.chunkCount ?? 0), 0)} fragmentos totales
                    </p>
                    {documents.map(doc => (
                      <DocumentRow key={doc.id} doc={doc} onDelete={deleteDoc} onRetry={retryDoc} t={t} />
                    ))}
                  </div>
                )}
              </div>

              {/* Chat sandbox — show when KB has indexed documents */}
              {activeKb?.status === 'ready' && (
                <ChatPanel kb={activeKb} />
              )}
              {activeKb?.status !== 'ready' && (
                <div className="mx-4 sm:mx-6 mb-4 px-4 py-3 bg-primary-50 border border-primary-100 rounded-xl flex items-center gap-3">
                  <Icons.bot className="w-5 h-5 text-primary-500 shrink-0" />
                  <p className="text-sm text-primary-700">
                    Agrega y procesa documentos para habilitar el chatbot.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateKBModal
          onClose={() => setShowCreate(false)}
          onCreate={kb => {
            setKbs(prev => [kb, ...prev])
            setActiveKb(kb)
            setDocuments([])
            setShowCreate(false)
          }}
        />
      )}

      {showAddDoc && activeKb && (
        <AddDocumentModal
          kbId={activeKb.id}
          onClose={() => setShowAddDoc(false)}
          onAdded={doc => {
            setDocuments(prev => [doc, ...prev])
            setShowAddDoc(false)
            // Refresh KB status + count
            fetch(`/api/chatbot/knowledge-bases/${activeKb.id}`)
              .then(r => r.json())
              .then(updated => {
                setKbs(prev => prev.map(k => k.id === updated.id ? updated : k))
                setActiveKb(updated)
              })
          }}
        />
      )}
    </>
  )
}
