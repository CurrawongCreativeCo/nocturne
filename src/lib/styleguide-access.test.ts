import { describe, expect, it } from 'vitest'

import {
  isStyleguidePath,
  MIN_PREVIEW_TOKEN_LENGTH,
  styleguideAccess,
  tokenMatches,
} from './styleguide-access'

const TOKEN = 'a-long-enough-token-1234'

describe('styleguideAccess', () => {
  it('is open in development and in the end-to-end build', () => {
    expect(styleguideAccess({ nodeEnv: 'development' })).toBe('open')
    expect(styleguideAccess({ nodeEnv: 'production', e2eGallery: '1' })).toBe('open')
  })

  it('needs the token on a preview deployment', () => {
    expect(
      styleguideAccess({ nodeEnv: 'production', vercelEnv: 'preview', previewToken: TOKEN }),
    ).toBe('token')
  })

  it('stays closed in production, even with a token set', () => {
    expect(
      styleguideAccess({ nodeEnv: 'production', vercelEnv: 'production', previewToken: TOKEN }),
    ).toBe('closed')
  })

  it('stays closed on a preview with no token, or one that is too short', () => {
    expect(styleguideAccess({ nodeEnv: 'production', vercelEnv: 'preview' })).toBe('closed')
    expect(
      styleguideAccess({
        nodeEnv: 'production',
        vercelEnv: 'preview',
        previewToken: 'x'.repeat(MIN_PREVIEW_TOKEN_LENGTH - 1),
      }),
    ).toBe('closed')
  })

  it('stays closed off Vercel', () => {
    expect(styleguideAccess({ nodeEnv: 'production', previewToken: TOKEN })).toBe('closed')
  })
})

describe('tokenMatches', () => {
  it('accepts only the exact token', () => {
    expect(tokenMatches(TOKEN, TOKEN)).toBe(true)
    expect(tokenMatches(TOKEN, `${TOKEN}x`)).toBe(false)
    expect(tokenMatches(TOKEN, TOKEN.slice(0, -1))).toBe(false)
    expect(tokenMatches(TOKEN, TOKEN.replace('a', 'b'))).toBe(false)
  })

  it('rejects a missing value, and never matches when no token is configured', () => {
    expect(tokenMatches(TOKEN, null)).toBe(false)
    expect(tokenMatches(TOKEN, '')).toBe(false)
    expect(tokenMatches(undefined, 'anything')).toBe(false)
    expect(tokenMatches('', '')).toBe(false)
  })
})

describe('isStyleguidePath', () => {
  it('matches the route and its children only', () => {
    expect(isStyleguidePath('/section-gallery', '/section-gallery')).toBe(true)
    expect(isStyleguidePath('/section-gallery/tokens', '/section-gallery')).toBe(true)
    expect(isStyleguidePath('/section-gallery-x', '/section-gallery')).toBe(false)
  })
})
