import { describe, expect, it } from 'vitest'

import { helpFallbackWording, supportRoute } from './support'

describe('supportRoute', () => {
  it('prefers the support address, then the guide, then the Help section', () => {
    expect(
      supportRoute({ supportEmail: 'help@example.com', guideUrl: 'https://g.example' }),
    ).toEqual({ href: 'mailto:help@example.com', external: true })
    expect(supportRoute({ guideUrl: 'https://g.example' })).toEqual({
      href: 'https://g.example',
      external: true,
    })
    expect(supportRoute({})).toEqual({ href: '#start-here-help', external: false })
  })
})

describe('helpFallbackWording', () => {
  it('names the studio and says what to include', () => {
    const { heading, body } = helpFallbackWording('Acme Studio')
    expect(heading).toContain('Acme Studio')
    expect(body).toContain('Acme Studio')
    expect(body).toMatch(/name of the page/)
    expect(body).toMatch(/screenshot/)
  })
})
