import { describe, expect, it } from 'vitest'
import { hashtags, notices, profiles } from './data'
import { dataIntegrityErrors, filterNotices, recentPostingProfiles, removeHashtag, trendingHashtags } from './feed'

describe('perfis, hashtags e publicações', () => {
  it('mantém autor e hashtags no grão da publicação sem referências órfãs', () => {
    expect(dataIntegrityErrors(profiles, hashtags, notices)).toEqual([])
  })

  it('combina perfil autor com hashtag escrita na busca', () => {
    const result = filterNotices(notices, profiles, hashtags, { query: '#Matrícula', profile: 'carb' })
    expect(result.map((notice) => notice.id)).toEqual(['a2', 'a5', 'a7'])
    expect(filterNotices(notices, profiles, hashtags, { query: '#Matrícula', profile: 'extensoes' })).toEqual([])
  })

  it('lista até 5 autores distintos pela ordem recente do feed', () => {
    expect(recentPostingProfiles(notices, profiles).map((profile) => profile.handle)).toEqual(['carb', 'extensoes', 'pesquisa'])
  })

  it('calcula as 5 hashtags mais usadas no máximo nos 10 posts recentes', () => {
    const extended = [...notices, { ...notices[0], id: 'a9' }, { ...notices[0], id: 'a10' }, { ...notices[0], id: 'a11', hashtagIds: ['hashtag-estagio'] }]
    const trends = trendingHashtags(extended, hashtags)
    expect(trends).toHaveLength(5)
    expect(trends[0]).toMatchObject({ hashtag: { id: 'hashtag-comunidade' }, count: 4 })
    expect(trends.some(({ hashtag }) => hashtag.id === 'hashtag-estagio')).toBe(false)
  })

  it('exclui a hashtag e remove associações sem deixar o ID órfão', () => {
    const result = removeHashtag(hashtags, notices, 'hashtag-matricula')
    expect(result.affected).toBe(3)
    expect(result.hashtags.some((hashtag) => hashtag.id === 'hashtag-matricula')).toBe(false)
    expect(result.notices.some((notice) => notice.hashtagIds.includes('hashtag-matricula'))).toBe(false)
    expect(dataIntegrityErrors(profiles, result.hashtags, result.notices)).toEqual([])
  })
})
