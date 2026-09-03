import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AdminApp, ContentProfilesPage, HashtagsPage, InteractionChart, PostsPage, ReactionChart, SecurityPage, UsersPage } from './AdminApp'
import { reactionRows } from './metrics'

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
    expect(profiles).toContain('aria-label="Perfil Perfil sintético ativo"')
    expect(profiles).toContain('role="switch"')
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

  it('mostra onboarding com função e o estado correto para contas ativas e inativas', () => {
    const users = renderToStaticMarkup(<UsersPage context={context as never} refresh={refresh} />)
    expect(users).toContain('Enviar convite e conceder função')
    expect(users).toContain('Diretoria de Comunicação')
    expect(users).toContain('aria-label="Conta de Pessoa sintética ativa" checked=""')
    expect(users).toContain('aria-label="Conta de Pessoa inativa ativa"/>')
    expect(users).toContain('aria-label="Conta de Pessoa sem função ativa" checked=""')
  })
})

const chartPosts = [
  { post_id: 'post-1', title: 'Aviso sintético com reações', total: 10, heart: 5, point: 3, skull: 1, dance: 1 },
  { post_id: 'post-2', title: 'Aviso sintético sem reações', total: 0, heart: 0, point: 0, skull: 0, dance: 0 },
]

describe('gráficos do dashboard', () => {
  it('converte as contagens do JSON para números antes de escalar', () => {
    const metrics = { reactions_by_post: [{ post_id: 'post-1', title: 'Aviso', total: '10', heart: '5', point: '3', skull: '1', dance: '1' }] }
    expect(reactionRows(metrics as never)).toEqual([{ post_id: 'post-1', title: 'Aviso', total: 10, heart: 5, point: 3, skull: 1, dance: 1 }])
    expect(reactionRows(null)).toEqual([])
  })

  it('escala as barras de interação pelo maior total e mantém o número visível', () => {
    const html = renderToStaticMarkup(<InteractionChart posts={chartPosts} windowLabel="últimos 7 dias" />)
    expect(html).toContain('Aviso sintético com reações')
    expect(html).toContain('style="width:100%"')
    expect(html).toContain('style="width:0%"')
    expect(html).toContain('<strong class="bar-chart-value">10</strong>')
    expect(html).toContain('<strong class="bar-chart-value">0</strong>')
  })

  it('renderiza os quatro emojis com número, ícone decorativo e nome acessível', () => {
    const html = renderToStaticMarkup(<ReactionChart posts={chartPosts} windowLabel="últimos 7 dias" />)
    for (const icon of ['smiling-face-with-open-mouth_1f6030', 'crying-face_1f6220', 'no-entry-sign_1f6ab0', 'kiss-mark_1f48b']) expect(html).toContain(`/icons/${icon}.png`)
    expect(html).toContain('aria-label="Rosto sorridente: 5 reações"')
    expect(html).toContain('aria-label="Sinal de proibido: 1 reação"')
    expect(html).toContain('aria-label="Marca de beijo: 0 reações"')
    expect(html).toContain('alt=""')
    expect(html).toContain('style="height:100%"')
    expect(html).toContain('style="height:0%"')
  })

  it('explica o conjunto vazio nos dois gráficos', () => {
    expect(renderToStaticMarkup(<InteractionChart posts={[]} windowLabel="últimos 7 dias" />)).toContain('Nenhuma publicação visível na janela selecionada.')
    expect(renderToStaticMarkup(<ReactionChart posts={[]} windowLabel="todo o histórico persistido" />)).toContain('Nenhuma publicação visível na janela selecionada.')
  })
})

describe('paleta de hashtags', () => {
  const palette = [
    { id: 'tag-blue', name: 'Azulada', slug: 'azulada', color: 'blue', active: true },
    { id: 'tag-green', name: 'Verdejante', slug: 'verdejante', color: 'green', active: true },
    { id: 'tag-gold', name: 'Dourada', slug: 'dourada', color: 'gold', active: true },
    { id: 'tag-violet', name: 'Violácea', slug: 'violacea', color: 'violet', active: true },
    { id: 'tag-red', name: 'Rubra', slug: 'rubra', color: 'red', active: false },
    { id: 'tag-gray', name: 'Acinzentada', slug: 'acinzentada', color: 'gray', active: true },
  ]
  const html = renderToStaticMarkup(<HashtagsPage context={{ ...context, hashtags: palette } as never} refresh={refresh} />)

  it('mostra bolinha com nome em português para os seis valores persistidos', () => {
    for (const [color, label] of [['blue', 'Azul'], ['green', 'Verde'], ['gold', 'Dourado'], ['violet', 'Violeta'], ['red', 'Vermelho'], ['gray', 'Cinza']]) {
      expect(html).toContain(`background:var(--hashtag-${color}, var(--hashtag-gray))`)
      expect(html).toContain(`aria-label="${label}" title="${label}"`)
    }
  })

  it('não exibe token em inglês como texto visível', () => {
    const visible = html.replace(/<[^>]*>/g, ' ')
    for (const token of ['blue', 'green', 'gold', 'violet', 'red', 'gray']) expect(visible).not.toContain(token)
  })

  it('preserva o valor enviado ao banco e substitui o prompt de cor por radios acessíveis', () => {
    for (const color of ['blue', 'green', 'gold', 'violet', 'red', 'gray']) expect(html).toContain(`value="${color}"/>`)
    expect(html.match(/name="hashtag-cor-tag-blue"/g)).toHaveLength(6)
    expect(html).toContain('aria-label="Azul" name="hashtag-cor-tag-blue" checked="" value="blue"')
    expect(html).toContain('<legend>Cor de #Azulada</legend>')
    expect(html).toContain('Renomear')
  })
})
