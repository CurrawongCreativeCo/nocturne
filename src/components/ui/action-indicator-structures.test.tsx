// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import { ActionIndicator } from './action-indicator'

/**
 * The indicator's CSS states must reach it in both structures cards use: the link is the whole card
 * (Link list), or a non-focusable card holds a title link stretched over it (Events, Team, Blog).
 * The real selectors are read from globals.css and matched against real markup, with one card focused
 * and its neighbour not; a browser run in CI proves the painted result.
 */
const css = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8')
const block = css.slice(css.indexOf('ActionIndicator (components'))
// The two rules that set `--action-on: 1`: hover (inside its media query), then focus.
const rules = [
  ...block.matchAll(
    /\n\s*((?:[^{}\n]*\[data-action-motion\],\s*)?[^{}\n]*\[data-action-motion\])\s*\{\s*--action-on: 1/g,
  ),
]
const HOVER = rules[0]?.[1]?.trim() ?? ''
const FOCUS_RULE = rules[1]?.[1]?.trim() ?? ''
// jsdom has no keyboard modality, so it never reports :focus-visible; :focus stands in for it. The
// structure of the selector, which is what these tests prove, is untouched.
const FOCUS = FOCUS_RULE.replaceAll(':focus-visible', ':focus')

const indicator = renderToStaticMarkup(
  <ActionIndicator glyph="chevron" external={false} motion="nudge" />,
)

const wholeCard = (id: string) => `<a href="/${id}" id="${id}" class="group">Title ${indicator}</a>`
const stretched = (id: string) =>
  `<li class="group relative"><h3><a href="/${id}" id="${id}" class="after:absolute after:inset-0">Title</a></h3>${indicator}</li>`

const byId = (id: string): HTMLElement => {
  const found = document.getElementById(id)
  if (!found) throw new Error(`No element ${id}`)
  return found
}
const indicatorOf = (id: string) => {
  const svg = byId(id).closest('.group')?.querySelector('svg')
  if (!svg) throw new Error(`No indicator for ${id}`)
  return svg
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ActionIndicator states in both card structures', () => {
  it('finds the hover and focus rules', () => {
    expect(HOVER).toContain(':hover')
    expect(FOCUS_RULE).toContain(':focus-visible')
    expect(FOCUS_RULE).toContain(':has(a:focus-visible)')
  })

  it.each([
    ['a link that is the whole card', wholeCard],
    ['a stretched link in a card that cannot take focus', stretched],
  ])('focus on %s reaches that card’s indicator only', (_name, build) => {
    document.body.innerHTML = `<ul>${build('a')}${build('b')}</ul>`
    byId('a').focus()
    expect(indicatorOf('a').matches(FOCUS)).toBe(true)
    expect(indicatorOf('b').matches(FOCUS)).toBe(false)
  })

  it('does not treat focus on something other than the link as the card’s focus', () => {
    document.body.innerHTML = `<li class="group"><a href="/x">A</a><button id="b">B</button>${indicator}</li>`
    byId('b').focus()
    expect(indicatorOf('b').matches(FOCUS)).toBe(false)
  })

  it.each([
    ['a link that is the whole card', wholeCard],
    ['a stretched link in a card that cannot take focus', stretched],
  ])('hover on %s uses the same group, so it reaches the indicator', (_name, build) => {
    document.body.innerHTML = build('a')
    // jsdom has no pointer; the hover rule names the same group and indicator as the focus rules.
    expect(HOVER).toBe(':where(.group):hover [data-action-motion]')
    expect(indicatorOf('a').matches('.group [data-action-motion]')).toBe(true)
  })

  it('leaves one keyboard destination per card: the indicator takes no focus', () => {
    document.body.innerHTML = stretched('a')
    expect(document.querySelectorAll('a, button, [tabindex]')).toHaveLength(1)
    expect(indicatorOf('a').getAttribute('aria-hidden')).toBe('true')
  })
})
