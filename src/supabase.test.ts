import { describe, expect, it } from 'vitest'
import { PUBLIC_DATA_REFRESH_MS, SIGNED_URL_TTL_SECONDS } from './supabase'

describe('URLs assinadas dos assets públicos', () => {
  it('renova os dados antes de as URLs expirarem', () => {
    expect(PUBLIC_DATA_REFRESH_MS).toBeLessThan(SIGNED_URL_TTL_SECONDS * 1000)
  })
})
