import { describe, expect, it, vi } from 'vitest'
import { ADMIN_SESSION_DURATION_MS, adminSessionDeadline, adminSessionId, endAdminSessions, forgetAdminSession, rememberAdminSession } from './session'

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

  it('revoga no banco antes do logout global e remove somente o prazo local', async () => {
    const storage = memoryStorage()
    rememberAdminSession(token, '2026-09-01T00:00:00.000Z', storage)
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const signOut = vi.fn().mockResolvedValue({ error: null })
    await endAdminSessions({ rpc, auth: { signOut } } as never, token, storage)
    expect(rpc).toHaveBeenCalledWith('revoke_current_admin_sessions')
    expect(signOut).toHaveBeenCalledWith({ scope: 'global' })
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(signOut.mock.invocationCallOrder[0])
    expect(adminSessionDeadline(token, storage)).toBeNull()
  })

  it('encerra a sessão local mesmo quando a revogação no banco falha', async () => {
    const storage = memoryStorage()
    rememberAdminSession(token, '2026-09-01T00:00:00.000Z', storage)
    const rpc = vi.fn().mockResolvedValue({ error: new Error('indisponível') })
    const signOut = vi.fn().mockResolvedValue({ error: null })
    await expect(endAdminSessions({ rpc, auth: { signOut } } as never, token, storage)).rejects.toThrow('indisponível')
    expect(signOut).toHaveBeenCalledWith({ scope: 'global' })
    expect(adminSessionDeadline(token, storage)).toBeNull()
  })
})
