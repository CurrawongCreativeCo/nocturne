import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  checkMarker,
  countH1,
  decodeEntities,
  getCanonical,
  getIconLinks,
  getMeta,
  getTitle,
  getUrls,
  getVisibleText,
  isNoindex,
} from './html.mjs'

const good = readFileSync(new URL('./fixtures/home-good.html', import.meta.url), 'utf8')
const marked = readFileSync(new URL('./fixtures/home-marker.html', import.meta.url), 'utf8')
const leftovers = readFileSync(new URL('./fixtures/home-leftovers.html', import.meta.url), 'utf8')

describe('html readers', () => {
  it('reads the title, description, canonical and og:image', () => {
    expect(getTitle(good)).toBe('Bondi Plumbing | Emergency plumbers in Sydney')
    expect(getMeta(good, 'description')).toBe(
      'Licensed Sydney plumbers, on call 24/7 for blocked drains & burst pipes.',
    )
    expect(getMeta(good, 'og:image')).toBe('https://bondiplumbing.com.au/api/og?title=Home')
    expect(getCanonical(good)).toBe('https://bondiplumbing.com.au')
    expect(getMeta(good, 'robots')).toBe('')
  })

  it('reads icon links in order', () => {
    expect(getIconLinks(good)).toEqual([
      { rel: 'icon', href: '/icon.svg?abc123' },
      { rel: 'apple-touch-icon', href: '/apple-icon.png?def456' },
    ])
  })

  it('counts only visible h1 elements', () => {
    expect(countH1(good)).toBe(1)
    expect(countH1(leftovers)).toBe(2)
    expect(countH1('<script>"<h1>"</script><!-- <h1> --><h1 class="x">a</h1>')).toBe(1)
    expect(countH1('<h10>no</h10><p>none</p>')).toBe(0)
  })

  it('keeps scripts, styles and comments out of the visible text', () => {
    const text = getVisibleText(good)
    expect(text).toContain("Sydney's fastest emergency plumbers")
    expect(text).toContain('Bondi Plumbing | Emergency plumbers in Sydney')
    expect(text).not.toMatch(/lorem|Replace:/i)
    expect(getVisibleText(leftovers)).toMatch(/Replace:/)
  })

  it('collects link, media, form and srcset URLs but not script text', () => {
    expect(getUrls(good)).toEqual(
      expect.arrayContaining([
        '/',
        '/contact',
        'https://cdn.sanity.io/images/p/d/hero.jpg',
        '/a.jpg',
        '/b.jpg',
        'https://bondiplumbing.com.au/api/og?title=Home',
      ]),
    )
    expect(getUrls(leftovers)).toEqual(
      expect.arrayContaining([
        'http://localhost:3000/contact',
        '//127.0.0.1:8080/send',
        'http://localhost:3000/a.jpg',
      ]),
    )
  })

  it('decodes entities and spots noindex', () => {
    expect(decodeEntities('a &amp; b &#38; c &#x26; d &unknown;')).toBe('a & b & c & d &unknown;')
    expect(isNoindex('noindex, nofollow')).toBe(true)
    expect(isNoindex('index, follow')).toBe(false)
    expect(isNoindex('none')).toBe(true)
  })
})

describe('checkMarker', () => {
  it('passes when the page carries the expected marker', () => {
    const [result] = checkMarker({ html: marked, expected: 'nocturne-test-co' })
    expect(result.status).toBe('pass')
  })

  it('fails when the marker differs', () => {
    const [result] = checkMarker({ html: marked, expected: 'nocturne-other' })
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('nocturne-test-co')
  })

  it('fails when the page has no marker, or no HTML at all', () => {
    expect(checkMarker({ html: good, expected: 'nocturne-test-co' })[0].detail).toContain(
      'no <meta name="nocturne:marker">',
    )
    expect(checkMarker({ html: undefined, expected: 'x' })[0].status).toBe('fail')
  })
})
