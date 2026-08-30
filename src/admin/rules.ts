export const canDecideOwnable = (canModerate: boolean, actorId: string, creatorId: string) => canModerate && actorId !== creatorId

export function passwordIssue(password: string, confirmation: string) {
  if (password !== confirmation) return 'As senhas não coincidem.'
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return 'Use ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo.'
  return ''
}

export const adminRoutes = (canModerate: boolean, superadmin: boolean) => [
  ['/admin', 'Dashboard'],
  ['/admin/posts', 'Posts'],
  ['/admin/documents', 'Documentos'],
  ...(canModerate ? [['/admin/hashtags', 'Hashtags']] : []),
  ...(superadmin ? [['/admin/profiles', 'Perfis públicos'], ['/admin/users', 'Usuários']] : []),
  ['/admin/security', 'Segurança'],
]
