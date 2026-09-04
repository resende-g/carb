import { createClient } from 'npm:@supabase/supabase-js@2.112.4'
import { corsHeaders, json } from '../_shared/http.ts'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const adminSessionDurationMs = 60 * 60 * 1000

function jwtPayload(token: string) {
  try {
    const value = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(value.padEnd(Math.ceil(value.length / 4) * 4, '='))) as { session_id?: string }
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
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'Serviço indisponível.' }, 503, headers)

  let input: { email?: string; password?: string }
  try {
    input = await request.json()
  } catch {
    return json({ error: 'Corpo inválido.' }, 400, headers)
  }
  const email = input.email?.trim().toLowerCase() || ''
  const password = input.password || ''
  if (!emailPattern.test(email) || password.length < 12 || password.length > 256) return json({ error: 'Credenciais inválidas.' }, 400, headers)

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await authClient.auth.signInWithPassword({ email, password })

  if (error || !data.session || !data.user) {
    await admin.from('audit_logs').insert({ event: 'LOGIN_FAILED', entity_type: 'auth_session', metadata: { reason: 'invalid_credentials' } })
    return json({ error: 'Credenciais inválidas.' }, 401, headers)
  }

  const now = new Date().toISOString()
  const [{ data: profile }, { data: roles }] = await Promise.all([
    admin.from('profiles').select('active').eq('id', data.user.id).maybeSingle(),
    admin.from('role_assignments').select('id').eq('user_id', data.user.id).eq('active', true).lte('starts_at', now).or(`ends_at.is.null,ends_at.gt.${now}`).limit(1),
  ])
  if (!profile?.active || !roles?.length) {
    await admin.from('audit_logs').insert({ actor_user_id: data.user.id, event: 'LOGIN_FAILED', entity_type: 'auth_session', metadata: { reason: 'inactive_or_unassigned' } })
    await authClient.auth.signOut()
    return json({ error: 'Conta administrativa inativa ou sem função.' }, 403, headers)
  }

  const sessionId = jwtPayload(data.session.access_token).session_id || ''
  if (!uuidPattern.test(sessionId)) {
    await authClient.auth.signOut()
    return json({ error: 'Não foi possível iniciar a sessão administrativa.' }, 503, headers)
  }

  const expiresAt = new Date(Date.now() + adminSessionDurationMs).toISOString()
  const { error: sessionError } = await admin.rpc('open_admin_session', {
    p_session_id: sessionId,
    p_user_id: data.user.id,
    p_expires_at: expiresAt,
  })
  if (sessionError) {
    await authClient.auth.signOut()
    return json({ error: 'Não foi possível iniciar a sessão administrativa.' }, 503, headers)
  }

  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, admin_expires_at: expiresAt }, 200, headers)
})
