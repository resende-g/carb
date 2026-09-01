import { describe, expect, it } from 'vitest'
import { adminRoutes, avatarIssue, canDecideOwnable, confirmCustodyTransfer, operationalAccountState, passwordIssue, userActivationAction } from './rules'

describe('regras visuais do painel', () => {
  it('não oferece decisão sobre conteúdo próprio', () => {
    expect(canDecideOwnable(true, 'pessoa-1', 'pessoa-1')).toBe(false)
    expect(canDecideOwnable(true, 'pessoa-1', 'pessoa-2')).toBe(true)
    expect(canDecideOwnable(false, 'pessoa-1', 'pessoa-2')).toBe(false)
  })

  it('exige senha administrativa forte e confirmação idêntica', () => {
    expect(passwordIssue('fraca', 'fraca')).toContain('12 caracteres')
    expect(passwordIssue('Senha-Forte-123', 'diferente')).toContain('não coincidem')
    expect(passwordIssue('Senha-Forte-123', 'Senha-Forte-123')).toBe('')
  })

  it('aceita somente formatos e tamanho permitidos para avatar', () => {
    expect(avatarIssue({ type: 'image/webp', size: 10 * 1024 * 1024 })).toBe('')
    expect(avatarIssue({ type: 'image/svg+xml', size: 100 })).toContain('JPG')
    expect(avatarIssue({ type: 'image/png', size: 10 * 1024 * 1024 + 1 })).toContain('10 MB')
  })

  it('expõe gestão de usuários somente à persona SUPERADMIN', () => {
    expect(adminRoutes(false, false).flat()).not.toContain('Hashtags')
    expect(adminRoutes(true, false).flat()).toContain('Hashtags')
    expect(adminRoutes(true, true).flat()).toContain('Usuários')
  })

  it('exige duas confirmações independentes para transferir custódia', () => {
    const accepted = [true, false]
    let calls = 0
    expect(confirmCustodyTransfer(() => accepted[calls++])).toBe(false)
    expect(calls).toBe(2)
    expect(confirmCustodyTransfer(() => true)).toBe(true)
  })

  it('deriva estados operacionais sem persistir um segundo status', () => {
    expect(operationalAccountState({ active: false }, true)).toBe('Inativa')
    expect(operationalAccountState({ active: true }, false)).toBe('Sem função')
    expect(operationalAccountState({ active: true }, true, { invited_at: '2026-08-31', last_sign_in_at: null, banned: false })).toBe('Convite/primeiro acesso pendente')
    expect(operationalAccountState({ active: true }, true, { invited_at: null, last_sign_in_at: '2026-08-31', banned: false })).toBe('Ativa')
    expect(operationalAccountState(null, false)).toBe('Conta não configurada')
  })

  it('alterna entre desativação e reativação conforme o estado real', () => {
    expect(userActivationAction({ active: true })).toMatchObject({ activate: false, label: 'Desativar' })
    expect(userActivationAction({ active: false })).toMatchObject({ activate: true, label: 'Reativar' })
    expect(userActivationAction({ active: true }, { banned: true })).toMatchObject({ activate: true, label: 'Reativar' })
  })
})
