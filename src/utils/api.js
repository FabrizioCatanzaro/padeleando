import { clearUser } from './auth'

const BASE = import.meta.env.VITE_API_URL ?? ''

async function handleAuth401(method, path, retry, replay) {
  if (!(retry && path !== '/auth/refresh' && path !== '/auth/login')) return null
  const refreshed = await fetch(`${BASE}/api/auth/refresh`, {
    method: 'POST', credentials: 'include',
  })
  if (refreshed.ok) return replay()
  clearUser()
  // En el chequeo de inicio (/auth/me) limpiar sin redirigir
  if (path !== '/auth/me') {
    const p = window.location.pathname
    if (p !== '/login' && p !== '/register' && !p.startsWith('/reset-password/')) {
      window.location.href = '/login?expired=1'
    }
  }
  throw new Error('Sesión expirada')
}

async function req(method, path, body, retry = true) {
  const hasBody = body !== undefined
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    // Sólo se declara el tipo cuando hay cuerpo que describir. Mandarlo
    // siempre sacaba a los GET de la lista segura de CORS y les anteponía un
    // OPTIONS: 360 ms medidos antes de cada lectura, con la caché de preflight
    // en los 5 s que asume el navegador por defecto.
    headers:     hasBody ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    body: hasBody ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    const replayed = await handleAuth401(method, path, retry, () => req(method, path, body, false))
    if (replayed !== null) return replayed
  }

  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error ?? 'Error desconocido')
    err.data   = data
    err.status = res.status
    throw err
  }
  return data
}

async function reqMultipart(method, path, formData, retry = true) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    credentials: 'include',
    body: formData,
  })

  if (res.status === 401) {
    const replayed = await handleAuth401(method, path, retry, () => reqMultipart(method, path, formData, false))
    if (replayed !== null) return replayed
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Error desconocido')
  return data
}

function imageForm(file, extraFields = {}) {
  const fd = new FormData()
  fd.append('image', file)
  for (const [k, v] of Object.entries(extraFields)) {
    if (v !== undefined && v !== null && v !== '') fd.append(k, v)
  }
  return fd
}

export const api = {
  auth: {
    register:       (body) => req('POST', '/auth/register', body),
    login:          (body) => req('POST', '/auth/login',    body),
    google:         (cred) => req('POST', '/auth/google',   { credential: cred }),
    me:             ()     => req('GET',  '/auth/me'),
    logout:         ()     => req('POST', '/auth/logout'),
    search:         (q)    => req('GET',  `/auth/search?q=${encodeURIComponent(q)}`),
    forgotPassword: (email)       => req('POST',  '/auth/forgot-password',  { email }),
    resetPassword:  (token, pass) => req('POST',  '/auth/reset-password',   { token, password: pass }),
    verifyEmail:        (token) => req('POST', '/auth/verify-email',        { token }),
    resendVerification: (email) => req('POST', '/auth/resend-verification', { email }),
    suggestUsername:    (name)     => req('GET', `/auth/suggest-username?name=${encodeURIComponent(name)}`),
    checkUsername:      (username) => req('GET', `/auth/username-available?username=${encodeURIComponent(username)}`),
    updateMe:       (body)        => req('PATCH', '/auth/me', body),
    uploadAvatar:   (file)        => reqMultipart('POST',   '/auth/me/avatar', imageForm(file)),
    deleteAvatar:   ()            => req('DELETE', '/auth/me/avatar'),
    deleteMe:       (password)    => req('DELETE', '/auth/me', password ? { password } : {}),
  },
  // Portada del visitante: actividad, próximas jornadas, inscripciones y totales en una sola petición.
  home: {
    get: () => req('GET', '/home'),
  },
  groups: {
    list:          ()         => req('GET',    '/groups'),
    search:        (q)        => req('GET',    `/groups/search?q=${encodeURIComponent(q)}`),
    nearby:        (lat, lon, radius = 20) => req('GET', `/groups/nearby?lat=${lat}&lon=${lon}&radius=${radius}`),
    participating: ()         => req('GET',    '/groups/participating'),
    collaborating: ()         => req('GET',    '/groups/collaborating'),
    get:           (id)       => req('GET',    `/groups/${id}`),
    // Metadata mínima (nombre, emojis, permisos): una sola consulta en el
    // backend, frente a las ~10 de groups.get. Para vistas que sólo necesitan
    // encabezar con el nombre de la categoría.
    meta:          (id)       => req('GET',    `/groups/${id}/meta`),
    history:       (id)       => req('GET',    `/groups/${id}/history`),
    create:        (body)     => req('POST',   '/groups', body),
    update:        (id, b)    => req('PUT',    `/groups/${id}`, b),
    delete:        (id)       => req('DELETE', `/groups/${id}`),
    byUsername:    (username) => req('GET',    `/groups/user/${username}`),
    favorites:     ()         => req('GET',    '/groups/favorites'),
    favorite:      (id)       => req('POST',   `/groups/${id}/favorite`),
    unfavorite:    (id)       => req('DELETE', `/groups/${id}/favorite`),
  },
  clubs: {
    list:        (q = '')      => req('GET',    `/clubs?q=${encodeURIComponent(q)}`),
    nearby:      (lat, lon, radius = 20) => req('GET', `/clubs/nearby?lat=${lat}&lon=${lon}&radius=${radius}`),
    get:         (id)          => req('GET',    `/clubs/${id}`),
    events:      (id)          => req('GET',    `/clubs/${id}/events`),
    create:      (body)        => req('POST',   '/clubs', body),
    update:      (id, body)    => req('PUT',    `/clubs/${id}`, body),
    delete:      (id)          => req('DELETE', `/clubs/${id}`),
    uploadPhoto: (id, file)    => reqMultipart('POST', `/clubs/${id}/photo`, imageForm(file)),
    deletePhoto: (id)          => req('DELETE', `/clubs/${id}/photo`),
    requests: {
      create:  (body)          => req('POST',  '/clubs/requests', body),
      list:    (status = 'pending') => req('GET', `/clubs/requests?status=${status}`),
      respond: (id, action, override) => req('PATCH', `/clubs/requests/${id}`, { action, ...(override ?? {}) }),
    },
  },
  players: {
    search:               (q, groupId, mine) => req('GET', `/players?q=${encodeURIComponent(q)}${groupId ? `&groupId=${groupId}` : ''}${mine ? '&mine=true' : ''}`),
    byGroup:              (groupId) => req('GET', `/players/group/${groupId}`),
    resolve:              (name, groupId, tournamentId) => req('POST', '/players/resolve', { name, groupId, tournamentId }),
    rename:               (id, name, groupId) => req('PATCH',  `/players/${id}`, { name, groupId }),
    removeFromTournament: (pId, tId)      => req('DELETE', `/players/${pId}/tournament/${tId}`),
    removeFromGroup:      (pId, gId)      => req('DELETE', `/players/${pId}/group/${gId}`),
    unlink:               (pId, gId)      => req('DELETE', `/players/${pId}/group/${gId}/link`),
  },
  tournaments: {
    get:         (id)   => req('GET',    `/tournaments/${id}`),
    search:      (q)    => req('GET',    `/tournaments/search?q=${encodeURIComponent(q)}`),
    create:      (body) => req('POST',   '/tournaments', body),
    update:      (id,b) => req('PATCH',  `/tournaments/${id}`, b),
    delete:      (id)   => req('DELETE', `/tournaments/${id}`),
    resetScores: (id)   => req('DELETE', `/tournaments/${id}/matches`),
    setLive:      (id,d)       => req('PATCH',  `/tournaments/${id}/live`, { live_match: d }),
    schedule:     (id)         => req('POST',   `/tournaments/${id}/schedule`),
    bracket:      (id)         => req('POST',   `/tournaments/${id}/bracket`),
    updateBracket:(id, mId, b) => req('PATCH',  `/tournaments/${id}/bracket/${mId}`, b),
    setBracket:   (id, b)     => req('PATCH',  `/tournaments/${id}/bracket`, { bracket: b }),
    deleteBracket:(id)         => req('DELETE', `/tournaments/${id}/bracket`),
    clearBracketMatch: (id, mId) => req('DELETE', `/tournaments/${id}/bracket/${mId}`),
  },
  matches: {
    create: (body)   => req('POST',   '/matches',       body),
    update: (id, b)  => req('PUT',    `/matches/${id}`, b),
    delete: (id)     => req('DELETE', `/matches/${id}`),
  },
  // Fixture: partidos con equipos, cancha y hora, todavía sin resultado.
  scheduled: {
    create: (body)   => req('POST',   '/scheduled',       body),
    update: (id, b)  => req('PATCH',  `/scheduled/${id}`, b),
    delete: (id)     => req('DELETE', `/scheduled/${id}`),
  },
  pairs: {
    create: (body)   => req('POST',   '/pairs',       body),
    update: (id, b)  => req('PUT',    `/pairs/${id}`, b),
    delete: (id)     => req('DELETE', `/pairs/${id}`),
  },
  readonly: {
    get: (id) => req('GET', `/readonly/${id}`),
  },
  // Las invitaciones se listan y se resuelven desde las notificaciones, así que
  // acá sólo quedan las que se usan: mandar, responder y cancelar.
  invitations: {
    send:   (playerId, groupId, identifier) => req('POST', '/invitations', { playerId, groupId, identifier }),
    // Link para quien todavía no tiene cuenta: se acepta desde /invitacion/:token
    createLink: (playerId, groupId) => req('POST', '/invitations', { playerId, groupId, link: true }),
    respond:(id, action)                 => req('PATCH',  `/invitations/${id}`, { action }),
    cancel: (id)                         => req('DELETE', `/invitations/${id}`),
  },
  follows: {
    follow:    (username) => req('POST',   `/follows/${username}`),
    unfollow:  (username) => req('DELETE', `/follows/${username}`),
    followers: (username) => req('GET',    `/follows/${username}/followers`),
    following: (username) => req('GET',    `/follows/${username}/following`),
    contacts:  ()         => req('GET',    '/follows/contacts'),
  },
  notifications: {
    list:        (limit = 30, offset = 0) => req('GET',   `/notifications?limit=${limit}&offset=${offset}`),
    count:       ()                        => req('GET',   '/notifications/count'),
    markAllRead: ()                        => req('PATCH', '/notifications/read-all'),
    markRead:    (id)                      => req('PATCH', `/notifications/${id}/read`),
  },
  subscriptions: {
    me:       ()                => req('GET',  '/subscriptions/me'),
    checkout: (billing_period)  => req('POST', '/subscriptions/checkout', { billing_period }),
    sync:     (preapprovalId)   => req('GET',  `/subscriptions/sync${preapprovalId ? `?preapproval_id=${encodeURIComponent(preapprovalId)}` : ''}`),
    claimStart:  (mp_email)     => req('POST', '/subscriptions/claim/start', { mp_email }),
    claimVerify: (code)         => req('POST', '/subscriptions/claim/verify', { code }),
    cancel:   ()                => req('POST', '/subscriptions/cancel'),
  },
  admin: {
    stats:         ()                       => req('GET',  '/admin/stats'),
    timeseries:    (days = 30)              => req('GET',  `/admin/timeseries?days=${days}`),
    users:         ({ q = '', page = 1, limit = 25 } = {}) =>
      req('GET', `/admin/users?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`),
    tournaments:   ({ q = '', status = 'all', page = 1, limit = 25 } = {}) =>
      req('GET', `/admin/tournaments?q=${encodeURIComponent(q)}&status=${status}&page=${page}&limit=${limit}`),
    grantPremium:  (userId, duration_days, preapproval_id)  => req('POST', `/admin/users/${userId}/grant-premium`, { duration_days, preapproval_id }),
    revokePremium: (userId)                 => req('POST', `/admin/users/${userId}/revoke-premium`),
    deleteUser:    (userId)                 => req('DELETE', `/admin/users/${userId}`),
    broadcast:     (body)                   => req('POST', '/admin/broadcast', body),
    broadcasts:    ({ page = 1, limit = 20 } = {}) =>
      req('GET', `/admin/broadcasts?page=${page}&limit=${limit}`),
  },
  joinRequests: {
    send:     (tournamentId, playerId) => req('POST',  '/join-requests', { tournamentId, playerId }),
    myStatus: (tournamentId)          => req('GET',   `/join-requests/my-status/${tournamentId}`),
    get:      (id)                    => req('GET',   `/join-requests/${id}`),
    accept:   (id, playerId)          => req('PATCH', `/join-requests/${id}`, { action: 'accept', playerId }),
    reject:   (id)                    => req('PATCH', `/join-requests/${id}`, { action: 'reject' }),
  },
  collaborators: {
    invite:        (groupId, body)    => req('POST',   `/groups/${groupId}/collaborators/invites`, body),
    respondInvite: (id, action)       => req('PATCH',  `/collaborator-invites/${id}`, { action }),
    remove:        (groupId, userId)  => req('DELETE', `/groups/${groupId}/collaborators/${userId}`),
    leave:         (groupId)          => req('DELETE', `/groups/${groupId}/collaborators/me`),
  },
  transfers: {
    start:   (groupId, body)          => req('POST',   `/groups/${groupId}/transfer`, body),
    respond: (id, action)             => req('PATCH',  `/ownership-transfers/${id}`, { action }),
    cancel:  (groupId)                => req('DELETE', `/groups/${groupId}/transfer`),
  },
  invites: {
    resolve: (token)                  => req('POST', '/invites/resolve', { token }),
    accept:  (token)                  => req('POST', '/invites/accept',  { token }),
  },
  photos: {
    list:          (tournamentId)                       => req('GET',    `/tournaments/${tournamentId}/photos`),
    upload:        (tournamentId, file, caption)        => reqMultipart('POST', `/tournaments/${tournamentId}/photos`, imageForm(file, { caption })),
    updateCaption: (tournamentId, photoId, caption)     => req('PATCH',  `/tournaments/${tournamentId}/photos/${photoId}`, { caption }),
    setCover:      (tournamentId, photoId)              => req('PATCH',  `/tournaments/${tournamentId}/photos/${photoId}/cover`),
    delete:        (tournamentId, photoId)              => req('DELETE', `/tournaments/${tournamentId}/photos/${photoId}`),
  },
}