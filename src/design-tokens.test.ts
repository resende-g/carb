import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')
const hex = (token: string) => css.match(new RegExp(`${token}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1] || ''
const luminance = (color: string) => {
  const channels = color.slice(1).match(/.{2}/g)?.map((value) => parseInt(value, 16) / 255) || []
  const [red, green, blue] = channels.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}
const contrast = (first: string, second: string) => {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('contraste dos novos tokens', () => {
  it('mantém texto branco legível em toda a paleta de hashtags', () => {
    for (const color of ['blue', 'green', 'gold', 'violet', 'red', 'gray']) {
      expect(contrast('#ffffff', hex(`--hashtag-${color}`))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('mantém contraste do tema escuro principal', () => {
    expect(contrast(hex('--foreground'), hex('--background'))).toBeGreaterThanOrEqual(4.5)
  })
})
