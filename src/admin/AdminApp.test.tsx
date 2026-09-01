import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AdminApp, ContentProfilesPage, PostsPage, SecurityPage, UsersPage } from './AdminApp'

const refresh = async () => undefined
const context = {
  profiles: [
    { id: 'user-1', full_name: 'Pessoa sintética', active: true },
    { id: 'user-2', full_name: 'Pessoa inativa', active: false },
    { id: 'user-3', full_name: 'Pessoa sem função', active: true },
  ],
  assignments: [{ id: 'assignment-1', user_id: 'user-1', role: 'SUPERADMIN', office: 'STI_ADMIN', active: true }],
  contentProfiles: [{ id: 'profile-1', name: 'Perfil sintético', slug: 'perfil-sintetico', avatar_path: 'profile-avatars/profile-1/avatar.png', avatar_url: 'https://example.invalid/avatar.png', description: '', active: true }],
  permissions: [{ user_id: 'user-1', content_profile_id: 'profile-1', can_publish: true, active: true }],
  hashtags: [{ id: 'tag-1', name: 'Teste', slug: 'teste', color: 'blue', active: true }],
  posts: [{ id: 'post-1', content_profile_id: 'profile-1', title: 'Rascunho sintético', body: 'Texto', category: 'Teste', status: 'DRAFT', created_by: 'user-1', rejection_reason: null, media_path: null, media_alt: null, media_mime_type: null, media_size_bytes: null, created_at: '2026-08-31T00:00:00Z' }],
  postHashtags: [{ post_id: 'post-1', hashtag_id: 'tag-1' }],
  revisions: [],
  documents: [],
}

describe('entrada administrativa', () => {
  it('não oferece credencial simulada quando o Supabase não está configurado', () => {
    const html = renderToStaticMarkup(<AdminApp />)
    expect(html).toContain('Supabase não configurado')
    expect(html).toContain('VITE_SUPABASE_URL')
    expect(html).not.toContain('VITE_ADMIN_USERNAME')
    expect(html).not.toContain('editor@carb')
  })

  it('mantém workflow acima da lista e mostra edição, exclusão e miniatura', () => {
    const posts = renderToStaticMarkup(<PostsPage context={context as never} userId="user-1" roles={['EDITOR']} refresh={refresh} />)
    expect(posts.indexOf('Workflow editorial')).toBeLessThan(posts.indexOf('Publicações e rascunhos'))
    expect(posts).toContain('Editar')
    expect(posts).toContain('Excluir')
    const profiles = renderToStaticMarkup(<ContentProfilesPage context={context as never} refresh={refresh} />)
    expect(profiles).toContain('Foto atual de Perfil sintético')
    expect(profiles).toMatch(/admin-icon[\s\S]*Trocar foto/)
  })

  it('separa ações de usuários das ações sensíveis de segurança', () => {
    const users = renderToStaticMarkup(<UsersPage context={context as never} refresh={refresh} />)
    expect(users).toContain('admin-three-columns')
    expect(users.indexOf('Convidar pessoa')).toBeLessThan(users.indexOf('Contas e papéis'))
    expect(users).not.toContain('Revogar MFA')
    expect(users).not.toContain('Transferir custódia')

    const session = { user: { id: 'user-1', email: 'pessoa@example.invalid' } }
    const security = renderToStaticMarkup(<SecurityPage session={session as never} context={context as never} superadmin refresh={refresh} />)
    expect(security).toContain('Revogar MFA')
    expect(security).toContain('Transferir custódia')
    expect(security).toContain('data-variant="destructive"')
    expect(security).toContain('admin-icon')
    const regularSecurity = renderToStaticMarkup(<SecurityPage session={session as never} context={context as never} superadmin={false} refresh={refresh} />)
    expect(regularSecurity).not.toContain('Transferir custódia')
  })

  it('mostra onboarding com função e a ação correta para contas ativas e inativas', () => {
    const users = renderToStaticMarkup(<UsersPage context={context as never} refresh={refresh} />)
    expect(users).toContain('Enviar convite e conceder função')
    expect(users).toContain('Diretoria de Comunicação')
    expect(users).toMatch(/Pessoa sintética[\s\S]*Estado: Ativa[\s\S]*Desativar/)
    expect(users).toMatch(/Pessoa inativa[\s\S]*Estado: Inativa[\s\S]*Reativar/)
    expect(users).toMatch(/Pessoa sem função[\s\S]*Estado: Sem função[\s\S]*Desativar/)
  })
})
