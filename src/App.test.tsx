import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('interface pública', () => {
  it('renderiza busca, Quem publica e Top trends com semântica acessível', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('aria-label="CARB — voltar aos avisos"')
    expect(html).toContain('aria-label="Abrir menu principal"')
    expect(html).toContain('Quem publica')
    expect(html).toContain('Top trends')
    expect(html).toContain('5 hashtags mais usadas em 8 avisos recentes')
    expect(html).not.toContain('Todas as hashtags')
    expect(html).toContain('#Matrícula')
  })
})
