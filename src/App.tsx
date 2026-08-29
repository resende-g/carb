import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import academicDataJson from './academic-data.json'
import { parseOfferingsCsv } from './admin'
import { HashtagChip } from './components/HashtagChip'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Separator } from './components/ui/separator'
import { documents, hashtags as initialHashtags, notices, profiles as initialProfiles, systems, type DocumentItem, type Hashtag, type HashtagColor, type Notice, type Profile, type ReactionCounts } from './data'
import { filterNotices, removeHashtag } from './feed'
import { activeHashtags, hashtagSlug, normalizeHashtagName, uniqueHashtagIds } from './hashtags'
import { meetingLabel, selectionIssue, TIME_ROWS, type ClassOffering, type SelectionIssue, type Semester, type Shift } from './planner'

type Tab = 'avisos' | 'sistemas' | 'planejador' | 'acervo'
type Reaction = keyof ReactionCounts
type Curriculum = {
  name: string
  semesters: number
  requiredHours: number
  optionalHours: number
  complementaryHours: number
  totalHours: number
  components: Record<string, Semester>
}
type AcademicData = {
  source: { period: string; classesReportIssued: string; curriculumIssued: string; notice: string }
  curricula: { day: Curriculum; night: Curriculum }
  componentTitles: Record<string, string>
  offerings: ClassOffering[]
}

const academicData = academicDataJson as AcademicData
const REACTIONS_KEY = 'carb:reactions'
const COMPLETED_KEY = 'carb:completed-components'
const THEME_KEY = 'carb:theme'
const ADMIN_SESSION_KEY = 'carb:admin-session'
const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || ''
const ADMIN_PASSWORD_HASH = import.meta.env.VITE_ADMIN_PASSWORD_HASH || ''
const REACTION_OPTIONS: { key: Reaction; icon: string; label: string }[] = [
  { key: 'heart', icon: '/icons/coracao-24.png', label: 'Coração' },
  { key: 'point', icon: '/icons/dedo-24.png', label: 'Indicador' },
  { key: 'skull', icon: '/icons/caveira-24.png', label: 'Caveira' },
  { key: 'dance', icon: '/icons/danca-24.png', label: 'Dançarina' },
]
const TAB_LABELS: Record<Tab, string> = { avisos: 'Avisos', sistemas: 'Sistemas', planejador: 'Planejador', acervo: 'Acervo documental' }
const NAVIGATION: { tab: Exclude<Tab, 'avisos'>; label: string; icon: string }[] = [
  { tab: 'planejador', label: 'Montador de grade', icon: '/icons/calendario-24.png' },
  { tab: 'sistemas', label: 'Sistemas', icon: '/icons/configuracoes-24.png' },
  { tab: 'acervo', label: 'Acervo', icon: '/icons/acervo-24.png' },
]
const WEEKDAYS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const WEEKDAY_LABELS: Record<string, string> = { segunda: 'Seg.', terça: 'Ter.', quarta: 'Qua.', quinta: 'Qui.', sexta: 'Sex.', sábado: 'Sáb.' }
const HASHTAG_COLORS: { value: HashtagColor; label: string }[] = [
  { value: 'blue', label: 'Azul' }, { value: 'green', label: 'Verde' }, { value: 'gold', label: 'Dourado' },
  { value: 'violet', label: 'Violeta' }, { value: 'red', label: 'Vermelho' }, { value: 'gray', label: 'Cinza' },
]

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function writeLocal<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // O protótipo continua funcional quando o navegador bloqueia armazenamento local.
  }
}

const readAdminSession = () => {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'authenticated'
  } catch {
    return false
  }
}

const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map((byte) => byte.toString(16).padStart(2, '0')).join('')

const normalized = (value: string) => value.trim().toLocaleLowerCase('pt-BR')
const semesterLabel = (value: Semester) => typeof value === 'number' ? `${value}º semestre` : value === 'optativa' ? 'Optativa' : 'Outras ofertas'

function Avatar({ profile }: { profile: Profile }) {
  return (
    <span className="avatar" aria-hidden="true" style={{ backgroundImage: `url(${profile.avatar})`, backgroundPosition: profile.avatarPosition }}>
      <span>{profile.shortName}</span>
    </span>
  )
}

function ProfileIconEditor({ profile, onChange }: { profile: Profile; onChange: (avatar: string) => void }) {
  const [message, setMessage] = useState('')
  const changeIcon = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setMessage('Use uma imagem de até 2 MB.')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onChange(String(reader.result))
      setMessage('Ícone alterado nesta sessão administrativa.')
    }
    reader.onerror = () => setMessage('Não foi possível ler a imagem.')
    reader.readAsDataURL(file)
  }

  return (
    <div className="avatar-editor">
      <label>Alterar ícone<input type="file" accept="image/*" onChange={changeIcon} aria-label={`Alterar ícone de @${profile.handle}`} /></label>
      {message && <small role="status">{message}</small>}
    </div>
  )
}

function ProfileCreator({ profiles, onCreate }: { profiles: Profile[]; onCreate: (profile: Profile) => void }) {
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [message, setMessage] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanHandle = handle.toLocaleLowerCase('pt-BR')
    const cleanName = name.trim()
    if (!cleanName) {
      setMessage('Informe o nome da entidade.')
      return
    }
    if (!/^[a-z0-9]{3,30}$/.test(cleanHandle)) {
      setMessage('Use de 3 a 30 letras minúsculas ou números, sem espaços e sem caracteres especiais.')
      return
    }
    if (profiles.some((profile) => profile.handle === cleanHandle)) {
      setMessage('Este @ já está em uso.')
      return
    }
    onCreate({ handle: cleanHandle, name: cleanName, shortName: cleanName.slice(0, 2).toLocaleUpperCase('pt-BR'), bio: 'Perfil institucional demonstrativo.', avatar: '/og.png', avatarPosition: '30% 76%' })
    setName('')
    setHandle('')
    setMessage(`@${cleanHandle} criado somente nesta sessão.`)
  }

  return (
    <details className="admin-demo">
      <summary>Criar perfil de entidade</summary>
      <p>A alteração permanece somente nesta sessão da v1.2.</p>
      <form onSubmit={submit}>
        <label htmlFor="entity-name">Nome da entidade</label>
        <input id="entity-name" value={name} onChange={(event) => setName(event.target.value)} required />
        <label htmlFor="entity-handle">@ único</label>
        <div className="handle-input"><span>@</span><input id="entity-handle" value={handle} onChange={(event) => setHandle(event.target.value)} pattern="[a-z0-9]{3,30}" required /></div>
        <button className="primary" type="submit">Criar perfil</button>
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
    </details>
  )
}

function CsvImporter({ onImport }: { onImport: (offerings: ClassOffering[]) => void }) {
  const [message, setMessage] = useState('')

  const change = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      if (!file.name.toLocaleLowerCase('pt-BR').endsWith('.csv') || file.size > 5 * 1024 * 1024) throw new Error('Use um arquivo CSV de até 5 MB.')
      const offerings = parseOfferingsCsv(await file.text(), academicData.source.period)
      onImport(offerings)
      setMessage(`${offerings.length} turma(s) carregada(s) nesta sessão.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível ler o CSV.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <section className="admin-card">
      <p className="eyebrow">Planejador</p>
      <h2>Importar turmas por CSV</h2>
      <p>Substitui temporariamente o catálogo do planejador. O arquivo não deve conter dados de estudantes.</p>
      <label className="file-button">Selecionar CSV<input type="file" accept=".csv,text/csv" onChange={change} /></label>
      {message && <p className="form-message" role="status">{message}</p>}
    </section>
  )
}

function DocumentUploader({ onUpload }: { onUpload: (document: DocumentItem) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || (!file.name.toLocaleLowerCase('pt-BR').endsWith('.pdf') && file.type !== 'application/pdf') || file.size > 10 * 1024 * 1024) {
      setMessage('Use um PDF de até 10 MB.')
      return
    }
    onUpload({ id: `document-${Math.round(event.timeStamp)}`, title: title.trim(), description: description.trim(), updatedAt: `Adicionado em ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`, file: URL.createObjectURL(file) })
    setTitle('')
    setDescription('')
    setFile(null)
    event.currentTarget.reset()
    setMessage('Documento adicionado ao acervo desta sessão.')
  }

  return (
    <section className="admin-card">
      <p className="eyebrow">Acervo</p>
      <h2>Adicionar documento</h2>
      <form className="admin-form" onSubmit={submit}>
        <label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
        <label>Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} required /></label>
        <label>Arquivo PDF<input type="file" accept=".pdf,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required /></label>
        <button className="primary" type="submit">Adicionar ao acervo</button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
    </section>
  )
}

function HashtagManager({ hashtags, notices, onCreate, onUpdate, onDelete, onDetach }: {
  hashtags: Hashtag[]
  notices: Notice[]
  onCreate: (hashtag: Hashtag) => void
  onUpdate: (hashtag: Hashtag) => void
  onDelete: (hashtagId: string) => void
  onDetach: (hashtagId: string) => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<HashtagColor>('blue')
  const [message, setMessage] = useState('')

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanName = normalizeHashtagName(name)
    const slug = hashtagSlug(cleanName)
    if (!cleanName || !slug) return
    if (hashtags.some((hashtag) => normalized(hashtag.name) === normalized(cleanName) || normalized(hashtag.slug) === normalized(slug))) {
      setMessage('Já existe uma hashtag com esse nome ou slug.')
      return
    }
    onCreate({ id: `hashtag-${slug}`, name: cleanName, slug, color, active: true })
    setName('')
    setMessage(`Hashtag “#${cleanName}” criada nesta sessão.`)
  }

  const rename = (hashtag: Hashtag, value: string) => {
    const cleanName = normalizeHashtagName(value)
    const slug = hashtagSlug(cleanName)
    if (!cleanName || !slug || hashtags.some((item) => item.id !== hashtag.id && (normalized(item.name) === normalized(cleanName) || normalized(item.slug) === normalized(slug)))) {
      setMessage('Nome inválido ou já utilizado; a hashtag não foi alterada.')
      return
    }
    onUpdate({ ...hashtag, name: cleanName, slug })
    setMessage(`Hashtag atualizada para #${cleanName}.`)
  }

  const deleteHashtag = (hashtag: Hashtag) => {
    const affected = notices.filter((notice) => notice.hashtagIds.includes(hashtag.id)).length
    if (!window.confirm(`Excluir “#${hashtag.name}”? ${affected} publicação(ões) perderá(ão) esta associação.`)) return
    onDelete(hashtag.id)
    setMessage(`Hashtag “#${hashtag.name}” excluída; ${affected} publicação(ões) afetada(s).`)
  }

  return (
    <section className="admin-card hashtag-manager">
      <p className="eyebrow">Classificação</p>
      <h2>Hashtags globais</h2>
      <p>Classificam temas e podem ser usadas por publicações de qualquer perfil.</p>
      <form className="admin-form compact-form" onSubmit={create}>
        <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <label>Cor<select value={color} onChange={(event) => setColor(event.target.value as HashtagColor)}>{HASHTAG_COLORS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <button className="primary" type="submit">Criar hashtag</button>
      </form>
      <div className="hashtag-admin-list">
        {hashtags.map((hashtag) => <div key={hashtag.id} className="hashtag-admin-row">
          <input aria-label={`Nome da hashtag ${hashtag.name}`} defaultValue={hashtag.name} onBlur={(event) => rename(hashtag, event.target.value)} />
          <select aria-label={`Cor da hashtag ${hashtag.name}`} value={hashtag.color} onChange={(event) => onUpdate({ ...hashtag, color: event.target.value as HashtagColor })}>{HASHTAG_COLORS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <label className="hashtag-active"><input type="checkbox" checked={hashtag.active} onChange={(event) => onUpdate({ ...hashtag, active: event.target.checked })} />Ativa</label>
          <div className="hashtag-admin-actions"><button type="button" disabled={!notices.some((notice) => notice.hashtagIds.includes(hashtag.id))} onClick={() => { const affected = notices.filter((notice) => notice.hashtagIds.includes(hashtag.id)).length; onDetach(hashtag.id); setMessage(`${affected} associação(ões) removida(s); a hashtag foi mantida.`) }}>Desassociar</button><button type="button" onClick={() => deleteHashtag(hashtag)}>Excluir</button></div>
        </div>)}
      </div>
      {message && <p className="form-message" role="status">{message}</p>}
    </section>
  )
}

function PostCreator({ profiles, hashtags, onCreate }: { profiles: Profile[]; hashtags: Hashtag[]; onCreate: (notice: Notice) => void }) {
  const [author, setAuthor] = useState(profiles[0]?.handle || '')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [body, setBody] = useState('')
  const [media, setMedia] = useState('')
  const [mediaAlt, setMediaAlt] = useState('')
  const [hashtagIds, setHashtagIds] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const selectableHashtags = activeHashtags(hashtags)

  const changeMedia = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setMedia('')
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setMessage('Use uma imagem JPG, PNG, WebP ou GIF de até 8 MB.')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => { setMedia(String(reader.result)); setMessage('') }
    reader.onerror = () => setMessage('Não foi possível ler a imagem.')
    reader.readAsDataURL(file)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profiles.some((profile) => profile.handle === author)) {
      setMessage('Selecione um perfil autor válido.')
      return
    }
    if (!hashtagIds.length || hashtagIds.some((id) => !selectableHashtags.some((hashtag) => hashtag.id === id))) {
      setMessage('Selecione ao menos uma hashtag ativa.')
      return
    }
    if (media && !mediaAlt.trim()) {
      setMessage('Descreva a imagem para leitores de tela.')
      return
    }
    onCreate({ id: `notice-${Math.round(event.timeStamp)}`, title: title.trim(), text: body.trim(), ...(media ? { media: { src: media, alt: mediaAlt.trim() } } : {}), category: category.trim(), date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()), state: 'publicado', author, hashtagIds: uniqueHashtagIds(hashtagIds), base: { heart: 0, point: 0, skull: 0, dance: 0 } })
    setTitle('')
    setCategory('')
    setBody('')
    setMedia('')
    setMediaAlt('')
    setHashtagIds([])
    event.currentTarget.reset()
    setMessage('Publicação criada nesta sessão.')
  }

  return (
    <section className="admin-card">
      <p className="eyebrow">Avisos</p>
      <h2>Criar publicação</h2>
      <form className="admin-form" onSubmit={submit}>
        <label>Perfil autor<select value={author} onChange={(event) => setAuthor(event.target.value)}>{profiles.map((profile) => <option key={profile.handle} value={profile.handle}>{profile.name}</option>)}</select></label>
        <fieldset className="hashtag-checkboxes"><legend>Hashtags</legend>{selectableHashtags.map((hashtag) => <label key={hashtag.id}><input type="checkbox" checked={hashtagIds.includes(hashtag.id)} onChange={() => setHashtagIds((current) => current.includes(hashtag.id) ? current.filter((id) => id !== hashtag.id) : uniqueHashtagIds([...current, hashtag.id]))} /><HashtagChip hashtag={hashtag} /></label>)}{!selectableHashtags.length && <small>Ative ou crie uma hashtag antes de publicar.</small>}</fieldset>
        <label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
        <label>Categoria<input value={category} onChange={(event) => setCategory(event.target.value)} required /></label>
        <label>Texto<textarea value={body} onChange={(event) => setBody(event.target.value)} required /></label>
        <label>Imagem ou GIF (opcional)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={changeMedia} /></label>
        {media && <label>Descrição da imagem<input value={mediaAlt} onChange={(event) => setMediaAlt(event.target.value)} required /></label>}
        <button className="primary" type="submit">Publicar</button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
    </section>
  )
}

function AdminPage({ profiles, hashtags, notices, theme, onExit, onToggleTheme, onChangeAvatar, onCreateProfile, onCreateHashtag, onUpdateHashtag, onDeleteHashtag, onDetachHashtag, onImportOfferings, onUploadDocument, onCreatePost }: {
  profiles: Profile[]
  hashtags: Hashtag[]
  notices: Notice[]
  theme: 'dark' | 'light'
  onExit: () => void
  onToggleTheme: () => void
  onChangeAvatar: (handle: string, avatar: string) => void
  onCreateProfile: (profile: Profile) => void
  onCreateHashtag: (hashtag: Hashtag) => void
  onUpdateHashtag: (hashtag: Hashtag) => void
  onDeleteHashtag: (hashtagId: string) => void
  onDetachHashtag: (hashtagId: string) => void
  onImportOfferings: (offerings: ClassOffering[]) => void
  onUploadDocument: (document: DocumentItem) => void
  onCreatePost: (notice: Notice) => void
}) {
  const [authenticated, setAuthenticated] = useState(readAdminSession)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const login = async (event: FormEvent) => {
    event.preventDefault()
    const accepted = username.trim() === ADMIN_USERNAME && await sha256(password) === ADMIN_PASSWORD_HASH
    if (!accepted) {
      setMessage('Usuário ou senha inválidos.')
      return
    }
    try { sessionStorage.setItem(ADMIN_SESSION_KEY, 'authenticated') } catch { /* sessão em memória ainda funciona */ }
    setPassword('')
    setMessage('')
    setAuthenticated(true)
  }

  const logout = () => {
    try { sessionStorage.removeItem(ADMIN_SESSION_KEY) } catch { /* sem armazenamento local */ }
    setAuthenticated(false)
  }

  if (!authenticated) return (
    <main className="admin-login">
      <a href="/" onClick={(event) => { event.preventDefault(); onExit() }}>← Voltar ao portal</a>
      <form className="admin-login-card" onSubmit={login}>
        <p className="eyebrow">Área restrita</p>
        <h1>Administração CARB</h1>
        <label>Usuário<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
        <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <button className="primary" type="submit">Entrar</button>
        {message && <p className="form-message" role="alert">{message}</p>}
      </form>
    </main>
  )

  return (
    <>
      <header className="admin-topbar"><a href="/" onClick={(event) => { event.preventDefault(); onExit() }}>CARB</a><div><button type="button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>{theme === 'dark' ? '☼' : '◐'}</button><button type="button" onClick={logout}>Sair</button></div></header>
      <main className="admin-shell">
        <div className="section-heading"><p className="eyebrow">Sessão administrativa v1.2</p><h1>Painel editorial demonstrativo</h1><p>As alterações abaixo duram somente nesta aba e não coletam matrícula nem dados estudantis.</p></div>
        <div className="admin-grid">
          <section className="admin-card admin-profiles">
            <p className="eyebrow">Entidades</p>
            <h2>Perfis e ícones</h2>
            {profiles.map((profile) => <div className="profile-row" key={profile.handle}><div className="profile-select"><Avatar profile={profile} /><span><strong>{profile.name}</strong><small>@{profile.handle}</small></span></div><ProfileIconEditor profile={profile} onChange={(avatar) => onChangeAvatar(profile.handle, avatar)} /></div>)}
            <ProfileCreator profiles={profiles} onCreate={onCreateProfile} />
          </section>
          <HashtagManager hashtags={hashtags} notices={notices} onCreate={onCreateHashtag} onUpdate={onUpdateHashtag} onDelete={onDeleteHashtag} onDetach={onDetachHashtag} />
          <CsvImporter onImport={onImportOfferings} />
          <DocumentUploader onUpload={onUploadDocument} />
          <PostCreator profiles={profiles} hashtags={hashtags} onCreate={onCreatePost} />
        </div>
      </main>
    </>
  )
}

function ReactionButtons({ notice, reaction, onReact }: { notice: Notice; reaction?: Reaction; onReact: (reaction: Reaction) => void }) {
  const counts = Object.fromEntries(REACTION_OPTIONS.map(({ key }) => [key, notice.base[key] + (reaction === key ? 1 : 0)])) as ReactionCounts
  const [shareMessage, setShareMessage] = useState('')

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#aviso-${notice.id}`
    const nativeShare = (navigator as unknown as { share?: (data?: ShareData) => Promise<void> }).share
    try {
      if (nativeShare) await nativeShare.call(navigator, { title: notice.title, text: notice.text, url })
      else await navigator.clipboard.writeText(url)
      setShareMessage(nativeShare ? 'Compartilhamento aberto.' : 'Link copiado.')
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') setShareMessage('Não foi possível compartilhar o link.')
    }
  }

  return (
    <div className="reaction-area">
      <p className="reaction-summary">{REACTION_OPTIONS.map(({ key, icon, label }) => <span key={key}>{counts[key]} <img src={icon} alt={label} /></span>)}</p>
      <div className="reactions" aria-label={`Reações ao aviso ${notice.title}`}>
        {REACTION_OPTIONS.map(({ key, icon, label }) => (
          <button key={key} className={reaction === key ? 'reaction active' : 'reaction'} aria-label={label} aria-pressed={reaction === key} title={label} onClick={() => onReact(key)}>
            <img src={icon} alt="" aria-hidden="true" />
          </button>
        ))}
        <button className="reaction share" type="button" onClick={share} aria-label="Compartilhar link do aviso" title="Compartilhar">
          <img src="/icons/cursor-24.png" alt="" aria-hidden="true" />
        </button>
      </div>
      {shareMessage && <p className="share-message" role="status">{shareMessage}</p>}
    </div>
  )
}

function NoticeCard({ notice, profile, hashtags, reaction, onReact, onProfile, onHashtag }: { notice: Notice; profile: Profile; hashtags: Hashtag[]; reaction?: Reaction; onReact: (reaction: Reaction) => void; onProfile: () => void; onHashtag: (hashtagId: string) => void }) {
  return (
    <article id={`aviso-${notice.id}`}>
      <Card className="card notice-card gap-0 py-0">
        <button className="profile-link" type="button" onClick={onProfile}>
          <Avatar profile={profile} />
          <span><strong>{profile.name}</strong><small>@{profile.handle} · {notice.date}</small></span>
        </button>
        <div className="meta"><span>{notice.category}</span><span>{notice.state}</span></div>
        <div className="notice-hashtags">{hashtags.map((hashtag) => <HashtagChip key={hashtag.id} hashtag={hashtag} onClick={() => onHashtag(hashtag.id)} />)}</div>
        <h2>{notice.title}</h2>
        <p>{notice.text}</p>
        {notice.media && <img className="notice-media" src={notice.media.src} alt={notice.media.alt} loading="lazy" />}
        <ReactionButtons notice={notice} reaction={reaction} onReact={onReact} />
      </Card>
    </article>
  )
}

function ScheduleTable({ selected }: { selected: ClassOffering[] }) {
  const scheduled = selected.flatMap((item) => item.meetings.map((meeting) => ({ item, meeting })))
  const meetingAt = (day: string, start: string) => selected.flatMap((item) => item.meetings.map((meeting) => ({ item, meeting }))).find(({ meeting }) => meeting.day === day && meeting.start === start)
  const covers = (day: string, index: number) => selected.some((item) => item.meetings.some((meeting) => {
    if (meeting.day !== day) return false
    const start = TIME_ROWS.findIndex(([value]) => value === meeting.start)
    const end = TIME_ROWS.findIndex(([, value]) => value === meeting.end)
    return start < index && end >= index
  }))

  return (
    <>
      <div className="schedule-scroll">
        <table className="schedule-table">
        <thead><tr><th>Horário</th>{WEEKDAYS.map((day) => <th key={day}>{day}</th>)}</tr></thead>
        <tbody>
          {TIME_ROWS.map(([start], index) => (
            <tr key={start}>
              <th>{start}</th>
              {WEEKDAYS.map((day) => {
                if (covers(day, index)) return null
                const found = meetingAt(day, start)
                if (!found) return <td key={day} />
                const endIndex = TIME_ROWS.findIndex(([, value]) => value === found.meeting.end)
                return <td key={day} rowSpan={Math.max(1, endIndex - index + 1)} className="scheduled-class"><strong>{found.item.code}</strong><span>T{found.item.class}</span><small>{found.item.location}</small></td>
              })}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      <div className="mobile-schedule" aria-label="Grade semanal compacta">
        {WEEKDAYS.map((day) => {
          const meetings = scheduled.filter(({ meeting }) => meeting.day === day).sort((a, b) => a.meeting.start.localeCompare(b.meeting.start))
          return <section key={day}><h3>{WEEKDAY_LABELS[day]}</h3><div className="day-meetings">{meetings.length ? meetings.map(({ item, meeting }) => <details key={`${item.id}-${meeting.start}`}><summary><strong>{meeting.start}–{meeting.end}</strong> {item.code} · T{item.class}</summary><p>{item.component} · {item.location}</p></details>) : <p>Sem turmas</p>}</div></section>
        })}
      </div>
    </>
  )
}

function Trajectory({ track, selected, offerings }: { track: 'day' | 'night'; selected: ClassOffering[]; offerings: ClassOffering[] }) {
  const curriculum = academicData.curricula[track]
  const [completed, setCompleted] = useState<string[]>(() => readLocal(COMPLETED_KEY, []))
  const availableCodes = useMemo(() => new Set(offerings.map((item) => item.code)), [offerings])
  const selectedCodes = new Set(selected.map((item) => item.code))
  const toggle = (code: string) => {
    const next = completed.includes(code) ? completed.filter((item) => item !== code) : [...completed, code]
    setCompleted(next)
    writeLocal(COMPLETED_KEY, next)
  }

  return (
    <details className="trajectory" open>
      <summary>Trajetória acadêmica - matriz {curriculum.name.toLocaleLowerCase('pt-BR')}</summary>
      <p>{curriculum.totalHours}h no total · {curriculum.requiredHours}h obrigatórias · {curriculum.optionalHours}h optativas · {curriculum.complementaryHours}h complementares.</p>
      <p className="hint">Marque o que já concluiu. A marcação fica somente neste navegador; “planejada” identifica componentes na grade atual.</p>
      <div className="semester-grid">
        {Array.from({ length: curriculum.semesters }, (_, index) => index + 1).map((semester) => {
          const codes = Object.entries(curriculum.components).filter(([, value]) => value === semester).map(([code]) => code)
          return (
            <section className="semester-card" key={semester}>
              <h3>{semester}º semestre</h3>
              <ul>{codes.map((code) => (
                <li key={code} className={selectedCodes.has(code) ? 'planned' : completed.includes(code) ? 'completed' : ''}>
                  <label><input type="checkbox" checked={completed.includes(code)} onChange={() => toggle(code)} /><span><strong>{code}</strong>{academicData.componentTitles[code] && <small>{academicData.componentTitles[code]}</small>}{selectedCodes.has(code) && <em>planejada</em>}{availableCodes.has(code) && !selectedCodes.has(code) && <em>ofertada</em>}</span></label>
                </li>
              ))}</ul>
            </section>
          )
        })}
      </div>
    </details>
  )
}

function Planner({ query, offerings }: { query: string; offerings: ClassOffering[] }) {
  const [track, setTrack] = useState<'day' | 'night'>('day')
  const [professor, setProfessor] = useState('')
  const [shift, setShift] = useState<'' | Shift>('')
  const [semester, setSemester] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [message, setMessage] = useState('Selecione turmas para começar a grade.')
  const [visibleLimit, setVisibleLimit] = useState(24)
  const [issue, setIssue] = useState<SelectionIssue | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const conflictTriggerRef = useRef<HTMLButtonElement | null>(null)
  const selected = offerings.filter((item) => selectedIds.includes(item.id))
  const professors = useMemo(() => [...new Set(offerings.map((item) => item.professor))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [offerings])
  const semesterField = track === 'day' ? 'daySemester' : 'nightSemester'
  const search = normalized(query)

  const visible = offerings.filter((item) => {
    const searchable = [item.code, item.component, item.professor, item.class, item.location].join(' ').toLocaleLowerCase('pt-BR')
    return (!search || searchable.includes(search))
      && (!professor || item.professor === professor)
      && (!shift || item.meetings.some((meeting) => meeting.shift === shift))
      && (!semester || String(item[semesterField]) === semester)
  })

  useEffect(() => {
    if (issue && !dialogRef.current?.open) dialogRef.current?.showModal()
  }, [issue])

  const toggle = (item: ClassOffering, trigger?: HTMLButtonElement) => {
    if (selectedIds.includes(item.id)) {
      setSelectedIds((current) => current.filter((id) => id !== item.id))
      setMessage(`${item.code}, turma ${item.class}, removida.`)
      return
    }
    const problem = selectionIssue(selected, item)
    if (problem) {
      conflictTriggerRef.current = trigger || null
      setIssue(problem)
      setMessage(problem.message)
      return
    }
    setSelectedIds((current) => [...current, item.id])
    setMessage(`${item.code}, turma ${item.class}, adicionada sem conflito.`)
  }

  return (
    <section className="planner" aria-labelledby="planner-title">
      <div className="section-heading planner-heading">
        <div><p className="eyebrow">Dados de {academicData.source.period}</p><h1 id="planner-title">Monte sua grade</h1><p>A grade semanal aparece primeiro; use a coluna de turmas para pesquisar e adicionar disciplinas sem choque de horário.</p></div>
      </div>

      <div className="planner-workspace">
        <section className="planner-main" aria-labelledby="schedule-title">
          <div className="planner-toolbar">
            <div><strong>{selected.length} turma(s) selecionada(s)</strong><span>{selected.length ? 'Grade sem conflitos' : 'Adicione turmas pela coluna lateral'}</span></div>
            <button className="primary print-button" type="button" disabled={!selected.length} onClick={() => window.print()}>Finalizar e salvar PDF</button>
          </div>
          <section className="printable-schedule weekly-board">
            <div className="subheading"><div><p className="eyebrow">Sem choques de horário</p><h2 id="schedule-title">Visualização semanal</h2></div></div>
            <ScheduleTable selected={selected} />
            {!selected.length && <p className="schedule-empty">A grade será preenchida conforme você adicionar turmas.</p>}
          </section>

          <aside className="selected-panel" aria-labelledby="selected-title">
            <div className="subheading"><h2 id="selected-title">Turmas na grade</h2><span>{selected.length} turma(s)</span></div>
            {selected.length ? <ul>{selected.map((item) => <li key={item.id}><span><strong>{item.code} · T{item.class}</strong><small>{item.meetings.map(meetingLabel).join(' · ')}</small></span><button type="button" onClick={(event) => toggle(item, event.currentTarget)} aria-label={`Remover ${item.code}`}>×</button></li>)}</ul> : <p>Nenhuma turma selecionada.</p>}
          </aside>
        </section>

        <aside className="planner-sidebar">
          <section className="filter-panel" aria-label="Filtros de turmas">
            <label>Matriz<select value={track} onChange={(event) => { setTrack(event.target.value as 'day' | 'night'); setSemester('') }}><option value="day">Diurna - 10 semestres</option><option value="night">Noturna - 12 semestres</option></select></label>
            <label>Professor<select value={professor} onChange={(event) => setProfessor(event.target.value)}><option value="">Todos</option>{professors.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label>Turno<select value={shift} onChange={(event) => setShift(event.target.value as '' | Shift)}><option value="">Todos</option><option>manhã</option><option>tarde</option><option>noite</option></select></label>
            <label>Semestre<select value={semester} onChange={(event) => setSemester(event.target.value)}><option value="">Todos</option>{Array.from({ length: academicData.curricula[track].semesters }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}º</option>)}<option value="optativa">Optativas</option><option value="outros">Outras ofertas</option></select></label>
          </section>
          <p className="planner-status" role="status" aria-live="polite">{message}</p>
          <section className="offerings" aria-labelledby="offerings-title">
            <div className="subheading"><h2 id="offerings-title">Turmas disponíveis</h2><span>{visible.length}</span></div>
            {visible.slice(0, visibleLimit).map((item) => {
              const isSelected = selectedIds.includes(item.id)
              return (
                <article className={isSelected ? 'offering-card selected' : 'offering-card'} key={item.id}>
                  <div className="offering-title"><div><span>{item.code} · turma {item.class}</span><h3>{item.component}</h3></div><button type="button" onClick={(event) => toggle(item, event.currentTarget)}>{isSelected ? 'Remover' : 'Adicionar'}</button></div>
                  <p>{item.professor}</p>
                  <div className="offering-facts"><span>{item.meetings.map(meetingLabel).join(' · ')}</span><span>{item.location}</span><span>{semesterLabel(item[semesterField])}</span><span>{item.enrolled}/{item.capacity} matrículas</span></div>
                </article>
              )
            })}
            {visibleLimit < visible.length && <button className="load-more" type="button" onClick={() => setVisibleLimit((value) => value + 24)}>Mostrar mais turmas</button>}
            {!visible.length && <p className="empty">Nenhuma turma corresponde aos filtros.</p>}
          </section>
          <p className="source-note">{academicData.source.notice}</p>
        </aside>
      </div>
      <Trajectory track={track} selected={selected} offerings={offerings} />
      <dialog ref={dialogRef} className="conflict-dialog" onClose={() => { setIssue(null); conflictTriggerRef.current?.focus() }}>
        <p className="eyebrow">Conflito de horário</p>
        <h2>Esta turma não foi adicionada</h2>
        {issue?.conflict && issue.candidateMeeting && issue.conflictMeeting ? <p><strong>{issue.candidate.code} · T{issue.candidate.class}</strong> coincide com <strong>{issue.conflict.code} · T{issue.conflict.class}</strong> em {WEEKDAY_LABELS[issue.candidateMeeting.day] || issue.candidateMeeting.day}: {issue.candidateMeeting.start}–{issue.candidateMeeting.end} e {issue.conflictMeeting.start}–{issue.conflictMeeting.end}.</p> : <p>{issue?.message}</p>}
        <button className="primary" type="button" autoFocus onClick={() => dialogRef.current?.close()}>Entendi</button>
      </dialog>
    </section>
  )
}

export default function App() {
  const adminPath = () => typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/admin'
  const [isAdminRoute, setIsAdminRoute] = useState(adminPath)
  const [tab, setTab] = useState<Tab>('avisos')
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [limit, setLimit] = useState(6)
  const [profileFilter, setProfileFilter] = useState('')
  const [hashtagFilter, setHashtagFilter] = useState('')
  const [profiles, setProfiles] = useState(initialProfiles)
  const [siteHashtags, setSiteHashtags] = useState(initialHashtags)
  const [siteNotices, setSiteNotices] = useState(notices)
  const [siteDocuments, setSiteDocuments] = useState(documents)
  const [offerings, setOfferings] = useState(academicData.offerings)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => readLocal<'dark' | 'light'>(THEME_KEY, 'dark') === 'light' ? 'light' : 'dark')
  const [reactions, setReactions] = useState<Record<string, Reaction>>(() => readLocal(REACTIONS_KEY, {}))
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const labels = TAB_LABELS

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    writeLocal(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    const route = () => setIsAdminRoute(adminPath())
    window.addEventListener('popstate', route)
    return () => window.removeEventListener('popstate', route)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [menuOpen])

  const react = (noticeId: string, selected: Reaction) => {
    const next = { ...reactions }
    if (next[noticeId] === selected) delete next[noticeId]
    else next[noticeId] = selected
    setReactions(next)
    writeLocal(REACTIONS_KEY, next)
  }

  const changeTab = (next: Tab) => {
    setTab(next)
    setQuery('')
    setMenuOpen(false)
    setLimit(6)
    window.scrollTo({ top: 0 })
  }

  const goHome = () => {
    changeTab('avisos')
    setProfileFilter('')
    setHashtagFilter('')
  }

  const search = normalized(query)
  const filteredNotices = filterNotices(siteNotices, profiles, siteHashtags, { query, profile: profileFilter, hashtag: hashtagFilter })
  const filteredSystems = systems.filter((system) => !search || [system.name, system.description, system.category].some((value) => value.toLocaleLowerCase('pt-BR').includes(search)))
  const filteredDocuments = siteDocuments.filter((document) => !search || [document.title, document.description, document.updatedAt].some((value) => value.toLocaleLowerCase('pt-BR').includes(search)))
  const activeProfile = profiles.find((profile) => profile.handle === profileFilter)
  const updateProfileAvatar = (handle: string, avatar: string) => setProfiles((current) => current.map((profile) => profile.handle === handle ? { ...profile, avatar, avatarPosition: 'center' } : profile))
  const selectProfile = (handle: string) => {
    setProfileFilter(handle)
    setLimit(6)
  }
  const deleteSiteHashtag = (hashtagId: string) => {
    const next = removeHashtag(siteHashtags, siteNotices, hashtagId)
    setSiteHashtags(next.hashtags)
    setSiteNotices(next.notices)
    if (hashtagFilter === hashtagId) setHashtagFilter('')
  }

  if (isAdminRoute) return <AdminPage profiles={profiles} hashtags={siteHashtags} notices={siteNotices} theme={theme} onExit={() => { history.pushState({}, '', '/'); setIsAdminRoute(false) }} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} onChangeAvatar={updateProfileAvatar} onCreateProfile={(profile) => setProfiles((current) => [...current, profile])} onCreateHashtag={(hashtag) => setSiteHashtags((current) => [...current, hashtag])} onUpdateHashtag={(hashtag) => setSiteHashtags((current) => current.map((item) => item.id === hashtag.id ? hashtag : item))} onDeleteHashtag={deleteSiteHashtag} onDetachHashtag={(hashtagId) => setSiteNotices((current) => current.map((notice) => notice.hashtagIds.includes(hashtagId) ? { ...notice, hashtagIds: notice.hashtagIds.filter((id) => id !== hashtagId) } : notice))} onImportOfferings={setOfferings} onUploadDocument={(document) => setSiteDocuments((current) => [document, ...current])} onCreatePost={(notice) => setSiteNotices((current) => [notice, ...current])} />

  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="topbar" id="top">
        <button className="brand-button" type="button" onClick={goHome} aria-label="CARB — voltar aos avisos" title="Voltar aos avisos"><img src="/logo-carb.png" alt="" aria-hidden="true" /></button>
        <div className="search-box" id="site-search"><img src="/icons/busca-24.png" alt="" aria-hidden="true" /><Label className="sr-only" htmlFor="search">Buscar em {labels[tab]}</Label><Input id="search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar em ${labels[tab].toLocaleLowerCase('pt-BR')}`} />{query && <button className="search-clear" type="button" aria-label="Limpar busca" onClick={() => setQuery('')}>×</button>}</div>
        <div className="menu-wrap" ref={menuRef}>
          <button ref={menuButtonRef} className="menu-button" type="button" aria-label={menuOpen ? 'Fechar menu principal' : 'Abrir menu principal'} aria-expanded={menuOpen} aria-controls="main-menu" onClick={() => setMenuOpen((current) => !current)}><span /><span /><span /></button>
          <nav className="main-menu" id="main-menu" aria-label="Navegação principal" hidden={!menuOpen}>
            {NAVIGATION.map((item) => <button key={item.tab} className={tab === item.tab ? 'menu-item active' : 'menu-item'} aria-current={tab === item.tab ? 'page' : undefined} onClick={() => changeTab(item.tab)}><img src={item.icon} alt="" aria-hidden="true" /><span>{item.label}</span></button>)}
            <Separator />
            <button className="menu-item" type="button" aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} aria-pressed={theme === 'light'} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><span className="theme-symbol" aria-hidden="true">{theme === 'dark' ? '☼' : '◐'}</span><span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span></button>
          </nav>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1}>
        {tab === 'avisos' && (
          <section className="content-section" aria-labelledby="notices-title">
            <div className="section-heading notices-heading"><h1 id="notices-title">{activeProfile ? activeProfile.name : 'Avisos'}</h1><p>{activeProfile ? `@${activeProfile.handle} · ${activeProfile.bio}` : 'Publicações da Faculdade de Direito da UFBA em um só lugar.'}</p></div>
            <div className="feed-layout">
              <section className="feed-filters" aria-label="Filtros de publicações">
                <div className="profile-chips" aria-label="Filtrar pelo perfil autor">
                  <button className={!profileFilter ? 'filter-chip active' : 'filter-chip'} type="button" aria-pressed={!profileFilter} onClick={() => selectProfile('')}>Todos os perfis</button>
                  {profiles.map((profile) => <button key={profile.handle} className={profileFilter === profile.handle ? 'filter-chip active' : 'filter-chip'} type="button" aria-pressed={profileFilter === profile.handle} onClick={() => selectProfile(profile.handle)}>@{profile.handle}</button>)}
                </div>
                <div className="hashtag-filters" aria-label="Filtrar por hashtag temática">
                  <button className={!hashtagFilter ? 'filter-chip active' : 'filter-chip'} type="button" aria-pressed={!hashtagFilter} onClick={() => { setHashtagFilter(''); setLimit(6) }}>Todas as hashtags</button>
                  {siteHashtags.map((hashtag) => <HashtagChip key={hashtag.id} hashtag={hashtag} active={hashtagFilter === hashtag.id} onClick={() => { setHashtagFilter(hashtag.id); setLimit(6) }} />)}
                </div>
                {(profileFilter || hashtagFilter || query) && <div className="active-filters"><span>Filtros ativos:</span>{profileFilter && <button type="button" onClick={() => selectProfile('')}>@{profileFilter} ×</button>}{hashtagFilter && <button type="button" onClick={() => setHashtagFilter('')}>#{siteHashtags.find((hashtag) => hashtag.id === hashtagFilter)?.name} ×</button>}{query && <button type="button" onClick={() => setQuery('')}>Busca: “{query}” ×</button>}</div>}
              </section>
              <div className="feed">
                {filteredNotices.length ? filteredNotices.slice(0, limit).map((notice) => {
                  const profile = profiles.find((item) => item.handle === notice.author) || profiles[0]
                  return <NoticeCard key={notice.id} notice={notice} profile={profile} hashtags={siteHashtags.filter((hashtag) => notice.hashtagIds.includes(hashtag.id))} reaction={reactions[notice.id]} onReact={(choice) => react(notice.id, choice)} onProfile={() => selectProfile(profile.handle)} onHashtag={(hashtagId) => { setHashtagFilter(hashtagId); setLimit(6) }} />
                }) : <p className="empty" role="status">Nenhum aviso corresponde aos filtros ativos.</p>}
                {limit < filteredNotices.length && <button className="load-more" type="button" onClick={() => setLimit((value) => value + 3)}>Carregar mais</button>}
              </div>
            </div>
          </section>
        )}

        {tab === 'sistemas' && (
          <section className="content-section" aria-labelledby="systems-title">
            <div className="section-heading"><p className="eyebrow">Atalhos públicos</p><h1 id="systems-title">Sistemas</h1><p>Links externos curados; nenhuma credencial é solicitada pelo portal.</p></div>
            <div className="system-grid">{filteredSystems.map((system) => <article key={system.id}><Card className="card system-card gap-0 py-0"><h2>{system.name}</h2><p>{system.description}</p><Button asChild className="primary"><a href={system.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${system.name} em nova aba`}>Abrir</a></Button></Card></article>)}</div>
            {!filteredSystems.length && <p className="empty" role="status">Nenhum sistema corresponde à busca.</p>}
          </section>
        )}

        {tab === 'planejador' && <div className="content-section planner-section"><Planner query={query} offerings={offerings} /></div>}

        {tab === 'acervo' && (
          <section className="content-section" aria-labelledby="documents-title">
            <div className="section-heading"><p className="eyebrow">Acervo documental do CARB</p><h1 id="documents-title">Documentos</h1><p>Consulte a descrição e baixe o arquivo disponível.</p></div>
            <div className="document-grid">{filteredDocuments.map((document) => <article key={document.id}><Card className="document-card gap-0 py-0"><p className="eyebrow">{document.updatedAt}</p><h2>{document.title}</h2><p>{document.description}</p><Button asChild className="primary"><a href={document.file} download aria-label={`Baixar ${document.title}`}>Baixar</a></Button></Card></article>)}</div>
            {!filteredDocuments.length && <p className="empty" role="status">Nenhum documento corresponde à busca.</p>}
          </section>
        )}
      </main>
      <footer><strong>CARB</strong><span>Protótipo local · dados acadêmicos sujeitos à confirmação no SIGAA</span></footer>
    </>
  )
}
