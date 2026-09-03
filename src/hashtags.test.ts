import { describe, expect, it } from 'vitest'
import { hashtags, notices } from './data'
import { hashtagCatalogErrors, hashtagSlug, normalizeHashtagName, uniqueHashtagIds } from './hashtags'

describe('catálogo global de hashtags', () => {
  it('normaliza nome e gera slug previsível', () => {
    expect(normalizeHashtagName('  ##Pesquisa   Jurídica ')).toBe('Pesquisa Jurídica')
    expect(hashtagSlug('Pesquisa Jurídica')).toBe('pesquisa-juridica')
  })

  it('rejeita nome e slug duplicados sem diferenciar maiúsculas', () => {
    const duplicate = { ...hashtags[0], id: 'outra', name: 'COMUNIDADE', slug: 'COMUNIDADE' }
    expect(hashtagCatalogErrors([...hashtags, duplicate])).toEqual(expect.arrayContaining([
      'Hashtag outra repete name.',
      'Hashtag outra repete slug.',
    ]))
  })

  it('deduplica associações', () => {
    expect(uniqueHashtagIds(['hashtag-pesquisa', 'hashtag-pesquisa'])).toEqual(['hashtag-pesquisa'])
    expect(notices.find((notice) => notice.id === 'a2')?.hashtagIds).toHaveLength(2)
  })
})
