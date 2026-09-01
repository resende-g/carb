import { describe, expect, it } from 'vitest'
import { ADMIN_SESSION_DURATION_MS, adminSessionDeadline, adminSessionId, forgetAdminSession, rememberAdminSession } from './session'

const sessionId = '40000000-0000-4000-8000-000000000001'
const token = `header.${btoa(JSON.stringify({ session_id: sessionId })).replace(/=/g, '')}.signature`

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

describe('sessão administrativa', () => {
  it('mantém duração absoluta de 60 minutos', () => {
    expect(ADMIN_SESSION_DURATION_MS).toBe(3_600_000)
  })

  it('guarda e remove o prazo pelo session_id sem armazenar tokens', () => {
    const storage = memoryStorage()
    const expiresAt = '2026-09-01T00:00:00.000Z'
    expect(adminSessionId(token)).toBe(sessionId)
    expect(rememberAdminSession(token, expiresAt, storage)).toBe(true)
    expect(adminSessionDeadline(token, storage)).toBe(Date.parse(expiresAt))
    forgetAdminSession(token, storage)
    expect(adminSessionDeadline(token, storage)).toBeNull()
  })
})
