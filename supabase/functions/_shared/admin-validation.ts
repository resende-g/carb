export type AdminRole = 'EDITOR' | 'ADMIN' | 'SUPERADMIN'
export type InstitutionalOffice = 'COMMUNICATION_DIRECTOR' | 'CARB_PRESIDENT' | 'TECHNICAL_CUSTODIAN' | 'STI_ADMIN'

const roleOffices: Record<AdminRole, readonly InstitutionalOffice[]> = {
  EDITOR: ['COMMUNICATION_DIRECTOR'],
  ADMIN: ['CARB_PRESIDENT'],
  SUPERADMIN: ['TECHNICAL_CUSTODIAN', 'STI_ADMIN'],
}

export function validRoleOffice(role: unknown, office: unknown): role is AdminRole {
  return typeof role === 'string'
    && role in roleOffices
    && typeof office === 'string'
    && roleOffices[role as AdminRole].includes(office as InstitutionalOffice)
}

export function existingAccountMessage(profile: { active: boolean } | null, hasActiveRole: boolean) {
  const base = 'Já existe uma conta associada a este e-mail.'
  if (!profile) return `${base} A conta ainda não está configurada no painel; revise o cadastro existente.`
  if (!profile.active) return `${base} A conta está inativa; reative-a em Contas e papéis antes de ajustar sua função.`
  if (!hasActiveRole) return `${base} A conta está sem função; ajuste a atribuição existente em Contas e papéis.`
  return `${base} Verifique se ela está ativa e ajuste sua função ou autorização existente.`
}

const allowedDatabaseMessages = new Set([
  'A plataforma deve manter ao menos 2 SUPERADM ativos.',
  'A plataforma permite no máximo 3 SUPERADM ativos.',
  'A sucessão exige uma conta individual diferente.',
  'A sucessão deve preservar papel e função institucional.',
  'Atribuição anterior ativa não encontrada.',
  'Novo usuário inexistente ou inativo.',
  'Usuário não encontrado.',
])

export function safeDatabaseMessage(message: unknown, fallback: string) {
  return typeof message === 'string' && allowedDatabaseMessages.has(message) ? message : fallback
}
