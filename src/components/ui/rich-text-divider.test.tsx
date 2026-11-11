import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { RichText } from './rich-text'

vi.mock('@/components/ui/sanity-image', () => ({
  SanityImage: () => createElement('img', { alt: '' }),
}))
vi.mock('@/components/ui/sanity-link', () => ({
  SanityLink: ({ children }: { children?: unknown }) => createElement('a', null, children as never),
}))

/**
 * A divider block in a Rich text body (task 151), drawn by the shared RichText. With none, or none that
 * draws, the output is exactly what it always was; with one, it owns 24px above and below and the blocks on
 * each side give up their own margin on that side (a class on the container, so it holds whatever the
 * neighbours are and does not depend on margins collapsing).
 */

const paragraph = (words: string, key: string) => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: `${key}s`, text: words, marks: [] }],
})
const heading = (words: string, key: string) => ({ ...paragraph(words, key), style: 'h2' })
const rule = (extra: Record<string, unknown> = {}) => ({
  _type: 'decorativeDivider',
  _key: 'd1',
  style: 'line',
  width: 'short',
  ...extra,
})

/** The markup with its HTML escapes undone, so class names read as written. */
const draw = (value: unknown[], props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(RichText, { value: value as never, ...props }))
    .replaceAll('&amp;', '&')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
const count = (html: string, needle: string) => html.split(needle).length - 1
/** How many dividers are drawn: the attribute with a value, which the container's class names don't have. */
const drawn = (html: string) => count(html, 'data-decorative-divider="')
/** The divider's own opening tag. */
const dividerTag = (html: string) =>
  /<div[^>]*data-decorative-divider="[^>]*>/.exec(html)?.[0] ?? ''

const BASE = [paragraph('One', 'a'), paragraph('Two', 'b')]
const BASE_HTML =
  '<div><p class="my-4 leading-relaxed">One</p><p class="my-4 leading-relaxed">Two</p></div>'
const AFTER = '[&>[data-decorative-divider]+*]:mt-0!'
const BEFORE = '[&>*:has(+[data-decorative-divider])]:mb-0!'

describe('a Rich text body with no divider', () => {
  it('is exactly the markup it always was', () => {
    expect(draw(BASE)).toBe(BASE_HTML)
  })

  it('keeps the class and role the caller gives it, and nothing more', () => {
    expect(draw(BASE, { className: 'mt-12 text-lead', textRole: 'intro' })).toBe(
      '<div class="mt-12 text-lead" data-text-role="intro"><p class="my-4 leading-relaxed">One</p><p class="my-4 leading-relaxed">Two</p></div>',
    )
  })

  it.each([
    ['None', { style: 'none' }],
    ['unset', { style: undefined }],
    ['an unknown style', { style: 'sparkly' }],
    ['a typeless block', { _type: 'decorativeDivider', style: null }],
  ])('is byte-identical when a divider that draws nothing is in it: %s', (_name, extra) => {
    const withBlank = [paragraph('One', 'a'), rule(extra), paragraph('Two', 'b')]
    expect(draw(withBlank)).toBe(BASE_HTML)
    expect(draw(withBlank, { className: 'x' })).toBe(draw(BASE, { className: 'x' }))
  })

  it('draws nothing for an empty or missing body', () => {
    expect(draw([])).toBe('')
    expect(renderToStaticMarkup(createElement(RichText, { value: null }))).toBe('')
  })
})

describe('a Rich text body with a divider', () => {
  const html = draw([paragraph('One', 'a'), rule(), paragraph('Two', 'b')])

  it('draws it once, between the two paragraphs', () => {
    expect(drawn(html)).toBe(1)
    expect(html.indexOf('One')).toBeLessThan(html.indexOf('data-decorative-divider="'))
    expect(html.indexOf('data-decorative-divider="')).toBeLessThan(html.indexOf('Two'))
  })

  it('is a direct child of the body, so the neighbour rules reach the blocks beside it', () => {
    expect(html).toMatch(/<\/p><div aria-hidden="true" data-decorative-divider="line"/)
    expect(html).toMatch(/<\/div><p class="my-4 leading-relaxed">Two<\/p><\/div>$/)
  })

  it('gives the blocks each side of it no margin on that side, on the container', () => {
    expect(html).toContain(`class="${AFTER} ${BEFORE}"`)
  })

  it('puts those after the caller’s own classes', () => {
    expect(draw([rule(), paragraph('Two', 'b')], { className: 'mt-12 text-lead' })).toContain(
      `class="mt-12 text-lead ${AFTER} ${BEFORE}"`,
    )
  })

  it('leaves the neighbours’ own markup alone: the rule is on the container, not edited into them', () => {
    expect(count(html, 'my-4 leading-relaxed')).toBe(2)
  })

  it('draws two together, and one at either end', () => {
    expect(drawn(draw([rule({ _key: 'x' }), rule({ _key: 'y' })]))).toBe(2)
    expect(drawn(draw([rule(), paragraph('Two', 'b')]))).toBe(1)
    expect(drawn(draw([paragraph('One', 'a'), rule()]))).toBe(1)
  })

  it('applies the same rule to any block beside it: a heading, a list, a picture', () => {
    const mixed = draw([
      { ...paragraph('Item', 'l'), listItem: 'bullet', level: 1 },
      rule(),
      heading('After', 'h'),
      rule({ _key: 'z' }),
      { _type: 'image', _key: 'i', asset: { _ref: 'image-a-1x1-png' } },
    ])
    expect(mixed).toContain(AFTER)
    expect(mixed).toContain(BEFORE)
    expect(drawn(mixed)).toBe(2)
  })

  it('starts where the section starts, or centres in a centred one', () => {
    expect(html).not.toContain('mx-auto')
    expect(draw([rule()], { dividerBlock: 'mx-auto' })).toContain('mx-auto')
  })

  it('is decoration, hidden from assistive technology, unless it has words', () => {
    expect(dividerTag(html)).toContain('aria-hidden="true"')
    const words = draw([rule({ centre: 'text', text: 'Our story' })])
    expect(dividerTag(words)).not.toContain('aria-hidden')
    expect(words).toContain('Our story')
  })

  it('keeps a chosen line colour', () => {
    const coloured = draw([rule({ lineColour: { colour: 'custom', hex: '#aa5500' } })])
    expect(coloured).toContain('color:')
    expect(coloured).not.toContain('text-line-strong')
  })
})
