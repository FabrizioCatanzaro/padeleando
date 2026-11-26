import { useEffect, useId, useMemo, useState } from 'react'
import { fetchProvincias, fetchLocalidades } from '../../utils/georef'
import { COUNTRY_OPTIONS } from '../../utils/countries'
import CountryFlag from '../shared/CountryFlag'
import { INPUT, Row, Select } from './fields'

const COUNTRY_SELECT = COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c.name }))

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
  const useList = isAR && !georefDown && provincias.length > 0
  const withCurrent = (opts, current) => (current && !opts.some((o) => o.value === current) ? [{ value: current, label: current }, ...opts] : opts)
  const provinceOptions = withCurrent(provincias.map((p) => ({ value: p.nombre, label: p.nombre })), value.province)
  const localityOptions = withCurrent(localidades.map((l) => ({ value: l, label: l })), value.locality)

  return (
    <>
      <Row htmlFor={`${uid}-pais`} label="País">
        <Select id={`${uid}-pais`} label="País" value={value.country} searchable placeholder="Elegí un país"
          options={COUNTRY_SELECT} renderIcon={(o) => <CountryFlag code={o.value} width={20} />}
          onChange={(v) => onChange({ country: v, province: '', locality: '' })} />
      </Row>

      <Row htmlFor={`${uid}-prov`} label="Provincia"
        hint={georefDown && isAR ? 'No pudimos cargar la lista. Escribila a mano.' : null}>
        {useList ? (
          <Select id={`${uid}-prov`} label="Provincia" value={value.province} searchable placeholder="Elegí la provincia"
            options={provinceOptions} onChange={(v) => onChange({ province: v, locality: '' })} />
        ) : (
          <input id={`${uid}-prov`} className={INPUT} value={value.province} maxLength={80}
            placeholder="Provincia o estado" autoComplete="address-level1" onChange={set('province')} />
        )}
      </Row>

      <Row htmlFor={`${uid}-loc`} label="Localidad">
        {useList ? (
          <Select id={`${uid}-loc`} label="Localidad" value={value.locality} searchable disabled={!value.province}
            placeholder={value.province ? 'Elegí la localidad' : 'Primero elegí la provincia'}
            options={localityOptions} onChange={(v) => onChange({ locality: v })} />
        ) : (
          <input id={`${uid}-loc`} className={INPUT} value={value.locality} maxLength={80}
            placeholder="Localidad" autoComplete="address-level2" onChange={set('locality')} />
        )}
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
