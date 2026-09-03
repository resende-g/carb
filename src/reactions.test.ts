import { describe, expect, it } from 'vitest'
import { barPercent, largestValue, reactionCountLabel, REACTION_OPTIONS } from './reactions'

describe('escala dos gráficos de reação', () => {
  it('normaliza pelo maior valor do conjunto exibido', () => {
    expect(barPercent(10, 10)).toBe(100)
    expect(barPercent(5, 10)).toBe(50)
    expect(barPercent(1, 3)).toBe(33)
  })

  it('trata máximo zero, valores negativos e não numéricos sem divisão por zero', () => {
    expect(barPercent(0, 0)).toBe(0)
    expect(barPercent(4, 0)).toBe(0)
    expect(barPercent(-2, 10)).toBe(0)
    expect(barPercent(Number.NaN, 10)).toBe(0)
    expect(barPercent(10, Number.NaN)).toBe(0)
    expect(barPercent(20, 10)).toBe(100)
  })

  it('encontra o maior valor e devolve zero para conjunto vazio', () => {
    expect(largestValue([3, 9, 1])).toBe(9)
    expect(largestValue([])).toBe(0)
    expect(largestValue([0, 0])).toBe(0)
  })

  it('mantém os quatro emojis do portal público com rótulo acessível em português', () => {
    expect(REACTION_OPTIONS.map(({ key }) => key)).toEqual(['heart', 'point', 'skull', 'dance'])
    expect(REACTION_OPTIONS.map(({ label }) => label)).toEqual(['Rosto sorridente', 'Rosto chorando', 'Sinal de proibido', 'Marca de beijo'])
    expect(reactionCountLabel(1)).toBe('1 reação')
    expect(reactionCountLabel(0)).toBe('0 reações')
    expect(reactionCountLabel(12)).toBe('12 reações')
  })
})
