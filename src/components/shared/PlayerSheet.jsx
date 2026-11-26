import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { api } from '../../utils/api'
import { countryName } from '../../utils/countries'
import { whatsappHref } from '../../utils/copa'
import { Sheet } from '../Friendly/parts'
import PlayerAvatar from './PlayerAvatar'
import CountryFlag from './CountryFlag'

const GENDER = { masculino: 'Masculino', femenino: 'Femenino', no_decir: 'Prefiere no decirlo' }
const DOC = { dni: 'DNI', pasaporte: 'Pasaporte', otro: 'Documento' }
const HAND = { diestro: 'Derecha', zurdo: 'Izquierda', ambidiestro: 'Ambidiestro' }
const SIDE = { drive: 'Drive', reves: 'Revés', cualquiera: 'Cualquiera' }

function Field({ label, children }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-2.5 border-b border-border text-[13.5px] last:border-b-0">
      <dt className="text-secondary">{label}</dt>
      <dd className="m-0 min-w-0 text-white break-words">{children || <span className="text-muted">Sin cargar</span>}</dd>
    </div>
  )
}

function fmtBirth(iso, age) {
  if (!iso) return null
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}${age != null ? ` · ${age} años` : ''}`
}

function address(f) {
  const street = [f.street, f.street_number].filter(Boolean).join(' ')
  const place = [f.locality, f.province].filter(Boolean).join(', ')
  const parts = [street, place, f.postal_code && `CP ${f.postal_code}`, f.country && f.country !== 'AR' && countryName(f.country)].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

// Ficha del jugador para quien organiza la categoría: los datos que el jugador cargó en su perfil.
export default function PlayerSheet({ groupId, userId, onClose }) {
  const [ficha, setFicha] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    api.groups.ficha(groupId, userId)
      .then((f) => { if (alive) setFicha(f) })
      .catch((e) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [groupId, userId])

  return (
    <Sheet title="Ficha del jugador" subtitle="Datos que el jugador cargó en su perfil. Solo los ven quienes organizan esta categoría." onClose={onClose}>
      {error && <p role="alert" className="m-0 text-sm text-danger">{error}</p>}
      {!ficha && !error && <div className="h-64 rounded-lg bg-surface-alt animate-pulse" />}
      {ficha && (
        <>
          <div className="flex items-center gap-3">
            <PlayerAvatar name={ficha.name} src={ficha.avatar_url} size={48} />
            <div className="min-w-0">
              <div className="font-condensed font-bold text-[16px] text-white truncate">{ficha.name}</div>
              <Link to={`/u/${ficha.username}`} onClick={onClose} className="text-[13px] text-secondary hover:text-brand">@{ficha.username}</Link>
            </div>
          </div>

          <dl className="m-0">
            <Field label="Documento">{ficha.doc_number && `${DOC[ficha.doc_type] ?? 'Documento'} ${ficha.doc_number}`}</Field>
            <Field label="Nacimiento">{fmtBirth(ficha.birth_date, ficha.age)}</Field>
            <Field label="Género">{GENDER[ficha.gender]}</Field>
            <Field label="Nacionalidad">
              {ficha.nationality && <span className="inline-flex items-center gap-2"><CountryFlag code={ficha.nationality} width={18} />{countryName(ficha.nationality)}</span>}
            </Field>
            <Field label="Categoría">{[ficha.category, HAND[ficha.hand] && `mano ${HAND[ficha.hand].toLowerCase()}`, SIDE[ficha.side] && `juega de ${SIDE[ficha.side].toLowerCase()}`].filter(Boolean).join(' · ')}</Field>
            <Field label="WhatsApp">
              {ficha.whatsapp && <a href={whatsappHref(ficha.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-green no-underline hover:underline">{ficha.whatsapp}</a>}
            </Field>
            <Field label="Domicilio">{address(ficha)}</Field>
          </dl>

          <div>
            <h3 className="m-0 mb-2 font-condensed font-bold text-[12px] tracking-[0.16em] text-muted">CONTACTOS DE EMERGENCIA</h3>
            {ficha.emergency_contacts?.length ? (
              <ul className="m-0 p-0 list-none flex flex-col gap-2">
                {ficha.emergency_contacts.map((c) => (
                  <li key={`${c.name}-${c.phone}`} className="flex items-center justify-between gap-3 rounded-lg border border-border-mid bg-surface-alt px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-[14px] text-white truncate">{c.name}</div>
                      <div className="text-[12px] text-secondary">{c.relation}</div>
                    </div>
                    <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-border-strong text-[13px] text-content no-underline hover:text-white">
                      <Phone size={14} aria-hidden="true" />{c.phone}
                    </a>
                  </li>
                ))}
              </ul>
            ) : <p className="m-0 text-[13px] text-muted">No cargó contactos de emergencia.</p>}
          </div>
        </>
      )}
    </Sheet>
  )
}
