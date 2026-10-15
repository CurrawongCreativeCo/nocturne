import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_ICON_SHA256,
  TEMPLATE_ICON_SVG,
  checkLocalhostLinks,
  checkPlaceholderIcons,
  checkTemplateCopy,
  expectedCdnIconSize,
  isPlaceholderIcon,
  pngSize,
} from './leftovers.mjs'

const read = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const good = read('home-good.html')
const leftovers = read('home-leftovers.html')
const page = (path, html) => ({ url: `https://example.com${path}`, html })
const svgIcon = (body) => ({ href: '/icon.svg', status: 200, contentType: 'image/svg+xml', body })

describe('TEMPLATE_ICON_SVG', () => {
  it('recognises the old purple placeholder', () => {
    expect(isPlaceholderIcon(read('icon-placeholder.svg'))).toBe(true)
    expect(isPlaceholderIcon(TEMPLATE_ICON_SVG)).toBe(true)
  })
})

/** A PNG header with the given size: all the check reads. */
function png(width, height) {
  const bytes = Buffer.alloc(32)
  Buffer.from('89504e470d0a1a0a', 'hex').copy(bytes)
  bytes.writeUInt32BE(width, 16)
  bytes.writeUInt32BE(height, 20)
  return bytes
}
const pngIcon = (href, bytes, extra = {}) => ({
  href,
  status: 200,
  contentType: 'image/png',
  body: '',
  bytes,
  ...extra,
})
const cdn = (query) => `https://cdn.sanity.io/images/abc123xy/production/a-1024x1024-png?${query}`

describe('png helpers', () => {
  it('reads a PNG size and rejects anything else', () => {
    expect(pngSize(png(180, 180))).toEqual({ width: 180, height: 180 })
    expect(pngSize(Buffer.from('<svg></svg>'))).toBeUndefined()
    expect(pngSize(undefined)).toBeUndefined()
  })
  it('expects the CDN size to be w/h plus pad on each side', () => {
    expect(expectedCdnIconSize(cdn('w=28&h=28&pad=2&fm=png'))).toEqual({ width: 32, height: 32 })
    expect(expectedCdnIconSize(cdn('w=32&h=32&fm=png'))).toEqual({ width: 32, height: 32 })
    expect(expectedCdnIconSize('/icon.png')).toBeUndefined()
  })
})

describe('checkPlaceholderIcons', () => {
  it('fails the old template icon, even with different whitespace', () => {
    const spaced = read('icon-placeholder.svg').replace('><', '>\n  <')
    expect(checkPlaceholderIcons({ icons: [svgIcon(spaced)] })[0].status).toBe('fail')
  })
  it('passes a custom SVG icon', () => {
    expect(checkPlaceholderIcons({ icons: [svgIcon(read('icon-custom.svg'))] })[0].status).toBe(
      'pass',
    )
  })
  it('ignores icons that did not load and warns when there is none', () => {
    const missing = { href: '/icon.svg', status: 404, contentType: 'text/html', body: '' }
    expect(checkPlaceholderIcons({ icons: [missing] })[0].status).toBe('pass')
    expect(checkPlaceholderIcons({ icons: [] })[0].status).toBe('warn')
  })

  it("warns while the site serves Currawong's default icon", () => {
    const bytes = readFileSync(new URL('../../src/app/icon.png', import.meta.url))
    const hash = createHash('sha256').update(bytes).digest('hex')
    const [result] = checkPlaceholderIcons({
      icons: [pngIcon('/icon.png', bytes)],
      defaultHashes: [hash],
    })
    expect(result.status).toBe('warn')
    expect(result.detail).toContain("Currawong's default favicon")
  })
  it('passes a different PNG on the site itself', () => {
    expect(checkPlaceholderIcons({ icons: [pngIcon('/icon.png', png(512, 512))] })[0].status).toBe(
      'pass',
    )
  })
  it('keeps the default hashes well formed', () => {
    for (const hash of DEFAULT_ICON_SHA256) expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('passes CDN icons that are PNGs of the size the URL asks for', () => {
    const icons = [
      pngIcon(cdn('w=32&h=32&fm=png'), png(32, 32)),
      pngIcon(cdn('w=148&h=148&pad=16&fm=png'), png(180, 180)),
    ]
    expect(checkPlaceholderIcons({ icons })[0].status).toBe('pass')
  })
  it('fails a CDN icon that is not rasterised to a PNG (an SVG upload)', () => {
    const svg = pngIcon(cdn('w=192&h=192&fm=png'), undefined, { contentType: 'image/svg+xml' })
    const [result] = checkPlaceholderIcons({ icons: [svg] })
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('not a PNG')
  })
  it('fails a CDN icon of the wrong size, which means padding did not do what we expect', () => {
    const icons = [pngIcon(cdn('w=148&h=148&pad=16&fm=png'), png(148, 148))]
    const [result] = checkPlaceholderIcons({ icons })
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('expected 180 × 180')
  })
  it('fails a CDN icon that does not load', () => {
    const icons = [pngIcon(cdn('w=32&h=32&fm=png'), undefined, { status: 404 })]
    expect(checkPlaceholderIcons({ icons })[0].status).toBe('fail')
  })
})

describe('checkTemplateCopy', () => {
  it('passes real copy, ignoring scripts, styles and comments', () => {
    expect(checkTemplateCopy({ pages: [page('/', good)] })[0].status).toBe('pass')
  })
  it('fails each kind of template wording and names the page', () => {
    const [result] = checkTemplateCopy({ pages: [page('/', good), page('/old', leftovers)] })
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('/old')
    expect(result.detail).toContain('A clear headline about what you offer')
    expect(result.detail).toContain('Replace:')
    expect(result.detail).toContain('lorem')
  })
  it('does not match words that merely contain "lorem"', () => {
    const html =
      '<html><head><title>T</title></head><body><h1>Dolorem and florem</h1></body></html>'
    expect(checkTemplateCopy({ pages: [page('/', html)] })[0].status).toBe('pass')
  })
})

describe('checkLocalhostLinks', () => {
  it('passes a clean page', () => {
    expect(checkLocalhostLinks({ pages: [page('/', good)] })[0].status).toBe('pass')
  })
  it('fails links, form actions and srcsets that point at a local address', () => {
    const [result] = checkLocalhostLinks({ pages: [page('/', leftovers)] })
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('http://localhost:3000')
  })
})
