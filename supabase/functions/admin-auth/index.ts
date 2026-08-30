import { createClient } from 'npm:@supabase/supabase-js@2.112.4'
import { corsHeaders, json } from '../_shared/http.ts'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token }, 200, headers)
})

