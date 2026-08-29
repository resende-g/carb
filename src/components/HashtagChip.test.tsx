import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { hashtags } from '@/data'
import { HashtagChip } from './HashtagChip'

describe('HashtagChip', () => {
  it('exibe # e nome acessível no estado estático', () => {
    const html = renderToStaticMarkup(<HashtagChip hashtag={hashtags[0]} />)
    expect(html).toContain('#Comunidade')
    expect(html).toContain('aria-label="Hashtag Comunidade"')
  })

  it('expõe uma ação de pesquisa sem estado selecionável', () => {
    const html = renderToStaticMarkup(<HashtagChip hashtag={hashtags[0]} onClick={() => undefined} />)
    expect(html).not.toContain('aria-pressed')
    expect(html).toContain('aria-label="Pesquisar #Comunidade"')
  })
})
