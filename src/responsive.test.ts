import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')

describe('responsividade do conteúdo público', () => {
  it('quebra URLs longas dentro dos avisos sem criar overflow horizontal', () => {
    expect(css).toMatch(/\.notice-card > p \{[^}]*overflow-wrap: anywhere;/)
    expect(css).toMatch(/\.notice-card > p a \{[^}]*overflow-wrap: anywhere;/)
    expect(css).toMatch(/\.notice-card > p a \{[^}]*word-break: break-word;/)
  })
})
