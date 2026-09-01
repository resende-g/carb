import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { existingAccountMessage, validRoleOffice } from '../../supabase/functions/_shared/admin-validation'

describe('contrato do onboarding administrativo', () => {
  it('aceita somente combinações institucionais válidas', () => {
    expect(validRoleOffice('EDITOR', 'COMMUNICATION_DIRECTOR')).toBe(true)
    expect(validRoleOffice('ADMIN', 'CARB_PRESIDENT')).toBe(true)
    expect(validRoleOffice('SUPERADMIN', 'STI_ADMIN')).toBe(true)
    expect(validRoleOffice('EDITOR', 'CARB_PRESIDENT')).toBe(false)
  })

  it('explica e-mail existente e orienta reativação sem duplicar identidade', () => {
    expect(existingAccountMessage({ active: false }, true)).toContain('reative-a em Contas e papéis')
    expect(existingAccountMessage({ active: true }, false)).toContain('sem função')
    expect(existingAccountMessage({ active: true }, true)).toContain('Já existe uma conta')
  })

  it('mantém autorização AAL2 e operações privilegiadas no servidor', () => {
    const source = readFileSync(new URL('../../supabase/functions/admin-users/index.ts', import.meta.url), 'utf8')
    expect(source).toContain("claims.aal !== 'aal2'")
    expect(source).toContain("actorClient.rpc('set_user_active'")
    expect(source).toContain("admin.rpc('complete_admin_onboarding'")
    expect(source).toContain('deleteUser(data.user.id)')
  })
})
