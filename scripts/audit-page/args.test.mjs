import { describe, expect, it } from 'vitest'

import { MAX_SAMPLE, pageTarget, parseArgs } from './args.mjs'

describe('parseArgs', () => {
  it('reads the url and the flags', () => {
    expect(parseArgs(['https://example.com.au/about', '--json', '--sample=5', '--bypass'])).toEqual(
      {
        url: 'https://example.com.au/about',
        json: true,
        help: false,
        bypass: true,
        confirm: false,
        sample: 5,
        expectOrigin: undefined,
      },
    )
  })

  it('reads --confirm', () => {
    expect(parseArgs(['x.com', '--confirm']).confirm).toBe(true)
    expect(parseArgs(['x.com']).confirm).toBe(false)
  })

  it('normalises --expect-origin to an origin', () => {
    expect(parseArgs(['x.com', '--expect-origin=https://Example.com.au/'])).toMatchObject({
      expectOrigin: 'https://example.com.au',
    })
  })

  it('defaults to no sample, and refuses a sample that is not a whole number in range', () => {
    expect(parseArgs(['x.com']).sample).toBe(0)
    for (const bad of [
      '--sample=-1',
      '--sample=1.5',
      '--sample=abc',
      `--sample=${MAX_SAMPLE + 1}`,
    ]) {
      expect(() => parseArgs(['x.com', bad]), bad).toThrow(/--sample needs a whole number/)
    }
    expect(parseArgs(['x.com', `--sample=${MAX_SAMPLE}`]).sample).toBe(MAX_SAMPLE)
  })

  it('refuses unknown flags and a second address', () => {
    expect(() => parseArgs(['--nope'])).toThrow('Unknown option --nope')
    expect(() => parseArgs(['a.com', 'b.com'])).toThrow('Unexpected extra argument "b.com"')
  })
})

describe('pageTarget', () => {
  it('turns a bare domain into its home page', () => {
    expect(pageTarget('example.com.au')).toBe('https://example.com.au/')
    expect(pageTarget('https://example.com.au')).toBe('https://example.com.au/')
  })

  it('keeps a page’s path and query, and drops the fragment', () => {
    expect(pageTarget('https://example.com.au/about?x=1#top')).toBe(
      'https://example.com.au/about?x=1',
    )
  })

  it('refuses an address with a username or password, and any scheme but http and https', () => {
    expect(() => pageTarget('https://user:secret@example.com.au/')).toThrow(/username or password/)
    expect(() => pageTarget('https://user@example.com.au/')).toThrow(/username or password/)
    for (const bad of [
      'file:///etc/passwd',
      'javascript:alert(1)',
      'data:text/html,x',
      'gopher://x',
    ]) {
      expect(() => pageTarget(bad), bad).toThrow()
    }
  })

  it('refuses nothing it can read and everything it cannot', () => {
    expect(() => pageTarget('')).toThrow('Pass the site URL')
    expect(() => pageTarget('ftp://example.com')).toThrow("isn't a web address")
  })
})
