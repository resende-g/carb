import { createClient } from 'npm:@supabase/supabase-js@2.112.4'
import { corsHeaders, json } from '../_shared/http.ts'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function jwtPayload(token: string) {
  try {
    const value = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(value.padEnd(Math.ceil(value.length / 4) * 4, '='))) as { aal?: string }
  } catch {
    return {}
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
  const { data: userData, error: userError } = await actorClient.auth.getUser(token)
  const actorId = userData.user?.id
  if (userError || !actorId || jwtPayload(token).aal !== 'aal2') return json({ error: 'MFA verificado é obrigatório.' }, 403, headers)

  const now = new Date().toISOString()
  const [{ data: profile }, { data: role }] = await Promise.all([
    admin.from('profiles').select('active').eq('id', actorId).maybeSingle(),
    admin.from('role_assignments').select('id').eq('user_id', actorId).eq('role', 'SUPERADMIN').eq('active', true).lte('starts_at', now).or(`ends_at.is.null,ends_at.gt.${now}`).limit(1),
  ])
  if (!profile?.active || !role?.length) return json({ error: 'Somente SUPERADMIN ativo pode executar esta ação.' }, 403, headers)

  let input: Record<string, unknown>
  try {
    input = await request.json()
  } catch {
    return json({ error: 'Corpo inválido.' }, 400, headers)
  }

  if (input.action === 'invite') {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
    const fullName = typeof input.full_name === 'string' ? input.full_name.trim() : ''
    if (!emailPattern.test(email) || fullName.length < 2 || fullName.length > 120) return json({ error: 'Nome ou e-mail inválido.' }, 400, headers)
    const redirectTo = `${Deno.env.get('SITE_URL') || 'http://127.0.0.1:5173'}/admin/login`
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo })
    if (error || !data.user) return json({ error: error?.message || 'Não foi possível convidar.' }, 400, headers)
    const { error: profileError } = await admin.from('profiles').insert({ id: data.user.id, full_name: fullName })
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id)
      return json({ error: 'O convite foi revertido porque o perfil não pôde ser criado.' }, 500, headers)
    }
    return json({ user_id: data.user.id }, 201, headers)
  }

  const userId = typeof input.user_id === 'string' ? input.user_id : ''
  if (!uuidPattern.test(userId)) return json({ error: 'Usuário inválido.' }, 400, headers)

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
    if (error) return json({ error: error.message }, 400, headers)
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
