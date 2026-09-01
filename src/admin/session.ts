export const ADMIN_SESSION_DURATION_MS = 60 * 60 * 1000

type TokenPayload = { session_id?: unknown }
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function tokenPayload(token: string): TokenPayload {
  try {
    const value = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(value.padEnd(Math.ceil(value.length / 4) * 4, '='))) as TokenPayload
  } catch {
    return {}
  }
}

export function adminSessionId(token: string) {
  const value = tokenPayload(token).session_id
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : ''
}

const storageKey = (sessionId: string) => `carb:admin-session-expiry:${sessionId}`

export function rememberAdminSession(token: string, expiresAt: string, storage: StorageLike = localStorage) {
  const sessionId = adminSessionId(token)
  const deadline = Date.parse(expiresAt)
  if (!sessionId || !Number.isFinite(deadline)) return false
  storage.setItem(storageKey(sessionId), String(deadline))
  return true
}

export function adminSessionDeadline(token: string, storage: StorageLike = localStorage) {
  const sessionId = adminSessionId(token)
  if (!sessionId) return null
  const deadline = Number(storage.getItem(storageKey(sessionId)))
  return Number.isFinite(deadline) && deadline > 0 ? deadline : null
}

export function forgetAdminSession(token: string, storage: StorageLike = localStorage) {
  const sessionId = adminSessionId(token)
  if (sessionId) storage.removeItem(storageKey(sessionId))
}
