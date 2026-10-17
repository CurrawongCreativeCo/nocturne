import { describe, expect, it } from 'vitest'

import {
  type EmbedProvider,
  EMBED_HEIGHTS,
  EMBED_PROVIDERS,
  INLINE_EMBED_PROVIDERS,
  embedHeight,
  embedNotes,
  resolveEmbed,
} from './embed-providers'

const MAPS_PB = '!1m18!1m12!1m3!1d3312.0!2d151.17!3d-33.89!2m3!1f0!2f0!3f0'

describe('the registry', () => {
  it('gives every provider the shape booking shares', () => {
    for (const provider of EMBED_PROVIDERS) {
      expect(provider.id).toMatch(/^[a-z-]+$/)
      expect(provider.label).not.toBe('')
      expect(['iframe', 'script']).toContain(provider.delivery)
      expect(provider.displays.length).toBeGreaterThan(0)
      expect([null, 'marketing']).toContain(provider.consent)
      // An address the provider offers as its own example must resolve.
      const example =
        provider.id === 'google-maps'
          ? `https://www.google.com/maps/embed?pb=${MAPS_PB}`
          : provider.example
      expect(resolveEmbed(provider.id, example)).toBeDefined()
    }
  })

  it('has unique ids', () => {
    const ids = EMBED_PROVIDERS.map((provider) => provider.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never lets a provider drop the narrowest sandbox', () => {
    for (const provider of EMBED_PROVIDERS) {
      expect(provider.sandbox).toContain('allow-scripts')
      expect(provider.sandbox).not.toContain('allow-top-navigation')
      expect(provider.sandbox).not.toContain('allow-top-navigation-by-user-activation')
      expect(provider.sandbox).not.toContain('allow-modals')
    }
  })

  it('offers only inline iframes to the Embed section', () => {
    expect(INLINE_EMBED_PROVIDERS.map((provider) => provider.id)).toEqual([
      'typeform',
      'google-maps',
      'spotify',
    ])
  })

  it('asks marketing consent of every provider that sets cookies', () => {
    for (const provider of EMBED_PROVIDERS as readonly EmbedProvider[]) {
      if (provider.setsCookies) expect(provider.consent).toBe('marketing')
    }
  })
})

describe('resolveEmbed', () => {
  it('rebuilds the Typeform address from the form id', () => {
    for (const input of [
      'https://form.typeform.com/to/AbCd1234',
      'https://acme.typeform.com/to/AbCd1234/',
      'acme.typeform.com/to/AbCd1234',
      'https://form.typeform.com/to/AbCd1234?typeform-source=x#top',
    ]) {
      expect(resolveEmbed('typeform', input)).toMatchObject({
        src: 'https://form.typeform.com/to/AbCd1234',
        openUrl: 'https://form.typeform.com/to/AbCd1234',
      })
    }
  })

  it('rebuilds Spotify as the embed player, keeping the public page to open', () => {
    for (const input of [
      'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc',
      'https://open.spotify.com/intl-au/playlist/37i9dQZF1DXcBWIGoYBM5M',
      'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M',
    ]) {
      expect(resolveEmbed('spotify', input)).toMatchObject({
        src: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M',
        openUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
      })
    }
  })

  it('keeps only the map’s own parameter', () => {
    const result = resolveEmbed(
      'google-maps',
      `https://www.google.com/maps/embed?pb=${MAPS_PB}&onload=alert(1)`,
    )
    expect(result?.src).toBe(`https://www.google.com/maps/embed?pb=${encodeURIComponent(MAPS_PB)}`)
    expect(result?.src).not.toContain('onload')
  })

  it.each([
    ['typeform', 'https://typeform.com.evil.test/to/AbCd1234'],
    ['typeform', 'https://evil.test/typeform.com/to/AbCd1234'],
    ['typeform', 'https://user:pass@form.typeform.com/to/AbCd1234'],
    ['typeform', 'https://form.typeform.com:8443/to/AbCd1234'],
    ['typeform', 'http://form.typeform.com/to/AbCd1234'],
    ['typeform', 'https://form.typeform.com/to/AbCd1234/../../x'],
    ['typeform', 'https://form.typeform.com/to/ab'],
    ['typeform', 'https://form.typeform.com/to/AbCd1234"onload="x'],
    ['typeform', 'javascript:alert(1)'],
    ['typeform', '<iframe src="https://form.typeform.com/to/AbCd1234"></iframe>'],
    ['typeform', ''],
    ['google-maps', 'https://www.google.com/maps/embed'],
    ['google-maps', 'https://www.google.com/maps/embed?pb=javascript:alert(1)'],
    ['google-maps', `https://www.google.com.evil.test/maps/embed?pb=${MAPS_PB}`],
    ['spotify', 'https://open.spotify.com/playlist/short'],
    ['spotify', 'https://open.spotify.com/user/someone'],
    ['spotify', 'https://spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'],
  ])('refuses %s address %s', (provider, input) => {
    expect(resolveEmbed(provider, input)).toBeUndefined()
  })

  it('refuses an address that belongs to another provider, and an unknown provider', () => {
    expect(resolveEmbed('spotify', 'https://form.typeform.com/to/AbCd1234')).toBeUndefined()
    expect(resolveEmbed('calendly', 'https://calendly.com/x/y')).toBeUndefined()
    expect(resolveEmbed(undefined, 'https://form.typeform.com/to/AbCd1234')).toBeUndefined()
  })
})

describe('embedHeight', () => {
  const provider = { defaultHeight: 'short' } as const

  it('prefers an exact height, clamped, then the preset, then the provider’s default', () => {
    expect(embedHeight(provider, 'tall', 352)).toBe(352)
    expect(embedHeight(provider, 'tall', 5)).toBe(120)
    expect(embedHeight(provider, 'tall', 99999)).toBe(1600)
    expect(embedHeight(provider, 'tall', null)).toBe(EMBED_HEIGHTS.tall)
    expect(embedHeight(provider, undefined, null)).toBe(EMBED_HEIGHTS.short)
    expect(embedHeight(provider, 'huge', undefined)).toBe(EMBED_HEIGHTS.short)
  })
})

describe('embedNotes', () => {
  it('names the form and says cookies are set before anything loads', () => {
    const notes = embedNotes({
      label: 'Typeform',
      noun: 'form',
      setsCookies: true,
      consent: 'marketing',
    })
    expect(notes.button).toBe('Show the form')
    expect(notes.note).toContain('Typeform sets cookies when the form loads.')
    expect(notes.consent).toContain('marketing cookies')
  })

  it('has no cookie warning for a provider that sets none', () => {
    const notes = embedNotes({
      label: 'Example',
      noun: 'player',
      setsCookies: false,
      consent: null,
    })
    expect(notes.note).not.toContain('cookies')
    expect(notes.button).toBe('Show the player')
  })
})
