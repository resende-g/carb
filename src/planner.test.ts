import { describe, expect, it } from 'vitest'
import academicData from './academic-data.json'
import { profiles } from './data'
import { meetingsConflict, selectionIssue, type ClassOffering } from './planner'

const offering = (id: string, code: string, day: string, start: string, end: string): ClassOffering => ({
  id,
  period: '2026.2',
  code,
  component: code,
  class: '01',
  professor: 'Docente',
  location: 'Sala',
  scheduleCode: '',
  meetings: [{ day, start, end, shift: 'manhã' }],
  enrolled: 0,
  capacity: 50,
  daySemester: 1,
  nightSemester: 1,
})

describe('planejador', () => {
  it('bloqueia sobreposição e turma duplicada, mas aceita horários adjacentes', () => {
    const selected = offering('a', 'DIR101', 'segunda', '08:00', '10:00')
    const conflict = offering('b', 'DIR102', 'segunda', '09:45', '11:35')
    const adjacent = offering('c', 'DIR103', 'segunda', '10:00', '11:00')
    const duplicate = offering('d', 'DIR101', 'quarta', '14:00', '16:00')

    expect(meetingsConflict(selected.meetings[0], adjacent.meetings[0])).toBe(false)
    expect(selectionIssue([selected], conflict)?.message).toContain('conflita')
    expect(selectionIssue([selected], adjacent)).toBeNull()
    expect(selectionIssue([selected], duplicate)?.message).toContain('já selecionou')

    const issue = selectionIssue([selected], conflict)
    expect(issue).toMatchObject({ candidate: { code: 'DIR102' }, conflict: { code: 'DIR101' }, candidateMeeting: { day: 'segunda', start: '09:45', end: '11:35' }, conflictMeeting: { start: '08:00', end: '10:00' } })
  })

  it('mantém íntegros os dados extraídos e os @ institucionais', () => {
    const offerings = academicData.offerings as ClassOffering[]
    const ids = offerings.map((item) => item.id)
    const handles = profiles.map((profile) => profile.handle)
    const teoriaDoDireito = offerings.find((item) => item.id === '2026.2-DIRA45-01')

    expect(offerings).toHaveLength(280)
    expect(new Set(ids).size).toBe(ids.length)
    expect(offerings.every((item) => item.meetings.length > 0 && item.meetings.every((meeting) => meeting.start < meeting.end))).toBe(true)
    expect(teoriaDoDireito?.meetings.map((meeting) => meeting.day)).toEqual(['segunda', 'quarta'])
    expect(handles.every((handle) => /^[a-z0-9]{3,30}$/.test(handle))).toBe(true)
    expect(new Set(handles).size).toBe(handles.length)
  })
})
