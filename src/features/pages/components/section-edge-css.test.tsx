// @vitest-environment jsdom
import { readFileSync } from 'node:fs'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PageSection } from '../types'
import { SectionRenderer } from './section-renderer'

vi.mock('next-sanity/image', () => ({ Image: () => null }))
vi.mock('server-only', () => ({}))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

/**
 * Section dividers on a page (task 151, stage B1): the REAL rules in globals.css, read from the file and
 * evaluated against the REAL markup SectionRenderer produces, because the fixes live in selectors that read
 * the markup (is there a frame in the wrapper above? is this the first section of the page, through however
 * many wrappers?). A rule is matched, not re-implemented, so this fails if the CSS and the markup drift apart.
 * What the browser then draws is checked in tests/e2e/section-edge-stability.spec.ts.
 */

const css = readFileSync('src/styles/globals.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** Splits a selector list on its top-level commas. */
function splitSelectors(list: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (const char of list) {
    if ('(['.includes(char)) depth += 1
    if (')]'.includes(char)) depth -= 1
    if (char === ',' && depth === 0) {
      out.push(current)
      current = ''
    } else current += char
  }
  out.push(current)
  return out.map((selector) => selector.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

/** The selectors of every rule that sets `property` (to `value`, when given). */
function selectorsSetting(property: string, value?: string): string[] {
  const found: string[] = []
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const pattern = new RegExp(`(^|[;\\s])${property}:\\s*${value ?? ''}`)
    if (pattern.test(body ?? '')) found.push(...splitSelectors(selectors ?? ''))
  }
  return found
}

/** Everything in the document that some selector in the list matches. */
const matched = (selectors: string[]): Set<Element> =>
  new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)]))

const richText = (key: string, style?: object, extra: object = {}) =>
  ({
    _key: key,
    _type: 'richText',
    access: null,
    style: { anchorId: key, ...style },
    body: [],
    ...extra,
  }) as unknown as PageSection
/** A section that draws nothing: a form section with no form. */
const empty = (key: string, style?: object) =>
  ({
    _key: key,
    _type: 'formSection',
    access: null,
    style: { anchorId: key, ...style },
  }) as unknown as PageSection
const WAVE = { edge: 'wave', edgeHeight: 'large' }

function mount(sections: PageSection[], props: object = {}, minimal = false) {
  const html = renderToStaticMarkup(
    createElement(SectionRenderer, { documentId: 'p', documentType: 'page', sections, ...props }),
  )
  document.body.innerHTML = `${minimal ? '<span hidden data-minimal-page=""></span>' : ''}<main>${html}</main>`
  // Cover the screen draws a backdrop in each section that has one; give every section one to find.
  for (const section of document.querySelectorAll('main section')) {
    const backdrop = document.createElement('div')
    backdrop.setAttribute('data-screen-backdrop', '')
    section.append(backdrop)
  }
}
const ids = (set: Set<Element>) =>
  [...set].map((element) => element.closest('section')?.id ?? element.tagName.toLowerCase()).sort()
const wrapperOf = (id: string): Element => {
  const section = document.getElementById(id)
  const wrapper = section?.closest('main > div, main > [data-sanity] > div') ?? section
  if (!wrapper) throw new Error(`No section ${id}.`)
  return wrapper
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('S1: the section below an edge is pulled up only under a cut that was drawn', () => {
  const NONE = selectorsSetting('--edge-live', '0px')

  it('has a rule that takes the pull-up away, and every rule that uses the pull-up reads --edge-live', () => {
    expect(NONE.length).toBeGreaterThan(0)
    // Nothing else may pull a section up by the raw height: those rules would ignore the one above.
    const raw = [...css.matchAll(/([^{}]+)\{([^{}]*var\(--edge-above\)[^{}]*)\}/g)].map(
      ([, selector]) => (selector ?? '').replace(/\s+/g, ' ').trim(),
    )
    expect(raw).toEqual(['[data-edge-above]', '[data-edge-backdrop]'])
  })

  it('does not take it away under a section that drew its edge', () => {
    mount([richText('a', WAVE), richText('b')])
    expect(matched(NONE).has(wrapperOf('b'))).toBe(false)
  })

  it('takes it away under an edge section that rendered nothing (it has no frame in its wrapper)', () => {
    mount([richText('a'), empty('u', WAVE), richText('c')])
    // The empty section still has its wrapper (it takes a stacking step), but holds no frame.
    expect(document.querySelector('main > div')?.innerHTML).toBe('')
    expect(matched(NONE).has(wrapperOf('c'))).toBe(true)
  })

  it('takes it away under an empty edge section right below a drawn edge: that cut shows the page, though a third section follows', () => {
    mount([richText('a', WAVE), empty('u', WAVE), richText('c')])
    const [, emptyWrapper] = document.querySelectorAll('main > div')
    if (!emptyWrapper) throw new Error('No wrapper for the empty section.')
    // The empty section takes nothing either (it has nothing to pull up), so nothing sits under a's cut.
    expect(emptyWrapper.innerHTML).toBe('')
    expect(matched(selectorsSetting('margin-top', '0')).has(emptyWrapper)).toBe(true)
    expect(matched(NONE).has(wrapperOf('c'))).toBe(true)
  })

  it('does the same in draft mode, where every section sits in an editable wrapper', () => {
    mount([richText('a'), empty('u', WAVE), richText('c')], { editable: true })
    expect(matched(NONE).has(wrapperOf('c'))).toBe(true)
    mount([richText('a', WAVE), richText('c')], { editable: true })
    expect(matched(NONE).has(wrapperOf('c'))).toBe(false)
  })

  it('keeps the pull-up under a section whose edge is still streaming in (a pending boundary, not an empty one)', () => {
    mount([richText('a'), empty('u', WAVE), richText('c')])
    // What React leaves in the wrapper while a boundary is pending.
    wrapperOf('c').previousElementSibling?.insertAdjacentHTML(
      'beforeend',
      '<!--$?--><template id="B:0"></template><!--/$-->',
    )
    expect(matched(NONE).has(wrapperOf('c'))).toBe(false)
  })

  it('leaves a page with no empty section exactly as it was: nothing is taken away anywhere', () => {
    mount([richText('a', WAVE), richText('b', WAVE), richText('c')])
    expect(matched(NONE).size).toBe(0)
  })
})

describe('S1 and S2: the footer’s band', () => {
  const HIDDEN = selectorsSetting('display', 'none').filter((selector) =>
    selector.includes('data-edge-backdrop'),
  )
  const band = (): Element => {
    const found = document.querySelector('[data-edge-backdrop]')
    if (!found) throw new Error('No band.')
    return found
  }

  it('is drawn under the last section’s cut', () => {
    mount([richText('a'), richText('b', WAVE)])
    expect(band()).toBeTruthy()
    expect(matched(HIDDEN).has(band())).toBe(false)
  })

  it('is not drawn when the last section rendered nothing, so no cut sits above it', () => {
    mount([richText('a'), empty('u', WAVE)])
    expect(matched(HIDDEN).has(band())).toBe(true)
  })

  it('is not drawn on a Minimal page, which has no footer to match: the page background shows instead', () => {
    mount([richText('a'), richText('b', WAVE)], {}, true)
    expect(matched(HIDDEN).has(band())).toBe(true)
  })

  describe('the footer’s top border, hidden only under a drawn band', () => {
    const rules = selectorsSetting('border-top-color', 'transparent')
    // What the footer rule asks of <main>: the relative selector inside `main:has(...)`.
    const inner = rules
      .map((selector) => /^main:has\((.+)\) ~ \[data-site-chrome\] footer$/.exec(selector)?.[1])
      .filter((selector) => selector !== undefined)
    const hidesBorder = () => inner.some((selector) => document.querySelector(selector) !== null)

    it('has exactly one such rule', () => {
      expect(inner).toHaveLength(1)
    })

    it('hides it under a drawn band, in draft mode too', () => {
      mount([richText('a'), richText('b', WAVE)])
      expect(hidesBorder()).toBe(true)
      mount([richText('a'), richText('b', WAVE)], { editable: true })
      expect(hidesBorder()).toBe(true)
    })

    it('keeps it when the last section rendered nothing, in draft mode too', () => {
      mount([richText('a'), empty('u', WAVE)])
      expect(hidesBorder()).toBe(false)
      mount([richText('a'), empty('u', WAVE)], { editable: true })
      expect(hidesBorder()).toBe(false)
    })

    it('hides it while the last section is still streaming in', () => {
      mount([richText('a'), empty('u', WAVE)])
      band().previousElementSibling?.insertAdjacentHTML(
        'beforeend',
        '<!--$?--><template id="B:0"></template><!--/$-->',
      )
      expect(hidesBorder()).toBe(true)
    })

    it('keeps it on a page with no band', () => {
      mount([richText('a'), richText('b')])
      expect(hidesBorder()).toBe(false)
    })
  })
})

describe('globals.css selectors a browser accepts', () => {
  /** Whether a `:has(` opens inside another `:has(...)`'s argument. */
  const nestsHas = (selector: string) => {
    const open: boolean[] = []
    for (let i = 0; i < selector.length; i++) {
      if (selector.startsWith(':has(', i)) {
        if (open.includes(true)) return true
        open.push(true)
        i += 4
      } else if (selector[i] === '(') open.push(false)
      else if (selector[i] === ')') open.pop()
    }
    return false
  }

  it('never nests :has() inside :has(): browsers drop the whole rule, though jsdom accepts it', () => {
    const all = [...css.matchAll(/([^{}]+)\{/g)].flatMap(([, list]) => splitSelectors(list ?? ''))
    expect(nestsHas('main:has(div:has(a) + b)')).toBe(true)
    expect(nestsHas('body:has(a) main > div:not(:has(~ b))')).toBe(false)
    expect(all.filter(nestsHas)).toEqual([])
  })
})

describe('S3: the first and last section of a Minimal page, through every wrapper', () => {
  const FIRST = selectorsSetting('--screen-backdrop-top')
  const LAST = selectorsSetting('--screen-backdrop-bottom')
  const expectEnds = (first: string, last: string) => {
    expect(ids(matched(FIRST))).toEqual([first])
    expect(ids(matched(LAST))).toEqual([last])
  }

  it('finds them in plain sections', () => {
    mount([richText('a'), richText('b'), richText('c')], {}, true)
    expectEnds('a', 'c')
  })

  it('finds a first section that has an edge (in a frame, in a wrapper) and a last one that is under one', () => {
    mount([richText('a', WAVE), richText('b', WAVE), richText('c')], {}, true)
    expectEnds('a', 'c')
  })

  it('does not mistake a plain section for the last when a wrapped one follows it', () => {
    mount([richText('a'), richText('b', WAVE)], {}, true)
    expectEnds('a', 'b')
  })

  it('does not mistake a plain section for the first when a wrapped one precedes it', () => {
    mount([richText('a', WAVE), richText('b', WAVE), richText('c'), richText('d')], {}, true)
    expectEnds('a', 'd')
  })

  it('looks past the footer’s band, which follows the last section but is not one', () => {
    mount([richText('a'), richText('b', WAVE)], {}, true)
    expect(document.querySelector('[data-edge-backdrop]')).toBeTruthy()
    expectEnds('a', 'b')
  })

  it('finds them in draft mode, where every section is in an editable wrapper inside one more', () => {
    mount([richText('a', WAVE), richText('b'), richText('c', WAVE)], { editable: true }, true)
    expectEnds('a', 'c')
    mount([richText('a'), richText('b')], { editable: true }, true)
    expectEnds('a', 'b')
  })

  it('finds a single section as both', () => {
    mount([richText('a', WAVE)], {}, true)
    expectEnds('a', 'a')
  })

  it('applies only on a Minimal page: with no marker, the page keeps the backdrop’s usual clip', () => {
    mount([richText('a'), richText('b')], {}, false)
    expect(matched(FIRST).size).toBe(0)
    expect(matched(LAST).size).toBe(0)
  })
})
