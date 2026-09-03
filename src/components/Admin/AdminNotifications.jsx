import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Send, Megaphone, Bold, Italic, Link2, X, User, Check } from 'lucide-react'
import { api } from '../../utils/api'
import { renderRichText } from '../../utils/richText'
import Loader from '../Loader/Loader'

const TARGET_LABELS = { all: 'Todos los usuarios', free: 'Solo free', premium: 'Solo premium', user: 'Usuarios específicos' }
const CHANNEL_LABELS = { app: 'Solo en app', app_email: 'App + Email' }

function formatDate(str) {
  return new Date(str).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminNotifications() {
  const [form, setForm]         = useState({ title: '', body: '', target: 'all', channel: 'app' })
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [sending, setSending]   = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [sendError, setSendError]   = useState(null)
  const bodyRef = useRef(null)

  const [history, setHistory]       = useState([])
  const [histTotal, setHistTotal]   = useState(0)
  const [histPage, setHistPage]     = useState(1)
  const [histLoading, setHistLoading] = useState(true)

  const loadHistory = useCallback(async (page = 1) => {
    setHistLoading(true)
    try {
      const data = await api.admin.broadcasts({ page, limit: 20 })
      setHistory(data.broadcasts)
      setHistTotal(data.total)
      setHistPage(page)
    } finally {
      setHistLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory(1) }, [loadHistory])

  // Buscar usuario cuando target === 'user'
  useEffect(() => {
    if (form.target !== 'user' || userSearch.trim().length < 2) {
      setUserResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const data = await api.admin.users({ q: userSearch, limit: 10 })
        setUserResults(data.users ?? [])
      } catch { setUserResults([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [userSearch, form.target])

  function addUser(u) {
    setSelectedUsers(prev => (prev.some(x => x.id === u.id) ? prev : [...prev, u]))
    setUserSearch('')
    setUserResults([])
  }

  function removeUser(id) {
    setSelectedUsers(prev => prev.filter(u => u.id !== id))
  }

  // Envuelve la selección del textarea con marcadores Markdown (negrita/itálica).
  function wrapSelection(before, after = before, placeholder = 'texto') {
    const ta = bodyRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e } = ta
    const val = form.body
    const sel = val.slice(s, e) || placeholder
    const next = val.slice(0, s) + before + sel + after + val.slice(e)
    setForm(f => ({ ...f, body: next }))
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(s + before.length, s + before.length + sel.length)
    })
  }

  // Inserta texto tal cual en la posición del cursor (p. ej. el placeholder {nombre}).
  function insertText(text) {
    const ta = bodyRef.current
    if (!ta) {
      setForm(f => ({ ...f, body: f.body + text }))
      return
    }
    const { selectionStart: s, selectionEnd: e } = ta
    const val = form.body
    const next = val.slice(0, s) + text + val.slice(e)
    setForm(f => ({ ...f, body: next }))
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(s + text.length, s + text.length)
    })
  }

  // Inserta la plantilla de un link y deja seleccionado el placeholder "url".
  function insertLink() {
    const ta = bodyRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e } = ta
    const val = form.body
    const label = val.slice(s, e) || 'texto'
    const snippet = `[${label}](url)`
    const next = val.slice(0, s) + snippet + val.slice(e)
    setForm(f => ({ ...f, body: next }))
    const urlStart = s + 1 + label.length + 2 // tras `[label](`
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(urlStart, urlStart + 3) // selecciona "url"
    })
  }

  async function handleSend(e) {
    e.preventDefault()
    setSendError(null)
    setSendResult(null)
    if (!form.title.trim() || !form.body.trim()) {
      setSendError('Completá título y cuerpo.')
      return
    }
    if (form.target === 'user' && selectedUsers.length === 0) {
      setSendError('Seleccioná al menos un usuario.')
      return
    }
    setSending(true)
    try {
      const res = await api.admin.broadcast({
        title:           form.title.trim(),
        body:            form.body.trim(),
        target:          form.target,
        target_user_ids: form.target === 'user' ? selectedUsers.map(u => u.id) : undefined,
        channel:         form.channel,
      })
      setSendResult(res.recipients)
      setForm({ title: '', body: '', target: 'all', channel: 'app' })
      setUserSearch('')
      setSelectedUsers([])
      loadHistory(1)
    } catch (err) {
      setSendError(err.message ?? 'Error al enviar')
    } finally {
      setSending(false)
    }
  }

  // Nombre de muestra para el preview: el del primer destinatario elegido, o genérico.
  const sampleName = (form.target === 'user' && selectedUsers[0]?.name) || 'Nombre'
  const previewBody = form.body.replace(/\{nombre\}/gi, sampleName)

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="text-muted hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-condensed font-black text-2xl tracking-widest text-white">
            <span className="text-brand">NOTIFICACIONES</span> ADMIN
          </h1>
          <p className="text-muted text-xs font-mono">Enviá mensajes a usuarios de la plataforma</p>
        </div>
      </div>

      {/* Formulario de envío */}
      <form onSubmit={handleSend} className="bg-surface border border-border rounded-lg p-5 mb-8 flex flex-col gap-4">
        <div className="font-condensed font-bold text-[12px] tracking-[3px] text-muted flex items-center gap-2">
          <Megaphone size={13} /> NUEVO MENSAJE
        </div>

        {/* Destino */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-muted">Destinatarios</label>
            <select
              value={form.target}
              onChange={e => {
                setForm(f => ({ ...f, target: e.target.value }))
                setSelectedUsers([])
                setUserSearch('')
              }}
              className="bg-base border border-border-strong text-white text-[12px] font-mono rounded px-3 py-2 cursor-pointer"
            >
              {Object.entries(TARGET_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-muted">Canal</label>
            <select
              value={form.channel}
              onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
              className="bg-base border border-border-strong text-white text-[12px] font-mono rounded px-3 py-2 cursor-pointer"
            >
              {Object.entries(CHANNEL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Búsqueda de usuarios específicos (multi-select) */}
        {form.target === 'user' && (
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[11px] font-mono text-muted">Buscar usuarios</label>
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Nombre, email o username…"
              className="bg-base border border-border-strong text-white text-[13px] font-mono rounded px-3 py-2 placeholder:text-dim outline-none focus:border-brand transition-colors"
            />
            {userResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 bg-surface border border-border-strong rounded-b shadow-lg">
                {userResults.map(u => {
                  const already = selectedUsers.some(x => x.id === u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      disabled={already}
                      onClick={() => addUser(u)}
                      className="w-full text-left px-3 py-2 text-[12px] font-mono text-white hover:bg-base transition-colors border-b border-border last:border-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {u.name}
                      {u.username && <span className="text-muted ml-1">@{u.username}</span>}
                      <span className="text-dim ml-1">— {u.email}</span>
                      {already && <Check size={12} strokeWidth={3} className="inline text-brand ml-1 align-[-1px]" />}
                    </button>
                  )
                })}
              </div>
            )}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selectedUsers.map(u => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 bg-base border border-border-strong rounded-full pl-2.5 pr-1 py-0.5 text-[11px] font-mono text-white"
                  >
                    {u.name}{u.username && <span className="text-muted">@{u.username}</span>}
                    <button
                      type="button"
                      onClick={() => removeUser(u.id)}
                      className="text-muted hover:text-danger transition-colors cursor-pointer"
                      aria-label={`Quitar ${u.name}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <span className="text-[11px] font-mono text-dim self-center">
                  {selectedUsers.length} seleccionado{selectedUsers.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Título */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-mono text-muted">Título</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            maxLength={120}
            placeholder="Asunto del mensaje…"
            className="bg-base border border-border-strong text-white text-[13px] font-mono rounded px-3 py-2 placeholder:text-dim outline-none focus:border-brand transition-colors"
          />
        </div>

        {/* Cuerpo con toolbar de formato */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono text-muted">Mensaje</label>
            <div className="flex items-center gap-1">
              <ToolbarButton label="Negrita" onClick={() => wrapSelection('**')}>
                <Bold size={13} />
              </ToolbarButton>
              <ToolbarButton label="Itálica" onClick={() => wrapSelection('*')}>
                <Italic size={13} />
              </ToolbarButton>
              <ToolbarButton label="Insertar link" onClick={insertLink}>
                <Link2 size={13} />
              </ToolbarButton>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => insertText('{nombre}')}
                title="Insertar el nombre del destinatario"
                className="inline-flex items-center gap-1 text-muted hover:text-white hover:bg-base transition-colors rounded px-2 py-1.5 cursor-pointer border border-transparent hover:border-border-strong text-[10px] font-mono"
              >
                <User size={12} /> Nombre
              </button>
            </div>
          </div>
          <textarea
            ref={bodyRef}
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={4}
            placeholder="Contenido del mensaje…"
            className="bg-base border border-border-strong text-white text-[13px] font-mono rounded px-3 py-2 placeholder:text-dim outline-none focus:border-brand transition-colors resize-y"
          />
          <p className="text-[10px] font-mono text-dim">
            Formato: <span className="text-secondary">**negrita**</span>,{' '}
            <span className="text-secondary">*itálica*</span>,{' '}
            <span className="text-secondary">[texto](https://…)</span>.{' '}
            <span className="text-secondary">{'{nombre}'}</span> se reemplaza por el nombre de cada destinatario.
          </p>
        </div>

        {/* Preview en vivo */}
        {form.body.trim() && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-muted">Vista previa</label>
            <div className="bg-base border border-border rounded p-3">
              {form.title.trim() && (
                <div className="text-[13px] font-semibold text-white mb-1">{form.title}</div>
              )}
              <div className="text-[12px] text-secondary whitespace-pre-wrap">
                {renderRichText(previewBody)}
              </div>
            </div>
          </div>
        )}

        {sendError && <div className="text-danger text-[12px] font-mono">{sendError}</div>}
        {sendResult !== null && (
          <div className="text-brand text-[12px] font-mono">
            Enviado correctamente a {sendResult} usuario{sendResult !== 1 ? 's' : ''}.
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="self-start inline-flex items-center gap-2 bg-brand text-base font-condensed font-bold tracking-widest text-sm px-5 py-2.5 rounded hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
        >
          <Send size={13} />
          {sending ? 'Enviando…' : 'ENVIAR'}
        </button>
      </form>

      {/* Historial */}
      <div>
        <div className="font-condensed font-bold text-[12px] tracking-[3px] text-muted mb-3">
          HISTORIAL DE ENVÍOS
          {histTotal > 0 && <span className="text-dim ml-2 font-mono normal-case tracking-normal">({histTotal})</span>}
        </div>

        {histLoading ? (
          <Loader />
        ) : history.length === 0 ? (
          <div className="text-dim text-sm font-mono text-center py-10">Todavía no se enviaron mensajes.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map(b => (
              <BroadcastRow key={b.id} b={b} />
            ))}
          </div>
        )}

        {histTotal > histPage * 20 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => loadHistory(histPage + 1)}
              className="text-[12px] font-mono text-muted hover:text-white transition-colors bg-transparent border border-border-strong px-4 py-2 rounded cursor-pointer"
            >
              Cargar más
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ToolbarButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()} // no perder la selección del textarea
      onClick={onClick}
      title={label}
      aria-label={label}
      className="text-muted hover:text-white hover:bg-base transition-colors rounded p-1.5 cursor-pointer border border-transparent hover:border-border-strong"
    >
      {children}
    </button>
  )
}

function BroadcastRow({ b }) {
  const [expanded, setExpanded] = useState(false)
  const targetLabel = TARGET_LABELS[b.target] ?? b.target
  const targetDetail =
    b.target === 'user'
      ? b.target_user_name
        ? ` — ${b.target_user_name}`
        : ` — ${b.recipients} usuario${b.recipients !== 1 ? 's' : ''}`
      : ''
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-[13px] truncate">{b.title}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <span className="text-[11px] font-mono text-muted">{formatDate(b.created_at)}</span>
            <span className="text-[11px] font-mono text-brand">{targetLabel}{targetDetail}</span>
            <span className="text-[11px] font-mono text-muted">{CHANNEL_LABELS[b.channel] ?? b.channel}</span>
            <span className="text-[11px] font-mono text-dim">{b.recipients} destinatario{b.recipients !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(x => !x)}
          className="text-[11px] font-mono text-muted hover:text-white transition-colors cursor-pointer shrink-0 bg-transparent border-none"
        >
          {expanded ? 'Ocultar' : 'Ver'}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border text-[12px] text-secondary whitespace-pre-wrap">
          {renderRichText(b.body)}
        </div>
      )}
    </div>
  )
}
