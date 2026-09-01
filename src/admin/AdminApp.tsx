import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { hashtagSlug, normalizeHashtagName } from '../hashtags'
import { signedUrl, supabase, supabaseConfigured } from '../supabase'
import { invokeEdge } from './edgeFunctions'
import { adminRoutes, avatarIssue, canDecideOwnable, confirmCustodyTransfer, operationalAccountState, passwordIssue, userActivationAction } from './rules'
import { adminSessionDeadline, forgetAdminSession, rememberAdminSession } from './session'
import { AdminIcon } from '../components/ui/admin-icon'
import { Button } from '../components/ui/button'

type Role = 'EDITOR' | 'ADMIN' | 'SUPERADMIN'
type Office = 'COMMUNICATION_DIRECTOR' | 'CARB_PRESIDENT' | 'TECHNICAL_CUSTODIAN' | 'STI_ADMIN'
type Status = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'REMOVAL_REQUESTED' | 'REMOVED'
type Profile = { id: string; full_name: string; active: boolean }
type Assignment = { id: string; user_id: string; role: Role; office: Office; active: boolean }
type AuthAccount = { id: string; email: string; invited_at: string | null; email_confirmed_at: string | null; last_sign_in_at: string | null; banned: boolean }
type ContentProfile = { id: string; name: string; slug: string; avatar_path: string | null; avatar_url?: string; description: string; active: boolean }
type Permission = { user_id: string; content_profile_id: string; can_publish: boolean; active: boolean }
type Hashtag = { id: string; name: string; slug: string; color: string; active: boolean }
type Post = { id: string; content_profile_id: string; title: string; body: string; category: string; status: Status; created_by: string; rejection_reason: string | null; media_path: string | null; media_alt: string | null; media_mime_type: string | null; media_size_bytes: number | null; created_at: string }
type Revision = { id: string; post_id: string; title: string; body: string; category: string; change_summary: string; status: string; created_by: string; decision_reason: string | null; created_at: string }
type Document = { id: string; content_profile_id: string; title: string; description: string; status: string; storage_path: string; original_filename: string; created_by: string; decision_reason: string | null; created_at: string }
type Metrics = { window_days: number | null; posts: number; pending_posts: number; approved_posts: number; rejected_posts: number; documents: number; removal_requests: number; reactions: number; reactions_by_post: { post_id: string; title: string; total: number }[] }
type Context = { profiles: Profile[]; assignments: Assignment[]; contentProfiles: ContentProfile[]; permissions: Permission[]; hashtags: Hashtag[]; posts: Post[]; postHashtags: { post_id: string; hashtag_id: string }[]; revisions: Revision[]; documents: Document[] }

const roles: Role[] = ['EDITOR', 'ADMIN', 'SUPERADMIN']
const roleOffices: Record<Role, Office[]> = { EDITOR: ['COMMUNICATION_DIRECTOR'], ADMIN: ['CARB_PRESIDENT'], SUPERADMIN: ['TECHNICAL_CUSTODIAN', 'STI_ADMIN'] }
const colors = ['blue', 'green', 'gold', 'violet', 'red', 'gray']
const labels: Record<string, string> = {
  COMMUNICATION_DIRECTOR: 'Diretoria de Comunicação', CARB_PRESIDENT: 'Presidência do CARB', TECHNICAL_CUSTODIAN: 'Custódia técnica', STI_ADMIN: 'Administração STI',
  DRAFT: 'Rascunho', PENDING_APPROVAL: 'Em aprovação', APPROVED: 'Aprovado', PUBLISHED: 'Publicado', REJECTED: 'Rejeitado', REMOVAL_REQUESTED: 'Remoção solicitada', REMOVED: 'Removido',
}
const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error || 'Erro inesperado.')
const safeFilename = (value: string) => value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-120) || 'arquivo'

function route(path: string) {
  history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function Login({ initialMessage = '' }: { initialMessage?: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(initialMessage)
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    const client = supabase
    setBusy(true)
    setMessage('')
    const result = await invokeEdge<{ access_token?: string; refresh_token?: string; admin_expires_at?: string; error?: string }>(
      () => client.functions.invoke('admin-auth', { body: { email: email.trim(), password } }),
      'Não foi possível entrar.',
    )
    const data = result.data
    if (result.error || !data?.access_token || !data.refresh_token || !data.admin_expires_at) setMessage(result.error || 'Não foi possível entrar.')
    else {
      if (!rememberAdminSession(data.access_token, data.admin_expires_at)) {
        setBusy(false)
        return setMessage('Não foi possível iniciar a sessão administrativa.')
      }
      const { error: sessionError } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
      if (sessionError) {
        forgetAdminSession(data.access_token)
        setMessage('Não foi possível salvar a sessão administrativa.')
      }
      else setPassword('')
    }
    setBusy(false)
  }
  return <main className="admin-login"><a href="/" onClick={(event) => { event.preventDefault(); route('/') }}>← Voltar ao portal</a><form className="admin-login-card" onSubmit={submit}><p className="eyebrow">Área administrativa</p><h1>Entrar no Portal CARB</h1><p>Use sua conta individual. O acesso exige TOTP após a senha.</p><label>E-mail<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Senha<input type="password" autoComplete="current-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><Button disabled={busy} aria-busy={busy}>{busy && <AdminIcon name="loading" />} {busy ? 'Entrando…' : 'Entrar'}</Button>{message && <p className="form-message" role="alert">{message}</p>}</form></main>
}

function PasswordSetup({ onDone }: { onDone: () => Promise<void> | void }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    const issue = passwordIssue(password, confirmation)
    if (issue) return setMessage(issue)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMessage(error.message)
    else await onDone()
  }
  return <main className="admin-login"><form className="admin-login-card" onSubmit={submit}><p className="eyebrow">Conta individual</p><h1>Defina sua senha</h1><label>Nova senha<input type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label>Confirmar senha<input type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label><Button><AdminIcon name="save" /> Salvar senha</Button>{message && <p role="alert">{message}</p>}</form></main>
}

function MfaGate({ onVerified }: { onVerified: (verified: boolean) => void }) {
  const [factorId, setFactorId] = useState('')
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('Preparando o segundo fator…')

  useEffect(() => {
    if (!supabase) return
    void (async () => {
      const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (level?.currentLevel === 'aal2') return onVerified(true)
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) return setMessage(error.message)
      const existing = data.totp.find((factor) => factor.status === 'verified')
      if (existing) {
        setFactorId(existing.id)
        setMessage('Digite o código do aplicativo autenticador.')
        return
      }
      for (const factor of data.totp.filter((item) => item.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: factor.id })
      const enrollment = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Portal CARB' })
      if (enrollment.error) return setMessage(enrollment.error.message)
      setFactorId(enrollment.data.id)
      setQr(enrollment.data.totp.qr_code)
      setSecret(enrollment.data.totp.secret)
      setMessage('Cadastre o QR code no aplicativo autenticador e confirme o código.')
    })()
  }, [onVerified])

  const verify = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !factorId || !/^\d{6}$/.test(code)) return setMessage('Informe os seis dígitos do autenticador.')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) setMessage(error.message)
    else onVerified(true)
  }
  return <main className="admin-login"><form className="admin-login-card" onSubmit={verify}><p className="eyebrow">MFA obrigatório</p><h1>Verificação em duas etapas</h1>{qr && <img className="mfa-qr" src={qr} alt="QR code para cadastrar o Portal CARB no aplicativo autenticador" />}{secret && <p>Alternativa manual: <code>{secret}</code></p>}<p>{message}</p><label>Código TOTP<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} required /></label><Button disabled={!factorId}><AdminIcon name="check" /> Verificar</Button><Button type="button" variant="outline" onClick={() => supabase?.auth.signOut()}><AdminIcon name="logout" /> Cancelar e sair</Button></form></main>
}

async function loadContext(): Promise<Context> {
  if (!supabase) throw new Error('Supabase não configurado.')
  const results = await Promise.all([
    supabase.from('profiles').select('id,full_name,active').order('full_name'),
    supabase.from('role_assignments').select('id,user_id,role,office,active').order('created_at'),
    supabase.from('content_profiles').select('id,name,slug,avatar_path,description,active').order('name'),
    supabase.from('content_profile_permissions').select('user_id,content_profile_id,can_publish,active'),
    supabase.from('hashtags').select('id,name,slug,color,active').order('name'),
    supabase.from('posts').select('id,content_profile_id,title,body,category,status,created_by,rejection_reason,media_path,media_alt,media_mime_type,media_size_bytes,created_at').order('created_at', { ascending: false }),
    supabase.from('post_hashtags').select('post_id,hashtag_id'),
    supabase.from('post_revisions').select('id,post_id,title,body,category,change_summary,status,created_by,decision_reason,created_at').order('created_at', { ascending: false }),
    supabase.from('documents').select('id,content_profile_id,title,description,status,storage_path,original_filename,created_by,decision_reason,created_at').order('created_at', { ascending: false }),
  ])
  const error = results.find((result) => result.error)?.error
  if (error) throw error
  const contentProfiles = results[2].data as ContentProfile[]
  const avatarUrls = await Promise.all(contentProfiles.map(({ avatar_path }) => signedUrl(avatar_path)))
  return { profiles: results[0].data as Profile[], assignments: results[1].data as Assignment[], contentProfiles: contentProfiles.map((profile, index) => ({ ...profile, avatar_url: avatarUrls[index] })), permissions: results[3].data as Permission[], hashtags: results[4].data as Hashtag[], posts: results[5].data as Post[], postHashtags: results[6].data as { post_id: string; hashtag_id: string }[], revisions: results[7].data as Revision[], documents: results[8].data as Document[] }
}

function Dashboard() {
  const [days, setDays] = useState<string>('7')
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [message, setMessage] = useState('Carregando métricas…')
  useEffect(() => {
    if (!supabase) return
    void supabase.rpc('dashboard_metrics', { p_days: days === 'total' ? null : Number(days) }).then(({ data, error }) => {
      setMetrics(error ? null : data as Metrics)
      setMessage(error?.message || '')
    })
  }, [days])
  const items = metrics ? [['Posts', metrics.posts], ['Pendentes', metrics.pending_posts], ['Aprovados/publicados', metrics.approved_posts], ['Rejeitados', metrics.rejected_posts], ['Documentos', metrics.documents], ['Remoções', metrics.removal_requests], ['Reações', metrics.reactions]] : []
  return <section><div className="admin-page-heading"><div><p className="eyebrow">Dados persistidos</p><h1>Dashboard</h1></div><label>Janela<select value={days} onChange={(event) => setDays(event.target.value)}><option value="7">7 dias</option><option value="30">30 dias</option><option value="total">Total</option></select></label></div>{message && <p role="status">{message}</p>}<div className="metric-grid">{items.map(([name, value]) => <article className="admin-card" key={name}><span>{name}</span><strong>{value}</strong></article>)}</div>{metrics?.reactions_by_post.length ? <section className="admin-card"><h2>Reações por publicação</h2><ul className="admin-list">{metrics.reactions_by_post.map((item) => <li key={item.post_id}><span>{item.title}</span><strong>{item.total}</strong></li>)}</ul></section> : null}</section>
}

type PostFormProps = { context: Context; userId: string; editing: Post | null; onNew: () => void; refresh: () => Promise<void> }

function PostForm(props: PostFormProps) {
  return <PostFormFields key={props.editing?.id || 'new'} {...props} />
}

function PostFormFields({ context, userId, editing, onNew, refresh }: PostFormProps) {
  const allowedIds = new Set(context.permissions.filter((permission) => permission.user_id === userId && permission.active && permission.can_publish).map((permission) => permission.content_profile_id))
  const canManage = context.assignments.some((assignment) => assignment.user_id === userId && assignment.role === 'SUPERADMIN' && assignment.active)
  const availableProfiles = context.contentProfiles.filter((profile) => profile.active && (canManage || allowedIds.has(profile.id)))
  const [contentProfileId, setContentProfileId] = useState(editing?.content_profile_id || availableProfiles[0]?.id || '')
  const [title, setTitle] = useState(editing?.title || '')
  const [category, setCategory] = useState(editing?.category || '')
  const [body, setBody] = useState(editing?.body || '')
  const [hashtagIds, setHashtagIds] = useState<string[]>(editing ? context.postHashtags.filter((item) => item.post_id === editing.id).map((item) => item.hashtag_id) : [])
  const [media, setMedia] = useState<File | null>(null)
  const [mediaAlt, setMediaAlt] = useState(editing?.media_alt || '')
  const [mediaPreview, setMediaPreview] = useState('')
  const [draftId, setDraftId] = useState<string | null>(editing?.id || null)
  const [savedMedia, setSavedMedia] = useState<Pick<Post, 'media_path' | 'media_alt' | 'media_mime_type' | 'media_size_bytes'> | null>(editing ? { media_path: editing.media_path, media_alt: editing.media_alt, media_mime_type: editing.media_mime_type, media_size_bytes: editing.media_size_bytes } : null)
  const [message, setMessage] = useState('')
  useEffect(() => () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview) }, [mediaPreview])
  const reset = () => { onNew(); setDraftId(null); setTitle(''); setCategory(''); setBody(''); setHashtagIds([]); setMedia(null); setMediaAlt(''); setSavedMedia(null); setMessage('') }
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    if (!hashtagIds.length) return setMessage('Selecione ao menos uma hashtag.')
    if (media && (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(media.type) || media.size > 8 * 1024 * 1024 || !mediaAlt.trim())) return setMessage('Use JPG, PNG, WebP ou GIF de até 8 MB e forneça o texto alternativo.')
    const path = media ? `posts/${userId}/${crypto.randomUUID()}-${safeFilename(media.name)}` : savedMedia?.media_path || null
    const payload = { p_post_id: draftId, p_content_profile_id: contentProfileId, p_title: title, p_body: body, p_category: category, p_hashtag_ids: hashtagIds, p_media_path: path, p_media_alt: path ? mediaAlt : null, p_media_mime_type: media?.type || savedMedia?.media_mime_type || null, p_media_size_bytes: media?.size || savedMedia?.media_size_bytes || null }
    const result = await supabase.rpc('save_post_draft', payload)
    if (result.error) return setMessage(result.error.message)
    if (media && path) {
      const upload = await supabase.storage.from('editorial-assets').upload(path, media, { contentType: media.type, upsert: false })
      if (upload.error) {
        await supabase.rpc('save_post_draft', { ...payload, p_post_id: result.data.id, p_media_path: savedMedia?.media_path || null, p_media_alt: savedMedia?.media_alt || null, p_media_mime_type: savedMedia?.media_mime_type || null, p_media_size_bytes: savedMedia?.media_size_bytes || null })
        return setMessage(`Rascunho salvo sem substituir a mídia: ${upload.error.message}`)
      }
      // ponytail: mídias substituídas ficam privadas até uma rotina de limpeza ser necessária por volume.
      setSavedMedia({ media_path: path, media_alt: mediaAlt, media_mime_type: media.type, media_size_bytes: media.size })
    }
    setDraftId(result.data.id); setMedia(null); setMessage(draftId ? 'Rascunho atualizado.' : 'Rascunho salvo.')
    await refresh()
  }
  if (!availableProfiles.length) return <section className="admin-card"><h2>Novo post</h2><p>Nenhum perfil de conteúdo autorizado. O vínculo deve ser concedido por SUPERADMIN.</p></section>
  return <section className="admin-card"><p className="eyebrow">Workflow editorial</p><div className="admin-page-heading"><h2>{draftId ? 'Editar rascunho' : 'Novo rascunho'}</h2>{draftId && <button type="button" onClick={reset}>Novo rascunho</button>}</div><form className="admin-form" onSubmit={save}><label>Perfil de conteúdo<select value={contentProfileId} onChange={(event) => setContentProfileId(event.target.value)}>{availableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><label>Título<input maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label>Categoria<input maxLength={80} value={category} onChange={(event) => setCategory(event.target.value)} required /></label><label>Texto<textarea maxLength={10000} value={body} onChange={(event) => setBody(event.target.value)} required /></label><fieldset className="hashtag-checkboxes"><legend>Hashtags</legend>{context.hashtags.filter(({ active }) => active).map((hashtag) => <label key={hashtag.id}><input type="checkbox" checked={hashtagIds.includes(hashtag.id)} onChange={() => setHashtagIds((current) => current.includes(hashtag.id) ? current.filter((id) => id !== hashtag.id) : [...current, hashtag.id])} />#{hashtag.name}</label>)}</fieldset><label>Imagem ou GIF<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0] || null; setMedia(file); setMediaPreview(file ? URL.createObjectURL(file) : '') }} /></label>{mediaPreview && <img className="admin-media-preview" src={mediaPreview} alt="Pré-visualização do anexo selecionado" />}{(media || savedMedia?.media_path) && <label>Texto alternativo<input value={mediaAlt} onChange={(event) => setMediaAlt(event.target.value)} required /></label>}<Button><AdminIcon name="save" /> Salvar rascunho</Button></form>{message && <p className="form-message" role="status">{message}</p>}</section>
}

function RevisionForm({ post, context, refresh }: { post: Post; context: Context; refresh: () => Promise<void> }) {
  const [title, setTitle] = useState(post.title)
  const [category, setCategory] = useState(post.category)
  const [body, setBody] = useState(post.body)
  const [summary, setSummary] = useState('')
  const [hashtagIds, setHashtagIds] = useState(context.postHashtags.filter((item) => item.post_id === post.id).map((item) => item.hashtag_id))
  const [message, setMessage] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase) return
    const { error } = await supabase.rpc('create_post_revision', { p_post_id: post.id, p_title: title, p_body: body, p_category: category, p_change_summary: summary, p_hashtag_ids: hashtagIds, p_media_path: post.media_path, p_media_alt: post.media_alt, p_media_mime_type: post.media_mime_type, p_media_size_bytes: post.media_size_bytes })
    setMessage(error?.message || 'Revisão submetida para aprovação.'); if (!error) await refresh()
  }
  return <details className="revision-form"><summary>Propor revisão</summary><form className="admin-form" onSubmit={submit}><label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label>Categoria<input value={category} onChange={(event) => setCategory(event.target.value)} required /></label><label>Texto<textarea value={body} onChange={(event) => setBody(event.target.value)} required /></label><fieldset className="hashtag-checkboxes"><legend>Hashtags</legend>{context.hashtags.filter(({ active }) => active).map((hashtag) => <label key={hashtag.id}><input type="checkbox" checked={hashtagIds.includes(hashtag.id)} onChange={() => setHashtagIds((current) => current.includes(hashtag.id) ? current.filter((id) => id !== hashtag.id) : [...current, hashtag.id])} />#{hashtag.name}</label>)}</fieldset><label>Resumo da mudança<textarea maxLength={500} value={summary} onChange={(event) => setSummary(event.target.value)} required /></label><button>Enviar revisão</button></form>{message && <p role="status">{message}</p>}</details>
}

export function PostsPage({ context, userId, roles: userRoles, refresh, selectedId }: { context: Context; userId: string; roles: Role[]; refresh: () => Promise<void>; selectedId?: string }) {
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Post | null>(null)
  const moderate = userRoles.some((role) => role === 'ADMIN' || role === 'SUPERADMIN')
  const visiblePosts = selectedId ? context.posts.filter(({ id }) => id === selectedId) : context.posts
  const transition = async (post: Post, target: Status) => {
    if (!supabase) return
    const needsReason = target === 'REJECTED' || target === 'REMOVAL_REQUESTED' || (post.status === 'REMOVAL_REQUESTED' && target === 'PUBLISHED')
    const reason = needsReason ? window.prompt('Justificativa (mínimo de 10 caracteres):') : null
    if (needsReason && (!reason || reason.trim().length < 10)) return setMessage('A ação foi cancelada: informe uma justificativa com ao menos 10 caracteres.')
    const { error } = await supabase.rpc('transition_post', { p_post_id: post.id, p_target_status: target, p_reason: reason })
    setMessage(error?.message || 'Estado editorial atualizado.')
    if (!error) await refresh()
  }
  const decideRevision = async (revision: Revision, approve: boolean) => {
    if (!supabase) return
    const reason = approve ? null : window.prompt('Justificativa (mínimo de 10 caracteres):')
    if (!approve && (!reason || reason.length < 10)) return
    const { error } = await supabase.rpc('decide_post_revision', { p_revision_id: revision.id, p_approve: approve, p_reason: reason })
    setMessage(error?.message || 'Revisão decidida.'); if (!error) await refresh()
  }
  const removeDraft = async (post: Post) => {
    if (!supabase || !window.confirm(`Excluir o rascunho “${post.title}”?`)) return
    const { error } = await supabase.rpc('delete_post_draft', { p_post_id: post.id })
    setMessage(error?.message || 'Rascunho excluído.')
    if (!error) { if (editing?.id === post.id) setEditing(null); await refresh() }
  }
  return <section><div className="admin-page-heading"><div><p className="eyebrow">Posts</p><h1>Fluxo editorial</h1></div>{selectedId && <a href="/admin/posts" onClick={(event) => { event.preventDefault(); route('/admin/posts') }}>← Voltar à lista</a>}</div><div className="admin-stack"><PostForm context={context} userId={userId} editing={editing} onNew={() => setEditing(null)} refresh={refresh} /><section className="admin-card"><h2>Publicações e rascunhos</h2><div className="admin-stack">{visiblePosts.map((post) => <article className="workflow-item" key={post.id}><p><span className="status-pill">{labels[post.status]}</span> · {context.contentProfiles.find(({ id }) => id === post.content_profile_id)?.name}</p><h3><a href={`/admin/posts/${post.id}`} onClick={(event) => { event.preventDefault(); route(`/admin/posts/${post.id}`) }}>{post.title}</a></h3><p>{post.body}</p>{post.rejection_reason && <p><strong>Justificativa:</strong> {post.rejection_reason}</p>}<div className="row-actions">{post.status === 'DRAFT' && (post.created_by === userId || moderate) && <><button onClick={() => setEditing(post)}>Editar</button><button onClick={() => removeDraft(post)}>Excluir</button></>}{post.status === 'DRAFT' && post.created_by === userId && <button onClick={() => transition(post, 'PENDING_APPROVAL')}>Submeter</button>}{post.status === 'PENDING_APPROVAL' && canDecideOwnable(moderate, userId, post.created_by) && <><button onClick={() => transition(post, 'APPROVED')}>Aprovar</button><button onClick={() => transition(post, 'REJECTED')}>Rejeitar</button></>}{post.status === 'APPROVED' && moderate && <button onClick={() => transition(post, 'PUBLISHED')}>Publicar</button>}{post.status === 'PUBLISHED' && <button onClick={() => transition(post, 'REMOVAL_REQUESTED')}>Solicitar remoção</button>}{post.status === 'REMOVAL_REQUESTED' && moderate && <><button onClick={() => transition(post, 'REMOVED')}>Remover</button><button onClick={() => transition(post, 'PUBLISHED')}>Manter publicado</button></>}</div>{post.status === 'PUBLISHED' && <RevisionForm post={post} context={context} refresh={refresh} />}</article>)}{!visiblePosts.length && <p>Nenhum post no escopo atual.</p>}</div></section></div>{context.revisions.length ? <section className="admin-card"><h2>Revisões</h2><ul className="admin-list">{context.revisions.filter((revision) => !selectedId || revision.post_id === selectedId).map((revision) => <li key={revision.id}><span><strong>{revision.title}</strong><small>{revision.status} · {revision.change_summary}</small>{revision.decision_reason && <small>{revision.decision_reason}</small>}</span>{revision.status === 'PENDING_APPROVAL' && canDecideOwnable(moderate, userId, revision.created_by) && <span className="row-actions"><button onClick={() => decideRevision(revision, true)}>Aprovar</button><button onClick={() => decideRevision(revision, false)}>Rejeitar</button></span>}</li>)}</ul></section> : null}{message && <p className="admin-toast" role="status">{message}</p>}</section>
}

function HashtagsPage({ context, refresh }: { context: Context; refresh: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('blue')
  const [message, setMessage] = useState('')
  const create = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    const clean = normalizeHashtagName(name)
    const { error } = await supabase.from('hashtags').insert({ name: clean, slug: hashtagSlug(clean), color })
    setMessage(error?.message || 'Hashtag criada.'); if (!error) { setName(''); await refresh() }
  }
  const toggle = async (hashtag: Hashtag) => {
    if (!supabase) return
    const { error } = await supabase.from('hashtags').update({ active: !hashtag.active }).eq('id', hashtag.id)
    setMessage(error?.message || 'Hashtag atualizada.'); if (!error) await refresh()
  }
  const edit = async (hashtag: Hashtag) => {
    if (!supabase) return
    const nextName = window.prompt('Nome da hashtag:', hashtag.name)?.trim()
    if (!nextName) return
    const nextColor = window.prompt(`Cor (${colors.join(', ')}):`, hashtag.color)?.trim()
    if (!nextColor || !colors.includes(nextColor)) return setMessage('Cor inválida.')
    const { error } = await supabase.from('hashtags').update({ name: normalizeHashtagName(nextName), slug: hashtagSlug(nextName), color: nextColor }).eq('id', hashtag.id)
    setMessage(error?.message || 'Hashtag atualizada.'); if (!error) await refresh()
  }
  return <section><div className="admin-page-heading"><div><p className="eyebrow">Catálogo global</p><h1>Hashtags</h1></div></div><section className="admin-card"><form className="admin-inline-form" onSubmit={create}><label>Nome<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Cor<select value={color} onChange={(event) => setColor(event.target.value)}>{colors.map((value) => <option key={value}>{value}</option>)}</select></label><button className="primary">Criar</button></form><ul className="admin-list">{context.hashtags.map((hashtag) => <li key={hashtag.id}><span>#{hashtag.name} · {hashtag.color} · {hashtag.active ? 'ativa' : 'inativa'}</span><span className="row-actions"><button onClick={() => edit(hashtag)}>Editar</button><button onClick={() => toggle(hashtag)}>{hashtag.active ? 'Desativar' : 'Reativar'}</button></span></li>)}</ul>{message && <p role="status">{message}</p>}</section></section>
}

export function ContentProfilesPage({ context, refresh }: { context: Context; refresh: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState('')
  const create = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase) return
    const { error } = await supabase.from('content_profiles').insert({ name: name.trim(), slug: slug.trim().toLowerCase(), description: description.trim() })
    setMessage(error?.message || 'Perfil de conteúdo criado.'); if (!error) { setName(''); setSlug(''); setDescription(''); await refresh() }
  }
  const update = async (profile: ContentProfile, active = profile.active) => {
    if (!supabase) return
    const nextName = window.prompt('Nome público:', profile.name)?.trim()
    if (!nextName) return
    const nextDescription = window.prompt('Descrição:', profile.description)
    if (nextDescription === null) return
    const { error } = await supabase.from('content_profiles').update({ name: nextName, description: nextDescription.trim(), active }).eq('id', profile.id)
    setMessage(error?.message || 'Perfil atualizado.'); if (!error) await refresh()
  }
  const toggle = async (profile: ContentProfile) => {
    if (!supabase || !window.confirm(`${profile.active ? 'Desativar' : 'Reativar'} @${profile.slug}?`)) return
    const { error } = await supabase.from('content_profiles').update({ active: !profile.active }).eq('id', profile.id)
    setMessage(error?.message || 'Perfil atualizado.'); if (!error) await refresh()
  }
  const uploadAvatar = async (profile: ContentProfile, file: File) => {
    if (!supabase) return
    const issue = avatarIssue(file)
    if (issue) return setMessage(issue)
    const path = `profile-avatars/${profile.id}/${crypto.randomUUID()}-${safeFilename(file.name)}`
    setUploading(profile.id); setMessage('Enviando foto…')
    const upload = await supabase.storage.from('editorial-assets').upload(path, file, { contentType: file.type, cacheControl: '3600' })
    if (upload.error) { setUploading(''); return setMessage(upload.error.message) }
    const saved = await supabase.from('content_profiles').update({ avatar_path: path }).eq('id', profile.id)
    if (saved.error) {
      await supabase.storage.from('editorial-assets').remove([path])
      setUploading(''); return setMessage(saved.error.message)
    }
    const cleanup = profile.avatar_path ? await supabase.storage.from('editorial-assets').remove([profile.avatar_path]) : null
    setMessage(cleanup?.error ? 'Foto atualizada; a imagem anterior precisa de limpeza manual.' : 'Foto atualizada.')
    setUploading(''); await refresh()
  }
  return <section><div className="admin-page-heading"><div><p className="eyebrow">Identidades públicas</p><h1>Perfis de conteúdo</h1></div></div><section className="admin-card"><form className="admin-form" onSubmit={create}><label>Nome<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Slug<input pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => setSlug(event.target.value)} required /></label><label>Descrição<textarea maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /></label><button className="primary">Criar perfil</button></form><ul className="admin-list">{context.contentProfiles.map((profile) => <li key={profile.id}><span className="profile-summary">{profile.avatar_url && <img className="admin-avatar-preview" src={profile.avatar_url} alt={`Foto atual de ${profile.name}`} />}<span><strong>{profile.name}</strong><small>@{profile.slug} · {profile.active ? 'ativo' : 'inativo'} · {profile.avatar_path ? 'com foto' : 'sem foto'}</small></span></span><span className="row-actions"><label className="admin-file-button">{uploading === profile.id ? <><AdminIcon name="loading" /> Enviando…</> : <><AdminIcon name="image" /> Trocar foto</>}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={Boolean(uploading)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(profile, file); event.currentTarget.value = '' }} /></label><Button variant="outline" onClick={() => update(profile)}><AdminIcon name="edit" /> Editar</Button><Button variant={profile.active ? 'destructive' : 'outline'} onClick={() => toggle(profile)}>{profile.active && <AdminIcon name="lock" />} {profile.active ? 'Desativar' : 'Reativar'}</Button></span></li>)}</ul>{message && <p role="status">{message}</p>}</section></section>
}

function DocumentsPage({ context, userId, refresh }: { context: Context; userId: string; refresh: () => Promise<void> }) {
  const allowedIds = new Set(context.permissions.filter((permission) => permission.user_id === userId && permission.active && permission.can_publish).map((permission) => permission.content_profile_id))
  const canManage = context.assignments.some((assignment) => assignment.user_id === userId && assignment.role === 'SUPERADMIN' && assignment.active)
  const canModerate = canManage || context.assignments.some((assignment) => assignment.user_id === userId && assignment.role === 'ADMIN' && assignment.active)
  const availableProfiles = context.contentProfiles.filter((profile) => profile.active && (canManage || allowedIds.has(profile.id)))
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [profileId, setProfileId] = useState(availableProfiles[0]?.id || '')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase || !file) return
    if (file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024) return setMessage('Use PDF de até 10 MB.')
    const path = `documents/${userId}/${crypto.randomUUID()}-${safeFilename(file.name)}`
    const draft = await supabase.rpc('save_document_draft', { p_document_id: null, p_content_profile_id: profileId, p_title: title, p_description: description, p_storage_path: path, p_original_filename: safeFilename(file.name), p_mime_type: file.type, p_size_bytes: file.size })
    if (draft.error) return setMessage(draft.error.message)
    const upload = await supabase.storage.from('editorial-assets').upload(path, file, { contentType: file.type })
    if (upload.error) {
      await supabase.rpc('delete_document_draft', { p_document_id: draft.data.id })
      return setMessage(`Upload cancelado sem manter metadados órfãos: ${upload.error.message}`)
    }
    setMessage('Documento salvo como rascunho.'); setTitle(''); setDescription(''); setFile(null); await refresh()
  }
  const transition = async (document: Document, target: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED') => {
    if (!supabase) return
    const reason = target === 'REJECTED' ? window.prompt('Justificativa (mínimo de 10 caracteres):') : null
    if (target === 'REJECTED' && (!reason || reason.length < 10)) return
    const { error } = await supabase.rpc('transition_document', { p_document_id: document.id, p_target_status: target, p_reason: reason })
    setMessage(error?.message || 'Documento atualizado.'); if (!error) await refresh()
  }
  return <section><div className="admin-page-heading"><div><p className="eyebrow">Storage privado</p><h1>Documentos</h1></div></div><div className="admin-two-columns"><section className="admin-card"><h2>Novo documento</h2>{availableProfiles.length ? <form className="admin-form" onSubmit={submit}><label>Perfil<select value={profileId} onChange={(event) => setProfileId(event.target.value)}>{availableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label>Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} required /></label><label>PDF<input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required /></label><button className="primary">Salvar rascunho</button></form> : <p>Nenhum perfil público autorizado para esta pessoa.</p>}</section><section className="admin-card"><h2>Fila documental</h2><ul className="admin-list">{context.documents.map((document) => <li key={document.id}><span><strong>{document.title}</strong><small>{labels[document.status] || document.status} · {document.original_filename}</small></span><span className="row-actions">{document.status === 'DRAFT' && document.created_by === userId && <button onClick={() => transition(document, 'PENDING_APPROVAL')}>Submeter</button>}{document.status === 'PENDING_APPROVAL' && canDecideOwnable(canModerate, userId, document.created_by) && <><button onClick={() => transition(document, 'APPROVED')}>Aprovar</button><button onClick={() => transition(document, 'REJECTED')}>Rejeitar</button></>}</span></li>)}</ul></section></div>{message && <p className="admin-toast" role="status">{message}</p>}</section>
}

export function UsersPage({ context, refresh }: { context: Context; refresh: () => Promise<void> }) {
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('EDITOR')
  const [inviteOffice, setInviteOffice] = useState<Office>('COMMUNICATION_DIRECTOR')
  const [authAccounts, setAuthAccounts] = useState<AuthAccount[]>([])
  const [userId, setUserId] = useState(context.profiles[0]?.id || '')
  const [role, setRole] = useState<Role>('EDITOR')
  const [office, setOffice] = useState<Office>('COMMUNICATION_DIRECTOR')
  const [contentProfileId, setContentProfileId] = useState(context.contentProfiles[0]?.id || '')
  const selectedUserId = userId || context.profiles[0]?.id || ''

  useEffect(() => {
    let current = true
    if (!supabase) return
    const client = supabase
    void invokeEdge<{ users?: AuthAccount[]; error?: string }>(
      () => client.functions.invoke('admin-users', { body: { action: 'list_users' } }),
      'Não foi possível consultar os estados das contas.',
    ).then((result) => {
      if (!current) return
      if (result.error) setMessage(result.error)
      else setAuthAccounts(result.data?.users || [])
    })
    return () => { current = false }
  }, [context.profiles])

  const invoke = async (body: Record<string, unknown>, success: string) => {
    if (!supabase) return null
    const client = supabase
    const result = await invokeEdge<Record<string, unknown>>(
      () => client.functions.invoke('admin-users', { body }),
      'Não foi possível concluir a ação administrativa.',
    )
    setMessage(result.error || success)
    return result.error ? null : result.data || {}
  }
  const invite = async (event: FormEvent) => {
    event.preventDefault()
    if (await invoke({ action: 'invite', email, full_name: name, role: inviteRole, office: inviteOffice }, 'Convite enviado e função inicial concedida.')) {
      setEmail('')
      setName('')
      await refresh()
    }
  }
  const grant = async () => { if (!supabase) return; const { error } = await supabase.rpc('grant_role', { p_user_id: selectedUserId, p_role: role, p_office: office }); setMessage(error?.message || 'Papel concedido.'); if (!error) await refresh() }
  const permit = async () => { if (!supabase) return; const { error } = await supabase.rpc('set_content_profile_permission', { p_user_id: selectedUserId, p_content_profile_id: contentProfileId, p_can_publish: true, p_active: true }); setMessage(error?.message || 'Autorização editorial concedida.'); if (!error) await refresh() }
  const unpermit = async (permission: Permission) => { if (!supabase) return; const { error } = await supabase.rpc('set_content_profile_permission', { p_user_id: permission.user_id, p_content_profile_id: permission.content_profile_id, p_can_publish: false, p_active: false }); setMessage(error?.message || 'Autorização editorial removida.'); if (!error) await refresh() }
  const revoke = async (id: string) => { if (!supabase) return; const { error } = await supabase.rpc('revoke_role', { p_assignment_id: id }); setMessage(error?.message || 'Papel revogado.'); if (!error) await refresh() }

  const changeActive = async (profile: Profile, auth: AuthAccount | null) => {
    const action = userActivationAction(profile, auth)
    if (!window.confirm(`${action.label} ${profile.full_name}?`)) return
    if (await invoke({ action: 'set_active', user_id: profile.id, active: action.activate }, action.activate ? 'Conta reativada.' : 'Conta desativada.')) await refresh()
  }

  const authById = new Map(authAccounts.map((account) => [account.id, account]))
  const profileIds = new Set(context.profiles.map((profile) => profile.id))
  const accounts = [
    ...context.profiles.map((profile) => ({ profile, auth: authById.get(profile.id) || null })),
    ...authAccounts.filter((account) => !profileIds.has(account.id)).map((auth) => ({ profile: null, auth })),
  ]

  return <section>
    <div className="admin-page-heading"><div><p className="eyebrow">SUPERADM</p><h1>Usuários</h1></div></div>
    <div className="admin-three-columns">
      <section className="admin-card"><h2>Convidar pessoa</h2><form className="admin-form" onSubmit={invite}>
        <label>Nome completo<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <label>E-mail individual<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Papel<select value={inviteRole} onChange={(event) => { const next = event.target.value as Role; setInviteRole(next); setInviteOffice(roleOffices[next][0]) }}>{roles.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Função institucional<select value={inviteOffice} onChange={(event) => setInviteOffice(event.target.value as Office)}>{roleOffices[inviteRole].map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
        <Button><AdminIcon name="user-add" /> Enviar convite e conceder função</Button>
      </form></section>
      <section className="admin-card"><h2>Conceder função</h2><div className="admin-form">
        <label>Pessoa<select value={selectedUserId} onChange={(event) => setUserId(event.target.value)}>{context.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}</select></label>
        <label>Papel<select value={role} onChange={(event) => { const next = event.target.value as Role; setRole(next); setOffice(roleOffices[next][0]) }}>{roles.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Função institucional<select value={office} onChange={(event) => setOffice(event.target.value as Office)}>{roleOffices[role].map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
        <button className="primary" onClick={grant}>Conceder</button>
      </div></section>
      <section className="admin-card"><h2>Autorizar perfil público</h2><div className="admin-form">
        <label>Pessoa<select value={selectedUserId} onChange={(event) => setUserId(event.target.value)}>{context.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}</select></label>
        <label>Perfil<select value={contentProfileId} onChange={(event) => setContentProfileId(event.target.value)}>{context.contentProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
        <button onClick={permit}>Autorizar publicação</button>
      </div></section>
    </div>
    <section className="admin-card"><h2>Contas e papéis</h2><ul className="admin-list">{accounts.map(({ profile, auth }) => {
      const assignments = profile ? context.assignments.filter((assignment) => assignment.user_id === profile.id && assignment.active) : []
      const state = operationalAccountState(profile, assignments.length > 0, auth)
      const name = profile?.full_name || auth?.email || 'Conta não identificada'
      return <li key={profile?.id || auth?.id}><span><strong>{name}</strong>
        {auth?.email && profile && <small>{auth.email}</small>}
        <small><strong>Estado: {state}</strong></small>
        {assignments.map((assignment) => <small key={assignment.id}>{assignment.role} · {labels[assignment.office]} <Button size="xs" variant="destructive" onClick={() => revoke(assignment.id)}><AdminIcon name="lock" /> Revogar</Button></small>)}
        {profile && context.permissions.filter((permission) => permission.user_id === profile.id && permission.active).map((permission) => <small key={permission.content_profile_id}>Pode publicar como {context.contentProfiles.find(({ id }) => id === permission.content_profile_id)?.name} <Button size="xs" variant="destructive" onClick={() => unpermit(permission)}><AdminIcon name="trash" /> Remover vínculo</Button></small>)}
      </span><span className="row-actions">{profile && <Button variant={userActivationAction(profile, auth).activate ? 'outline' : 'destructive'} onClick={() => changeActive(profile, auth)}>{!userActivationAction(profile, auth).activate && <AdminIcon name="lock" />} {userActivationAction(profile, auth).label}</Button>}</span></li>
    })}</ul></section>
    {message && <p className="admin-toast" role="status">{message}</p>}
  </section>
}

export function SecurityPage({ session, context, superadmin, refresh }: { session: Session; context: Context; superadmin: boolean; refresh: () => Promise<void> }) {
  const [factors, setFactors] = useState<{ id: string; friendly_name?: string; status: string }[]>([])
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState(context.profiles[0]?.id || '')
  const [successionAssignmentId, setSuccessionAssignmentId] = useState(context.assignments.find(({ active }) => active)?.id || '')
  const [successorId, setSuccessorId] = useState(context.profiles.find(({ active }) => active)?.id || '')
  useEffect(() => { void supabase?.auth.mfa.listFactors().then(({ data, error }) => { setFactors(data?.totp || []); setMessage(error?.message || '') }) }, [])
  const remove = async (id: string) => {
    if (!supabase || !window.confirm('Revogar este fator encerra a proteção atual e exigirá novo cadastro. Continuar?')) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
    if (error) setMessage(error.message)
    else {
      forgetAdminSession(session.access_token)
      await supabase.auth.signOut({ scope: 'global' })
    }
  }
  const invoke = async (body: Record<string, unknown>) => {
    if (!supabase) return null
    const client = supabase
    const result = await invokeEdge<Record<string, unknown>>(
      () => client.functions.invoke('admin-users', { body }),
      'Não foi possível concluir a ação de segurança.',
    )
    setMessage(result.error || 'Ação concluída.')
    return result.error && !result.data?.transfer_complete ? null : result.data || {}
  }
  const revokeMfa = async () => { if (await invoke({ action: 'reset_mfa', user_id: userId })) await refresh() }
  const transfer = async () => {
    const assignment = context.assignments.find(({ id }) => id === successionAssignmentId)
    if (!assignment || !confirmCustodyTransfer((message) => window.confirm(message))) return
    if (await invoke({ action: 'transfer_custody', assignment_id: assignment.id, user_id: successorId, role: assignment.role, office: assignment.office })) await refresh()
  }
  return <section><div className="admin-page-heading"><div><p className="eyebrow">Conta individual</p><h1>Segurança</h1></div></div><section className="admin-card"><h2>MFA</h2><p>{session.user.email}</p><ul className="admin-list">{factors.map((factor) => <li key={factor.id}><span>{factor.friendly_name || 'Aplicativo autenticador'} · {factor.status}</span><Button variant="destructive" onClick={() => remove(factor.id)}><AdminIcon name="lock" /> Revogar e reconfigurar</Button></li>)}</ul><Button variant="destructive" onClick={() => { forgetAdminSession(session.access_token); void supabase?.auth.signOut({ scope: 'global' }) }}><AdminIcon name="logout" /> Encerrar todas as minhas sessões</Button><p>Se o dispositivo for perdido, outro SUPERADM deve revogar o MFA. Não há segredo de recuperação armazenado pelo portal.</p></section>{superadmin && <div className="admin-two-columns"><section className="admin-card"><h2>Revogar MFA</h2><div className="admin-form"><label>Pessoa<select value={userId} onChange={(event) => setUserId(event.target.value)}>{context.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}</select></label><Button variant="destructive" onClick={revokeMfa}><AdminIcon name="lock" /> Revogar MFA</Button></div></section><section className="admin-card"><h2>Transferir custódia</h2><div className="admin-form"><label>Atribuição atual<select value={successionAssignmentId} onChange={(event) => setSuccessionAssignmentId(event.target.value)}>{context.assignments.filter(({ active }) => active).map((assignment) => <option key={assignment.id} value={assignment.id}>{context.profiles.find(({ id }) => id === assignment.user_id)?.full_name} · {assignment.role} · {labels[assignment.office]}</option>)}</select></label><label>Sucessor(a)<select value={successorId} onChange={(event) => setSuccessorId(event.target.value)}>{context.profiles.filter(({ active }) => active).map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}</select></label><Button variant="destructive" onClick={transfer}><AdminIcon name="lock" /> Transferir e encerrar anterior</Button></div></section></div>}{message && <p className="admin-toast" role="status">{message}</p>}</section>
}

function AdminShell({ session }: { session: Session }) {
  const [path, setPath] = useState(location.pathname)
  const [context, setContext] = useState<Context | null>(null)
  const [message, setMessage] = useState('Carregando escopo administrativo…')
  useEffect(() => { const update = () => setPath(location.pathname); addEventListener('popstate', update); return () => removeEventListener('popstate', update) }, [])
  const refresh = async () => { try { setContext(await loadContext()); setMessage('') } catch (error) { setMessage(messageOf(error)) } }
  useEffect(() => {
    let active = true
    void loadContext().then((data) => { if (active) { setContext(data); setMessage('') } }).catch((error) => { if (active) setMessage(messageOf(error)) })
    return () => { active = false }
  }, [])
  const userRoles = useMemo(() => context?.assignments.filter((assignment) => assignment.user_id === session.user.id && assignment.active).map(({ role }) => role) || [], [context, session.user.id])
  const superadmin = userRoles.includes('SUPERADMIN')
  const canModerate = superadmin || userRoles.includes('ADMIN')
  const nav = adminRoutes(canModerate, superadmin)
  if (!context) return <main className="admin-login"><p role="status">{message}</p></main>
  let page = <Dashboard />
  if (path.startsWith('/admin/posts')) page = <PostsPage context={context} userId={session.user.id} roles={userRoles} refresh={refresh} selectedId={path.split('/')[3]} />
  else if (path === '/admin/documents') page = <DocumentsPage context={context} userId={session.user.id} refresh={refresh} />
  else if (path === '/admin/hashtags' && canModerate) page = <HashtagsPage context={context} refresh={refresh} />
  else if (path === '/admin/profiles' && superadmin) page = <ContentProfilesPage context={context} refresh={refresh} />
  else if (path === '/admin/users' && superadmin) page = <UsersPage context={context} refresh={refresh} />
  else if (path === '/admin/security') page = <SecurityPage session={session} context={context} superadmin={superadmin} refresh={refresh} />
  return <><header className="admin-topbar"><a href="/" onClick={(event) => { event.preventDefault(); route('/') }}>CARB</a><div><span>{userRoles.join(' · ')}</span><Button variant="outline" onClick={() => { forgetAdminSession(session.access_token); void supabase?.auth.signOut() }}><AdminIcon name="logout" /> Sair</Button></div></header><div className="admin-layout"><aside><nav aria-label="Painel administrativo">{nav.map(([href, label]) => <a key={href} href={href} aria-current={path === href || (href === '/admin/posts' && path.startsWith('/admin/posts/')) ? 'page' : undefined} onClick={(event) => { event.preventDefault(); route(href) }}>{href === '/admin/security' && <AdminIcon name="settings" />}{label}</a>)}</nav></aside><main className="admin-content" id="conteudo">{page}{message && <p role="status">{message}</p>}</main></div></>
}

export function AdminApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  const [aal2, setAal2] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')
  const [needsPassword, setNeedsPassword] = useState(() => typeof window !== 'undefined' && /(?:[?#&])type=(?:invite|recovery)/.test(location.href))
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((event, next) => { setSession(next); if (next) setLoginMessage(''); if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true); if (!next) setAal2(false) })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session || needsPassword || !supabase) return
    const client = supabase
    const deadline = adminSessionDeadline(session.access_token)
    const expire = () => {
      forgetAdminSession(session.access_token)
      setLoginMessage('Sua sessão administrativa de 60 minutos expirou. Entre novamente.')
      void client.auth.signOut()
    }
    if (!deadline || deadline <= Date.now()) {
      expire()
      return
    }
    const timer = window.setTimeout(expire, deadline - Date.now())
    return () => window.clearTimeout(timer)
  }, [needsPassword, session])
  useEffect(() => {
    if (!session || !aal2 || !supabase) return
    const key = `carb:login-audit:${session.user.id}:${session.expires_at}`
    if (sessionStorage.getItem(key)) return
    void supabase.rpc('record_login_success').then(({ error }) => { if (!error) sessionStorage.setItem(key, '1') })
  }, [session, aal2])
  if (!supabaseConfigured) return <main className="admin-login"><a href="/">← Voltar ao portal</a><section className="admin-login-card"><p className="eyebrow">Configuração necessária</p><h1>Supabase não configurado</h1><p>Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>. Não use a chave <code>service_role</code> no frontend.</p></section></main>
  if (!ready) return <main className="admin-login"><p role="status">Validando sessão…</p></main>
  if (!session) return <Login initialMessage={loginMessage} />
  if (needsPassword) return <PasswordSetup onDone={async () => {
    forgetAdminSession(session.access_token)
    await supabase?.auth.signOut()
    history.replaceState({}, '', '/admin')
    setNeedsPassword(false)
    setLoginMessage('Senha definida. Entre com sua conta individual e confirme o MFA.')
  }} />
  if (!aal2) return <MfaGate onVerified={setAal2} />
  return <AdminShell session={session} />
}
