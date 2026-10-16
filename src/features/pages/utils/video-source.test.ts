import { describe, expect, it } from 'vitest'

import {
  ambientSizeProblem,
  aspectClass,
  embedUrl,
  formatMegabytes,
  parseVideoUrl,
  watchUrl,
} from './video-source'

const ID = 'dQw4w9WgXcQ'

describe('parseVideoUrl', () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=10s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `youtube.com/watch?v=${ID}`,
    `  https://youtu.be/${ID}  `,
  ])('finds the YouTube id in %s', (url) => {
    expect(parseVideoUrl(url)).toEqual({ provider: 'youtube', id: ID })
  })

  it.each([
    ['https://vimeo.com/76979871', { provider: 'vimeo', id: '76979871' }],
    ['https://www.vimeo.com/76979871', { provider: 'vimeo', id: '76979871' }],
    ['https://player.vimeo.com/video/76979871', { provider: 'vimeo', id: '76979871' }],
    [
      'https://player.vimeo.com/video/76979871?h=abcdef1234',
      { provider: 'vimeo', id: '76979871', hash: 'abcdef1234' },
    ],
    [
      'https://vimeo.com/76979871/abcdef1234',
      { provider: 'vimeo', id: '76979871', hash: 'abcdef1234' },
    ],
  ])('finds the Vimeo id in %s', (url, expected) => {
    expect(parseVideoUrl(url)).toEqual(expected)
  })

  it.each([
    '',
    '   ',
    'not a url',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
    'https://evil.test/youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/@channel',
    'https://vimeo.com/channels/staffpicks',
    'https://vimeo.com/',
    'https://player.vimeo.com/video/abc',
    'javascript:alert(1)',
    'ftp://youtu.be/dQw4w9WgXcQ',
  ])('rejects %j', (url) => {
    expect(parseVideoUrl(url)).toBeUndefined()
  })

  it('ignores a malformed hash instead of passing it on', () => {
    expect(parseVideoUrl('https://player.vimeo.com/video/76979871?h="><script>')).toEqual({
      provider: 'vimeo',
      id: '76979871',
    })
  })

  it('handles missing input', () => {
    expect(parseVideoUrl(undefined)).toBeUndefined()
    expect(parseVideoUrl(null)).toBeUndefined()
  })
})

describe('embedUrl and watchUrl', () => {
  it('plays YouTube from the no-cookie domain with autoplay', () => {
    const url = new URL(embedUrl({ provider: 'youtube', id: ID }))
    expect(url.origin).toBe('https://www.youtube-nocookie.com')
    expect(url.pathname).toBe(`/embed/${ID}`)
    expect(url.searchParams.get('autoplay')).toBe('1')
  })

  it('plays Vimeo with dnt=1 and autoplay, keeping an unlisted video’s hash', () => {
    const url = new URL(embedUrl({ provider: 'vimeo', id: '76979871', hash: 'abcdef1234' }))
    expect(url.origin).toBe('https://player.vimeo.com')
    expect(url.pathname).toBe('/video/76979871')
    expect(url.searchParams.get('dnt')).toBe('1')
    expect(url.searchParams.get('autoplay')).toBe('1')
    expect(url.searchParams.get('h')).toBe('abcdef1234')
  })

  it('links to the video’s own page', () => {
    expect(watchUrl({ provider: 'youtube', id: ID })).toBe(`https://www.youtube.com/watch?v=${ID}`)
    expect(watchUrl({ provider: 'vimeo', id: '76979871' })).toBe('https://vimeo.com/76979871')
    expect(watchUrl({ provider: 'vimeo', id: '76979871', hash: 'abcdef1234' })).toBe(
      'https://vimeo.com/76979871/abcdef1234',
    )
  })
})

describe('aspectClass', () => {
  it('maps each stored ratio to its class, defaulting to widescreen', () => {
    expect(aspectClass('16:9')).toBe('aspect-video')
    expect(aspectClass('4:3')).toBe('aspect-[4/3]')
    expect(aspectClass('1:1')).toBe('aspect-square')
    expect(aspectClass('21:9')).toBe('aspect-[21/9]')
    expect(aspectClass(undefined)).toBe('aspect-video')
    expect(aspectClass('7:5')).toBe('aspect-video')
  })
})

describe('formatMegabytes', () => {
  it('shows one decimal place', () => {
    expect(formatMegabytes(6.25 * 1024 * 1024)).toBe('6.3 MB')
  })
})

describe('ambientSizeProblem', () => {
  it('warns above 5 MB, naming the size', () => {
    expect(ambientSizeProblem(6.25 * 1024 * 1024)).toContain('6.3 MB')
  })

  it('is quiet at 5 MB or less, and when the size is unknown', () => {
    expect(ambientSizeProblem(5 * 1024 * 1024)).toBeUndefined()
    expect(ambientSizeProblem(undefined)).toBeUndefined()
    expect(ambientSizeProblem(null)).toBeUndefined()
  })
})
