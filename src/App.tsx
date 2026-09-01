import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import academicDataJson from './academic-data.json'
import { AdminApp } from './admin/AdminApp'
import { HashtagChip } from './components/HashtagChip'
import { AdminIcon } from './components/ui/admin-icon'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Separator } from './components/ui/separator'
import { documents, hashtags as initialHashtags, notices, profiles as initialProfiles, systems, type Hashtag, type Notice, type Profile, type ReactionCounts } from './data'
import { filterNotices, recentPostingProfiles, trendingHashtags } from './feed'
import { meetingLabel, selectionIssue, TIME_ROWS, type ClassOffering, type SelectionIssue, type Semester, type Shift } from './planner'
import { anonymousReactionId, loadPublicData, persistReaction, PUBLIC_DATA_REFRESH_MS, supabaseConfigured } from './supabase'

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

const normalized = (value: string) => value.trim().toLocaleLowerCase('pt-BR')
const semesterLabel = (value: Semester) => typeof value === 'number' ? `${value}º semestre` : value === 'optativa' ? 'Optativa' : 'Outras ofertas'
const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g
const URL_SUFFIX = /[),.;!?]+$/

export function LinkedText({ children }: { children: string }) {
  return children.split(URL_PATTERN).map((part, index) => {
    if (!/^https?:\/\//.test(part)) return part
    const suffix = part.match(URL_SUFFIX)?.[0] || ''
    const href = suffix ? part.slice(0, -suffix.length) : part
    return <Fragment key={index}><a href={href} target="_blank" rel="noopener noreferrer">{href}</a>{suffix}</Fragment>
  })
}

function Avatar({ profile }: { profile: Profile }) {
  return (
    <span className="avatar" aria-hidden="true" style={{ backgroundImage: `url(${profile.avatar})`, backgroundPosition: profile.avatarPosition, backgroundSize: profile.avatarSize }}>
      <span>{profile.shortName}</span>
    </span>
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
          <AdminIcon name="share" />
        </button>
      </div>
      {shareMessage && <p className="share-message" role="status">{shareMessage}</p>}
    </div>
  )
}

function NoticeCard({ notice, profile, hashtags, reaction, onReact, onProfile, onHashtag }: { notice: Notice; profile: Profile; hashtags: Hashtag[]; reaction?: Reaction; onReact: (reaction: Reaction) => void; onProfile?: () => void; onHashtag: (hashtag: Hashtag) => void }) {
  const profileContent = <><Avatar profile={profile} /><span><strong>{profile.name}</strong><small>@{profile.handle} · {notice.date}</small></span></>
  return (
    <article id={`aviso-${notice.id}`}>
      <Card className="card notice-card gap-0 py-0">
        {onProfile ? <button className="profile-link" type="button" onClick={onProfile}>{profileContent}</button> : <div className="profile-link">{profileContent}</div>}
        <div className="meta"><span>{notice.category}</span><span>{notice.state}</span></div>
        <div className="notice-hashtags">{hashtags.map((hashtag) => <HashtagChip key={hashtag.id} hashtag={hashtag} onClick={() => onHashtag(hashtag)} />)}</div>
        <h2>{notice.title}</h2>
        <p><LinkedText>{notice.text}</LinkedText></p>
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
  const initialPath = () => typeof window === 'undefined' ? '/' : window.location.pathname
  const pathTab = (path: string): Tab => path === '/sistemas' ? 'sistemas' : path === '/acervo' ? 'acervo' : path === '/planejador' ? 'planejador' : 'avisos'
  const [path, setPath] = useState(initialPath)
  const isAdminRoute = path.startsWith('/admin')
  const [tab, setTab] = useState<Tab>(() => pathTab(initialPath()))
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [limit, setLimit] = useState(6)
  const [profileFilter, setProfileFilter] = useState('')
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches)
  const allowLocalFixtures = import.meta.env.DEV && !supabaseConfigured
  const [profiles, setProfiles] = useState<Profile[]>(allowLocalFixtures ? initialProfiles : [])
  const [siteHashtags, setSiteHashtags] = useState<Hashtag[]>(allowLocalFixtures ? initialHashtags : [])
  const [siteNotices, setSiteNotices] = useState<Notice[]>(allowLocalFixtures ? notices : [])
  const [siteDocuments, setSiteDocuments] = useState(allowLocalFixtures ? documents : [])
  const offerings = academicData.offerings
  const [theme, setTheme] = useState<'dark' | 'light'>(() => readLocal<'dark' | 'light'>(THEME_KEY, 'dark') === 'light' ? 'light' : 'dark')
  const [reactions, setReactions] = useState<Record<string, Reaction>>(() => readLocal(REACTIONS_KEY, {}))
  const [dataMode, setDataMode] = useState(
    supabaseConfigured
      ? 'Conectando ao ambiente demonstrativo…'
      : import.meta.env.DEV
        ? 'Fixtures locais de demonstração'
        : 'Backend indisponível'
  )
  const [reactionMessage, setReactionMessage] = useState('')
  const reactionIdRef = useRef('')
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const labels = TAB_LABELS

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    writeLocal(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    const route = () => {
      const nextPath = window.location.pathname
      setPath(nextPath)
      if (!nextPath.startsWith('/admin')) setTab(pathTab(nextPath))
    }
    window.addEventListener('popstate', route)
    return () => window.removeEventListener('popstate', route)
  }, [])

  useEffect(() => {
    if (!supabaseConfigured) return
    let active = true
    reactionIdRef.current = anonymousReactionId()
    const refresh = () => void loadPublicData(reactionIdRef.current).then((data) => {
        if (!active) return
        setProfiles(data.profiles)
        setSiteHashtags(data.hashtags)
        setSiteNotices(data.notices)
        setSiteDocuments(data.documents)
        setReactions(data.selectedReactions)
        writeLocal(REACTIONS_KEY, data.selectedReactions)
        setDataMode('Dados persistidos no ambiente demonstrativo')
      }).catch(() => {
        if (!active) return
        setDataMode('Backend temporariamente indisponível')
      })
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refresh() }
    refresh()
    const interval = window.setInterval(refresh, PUBLIC_DATA_REFRESH_MS)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 760px)')
    const removeHiddenFilter = () => {
      setIsMobile(mobile.matches)
      if (mobile.matches) setProfileFilter('')
    }
    removeHiddenFilter()
    mobile.addEventListener('change', removeHiddenFilter)
    return () => mobile.removeEventListener('change', removeHiddenFilter)
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

  const react = async (noticeId: string, selected: Reaction) => {
    const previous = reactions
    const next = { ...reactions }
    if (next[noticeId] === selected) delete next[noticeId]
    else next[noticeId] = selected
    setReactions(next)
    writeLocal(REACTIONS_KEY, next)
    if (!supabaseConfigured || !reactionIdRef.current) return
    try {
      await persistReaction(noticeId, reactionIdRef.current, next[noticeId] || null)
      setReactionMessage('Reação salva.')
    } catch {
      setReactions(previous)
      writeLocal(REACTIONS_KEY, previous)
      setReactionMessage('Não foi possível salvar a reação.')
    }
  }

  const changeTab = (next: Tab) => {
    setTab(next)
    const nextPath = next === 'avisos' ? '/' : `/${next}`
    if (window.location.pathname !== nextPath) history.pushState({}, '', nextPath)
    setPath(nextPath)
    setQuery('')
    setMenuOpen(false)
    setLimit(6)
    window.scrollTo({ top: 0 })
  }

  const goHome = () => {
    changeTab('avisos')
    setProfileFilter('')
  }

  const search = normalized(query)
  const filteredNotices = filterNotices(siteNotices, profiles, siteHashtags, { query, profile: profileFilter })
  const filteredSystems = systems.filter((system) => !search || [system.name, system.description, system.category].some((value) => value.toLocaleLowerCase('pt-BR').includes(search)))
  const filteredDocuments = siteDocuments.filter((document) => !search || [document.title, document.description, document.updatedAt].some((value) => value.toLocaleLowerCase('pt-BR').includes(search)))
  const activeProfile = profiles.find((profile) => profile.handle === profileFilter)
  const recentProfiles = recentPostingProfiles(siteNotices, profiles)
  const trends = trendingHashtags(siteNotices, siteHashtags)
  const trendWindow = Math.min(10, siteNotices.length)
  const selectProfile = (handle: string) => {
    setProfileFilter(handle)
    setLimit(6)
  }
  if (isAdminRoute) return <AdminApp />

  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="topbar" id="top">
        <button className="brand-button" type="button" onClick={goHome} aria-label="CARB — voltar aos avisos" title="Voltar aos avisos"><img src="/logo-carb.png" alt="" aria-hidden="true" /></button>
        <div className="search-box" id="site-search"><img src="/icons/busca-24.png" alt="" aria-hidden="true" /><Label className="sr-only" htmlFor="search">Buscar em {labels[tab]}</Label><Input id="search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar em ${labels[tab].toLocaleLowerCase('pt-BR')}`} />{query && <button className="search-clear" type="button" aria-label="Limpar busca" onClick={() => setQuery('')}>×</button>}</div>
        <div className="menu-wrap" ref={menuRef}>
          <button ref={menuButtonRef} className="menu-button" type="button" aria-label={menuOpen ? 'Fechar menu principal' : 'Abrir menu principal'} aria-expanded={menuOpen} aria-controls="main-menu" onClick={() => setMenuOpen((current) => !current)}><AdminIcon name="burger" /></button>
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
              <div className="feed">
                {filteredNotices.length ? filteredNotices.slice(0, limit).map((notice) => {
                  const profile = profiles.find((item) => item.handle === notice.author) || profiles[0]
                  return <NoticeCard key={notice.id} notice={notice} profile={profile} hashtags={siteHashtags.filter((hashtag) => notice.hashtagIds.includes(hashtag.id))} reaction={reactions[notice.id]} onReact={(choice) => react(notice.id, choice)} onProfile={isMobile ? undefined : () => selectProfile(profile.handle)} onHashtag={(hashtag) => { setQuery(`#${hashtag.name}`); setLimit(6); window.scrollTo({ top: 0 }) }} />
                }) : <p className="empty" role="status">Nenhum aviso corresponde aos filtros ativos.</p>}
                {limit < filteredNotices.length && <button className="load-more" type="button" onClick={() => setLimit((value) => value + 3)}>Carregar mais</button>}
              </div>
              <aside className="feed-sidebar" aria-label="Filtros e tendências dos avisos">
                <section className="profiles-panel" aria-labelledby="profiles-title">
                  <p className="eyebrow">Perfis institucionais</p>
                  <h2 id="profiles-title">Quem publica</h2>
                  <p className="panel-note">Até 5 perfis que publicaram mais recentemente.</p>
                  {recentProfiles.map((profile) => <div className="profile-row" key={profile.handle}><button className={profileFilter === profile.handle ? 'profile-select active' : 'profile-select'} type="button" aria-pressed={profileFilter === profile.handle} onClick={() => selectProfile(profileFilter === profile.handle ? '' : profile.handle)}><Avatar profile={profile} /><span><strong>{profile.name}</strong><small>@{profile.handle}</small></span></button></div>)}
                </section>
                <section className="trends-panel" aria-labelledby="trends-title">
                  <p className="eyebrow">Tópicos recentes</p>
                  <h2 id="trends-title">Top trends</h2>
                  <p className="panel-note">5 hashtags mais usadas em {trendWindow} avisos recentes.</p>
                  <ol className="trend-list">{trends.map(({ hashtag, count }) => <li key={hashtag.id}><HashtagChip hashtag={hashtag} /><small>{count} {count === 1 ? 'aviso' : 'avisos'}</small></li>)}</ol>
                </section>
              </aside>
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
      {reactionMessage && <p className="sr-only" role="status">{reactionMessage}</p>}
      <footer><strong>CARB</strong><span>Protótipo público · {dataMode} · dados acadêmicos sujeitos à confirmação no SIGAA</span></footer>
    </>
  )
}
