import { createClient } from '@supabase/supabase-js'

const required = (name) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`)
  return value
}

const url = required('SUPABASE_URL')
const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY')
const email = required('BOOTSTRAP_SUPERADMIN_EMAIL').toLowerCase()
const fullName = required('BOOTSTRAP_SUPERADMIN_NAME')
const office = process.env.BOOTSTRAP_SUPERADMIN_OFFICE || 'TECHNICAL_CUSTODIAN'
const offices = new Set(['TECHNICAL_CUSTODIAN', 'STI_ADMIN'])
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail de bootstrap inválido.')
if (fullName.length < 2 || fullName.length > 120) throw new Error('Nome de bootstrap inválido.')
if (!offices.has(office)) throw new Error('Função institucional de bootstrap inválida.')

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const { count, error: countError } = await supabase.from('role_assignments').select('id', { count: 'exact', head: true }).eq('role', 'SUPERADMIN').eq('active', true)
if (countError) throw countError
if (count) throw new Error('Bootstrap encerrado: já existe SUPERADMIN ativo.')

let user
for (let page = 1; !user; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
  if (error) throw error
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === email)
  if (user || data.users.length < 100) break
}
if (!user) {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } })
  if (error || !data.user) throw error || new Error('Convite não retornou usuário.')
  user = data.user
}

const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, active: true })
if (profileError) throw profileError
const { error: roleError } = await supabase.from('role_assignments').insert({ user_id: user.id, role: 'SUPERADMIN', office })
if (roleError) throw roleError
console.log('Bootstrap concluído. A pessoa convidada deve configurar senha e TOTP no primeiro acesso.')
