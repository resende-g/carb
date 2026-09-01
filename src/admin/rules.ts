export const canDecideOwnable = (canModerate: boolean, actorId: string, creatorId: string) => canModerate && actorId !== creatorId

export const confirmCustodyTransfer = (confirm: (message: string) => boolean) =>
  confirm('Transferir a função e encerrar a atribuição anterior?')
  && confirm('Confirma novamente a transferência de custódia? Esta ação não pode ser desfeita pelo painel.')

export function passwordIssue(password: string, confirmation: string) {
  if (password !== confirmation) return 'As senhas não coincidem.'
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return 'Use ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo.'
  return ''
}

const avatarTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function avatarIssue(file: Pick<File, 'size' | 'type'>) {
  if (!avatarTypes.has(file.type)) return 'Use uma imagem JPG, PNG, WEBP ou GIF.'
  if (file.size > 10 * 1024 * 1024) return 'A imagem deve ter no máximo 10 MB.'
  return ''
}

export type OperationalAccountState = 'Ativa' | 'Inativa' | 'Sem função' | 'Convite/primeiro acesso pendente' | 'Conta não configurada'

export function operationalAccountState(
  profile: { active: boolean } | null,
  hasActiveRole: boolean,
  auth?: { invited_at: string | null; last_sign_in_at: string | null; banned: boolean } | null,
): OperationalAccountState {
  if (!profile) return 'Conta não configurada'
  if (!profile.active || auth?.banned) return 'Inativa'
  if (!hasActiveRole) return 'Sem função'
  if (auth?.invited_at && !auth.last_sign_in_at) return 'Convite/primeiro acesso pendente'
  return 'Ativa'
}

export function userActivationAction(profile: { active: boolean }, auth?: { banned: boolean } | null) {
  const activate = !profile.active || Boolean(auth?.banned)
  return {
    activate,
    label: activate ? 'Reativar' : 'Desativar',
    confirmation: activate ? 'Reativar esta conta administrativa?' : 'Desativar esta conta administrativa?',
  }
}

export const adminRoutes = (canModerate: boolean, superadmin: boolean) => [
  ['/admin', 'Dashboard'],
  ['/admin/posts', 'Posts'],
  ['/admin/documents', 'Documentos'],
  ...(canModerate ? [['/admin/hashtags', 'Hashtags']] : []),
  ...(superadmin ? [['/admin/profiles', 'Perfis públicos'], ['/admin/users', 'Usuários']] : []),
  ['/admin/security', 'Segurança'],
]
