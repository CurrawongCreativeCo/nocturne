import { describe, expect, it } from 'vitest'

import {
  FALLBACK_COLOURS,
  QUIET_ZONE,
  contrastRatio,
  qrColours,
  qrFileName,
  qrMatrix,
  qrPayload,
  qrSvg,
} from './qr-code'

describe('qrPayload', () => {
  it('leaves the address alone when scans are not tracked', () => {
    expect(qrPayload('https://example.com.au/links', { trackScans: false })).toBe(
      'https://example.com.au/links',
    )
  })

  it('adds utm_source=qr when scans are tracked', () => {
    expect(qrPayload('https://example.com.au/links', { trackScans: true })).toBe(
      'https://example.com.au/links?utm_source=qr',
    )
  })

  it('works on the home page', () => {
    expect(qrPayload('https://example.com.au/', { trackScans: true })).toBe(
      'https://example.com.au/?utm_source=qr',
    )
  })

  it('keeps other query parameters and a hash', () => {
    expect(qrPayload('https://example.com.au/a?x=1#top', { trackScans: true })).toBe(
      'https://example.com.au/a?x=1&utm_source=qr#top',
    )
  })

  it('never overwrites a utm_source already in the address', () => {
    expect(qrPayload('https://example.com.au/a?utm_source=flyer', { trackScans: true })).toBe(
      'https://example.com.au/a?utm_source=flyer',
    )
  })

  it.each(['not a url', 'mailto:hi@example.com.au', 'tel:+61400000000', ''])(
    'returns %j unchanged',
    (value) => {
      expect(qrPayload(value, { trackScans: true })).toBe(value)
    },
  )
})

describe('qrMatrix', () => {
  it('is square, with no border, and the same for the same text', () => {
    const matrix = qrMatrix('https://example.com.au/links?utm_source=qr')
    expect(matrix.length).toBeGreaterThanOrEqual(21)
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true)
    expect(qrMatrix('https://example.com.au/links?utm_source=qr')).toEqual(matrix)
  })

  it('has the finder pattern in the top left corner', () => {
    const matrix = qrMatrix('https://example.com.au')
    expect(matrix[0]?.slice(0, 7)).toEqual(Array(7).fill(true))
    expect(matrix[3]?.[3]).toBe(true)
    expect(matrix[1]?.[1]).toBe(false)
  })
})

describe('qrColours', () => {
  it('uses the site colours when dark on light', () => {
    expect(qrColours('#030712', '#FFFFFF')).toEqual({
      foreground: '#030712',
      background: '#ffffff',
    })
  })

  it('falls back to black on white when the foreground is lighter than the background', () => {
    expect(qrColours('#ffffff', '#030712')).toEqual(FALLBACK_COLOURS)
  })

  it('falls back when the contrast is too low to scan reliably', () => {
    expect(qrColours('#999999', '#ffffff')).toEqual(FALLBACK_COLOURS)
  })

  it.each(['red', '#fff', 'oklch(1 0 0)', ''])(
    'falls back for an unreadable colour (%j)',
    (bad) => {
      expect(qrColours(bad, '#ffffff')).toEqual(FALLBACK_COLOURS)
      expect(qrColours('#000000', bad)).toEqual(FALLBACK_COLOURS)
    },
  )

  it('measures contrast as WCAG does', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })
})

describe('qrSvg', () => {
  const colours = { foreground: '#030712', background: '#ffffff' }
  const matrix = qrMatrix('https://example.com.au')
  const svg = qrSvg(matrix, colours, 'QR code for /about')

  it('has a viewBox that includes the quiet zone, and no fixed size', () => {
    const total = matrix.length + QUIET_ZONE * 2
    expect(svg).toContain(`viewBox="0 0 ${total} ${total}"`)
    expect(/^<svg[^>]*>/.exec(svg)?.[0]).not.toMatch(/\s(width|height)=/)
  })

  it('paints the background across the whole code, quiet zone included', () => {
    const total = matrix.length + QUIET_ZONE * 2
    expect(svg).toContain(`<rect width="${total}" height="${total}" fill="#ffffff"/>`)
  })

  it('draws exactly the dark modules', () => {
    const path = /<path d="([^"]*)"/.exec(svg)?.[1] ?? ''
    const drawn = [...path.matchAll(/M(\d+) (\d+)h(\d+)v1/g)].flatMap(([, x, y, length]) =>
      Array.from({ length: Number(length) }, (_, i) => `${Number(x) + i},${y}`),
    )
    const expected = matrix.flatMap((row, y) =>
      row.flatMap((dark, x) => (dark ? [`${x + QUIET_ZONE},${y + QUIET_ZONE}`] : [])),
    )
    expect(drawn.sort()).toEqual(expected.sort())
  })

  it('is labelled, and escapes the title', () => {
    expect(svg).toContain('role="img"')
    expect(svg).toContain('<title>QR code for /about</title>')
    expect(qrSvg(matrix, colours, '<a & "b">')).toContain(
      '<title>&lt;a &amp; &quot;b&quot;&gt;</title>',
    )
  })
})

describe('qrFileName', () => {
  it.each([
    ['home', 'svg', 'qr-home.svg'],
    ['services/web-design', 'png', 'qr-services-web-design.png'],
    ['Café & Bar', 'svg', 'qr-Caf-Bar.svg'],
    ['', 'png', 'qr-page.png'],
  ] as const)('%j -> %s', (slug, extension, expected) => {
    expect(qrFileName(slug, extension)).toBe(expected)
  })
})
