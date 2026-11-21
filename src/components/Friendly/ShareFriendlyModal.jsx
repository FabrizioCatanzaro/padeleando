import { useEffect, useState } from 'react'
import { Check, Copy, MoreHorizontal, X } from 'lucide-react'
import { Tile, WhatsAppIcon } from '../shared/ShareModal'
import { formatMoney } from '../../utils/money'
import { STYLE_LABEL, endTime, freeCount, longDate } from '../../utils/friendlies'

function capitalize(s) {
  return s.charAt(0) + s.slice(1).toLowerCase()
}

function shareLines(m) {
  const libres = freeCount(m.players)
  const fecha = longDate(m.date).split(' ').map(capitalize).join(' ')
  const lugar = [m.club.name, m.court_label].filter(Boolean).join(' · ')
  const extras = [
    libres > 0 ? `Faltan ${libres} ${libres === 1 ? 'jugador' : 'jugadores'}` : 'Equipos completos',
    m.style ? STYLE_LABEL[m.style] : null,
    m.level ? m.level : null,
  ].filter(Boolean).join(' · ')
  return [
    { icon: '📅', text: `${fecha} · ${m.start_time} a ${endTime(m.start_time, m.duration_minutes)}` },
    { icon: '📍', text: `${lugar}${m.club.location_name ? ` (${m.club.location_name})` : ''}` },
    { icon: '👥', text: extras },
    m.price_per_person != null ? { icon: '💵', text: `${formatMoney(m.price_per_person)} por persona` } : null,
    { icon: '🎾', text: m.sets_format === 3 ? 'Al mejor de 3 sets' : 'A un set' },
  ].filter(Boolean)
}

export default function ShareFriendlyModal({ m, url, guest = null, onClose }) {
  const [copied, setCopied] = useState(false)
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share
  const title = guest
    ? `${guest.split(' ')[0]}, te anoté en un amistoso de pádel`
    : freeCount(m.players) > 0 ? '¡Sumate a un amistoso de pádel!' : 'Amistoso de pádel'
  const lines = guest
    ? [...shareLines(m).filter((l) => l.icon !== '👥'), { icon: '✅', text: 'Abrí el link y vinculá el lugar a tu cuenta: el partido suma a tu perfil' }]
    : shareLines(m)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const body = lines.map((l) => `${l.icon} ${l.text}`).join('\n')
  const waText = `*${title}*\n\n${body}\n\n🔗 ${url}`
  const plainText = `${title}\n\n${body}\n\n🔗 ${url}`

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank', 'noopener')

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* el navegador no dio permiso */ }
  }

  const moreOptions = async () => {
    if (!canNativeShare) { copyLink(); return }
    try { await navigator.share({ title, text: plainText }) } catch { /* el usuario canceló */ }
  }

  return (
    <div className="fixed inset-0 z-1000 bg-black/75 flex items-end sm:items-center justify-center sm:p-5" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={guest ? `Invitar a ${guest}` : 'Compartir amistoso'} onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up bg-surface border border-border-strong w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="relative flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-mid">
          <div className="sm:hidden absolute left-1/2 -translate-x-1/2 top-2 w-9 h-1 rounded-full bg-border-strong" />
          <span className="font-condensed font-bold text-xl text-white truncate">{guest ? `Invitar a ${guest}` : 'Compartir amistoso'}</span>
          <button onClick={onClose} aria-label="Cerrar"
            className="bg-transparent border-0 text-muted hover:text-white cursor-pointer p-1 transition-colors"><X size={20} /></button>
        </div>
        <div className="flex items-start gap-2 px-5 pt-5 pb-4">
          <Tile onClick={shareWhatsApp} accent icon={<WhatsAppIcon size={24} />} label="WhatsApp" />
          <Tile onClick={copyLink} icon={copied ? <Check size={22} /> : <Copy size={22} />} label={copied ? 'Copiado' : 'Copiar link'} />
          <Tile onClick={moreOptions} icon={<MoreHorizontal size={22} />} label="Más opciones" />
        </div>
        <div className="px-5 pb-5">
          <div className="text-[10px] font-mono tracking-widest text-muted mb-2">VISTA PREVIA</div>
          <div className="bg-surface-alt border border-border-mid rounded-xl px-4 py-3 flex flex-col gap-1">
            <p className="m-0 mb-1 text-[13px] text-white font-semibold font-sans">{title}</p>
            {lines.map((l) => (
              <p key={l.icon} className="m-0 text-[13px] text-content leading-relaxed font-sans"><span aria-hidden="true">{l.icon}</span> {l.text}</p>
            ))}
            <p className="m-0 mt-2 text-[12px] text-brand font-mono break-all">🔗 {url}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
