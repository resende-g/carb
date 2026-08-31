import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App, { LinkedText } from './App'

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

  it('transforma URLs no texto do aviso em links seguros', () => {
    const html = renderToStaticMarkup(<LinkedText>Veja https://example.com/edital e http://example.com; javascript:alert(1) &lt;b&gt;</LinkedText>)
    expect(html).toContain('<a href="https://example.com/edital"')
    expect(html).toContain('<a href="http://example.com"')
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('&lt;b&gt;')
  })
})
