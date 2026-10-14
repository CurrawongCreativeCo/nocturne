import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  TEMPLATE_ICON_SVG,
  checkLocalhostLinks,
  checkPlaceholderIcons,
  checkTemplateCopy,
  isPlaceholderIcon,
} from './leftovers.mjs'

const read = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const good = read('home-good.html')
const leftovers = read('home-leftovers.html')
const page = (path, html) => ({ url: `https://example.com${path}`, html })
const svgIcon = (body) => ({ href: '/icon.svg', status: 200, contentType: 'image/svg+xml', body })

describe('TEMPLATE_ICON_SVG', () => {
  it('stays equal to src/app/icon.svg while that file is still the placeholder', () => {
    const current = readFileSync(new URL('../../src/app/icon.svg', import.meta.url), 'utf8')
    // A client site replaces icon.svg with their logo; only the template's copy must match.
    if (/placeholder:/i.test(current)) expect(isPlaceholderIcon(current)).toBe(true)
    expect(isPlaceholderIcon(read('icon-placeholder.svg'))).toBe(true)
    expect(isPlaceholderIcon(TEMPLATE_ICON_SVG)).toBe(true)
  })
})

describe('checkPlaceholderIcons', () => {
  it('fails the template icon, even with different whitespace', () => {
    const spaced = read('icon-placeholder.svg').replace('><', '>\n  <')
    expect(checkPlaceholderIcons({ icons: [svgIcon(spaced)] })[0].status).toBe('fail')
  })
  it('passes a custom icon', () => {
    expect(checkPlaceholderIcons({ icons: [svgIcon(read('icon-custom.svg'))] })[0].status).toBe(
      'pass',
    )
  })
  it('ignores icons that did not load and warns when there is none', () => {
    const missing = { href: '/icon.svg', status: 404, contentType: 'text/html', body: '' }
    expect(checkPlaceholderIcons({ icons: [missing] })[0].status).toBe('pass')
    expect(checkPlaceholderIcons({ icons: [] })[0].status).toBe('warn')
  })
  it('warns when apple-icon.tsx still says Placeholder', () => {
    const [result] = checkPlaceholderIcons({
      icons: [svgIcon(read('icon-custom.svg'))],
      appleIconSource: '/** iOS icon. Placeholder: match it to icon.svg. */',
    })
    expect(result.status).toBe('warn')
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
