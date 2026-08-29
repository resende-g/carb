import { describe, expect, it } from 'vitest'
import { hashtags, notices, profiles } from './data'
import { dataIntegrityErrors, filterNotices, removeHashtag } from './feed'

describe('perfis, hashtags e publicações', () => {
  it('mantém autor e hashtags no grão da publicação sem referências órfãs', () => {
    expect(dataIntegrityErrors(profiles, hashtags, notices)).toEqual([])
  })

  it('combina busca textual, perfil autor e uma hashtag global', () => {
    const result = filterNotices(notices, profiles, hashtags, { query: 'prazo', profile: 'carb', hashtag: 'hashtag-matricula' })
    expect(result.map((notice) => notice.id)).toEqual(['a2'])
    expect(filterNotices(notices, profiles, hashtags, { query: 'prazo', profile: 'extensoes', hashtag: '' })).toEqual([])
  })

  it('exclui a hashtag e remove associações sem deixar o ID órfão', () => {
    const result = removeHashtag(hashtags, notices, 'hashtag-matricula')
    expect(result.affected).toBe(3)
    expect(result.hashtags.some((hashtag) => hashtag.id === 'hashtag-matricula')).toBe(false)
    expect(result.notices.some((notice) => notice.hashtagIds.includes('hashtag-matricula'))).toBe(false)
    expect(dataIntegrityErrors(profiles, result.hashtags, result.notices)).toEqual([])
  })
})
