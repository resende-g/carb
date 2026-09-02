import { describe, expect, it } from 'vitest'
import { alignSignedUrls, PUBLIC_DATA_REFRESH_MS, SIGNED_URL_TTL_SECONDS } from './supabase'

describe('URLs assinadas dos assets públicos', () => {
  it('renova os dados antes de as URLs expirarem', () => {
    expect(PUBLIC_DATA_REFRESH_MS).toBeLessThan(SIGNED_URL_TTL_SECONDS * 1000)
  })

  it('alinha o lote de URLs aos registros, inclusive quando não há asset', () => {
    expect(alignSignedUrls(['avatars/a.png', null, 'posts/b.png'], [
      { path: 'posts/b.png', signedUrl: 'https://storage.test/b' },
      { path: 'avatars/a.png', signedUrl: 'https://storage.test/a' },
    ])).toEqual(['https://storage.test/a', '', 'https://storage.test/b'])
  })
})
