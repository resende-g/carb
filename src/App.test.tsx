import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('interface pública', () => {
  it('renderiza navegação, busca, perfis e hashtags com semântica acessível', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('aria-label="CARB — voltar aos avisos"')
    expect(html).toContain('aria-label="Abrir menu principal"')
    expect(html).toContain('aria-label="Filtrar pelo perfil autor"')
    expect(html).toContain('aria-label="Filtrar por hashtag temática"')
    expect(html).toContain('#Matrícula')
  })
})
