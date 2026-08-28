import { describe, expect, it } from 'vitest'
import { parseOfferingsCsv } from './admin'

describe('importação administrativa', () => {
  it('aceita CSV com ponto e vírgula e rejeita chave duplicada', () => {
    const header = 'codigo;componente;turma;professor;local;horarios;matriculados;capacidade;semestre_diurno;semestre_noturno'
    const row = 'DIR101;Direito sintético;01;Docente;Sala 1;segunda 07:00-08:50|quarta 07:00-08:50;20;40;1;1'
    const offering = parseOfferingsCsv(`${header}\n${row}`, '2026.2')[0]

    expect(offering.id).toBe('2026.2-DIR101-01')
    expect(offering.meetings).toHaveLength(2)
    expect(() => parseOfferingsCsv(`${header}\n${row}\n${row}`, '2026.2')).toThrow('duplicados')
  })
})
