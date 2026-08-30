import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AdminApp } from './AdminApp'

describe('entrada administrativa', () => {
  it('não oferece credencial simulada quando o Supabase não está configurado', () => {
    const html = renderToStaticMarkup(<AdminApp />)
    expect(html).toContain('Supabase não configurado')
    expect(html).toContain('VITE_SUPABASE_URL')
    expect(html).not.toContain('VITE_ADMIN_USERNAME')
    expect(html).not.toContain('editor@carb')
  })
})

