export type Shift = 'manhã' | 'tarde' | 'noite'

export type Meeting = {
  day: string
  start: string
  end: string
  shift: Shift
}

export type Semester = number | 'optativa' | 'outros'

export type ClassOffering = {
  id: string
  period: string
  code: string
  component: string
  class: string
  professor: string
  location: string
  scheduleCode: string
  meetings: Meeting[]
  enrolled: number | null
  capacity: number | null
  daySemester: Semester
  nightSemester: Semester
}

export const TIME_ROWS: [string, string][] = [
  ['07:00', '07:55'], ['07:55', '08:50'], ['08:50', '09:45'], ['09:45', '10:40'], ['10:40', '11:35'], ['11:35', '12:30'],
  ['13:00', '13:55'], ['13:55', '14:50'], ['14:50', '15:45'], ['15:45', '16:40'], ['16:40', '17:35'], ['17:35', '18:30'],
  ['18:30', '19:25'], ['19:25', '20:20'], ['20:20', '21:15'], ['21:15', '22:10'],
]

const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3))

export function meetingsConflict(first: Meeting, second: Meeting) {
  return first.day === second.day && minutes(first.start) < minutes(second.end) && minutes(second.start) < minutes(first.end)
}

export function conflictingClass(selected: ClassOffering[], candidate: ClassOffering) {
  return selected.find((current) => current.meetings.some((first) => candidate.meetings.some((second) => meetingsConflict(first, second))))
}

export type SelectionIssue = {
  message: string
  candidate: ClassOffering
  conflict?: ClassOffering
  candidateMeeting?: Meeting
  conflictMeeting?: Meeting
}

export function selectionIssue(selected: ClassOffering[], candidate: ClassOffering): SelectionIssue | null {
  if (selected.some((current) => current.code === candidate.code)) return { message: `Você já selecionou uma turma de ${candidate.code}.`, candidate }
  for (const conflict of selected) {
    for (const conflictMeeting of conflict.meetings) {
      const candidateMeeting = candidate.meetings.find((meeting) => meetingsConflict(conflictMeeting, meeting))
      if (candidateMeeting) return {
        message: `${candidate.code} conflita com ${conflict.code} em ${candidateMeeting.day}, ${candidateMeeting.start}-${candidateMeeting.end}.`,
        candidate,
        conflict,
        candidateMeeting,
        conflictMeeting,
      }
    }
  }
  return null
}

export function selectionProblem(selected: ClassOffering[], candidate: ClassOffering) {
  return selectionIssue(selected, candidate)?.message || null
}

export const meetingLabel = (meeting: Meeting) => `${meeting.day}, ${meeting.start}-${meeting.end}`
