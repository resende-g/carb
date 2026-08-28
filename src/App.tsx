import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import academicDataJson from './academic-data.json'
import { parseOfferingsCsv } from './admin'
import { documents, notices, profiles as initialProfiles, systems, type DocumentItem, type Notice, type Profile, type ReactionCounts } from './data'
import { meetingLabel, selectionProblem, TIME_ROWS, type ClassOffering, type Meeting, type Semester, type Shift } from './planner'

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
const REACTION_OPTIONS: { key: Reaction; emoji: string; label: string }[] = [
  { key: 'heart', emoji: '♥', label: 'Coração' },
  { key: 'point', emoji: '☝', label: 'Indicador' },
  { key: 'skull', emoji: '☠', label: 'Caveira' },
  { key: 'dance', emoji: '💃', label: 'Dançarina' },
]
const TAB_LABELS: Record<Tab, string> = { avisos: 'Avisos', sistemas: 'Sistemas', planejador: 'Planejador', acervo: 'Acervo documental' }
const NAVIGATION: { tab: Exclude<Tab, 'avisos'>; label: string; icon: string }[] = [
  { tab: 'sistemas', label: 'Sistemas', icon: '⚙' },
  { tab: 'planejador', label: 'Planejador', icon: '▦' },
  { tab: 'acervo', label: 'Acervo documental', icon: '▤' },
]
const WEEKDAYS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function writeLocal<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // O protótipo continua funcional quando o navegador bloqueia armazenamento local.
  }
}

const readAdminSession = () => {
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

  const submit = (event: FormEvent) => {
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
      <p>A alteração permanece somente nesta sessão da v0.</p>
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
    onUpload({ id: `document-${Date.now()}`, title: title.trim(), description: description.trim(), updatedAt: `Adicionado em ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`, file: URL.createObjectURL(file) })
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

function PostCreator({ profiles, onCreate }: { profiles: Profile[]; onCreate: (notice: Notice) => void }) {
  const [author, setAuthor] = useState(profiles[0]?.handle || '')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [body, setBody] = useState('')
  const [message, setMessage] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!profiles.some((profile) => profile.handle === author)) {
      setMessage('Selecione um perfil autor válido.')
      return
    }
    onCreate({ id: `notice-${Date.now()}`, title: title.trim(), text: body.trim(), category: category.trim(), date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()), state: 'publicado', author, base: { heart: 0, point: 0, skull: 0, dance: 0 } })
    setTitle('')
    setCategory('')
    setBody('')
    setMessage('Publicação criada nesta sessão.')
  }

  return (
    <section className="admin-card">
      <p className="eyebrow">Avisos</p>
      <h2>Criar publicação</h2>
      <form className="admin-form" onSubmit={submit}>
        <label>Perfil autor<select value={author} onChange={(event) => setAuthor(event.target.value)}>{profiles.map((profile) => <option key={profile.handle} value={profile.handle}>{profile.name}</option>)}</select></label>
        <label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
        <label>Categoria<input value={category} onChange={(event) => setCategory(event.target.value)} required /></label>
        <label>Texto<textarea value={body} onChange={(event) => setBody(event.target.value)} required /></label>
        <button className="primary" type="submit">Publicar</button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
    </section>
  )
}

function AdminPage({ profiles, theme, onExit, onToggleTheme, onChangeAvatar, onCreateProfile, onImportOfferings, onUploadDocument, onCreatePost }: {
  profiles: Profile[]
  theme: 'dark' | 'light'
  onExit: () => void
  onToggleTheme: () => void
  onChangeAvatar: (handle: string, avatar: string) => void
  onCreateProfile: (profile: Profile) => void
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
        <div className="section-heading"><p className="eyebrow">Sessão administrativa v0</p><h1>Painel editorial</h1><p>As alterações abaixo duram somente nesta aba e não coletam matrícula nem dados estudantis.</p></div>
        <div className="admin-grid">
          <section className="admin-card admin-profiles">
            <p className="eyebrow">Entidades</p>
            <h2>Perfis e ícones</h2>
            {profiles.map((profile) => <div className="profile-row" key={profile.handle}><div className="profile-select"><Avatar profile={profile} /><span><strong>{profile.name}</strong><small>@{profile.handle}</small></span></div><ProfileIconEditor profile={profile} onChange={(avatar) => onChangeAvatar(profile.handle, avatar)} /></div>)}
            <ProfileCreator profiles={profiles} onCreate={onCreateProfile} />
          </section>
          <CsvImporter onImport={onImportOfferings} />
          <DocumentUploader onUpload={onUploadDocument} />
          <PostCreator profiles={profiles} onCreate={onCreatePost} />
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
      <p className="reaction-summary">{REACTION_OPTIONS.map(({ key, emoji }) => `${counts[key]} ${emoji}`).join('  ·  ')}</p>
      <div className="reactions" aria-label={`Reações ao aviso ${notice.title}`}>
        {REACTION_OPTIONS.map(({ key, emoji, label }) => (
          <button key={key} className={reaction === key ? 'reaction active' : 'reaction'} aria-label={label} aria-pressed={reaction === key} title={label} onClick={() => onReact(key)}>
            <span aria-hidden="true">{emoji}</span>
          </button>
        ))}
        <button className="reaction share" type="button" onClick={share} aria-label="Compartilhar link do aviso" title="Compartilhar">
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      {shareMessage && <p className="share-message" role="status">{shareMessage}</p>}
    </div>
  )
}

function NoticeCard({ notice, profile, reaction, onReact, onProfile }: { notice: Notice; profile: Profile; reaction?: Reaction; onReact: (reaction: Reaction) => void; onProfile: () => void }) {
  return (
    <article className="card notice-card" id={`aviso-${notice.id}`}>
      <button className="profile-link" type="button" onClick={onProfile}>
        <Avatar profile={profile} />
        <span><strong>{profile.name}</strong><small>@{profile.handle} · {notice.date}</small></span>
      </button>
      <div className="meta"><span>{notice.category}</span><span>{notice.state}</span></div>
      <h2>{notice.title}</h2>
      <p>{notice.text}</p>
      <ReactionButtons notice={notice} reaction={reaction} onReact={onReact} />
    </article>
  )
}

function ScheduleTable({ selected }: { selected: ClassOffering[] }) {
  const meetingAt = (day: string, start: string) => selected.flatMap((item) => item.meetings.map((meeting) => ({ item, meeting }))).find(({ meeting }) => meeting.day === day && meeting.start === start)
  const covers = (day: string, index: number) => selected.some((item) => item.meetings.some((meeting) => {
    if (meeting.day !== day) return false
    const start = TIME_ROWS.findIndex(([value]) => value === meeting.start)
    const end = TIME_ROWS.findIndex(([, value]) => value === meeting.end)
    return start < index && end >= index
  }))

  return (
    <div className="schedule-scroll">
      <table className="schedule-table">
        <thead><tr><th>Horário</th>{WEEKDAYS.map((day) => <th key={day}>{day}</th>)}</tr></thead>
        <tbody>
          {TIME_ROWS.map(([start, end], index) => (
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

  const toggle = (item: ClassOffering) => {
    if (selectedIds.includes(item.id)) {
      setSelectedIds((current) => current.filter((id) => id !== item.id))
      setMessage(`${item.code}, turma ${item.class}, removida.`)
      return
    }
    const problem = selectionProblem(selected, item)
    if (problem) {
      setMessage(problem)
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
            {selected.length ? <ul>{selected.map((item) => <li key={item.id}><span><strong>{item.code} · T{item.class}</strong><small>{item.meetings.map(meetingLabel).join(' · ')}</small></span><button type="button" onClick={() => toggle(item)} aria-label={`Remover ${item.code}`}>×</button></li>)}</ul> : <p>Nenhuma turma selecionada.</p>}
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
                  <div className="offering-title"><div><span>{item.code} · turma {item.class}</span><h3>{item.component}</h3></div><button type="button" onClick={() => toggle(item)}>{isSelected ? 'Remover' : 'Adicionar'}</button></div>
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
    </section>
  )
}

export default function App() {
  const adminPath = () => window.location.pathname.replace(/\/+$/, '') === '/admin'
  const [isAdminRoute, setIsAdminRoute] = useState(adminPath)
  const [tab, setTab] = useState<Tab>('avisos')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(6)
  const [profileFilter, setProfileFilter] = useState('')
  const [profiles, setProfiles] = useState(initialProfiles)
  const [siteNotices, setSiteNotices] = useState(notices)
  const [siteDocuments, setSiteDocuments] = useState(documents)
  const [offerings, setOfferings] = useState(academicData.offerings)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => readLocal<'dark' | 'light'>(THEME_KEY, 'dark') === 'light' ? 'light' : 'dark')
  const [reactions, setReactions] = useState<Record<string, Reaction>>(() => readLocal(REACTIONS_KEY, {}))
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
    setLimit(6)
  }

  const search = normalized(query)
  const filteredNotices = siteNotices.filter((notice) => {
    const profile = profiles.find((item) => item.handle === notice.author)
    return (!profileFilter || notice.author === profileFilter) && (!search || [notice.title, notice.text, notice.category, profile?.name || '', notice.author].some((value) => value.toLocaleLowerCase('pt-BR').includes(search)))
  })
  const filteredSystems = systems.filter((system) => !search || [system.name, system.description, system.category].some((value) => value.toLocaleLowerCase('pt-BR').includes(search)))
  const filteredDocuments = siteDocuments.filter((document) => !search || [document.title, document.description, document.updatedAt].some((value) => value.toLocaleLowerCase('pt-BR').includes(search)))
  const activeProfile = profiles.find((profile) => profile.handle === profileFilter)
  const updateProfileAvatar = (handle: string, avatar: string) => setProfiles((current) => current.map((profile) => profile.handle === handle ? { ...profile, avatar, avatarPosition: 'center' } : profile))

  if (isAdminRoute) return <AdminPage profiles={profiles} theme={theme} onExit={() => { history.pushState({}, '', '/'); setIsAdminRoute(false) }} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} onChangeAvatar={updateProfileAvatar} onCreateProfile={(profile) => setProfiles((current) => [...current, profile])} onImportOfferings={setOfferings} onUploadDocument={(document) => setSiteDocuments((current) => [document, ...current])} onCreatePost={(notice) => setSiteNotices((current) => [notice, ...current])} />

  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="topbar" id="top">
        <div className="brand"><strong>CARB</strong><button className="home-button" type="button" onClick={() => changeTab('avisos')} aria-label="Ir para avisos" title="Avisos"><span aria-hidden="true">⌂</span></button></div>
        <div className="search-box"><span aria-hidden="true">⌕</span><label className="sr-only" htmlFor="search">Buscar em {labels[tab]}</label><input id="search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar em ${labels[tab].toLocaleLowerCase('pt-BR')}`} /></div>
        <nav aria-label="Navegação principal">
          <button className="nav-button theme-toggle" type="button" data-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} aria-pressed={theme === 'light'} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><span aria-hidden="true">{theme === 'dark' ? '☼' : '◐'}</span></button>
          {NAVIGATION.map((item) => <button key={item.tab} className={tab === item.tab ? 'nav-button active' : 'nav-button'} data-label={item.label} aria-label={item.label} aria-current={tab === item.tab ? 'page' : undefined} onClick={() => changeTab(item.tab)}><span aria-hidden="true">{item.icon}</span></button>)}
        </nav>
      </header>

      <main id="conteudo" tabIndex={-1}>
        {tab === 'avisos' && (
          <section className="content-section" aria-labelledby="notices-title">
            <div className="section-heading notices-heading"><h1 id="notices-title">{activeProfile ? activeProfile.name : 'Avisos'}</h1><p>{activeProfile ? `@${activeProfile.handle} · ${activeProfile.bio}` : 'Publicações da Faculdade de Direito da UFBA em um só lugar.'}</p></div>
            <div className="feed-layout">
              <div className="feed">
                {filteredNotices.length ? filteredNotices.slice(0, limit).map((notice) => {
                  const profile = profiles.find((item) => item.handle === notice.author) || profiles[0]
                  return <NoticeCard key={notice.id} notice={notice} profile={profile} reaction={reactions[notice.id]} onReact={(choice) => react(notice.id, choice)} onProfile={() => setProfileFilter(profile.handle)} />
                }) : <p className="empty" role="status">Nenhum aviso corresponde à busca.</p>}
                {limit < filteredNotices.length && <button className="load-more" type="button" onClick={() => setLimit((value) => value + 3)}>Carregar mais</button>}
              </div>
              <aside className="profiles-panel"><p className="eyebrow">Perfis institucionais</p><h2>Quem publica</h2><div className="profile-row"><button className={!profileFilter ? 'profile-select active' : 'profile-select'} type="button" aria-pressed={!profileFilter} onClick={() => setProfileFilter('')}><span><strong>Todas as publicações</strong><small>Remover filtro de perfil</small></span></button></div>{profiles.map((profile) => <div className="profile-row" key={profile.handle}><button className={profileFilter === profile.handle ? 'profile-select active' : 'profile-select'} type="button" aria-pressed={profileFilter === profile.handle} onClick={() => setProfileFilter(profile.handle)}><Avatar profile={profile} /><span><strong>{profile.name}</strong><small>@{profile.handle}</small></span></button></div>)}</aside>
            </div>
          </section>
        )}

        {tab === 'sistemas' && (
          <section className="content-section" aria-labelledby="systems-title">
            <div className="section-heading"><p className="eyebrow">Atalhos públicos</p><h1 id="systems-title">Sistemas</h1><p>Links externos curados; nenhuma credencial é solicitada pelo portal.</p></div>
            <div className="system-grid">{filteredSystems.map((system) => <article className="card system-card" key={system.id}><p className="eyebrow">{system.category}</p><h2>{system.name}</h2><p>{system.description}</p><a href={system.url} target="_blank" rel="noopener noreferrer">Abrir página externa <span aria-hidden="true">↗</span><span className="sr-only"> em nova aba</span></a></article>)}</div>
            {!filteredSystems.length && <p className="empty" role="status">Nenhum sistema corresponde à busca.</p>}
          </section>
        )}

        {tab === 'planejador' && <div className="content-section planner-section"><Planner query={query} offerings={offerings} /></div>}

        {tab === 'acervo' && (
          <section className="content-section" aria-labelledby="documents-title">
            <div className="section-heading"><p className="eyebrow">Acervo documental do CARB</p><h1 id="documents-title">Documentos</h1><p>Consulte a descrição e baixe o arquivo em PDF.</p></div>
            <div className="document-grid">{filteredDocuments.map((document) => <article className="document-card" key={document.id}><span className="document-icon" aria-hidden="true">PDF</span><div><p className="eyebrow">{document.updatedAt}</p><h2>{document.title}</h2><p>{document.description}</p><a className="primary" href={document.file} download>Baixar PDF ↓</a></div></article>)}</div>
            {!filteredDocuments.length && <p className="empty" role="status">Nenhum documento corresponde à busca.</p>}
          </section>
        )}
      </main>
      <footer><strong>CARB</strong><span>Protótipo local · dados acadêmicos sujeitos à confirmação no SIGAA</span></footer>
    </>
  )
}
