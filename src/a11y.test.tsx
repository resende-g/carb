// @vitest-environment jsdom
import axe from 'axe-core'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import App from './App'
import {
  AdminApp,
  ContentProfilesPage,
  DocumentsPage,
  HashtagsPage,
  InteractionChart,
  Login,
  PostsPage,
  ReactionChart,
  SecurityPage,
  UsersPage,
} from './admin/AdminApp'

// Contraste vive em design-tokens.test.ts: axe precisa de layout real para medir cor.
// As rotas públicas rodam o conjunto completo; os trechos administrativos são
// fragmentos montados fora do AdminShell, então as regras de documento inteiro
// não se aplicam a eles.
const fragmentRules = {
  'color-contrast': { enabled: false },
  region: { enabled: false },
  'landmark-one-main': { enabled: false },
  'page-has-heading-one': { enabled: false },
  bypass: { enabled: false },
}
const pageRules = { 'color-contrast': { enabled: false } }

async function issues(markup: string, rules: axe.RuleObject = fragmentRules, prepare?: (root: HTMLElement) => void) {
  document.body.innerHTML = markup
  prepare?.(document.body)
  const { violations } = await axe.run(document.body, { rules, resultTypes: ['violations'] })
  return violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`)
}

const session = { user: { id: 'user-1', email: 'pessoa@example.invalid' } }
const context = {
  profiles: [
    { id: 'user-1', full_name: 'Pessoa sintética', active: true },
    { id: 'user-2', full_name: 'Pessoa inativa', active: false },
  ],
  assignments: [{ id: 'assignment-1', user_id: 'user-1', role: 'SUPERADMIN', office: 'STI_ADMIN', active: true }],
  contentProfiles: [{ id: 'profile-1', name: 'Perfil sintético', slug: 'perfil-sintetico', avatar_path: 'profile-avatars/profile-1/avatar.png', avatar_url: 'https://example.invalid/avatar.png', description: '', active: true }],
  permissions: [{ user_id: 'user-1', content_profile_id: 'profile-1', can_publish: true, active: true }],
  hashtags: [
    { id: 'tag-1', name: 'Azulada', slug: 'azulada', color: 'blue', active: true },
    { id: 'tag-2', name: 'Rubra', slug: 'rubra', color: 'red', active: false },
  ],
  posts: [
    { id: 'post-1', content_profile_id: 'profile-1', title: 'Rascunho sintético', body: 'Texto', category: 'Teste', status: 'DRAFT', created_by: 'user-1', rejection_reason: null, media_path: null, media_alt: null, media_mime_type: null, media_size_bytes: null, created_at: '2026-08-31T00:00:00Z' },
    { id: 'post-2', content_profile_id: 'profile-1', title: 'Aviso publicado sintético', body: 'Texto', category: 'Teste', status: 'PUBLISHED', created_by: 'user-1', rejection_reason: null, media_path: null, media_alt: null, media_mime_type: null, media_size_bytes: null, created_at: '2026-08-31T00:00:00Z' },
  ],
  postHashtags: [{ post_id: 'post-1', hashtag_id: 'tag-1' }],
  revisions: [],
  documents: [{ id: 'doc-1', content_profile_id: 'profile-1', title: 'Documento sintético', description: 'Descrição', status: 'DRAFT', storage_path: 'documents/user-1/arquivo.pdf', original_filename: 'arquivo.pdf', created_by: 'user-1', decision_reason: null, created_at: '2026-08-31T00:00:00Z' }],
}
const chartPosts = [
  { post_id: 'post-1', title: 'Aviso sintético com reações', total: 10, heart: 5, point: 3, skull: 1, dance: 1 },
  { post_id: 'post-2', title: 'Aviso sintético sem reações', total: 0, heart: 0, point: 0, skull: 0, dance: 0 },
]

const refresh = async () => undefined
const portal = (path: string) => {
  history.replaceState({}, '', path)
  return renderToStaticMarkup(<App />)
}

beforeAll(() => {
  document.documentElement.lang = 'pt-BR'
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as never
})

describe('acessibilidade automatizável do portal público', () => {
  it.each([
    ['avisos, busca e reações', '/'],
    ['planejador de matrícula', '/planejador'],
    ['sistemas', '/sistemas'],
    ['acervo', '/acervo'],
  ])('não introduz barreira automática em %s', async (_name, path) => {
    expect(await issues(portal(path), pageRules)).toEqual([])
  })

  it('não introduz barreira automática no menu principal aberto', async () => {
    const open = (root: HTMLElement) => root.querySelector('#main-menu')?.removeAttribute('hidden')
    expect(await issues(portal('/'), pageRules, open)).toEqual([])
  })
})

describe('acessibilidade automatizável do painel administrativo', () => {
  it.each([
    ['login administrativo', () => <Login />],
    ['aviso de configuração ausente', () => <AdminApp />],
    ['publicações e formulário editorial', () => <PostsPage context={context as never} userId="user-1" roles={['SUPERADMIN'] as never} refresh={refresh} />],
    ['acervo administrativo', () => <DocumentsPage context={context as never} userId="user-1" refresh={refresh} />],
    ['hashtags e paleta de cores', () => <HashtagsPage context={context as never} refresh={refresh} />],
    ['perfis de conteúdo', () => <ContentProfilesPage context={context as never} refresh={refresh} />],
    ['contas e papéis', () => <UsersPage context={context as never} refresh={refresh} />],
    ['segurança da conta', () => <SecurityPage session={session as never} context={context as never} superadmin refresh={refresh} />],
    ['gráfico de interações', () => <InteractionChart posts={chartPosts} windowLabel="últimos 7 dias" />],
    ['gráfico de reações', () => <ReactionChart posts={chartPosts} windowLabel="últimos 7 dias" />],
    ['gráficos sem dados', () => <><InteractionChart posts={[]} windowLabel="últimos 7 dias" /><ReactionChart posts={[]} windowLabel="últimos 7 dias" /></>],
  ])('não introduz barreira automática em %s', async (_name, render) => {
    expect(await issues(renderToStaticMarkup(render()))).toEqual([])
  })
})
