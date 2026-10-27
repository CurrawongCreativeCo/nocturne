import { describe, expect, it } from 'vitest'

import { getRevalidateReadiness, readRevalidateSecret } from './revalidate-config'

describe('webhook mode', () => {
  it('is off without the secret, and an empty one counts as unset', () => {
    expect(readRevalidateSecret({})).toBeUndefined()
    expect(readRevalidateSecret({ SANITY_REVALIDATE_SECRET: '' })).toBeUndefined()
    expect(getRevalidateReadiness({})).toEqual({
      ready: false,
      missing: ['SANITY_REVALIDATE_SECRET'],
    })
  })

  it('is ready with it', () => {
    expect(getRevalidateReadiness({ SANITY_REVALIDATE_SECRET: 'x' })).toEqual({ ready: true })
  })
})
