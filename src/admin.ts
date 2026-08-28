import { TIME_ROWS, type ClassOffering, type Meeting, type Semester, type Shift } from './planner'

const REQUIRED_COLUMNS = ['codigo', 'componente', 'turma', 'professor', 'local', 'horarios'] as const
const DAYS = new Set(['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'])
const STARTS = new Set(TIME_ROWS.map(([start]) => start))
const ENDS = new Set(TIME_ROWS.map(([, end]) => end))

function rows(text: string, delimiter: ',' | ';') {
  const result: string[][] = [['']]
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"' && quoted && text[index + 1] === '"') {
      const row = result[result.length - 1]
      row[row.length - 1] += '"'
      index += 1
    } else if (char === '"') quoted = !quoted
    else if (char === delimiter && !quoted) result.at(-1)?.push('')
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      result.push([''])
    } else result.at(-1)![result.at(-1)!.length - 1] += char
  }

  return result.filter((row) => row.some((value) => value.trim()))
}

const integer = (value: string, line: number) => {
  if (!value.trim()) return null
  const number = Number(value)
  if (!Number.isInteger(number) || number < 0) throw new Error(`Linha ${line}: use números inteiros não negativos para vagas e matrículas.`)
  return number
}

const semester = (value: string, line: number): Semester => {
  const clean = value.trim().toLocaleLowerCase('pt-BR')
  if (clean === 'optativa' || clean === 'outros') return clean
  const number = Number(clean)
  if (!Number.isInteger(number) || number < 1 || number > 12) throw new Error(`Linha ${line}: semestre inválido.`)
  return number
}

const shift = (start: string): Shift => start < '13:00' ? 'manhã' : start < '18:30' ? 'tarde' : 'noite'

function meetings(value: string, line: number): Meeting[] {
  return value.split('|').map((slot) => {
    const match = slot.trim().toLocaleLowerCase('pt-BR').match(/^(segunda|terça|quarta|quinta|sexta|sábado)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/)
    if (!match || !DAYS.has(match[1]) || !STARTS.has(match[2]) || !ENDS.has(match[3]) || match[2] >= match[3]) {
      throw new Error(`Linha ${line}: horário inválido. Exemplo: segunda 07:00-08:50|quarta 07:00-08:50.`)
    }
    return { day: match[1], start: match[2], end: match[3], shift: shift(match[2]) }
  })
}

export function parseOfferingsCsv(text: string, defaultPeriod: string): ClassOffering[] {
  const comma = rows(text.replace(/^\uFEFF/, ''), ',')
  const semicolon = rows(text.replace(/^\uFEFF/, ''), ';')
  const parsed = (semicolon[0]?.length || 0) > (comma[0]?.length || 0) ? semicolon : comma
  const headers = parsed.shift()?.map((value) => value.trim().toLocaleLowerCase('pt-BR')) || []
  const column = (name: string) => headers.indexOf(name)

  for (const name of REQUIRED_COLUMNS) if (column(name) < 0) throw new Error(`Coluna obrigatória ausente: ${name}.`)
  if (!parsed.length) throw new Error('O CSV não contém turmas.')

  const offerings = parsed.map((row, index): ClassOffering => {
    const line = index + 2
    const get = (name: string) => row[column(name)]?.trim() || ''
    const code = get('codigo').toLocaleUpperCase('pt-BR')
    const className = get('turma').toLocaleUpperCase('pt-BR')
    const period = get('periodo') || defaultPeriod
    if (!code || !className || !get('componente') || !get('professor') || !get('local')) throw new Error(`Linha ${line}: há campos obrigatórios vazios.`)
    const parsedMeetings = meetings(get('horarios'), line)

    return {
      id: `${period}-${code}-${className}`,
      period,
      code,
      component: get('componente'),
      class: className,
      professor: get('professor'),
      location: get('local'),
      scheduleCode: get('horarios'),
      meetings: parsedMeetings,
      enrolled: integer(get('matriculados'), line),
      capacity: integer(get('capacidade'), line),
      daySemester: semester(get('semestre_diurno') || 'outros', line),
      nightSemester: semester(get('semestre_noturno') || 'outros', line),
    }
  })

  if (new Set(offerings.map(({ id }) => id)).size !== offerings.length) throw new Error('O CSV contém período, código e turma duplicados.')
  return offerings
}
