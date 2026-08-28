import { describe, expect, it } from 'vitest'
import { notices, profiles, tags } from './data'
import { dataIntegrityErrors, filterNotices, removeTag } from './feed'

describe('perfis, tags e publicações', () => {
  it('mantém autor e tags no grão da publicação sem referências órfãs', () => {
    expect(dataIntegrityErrors(profiles, tags, notices)).toEqual([])
  })

  it('combina busca textual, perfil autor e uma tag', () => {
    const result = filterNotices(notices, profiles, tags, { query: 'prazo', profile: 'carb', tag: 'carb-diretoria-academica' })
    expect(result.map((notice) => notice.id)).toEqual(['a2'])
    expect(filterNotices(notices, profiles, tags, { query: 'prazo', profile: 'extensoes', tag: '' })).toEqual([])
  })

  it('exclui a tag e remove todas as associações sem deixar o ID órfão', () => {
    const result = removeTag(tags, notices, 'carb-diretoria-academica')
    expect(result.affected).toBe(3)
    expect(result.tags.some((tag) => tag.id === 'carb-diretoria-academica')).toBe(false)
    expect(result.notices.some((notice) => notice.tagIds.includes('carb-diretoria-academica'))).toBe(false)
    expect(dataIntegrityErrors(profiles, result.tags, result.notices)).toEqual([])
  })
})
