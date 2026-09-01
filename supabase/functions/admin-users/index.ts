import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.112.4'
import { corsHeaders, json } from '../_shared/http.ts'
import { existingAccountMessage, safeDatabaseMessage, validRoleOffice } from '../_shared/admin-validation.ts'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function jwtPayload(token: string) {
  try {
    const value = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(value.padEnd(Math.ceil(value.length / 4) * 4, '='))) as { aal?: string; session_id?: string }
  } catch {
    return {}
  }
}

async function listAuthUsers(admin: SupabaseClient) {
  const users: User[] = []
  const perPage = 200
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) return { users: [], error }
    users.push(...data.users)
    if (data.users.length < perPage) return { users, error: null }
  }
  return { users: [], error: new Error('Limite de paginação excedido.') }
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  const result = await listAuthUsers(admin)
  return { user: result.users.find((user) => user.email?.toLocaleLowerCase('en-US') === email) || null, error: result.error }
}

function authUserSummary(user: User) {
  return {
    id: user.id,
    email: user.email || '',
    invited_at: user.invited_at || null,
    email_confirmed_at: user.email_confirmed_at || null,
    last_sign_in_at: user.last_sign_in_at || null,
    banned: Boolean(user.banned_until && Date.parse(user.banned_until) > Date.now()),
  }
}

Deno.serve(async (request) => {
  let headers: Record<string, string>
  try {
    headers = corsHeaders(request)
  } catch {
    return json({ error: 'Origem não autorizada.' }, 403, {})
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, headers)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  if (!supabaseUrl || !anonKey || !serviceKey || !token) return json({ error: 'Sessão obrigatória.' }, 401, headers)

  const actorClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } })
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const claims = jwtPayload(token)
  const { data: userData, error: userError } = await actorClient.auth.getUser(token)
  const actorId = userData.user?.id
  if (userError || !actorId || claims.aal !== 'aal2') return json({ error: 'MFA verificado é obrigatório.' }, 403, headers)
  if (!claims.session_id || !uuidPattern.test(claims.session_id)) return json({ error: 'Sessão administrativa inválida.' }, 401, headers)

  const now = new Date().toISOString()
  const [{ data: profile }, { data: role }, { data: adminSession }] = await Promise.all([
    admin.from('profiles').select('active').eq('id', actorId).maybeSingle(),
    admin.from('role_assignments').select('id').eq('user_id', actorId).eq('role', 'SUPERADMIN').eq('active', true).lte('starts_at', now).or(`ends_at.is.null,ends_at.gt.${now}`).limit(1),
    admin.from('admin_sessions').select('session_id').eq('session_id', claims.session_id).eq('user_id', actorId).is('revoked_at', null).gt('expires_at', now).maybeSingle(),
  ])
  if (!profile?.active || !role?.length) return json({ error: 'Somente SUPERADMIN ativo pode executar esta ação.' }, 403, headers)
  if (!adminSession) return json({ error: 'Sessão administrativa expirada. Entre novamente.' }, 401, headers)

  let input: Record<string, unknown>
  try {
    input = await request.json()
  } catch {
    return json({ error: 'Corpo inválido.' }, 400, headers)
  }

  if (input.action === 'list_users') {
    const result = await listAuthUsers(admin)
    if (result.error) return json({ error: 'Não foi possível consultar as contas.' }, 503, headers)
    return json({ users: result.users.map(authUserSummary) }, 200, headers)
  }

  if (input.action === 'invite') {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
    const fullName = typeof input.full_name === 'string' ? input.full_name.trim() : ''
    if (!emailPattern.test(email) || fullName.length < 2 || fullName.length > 120) return json({ error: 'Nome ou e-mail inválido.' }, 400, headers)
    if (!validRoleOffice(input.role, input.office)) return json({ error: 'Combinação de papel e função institucional inválida.' }, 400, headers)

    const existing = await findAuthUserByEmail(admin, email)
    if (existing.error) return json({ error: 'Não foi possível verificar o e-mail informado.' }, 503, headers)
    if (existing.user) {
      const [{ data: existingProfile }, { data: existingRoles }] = await Promise.all([
        admin.from('profiles').select('active').eq('id', existing.user.id).maybeSingle(),
        admin.from('role_assignments').select('id').eq('user_id', existing.user.id).eq('active', true).limit(1),
      ])
      return json({ error: existingAccountMessage(existingProfile, Boolean(existingRoles?.length)), existing_user_id: existing.user.id }, 409, headers)
    }

    const siteUrl = (Deno.env.get('SITE_URL') || 'https://carb-v1-3.portal-carb-prototipo.workers.dev').replace(/\/+$/, '')
    const redirectTo = `${siteUrl}/admin`
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo })
    if (error || !data.user) {
      const concurrent = await findAuthUserByEmail(admin, email)
      if (concurrent.user) return json({ error: 'Já existe uma conta associada a este e-mail. Verifique a conta existente no painel.' }, 409, headers)
      return json({ error: 'Não foi possível enviar o convite.' }, 400, headers)
    }

    const { data: assignmentId, error: onboardingError } = await admin.rpc('complete_admin_onboarding', {
      p_user_id: data.user.id,
      p_full_name: fullName,
      p_role: input.role,
      p_office: input.office,
      p_actor_id: actorId,
    })
    if (onboardingError) {
      const rollback = await admin.auth.admin.deleteUser(data.user.id)
      if (rollback.error) return json({ error: 'O onboarding não foi concluído e a conta precisa de revisão administrativa.' }, 500, headers)
      return json({ error: safeDatabaseMessage(onboardingError.message, 'O convite foi revertido porque o perfil e a função não puderam ser configurados.') }, 400, headers)
    }
    return json({ user_id: data.user.id, assignment_id: assignmentId }, 201, headers)
  }

  const userId = typeof input.user_id === 'string' ? input.user_id : ''
  if (!uuidPattern.test(userId)) return json({ error: 'Usuário inválido.' }, 400, headers)

  if (input.action === 'set_active') {
    if (typeof input.active !== 'boolean') return json({ error: 'Estado de conta inválido.' }, 400, headers)
    const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId)
    if (authError || !authUser.user) return json({ error: 'Não foi possível consultar a conta.' }, 400, headers)
    const wasBanned = Boolean(authUser.user.banned_until && Date.parse(authUser.user.banned_until) > Date.now())
    if (input.active && wasBanned) {
      const unban = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
      if (unban.error) return json({ error: 'Não foi possível reativar o acesso da conta.' }, 500, headers)
    }
    const { error } = await actorClient.rpc('set_user_active', { p_user_id: userId, p_active: input.active })
    if (error) {
      if (input.active && wasBanned) await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
      return json({ error: safeDatabaseMessage(error.message, 'Não foi possível alterar o estado da conta.') }, 400, headers)
    }
    return json({ user_id: userId, active: input.active }, 200, headers)
  }

  if (input.action === 'reset_mfa') {
    const { data, error } = await admin.auth.admin.mfa.listFactors({ userId })
    if (error) return json({ error: 'Não foi possível consultar os fatores.' }, 400, headers)
    await admin.from('audit_logs').insert({ actor_user_id: actorId, event: 'MFA_RESET_REQUESTED', entity_type: 'profile', entity_id: userId })
    for (const factor of data.factors) {
      const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({ userId, id: factor.id })
      if (deleteError) return json({ error: 'A revogação do MFA ficou incompleta.' }, 500, headers)
    }
    if (data.factors.some((factor) => factor.status === 'verified')) {
      await admin.from('audit_logs').insert({ actor_user_id: actorId, event: 'SESSIONS_REVOKED', entity_type: 'profile', entity_id: userId, metadata: { reason: 'mfa_reset' } })
    }
    return json({ removed_factors: data.factors.length }, 200, headers)
  }

  if (input.action === 'transfer_custody') {
    const assignmentId = typeof input.assignment_id === 'string' ? input.assignment_id : ''
    if (!uuidPattern.test(assignmentId) || !['EDITOR', 'ADMIN', 'SUPERADMIN'].includes(String(input.role)) || !['COMMUNICATION_DIRECTOR', 'CARB_PRESIDENT', 'TECHNICAL_CUSTODIAN', 'STI_ADMIN'].includes(String(input.office))) {
      return json({ error: 'Dados da sucessão inválidos.' }, 400, headers)
    }
    const { data, error } = await actorClient.rpc('transfer_custody', { p_old_assignment_id: assignmentId, p_new_user_id: userId, p_role: input.role, p_office: input.office })
    if (error) return json({ error: safeDatabaseMessage(error.message, 'Não foi possível transferir a custódia.') }, 400, headers)
    const result = data as { old_user_id?: string; old_user_disabled?: boolean }
    if (result.old_user_disabled && result.old_user_id) {
      const { error: banError } = await admin.auth.admin.updateUserById(result.old_user_id, { ban_duration: '876000h' })
      if (banError) return json({ error: 'A função foi transferida, mas o bloqueio da conta anterior precisa ser repetido.', transfer_complete: true, auth_cleanup_pending: true }, 500, headers)
      const { data: factors, error: factorsError } = await admin.auth.admin.mfa.listFactors({ userId: result.old_user_id })
      if (factorsError) return json({ error: 'A função foi transferida, mas a limpeza de MFA precisa ser repetida.', transfer_complete: true, auth_cleanup_pending: true }, 500, headers)
      const verified = factors.factors.filter((factor) => factor.status === 'verified')
      for (const factor of factors.factors) {
        const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({ userId: result.old_user_id, id: factor.id })
        if (deleteError) return json({ error: 'A função foi transferida, mas a limpeza de MFA ficou incompleta.', transfer_complete: true, auth_cleanup_pending: true }, 500, headers)
      }
      if (verified.length) await admin.from('audit_logs').insert({ actor_user_id: actorId, event: 'SESSIONS_REVOKED', entity_type: 'profile', entity_id: result.old_user_id, metadata: { reason: 'custody_transfer' } })
    }
    return json(data, 200, headers)
  }

  return json({ error: 'Ação desconhecida.' }, 400, headers)
})
