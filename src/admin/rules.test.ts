import { describe, expect, it } from 'vitest'
import { adminRoutes, canDecideOwnable, passwordIssue } from './rules'

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

  it('expõe gestão de usuários somente à persona SUPERADMIN', () => {
    expect(adminRoutes(false, false).flat()).not.toContain('Hashtags')
    expect(adminRoutes(true, false).flat()).toContain('Hashtags')
    expect(adminRoutes(true, true).flat()).toContain('Usuários')
  })
})
