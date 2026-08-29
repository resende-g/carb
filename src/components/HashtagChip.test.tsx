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

  it('expõe o estado do filtro no botão', () => {
    const html = renderToStaticMarkup(<HashtagChip hashtag={hashtags[0]} active onClick={() => undefined} />)
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-label="Filtrar por #Comunidade"')
  })
})
