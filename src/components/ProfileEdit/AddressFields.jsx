import { useEffect, useId, useMemo, useState } from 'react'
import { fetchProvincias, fetchLocalidades } from '../../utils/georef'
import { COUNTRY_OPTIONS } from '../../utils/countries'
import { INPUT, Row, Select } from './fields'

// Domicilio: en Argentina, provincia y localidad salen de Georef; en otro país se escriben.
export default function AddressFields({ value, onChange }) {
  const uid = useId()
  const isAR = value.country === 'AR'
  const [provincias, setProvincias] = useState([])
  const [localidades, setLocalidades] = useState([])
  const [georefDown, setGeorefDown] = useState(false)

  useEffect(() => {
    if (!isAR) return
    let alive = true
    fetchProvincias()
      .then((list) => { if (alive) setProvincias(list) })
      .catch(() => { if (alive) setGeorefDown(true) })
    return () => { alive = false }
  }, [isAR])

  const provinciaId = useMemo(
    () => provincias.find((p) => p.nombre === value.province)?.id ?? null,
    [provincias, value.province],
  )

  useEffect(() => {
    if (!isAR || !provinciaId) return
    let alive = true
    fetchLocalidades(provinciaId)
      .then((list) => { if (alive) setLocalidades(list) })
      .catch(() => { if (alive) setGeorefDown(true) })
    return () => { alive = false }
  }, [isAR, provinciaId])

  const set = (k) => (e) => onChange({ [k]: e.target.value })
  const useList = isAR && !georefDown
  const provinceKnown = !value.province || provincias.some((p) => p.nombre === value.province)

  return (
    <>
      <Row htmlFor={`${uid}-pais`} label="País">
        <Select id={`${uid}-pais`} value={value.country}
          onChange={(e) => onChange({ country: e.target.value, province: '', locality: '' })}>
          <option value="">Elegí un país</option>
          {COUNTRY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
      </Row>

      <Row htmlFor={`${uid}-prov`} label="Provincia y localidad"
        hint={georefDown && isAR ? 'No pudimos cargar la lista de localidades. Escribilas a mano.' : null}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {useList && provincias.length > 0 ? (
            <Select id={`${uid}-prov`} value={value.province}
              onChange={(e) => onChange({ province: e.target.value, locality: '' })}>
              <option value="">Provincia</option>
              {!provinceKnown && <option value={value.province}>{value.province}</option>}
              {provincias.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
            </Select>
          ) : (
            <input id={`${uid}-prov`} className={INPUT} value={value.province} maxLength={80}
              placeholder="Provincia o estado" autoComplete="address-level1" onChange={set('province')} />
          )}
          <input aria-label="Localidad" className={INPUT} value={value.locality} maxLength={80}
            placeholder={useList && !value.province ? 'Elegí la provincia' : 'Localidad'}
            disabled={useList && provincias.length > 0 && !value.province}
            list={useList ? `${uid}-locs` : undefined} autoComplete="address-level2" onChange={set('locality')} />
          {useList && (
            <datalist id={`${uid}-locs`}>
              {localidades.map((l) => <option key={l} value={l} />)}
            </datalist>
          )}
        </div>
      </Row>

      <Row htmlFor={`${uid}-calle`} label="Dirección" last>
        <div className="grid gap-2.5 grid-cols-[minmax(0,1fr)_88px] sm:grid-cols-[minmax(0,1fr)_96px_110px]">
          <input id={`${uid}-calle`} className={`${INPUT} col-span-2 sm:col-span-1`} value={value.street} maxLength={100}
            placeholder="Calle" autoComplete="address-line1" onChange={set('street')} />
          <input aria-label="Número" className={INPUT} value={value.street_number} maxLength={10}
            placeholder="Número" inputMode="numeric" onChange={set('street_number')} />
          <input aria-label="Código postal" className={INPUT} value={value.postal_code} maxLength={10}
            placeholder="CP" autoComplete="postal-code" onChange={(e) => onChange({ postal_code: e.target.value.toUpperCase() })} />
        </div>
      </Row>
    </>
  )
}
