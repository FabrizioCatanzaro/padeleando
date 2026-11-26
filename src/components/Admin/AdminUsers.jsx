import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Crown, ShieldCheck, ChevronLeft, ChevronRight, ArrowLeft, Trash2, AtSign, Venus } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import Loader from '../Loader/Loader'
import PlayerAvatar from '../shared/PlayerAvatar'
import Modal from '../shared/Modal'
import DropdownSelect from '../shared/DropdownSelect'

const PAGE_SIZE = 25
const DURATION_OPTIONS = [
  { value: 7,   label: '7 días' },
  { value: 14,  label: '14 días' },
  { value: 30,  label: '30 días' },
  { value: 90,  label: '90 días' },
  { value: 180, label: '180 días' },
  { value: 365, label: '1 año' },
]
const GENDER_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino',  label: 'Femenino' },
  { value: 'no_decir',  label: 'Prefiere no decirlo' },
]

function fmtDate(s) {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function PlanBadge({ plan, billingPeriod, endsAt }) {
  if (plan === 'premium') {
    const isComp = billingPeriod === 'trial'
    const label  = isComp ? 'TEST' : 'PREMIUM'
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-brand/15 text-brand border border-brand/40 px-1.5 py-0.5 rounded">
        <Crown size={10} /> {label}
        {endsAt && <span className="text-muted">· hasta {fmtDate(endsAt)}</span>}
      </span>
    )
  }
  return <span className="text-[10px] font-mono text-muted">free</span>
}

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [users,    setUsers]    = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [q,        setQ]        = useState('')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [busyId,   setBusyId]   = useState(null)
  const [grantUser,    setGrantUser]    = useState(null)
  const [grantDays,    setGrantDays]    = useState(30)
  const [grantPreapproval, setGrantPreapproval] = useState('')
  const [revokeUser,   setRevokeUser]   = useState(null)
  const [deleteUser,   setDeleteUser]   = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [modalError,   setModalError]   = useState(null)
  const [genderUser,   setGenderUser]   = useState(null)
  const [genderValue,  setGenderValue]  = useState('')
  const [usernameUser, setUsernameUser] = useState(null)
  const [notice,       setNotice]       = useState(null)

  const fetchUsers = useCallback(async (opts) => {
    setLoading(true)
    try {
      const data = await api.admin.users(opts)
      setUsers(data.users)
      setTotal(data.total)
      setError(null)
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }, [])

  // Debounce de búsqueda — al cambiar q, esperar 300ms y resetear a página 1
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      fetchUsers({ q, page: 1, limit: PAGE_SIZE })
    }, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [q, fetchUsers])

  function changePage(next) {
    setPage(next)
    fetchUsers({ q, page: next, limit: PAGE_SIZE })
  }

  function openGrantModal(user) {
    setModalError(null)
    setGrantDays(30)
    setGrantPreapproval('')
    setGrantUser(user)
  }

  function openRevokeModal(user) {
    setModalError(null)
    setRevokeUser(user)
  }

  async function confirmGrantPremium() {
    if (!grantUser) return
    setBusyId(grantUser.id)
    setModalError(null)
    try {
      await api.admin.grantPremium(grantUser.id, grantDays, grantPreapproval.trim() || undefined)
      setGrantUser(null)
      await fetchUsers({ q, page, limit: PAGE_SIZE })
    } catch (e) { setModalError(e.message) }
    finally     { setBusyId(null) }
  }

  async function confirmRevokePremium() {
    if (!revokeUser) return
    setBusyId(revokeUser.id)
    setModalError(null)
    try {
      await api.admin.revokePremium(revokeUser.id)
      setRevokeUser(null)
      await fetchUsers({ q, page, limit: PAGE_SIZE })
    } catch (e) { setModalError(e.message) }
    finally     { setBusyId(null) }
  }

  function openDeleteModal(user) {
    setModalError(null)
    setDeleteConfirm('')
    setDeleteUser(user)
  }

  async function confirmDeleteUser() {
    if (!deleteUser) return
    setBusyId(deleteUser.id)
    setModalError(null)
    try {
      await api.admin.deleteUser(deleteUser.id)
      setDeleteUser(null)
      await fetchUsers({ q, page, limit: PAGE_SIZE })
    } catch (e) { setModalError(e.message) }
    finally     { setBusyId(null) }
  }

  function openGenderModal(user) {
    setModalError(null)
    setGenderValue(user.gender ?? '')
    setGenderUser(user)
  }

  async function confirmGender() {
    setBusyId(genderUser.id)
    setModalError(null)
    try {
      await api.admin.setGender(genderUser.id, genderValue || null)
      setGenderUser(null)
      await fetchUsers({ q, page, limit: PAGE_SIZE })
    } catch (e) { setModalError(e.message) }
    finally     { setBusyId(null) }
  }

  async function confirmUsernameChange() {
    setBusyId(usernameUser.id)
    setModalError(null)
    try {
      await api.admin.allowUsernameChange(usernameUser.id)
      setNotice(`@${usernameUser.username} ya puede cambiar su nombre de usuario.`)
      setUsernameUser(null)
      await fetchUsers({ q, page, limit: PAGE_SIZE })
    } catch (e) { setModalError(e.message) }
    finally     { setBusyId(null) }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      <Link to="/admin"
        className="inline-flex items-center gap-1 text-muted hover:text-white text-xs font-mono mb-3 transition-colors">
        <ArrowLeft size={12} /> Dashboard
      </Link>

      <h1 className="font-condensed font-black text-2xl tracking-widest text-white mb-1">
        USUARIOS <span className="text-brand">/ ADMIN</span>
      </h1>
      <p className="text-muted text-xs font-mono mb-6">{total} {total === 1 ? 'usuario' : 'usuarios'} en total</p>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por email, username o nombre"
          className="w-full bg-surface border border-border focus:border-brand outline-none text-white text-sm font-mono pl-9 pr-3 py-2 rounded transition-colors"
        />
      </div>

      {error && <p className="text-danger text-xs font-mono mb-3">{error}</p>}
      {notice && <p role="status" className="text-green text-xs font-mono mb-3">{notice}</p>}

      {loading ? <Loader /> : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-border-mid/30 text-muted font-condensed text-[11px] tracking-[2px] uppercase">
                <tr>
                  <th className="py-2 px-3">Usuario</th>
                  <th className="py-2 px-3 hidden md:table-cell">Email</th>
                  <th className="py-2 px-3">Plan</th>
                  <th className="py-2 px-3 hidden sm:table-cell text-center">C</th>
                  <th className="py-2 px-3 hidden sm:table-cell text-center">T</th>
                  <th className="py-2 px-3 hidden lg:table-cell">Alta</th>
                  <th className="py-2 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted text-xs font-mono">Sin resultados</td></tr>
                )}
                {users.map(u => {
                  const isPremium = u.plan === 'premium'
                  return (
                    <tr key={u.id} className="border-t border-border hover:bg-border-mid/20">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <PlayerAvatar name={u.name} src={u.avatar_url} size={28} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-white font-semibold truncate">
                              {u.name}
                              {u.role === 'admin' && (
                                <span title="Admin"><ShieldCheck size={12} className="text-brand" /></span>
                              )}
                            </div>
                            <div className="text-muted text-[11px] font-mono truncate">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 hidden md:table-cell text-muted font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[200px]">{u.email}</span>
                          {!u.email_verified_at && (
                            <span className="text-[9px] text-danger border border-danger/40 px-1 rounded">no verif.</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <PlanBadge plan={u.plan} billingPeriod={u.billing_period} endsAt={u.plan_ends_at} />
                      </td>
                      <td className="py-2 px-3 hidden sm:table-cell text-center font-mono text-muted text-xs">{u.groups_count}</td>
                      <td className="py-2 px-3 hidden sm:table-cell text-center font-mono text-muted text-xs">{u.tournaments_count}</td>
                      <td className="py-2 px-3 hidden lg:table-cell text-muted font-mono text-xs">{fmtDate(u.created_at)}</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPremium ? (
                            <button
                              disabled={busyId === u.id}
                              onClick={() => openRevokeModal(u)}
                              className="text-[11px] font-condensed font-bold tracking-widest text-danger hover:bg-danger/10 cursor-pointer px-2 py-1 rounded disabled:opacity-50"
                            >
                              REVOCAR
                            </button>
                          ) : (
                            <button
                              disabled={busyId === u.id}
                              onClick={() => openGrantModal(u)}
                              className="text-[11px] font-condensed font-bold tracking-widest text-brand hover:bg-brand/10 cursor-pointer px-2 py-1 rounded disabled:opacity-50"
                            >
                              DAR PREMIUM
                            </button>
                          )}
                          <button
                            disabled={busyId === u.id}
                            onClick={() => openGenderModal(u)}
                            title="Editar género"
                            aria-label={`Editar género de ${u.name}`}
                            className="text-muted hover:text-white hover:bg-white/5 cursor-pointer p-1.5 rounded disabled:opacity-50 transition-colors"
                          >
                            <Venus size={14} />
                          </button>
                          <button
                            disabled={busyId === u.id}
                            onClick={() => { setModalError(null); setUsernameUser(u) }}
                            title="Habilitar cambio de usuario"
                            aria-label={`Habilitar cambio de usuario a ${u.name}`}
                            className="text-muted hover:text-white hover:bg-white/5 cursor-pointer p-1.5 rounded disabled:opacity-50 transition-colors"
                          >
                            <AtSign size={14} />
                          </button>
                          {u.id !== me?.id && (
                            <button
                              disabled={busyId === u.id}
                              onClick={() => openDeleteModal(u)}
                              title="Borrar cuenta"
                              className="text-muted hover:text-danger hover:bg-danger/10 cursor-pointer p-1.5 rounded disabled:opacity-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs font-mono text-muted">
              <span>Página {page} de {totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => changePage(page - 1)} disabled={page <= 1}
                  className="p-1 hover:text-white disabled:opacity-30">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => changePage(page + 1)} disabled={page >= totalPages}
                  className="p-1 hover:text-white disabled:opacity-30">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {grantUser && (
        <Modal
          title={`Otorgar premium`}
          confirmText={busyId === grantUser.id ? 'Otorgando...' : 'Otorgar'}
          confirmDisabled={busyId === grantUser.id}
          onConfirm={confirmGrantPremium}
          onCancel={() => setGrantUser(null)}
        >
          <p className="mb-4">
            Otorgar <span className="text-brand font-semibold">premium</span> a{' '}
            <span className="text-white font-semibold">{grantUser.name}</span>.
          </p>

          <label className="block text-[11px] tracking-widest text-muted font-mono mb-1.5">
            ID DE SUSCRIPCIÓN DE MP <span className="text-dim">(opcional)</span>
          </label>
          <input
            type="text"
            value={grantPreapproval}
            onChange={e => setGrantPreapproval(e.target.value)}
            placeholder="preapproval_id de Mercado Pago"
            className="w-full bg-base border border-border-strong rounded text-white text-sm font-mono px-3 py-2 outline-none focus:border-brand"
          />
          <p className="text-[11px] text-dim font-mono mt-1.5 mb-4 leading-relaxed">
            Si lo pegás, vinculamos la suscripción real de MP y se <span className="text-secondary">renueva sola</span> cada mes. Lo encontrás en tu panel de MP → Suscripciones → el suscriptor. Si lo dejás vacío, es una cortesía por N días (no se renueva).
          </p>

          {!grantPreapproval.trim() && (
            <>
              <label className="block text-[11px] tracking-widest text-muted font-mono mb-1.5">DURACIÓN</label>
              <select
                value={grantDays}
                onChange={e => setGrantDays(Number(e.target.value))}
                className="w-full bg-base border border-border-strong rounded text-white text-sm font-mono px-3 py-2 outline-none focus:border-brand"
              >
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </>
          )}
          {modalError && <p className="text-danger text-xs font-mono mt-3">{modalError}</p>}
        </Modal>
      )}

      {revokeUser && (
        <Modal
          title="Revocar premium"
          confirmText={busyId === revokeUser.id ? 'Revocando...' : 'Revocar'}
          confirmDisabled={busyId === revokeUser.id}
          confirmDanger
          onConfirm={confirmRevokePremium}
          onCancel={() => setRevokeUser(null)}
        >
          <p>
            Se cancelará el plan premium de{' '}
            <span className="text-white font-semibold">{revokeUser.name}</span> y volverá a free de inmediato.
          </p>
          {modalError && <p className="text-danger text-xs font-mono mt-3">{modalError}</p>}
        </Modal>
      )}

      {genderUser && (
        <Modal
          title="Editar género"
          confirmText={busyId === genderUser.id ? 'Guardando...' : 'Guardar'}
          confirmDisabled={busyId === genderUser.id || (genderUser.gender ?? '') === genderValue}
          onConfirm={confirmGender}
          onCancel={() => setGenderUser(null)}
        >
          <p className="mb-4">
            El usuario no puede cambiarlo después de guardarlo. Corregilo solo si te lo pidió{' '}
            <span className="text-white font-semibold">{genderUser.name}</span> (@{genderUser.username}).
          </p>
          <DropdownSelect
            id="admin-gender"
            label="Género"
            value={genderValue}
            onChange={setGenderValue}
            options={[{ value: '', label: 'Sin cargar' }, ...GENDER_OPTIONS]}
          />
          {modalError && <p className="text-danger text-xs font-mono mt-3">{modalError}</p>}
        </Modal>
      )}

      {usernameUser && (
        <Modal
          title="Habilitar cambio de usuario"
          confirmText={busyId === usernameUser.id ? 'Habilitando...' : 'Habilitar'}
          confirmDisabled={busyId === usernameUser.id}
          onConfirm={confirmUsernameChange}
          onCancel={() => setUsernameUser(null)}
        >
          <p className="mb-2">
            <span className="text-white font-semibold">{usernameUser.name}</span> va a poder cambiar @{usernameUser.username} ahora, sin esperar los 90 días.
          </p>
          <p className="text-[12px] text-muted">El límite vuelve a correr desde ese cambio.</p>
          {modalError && <p className="text-danger text-xs font-mono mt-3">{modalError}</p>}
        </Modal>
      )}

      {deleteUser && (
        <Modal
          title="Borrar cuenta"
          confirmText={busyId === deleteUser.id ? 'Borrando...' : 'Borrar cuenta'}
          confirmDisabled={busyId === deleteUser.id || deleteConfirm.trim().toUpperCase() !== 'BORRAR'}
          confirmDanger
          onConfirm={confirmDeleteUser}
          onCancel={() => setDeleteUser(null)}
        >
          <p className="mb-3">
            Se borrará permanentemente la cuenta de{' '}
            <span className="text-white font-semibold">{deleteUser.name}</span> (@{deleteUser.username}).
            Sus categorías y torneos se conservan bajo una cuenta anónima; sus partidos en categorías ajenas
            quedan sin vincular. Esta acción no se puede deshacer.
          </p>
          <label className="block text-[11px] tracking-widest text-muted font-mono mb-1.5">
            ESCRIBÍ <span className="text-danger">BORRAR</span> PARA CONFIRMAR
          </label>
          <input
            type="text"
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            placeholder="BORRAR"
            className="w-full bg-base border border-border-strong rounded text-white text-sm font-mono px-3 py-2 outline-none focus:border-danger"
          />
          {modalError && <p className="text-danger text-xs font-mono mt-3">{modalError}</p>}
        </Modal>
      )}
    </div>
  )
}
