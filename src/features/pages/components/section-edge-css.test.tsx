// @vitest-environment jsdom
import { readFileSync } from 'node:fs'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { bump, pathFromFunction } from '@/components/ui/edge-crest'
import type * as SectionEdges from '@/components/ui/section-edges'
import type { EdgeComposition, ResolvedEdge } from '@/components/ui/section-edges'

import type { PageSection } from '../types'
import { SectionRenderer } from './section-renderer'

// A composed edge (task 151, Slice 1): no shape is one yet, so a test stands one in where it asks for it.
const stub = vi.hoisted(() => ({ composition: undefined as EdgeComposition | undefined }))
vi.mock('@/components/ui/section-edges', async (importOriginal) => {
  const actual = await importOriginal<typeof SectionEdges>()
  return {
    ...actual,
    edgeComposition: (edge: ResolvedEdge) => stub.composition ?? actual.edgeComposition(edge),
  }
})
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

const read = (path: string) => readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const css = read('src/styles/globals.css')
/** The tones, and the composed edges' follower-tone and Echo rules generated beside them (task 151). */
const tokensCss = read('src/styles/tokens.generated.css')

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
function selectorsSetting(property: string, value?: string, source = css): string[] {
  const found: string[] = []
  for (const [, selectors, body] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
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
    const all = [css, tokensCss].flatMap((source) =>
      [...source.matchAll(/([^{}]+)\{/g)].flatMap(([, list]) => splitSelectors(list ?? '')),
    )
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

describe('a composed edge’s parts: hidden without mask support and in forced colours, and nothing else is', () => {
  /** Every rule inside the at-rule blocks whose prelude matches, found by matching braces. */
  const rulesInside = (prelude: RegExp) =>
    [...css.matchAll(/@(?:media|supports)[^{]*\{/g)]
      .filter(([opening]) => prelude.test(opening))
      .flatMap((match) => {
        const start = match.index + match[0].length
        let depth = 1
        let end = start
        while (depth > 0 && end < css.length) {
          if (css[end] === '{') depth += 1
          if (css[end] === '}') depth -= 1
          end += 1
        }
        return [...css.slice(start, end - 1).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      })
      .filter(([, , body]) => /(^|[;\s])display:\s*none/.test(body ?? ''))
      .flatMap(([, selectors]) => splitSelectors(selectors ?? ''))
  const NO_MASK = rulesInside(
    /^@supports not \(\(mask-image: none\) or \(-webkit-mask-image: none\)\)/,
  )
  const FORCED = rulesInside(/^@media \(forced-colors: active\)/).filter((selector) =>
    selector.includes('data-edge'),
  )

  const crest = (x: number) => 0.5 - 0.3 * bump(x, 0.6, 0.3, 0.2)
  const line = (offset: number) => pathFromFunction((x) => crest(x) + offset)
  const COMPOSITION: EdgeComposition = {
    cut: line(0),
    parts: [
      { kind: 'fill', side: 'under', line: line(0.2), paint: 'accent', opacity: 0.25 },
      { kind: 'stroke', side: 'under', line: line(0.1), paint: 'ink', opacity: 0.65, widthPx: 1.5 },
      { kind: 'fill', side: 'over', line: line(-0.2), paint: 'accent-2', opacity: 0.3 },
      {
        kind: 'stroke',
        side: 'over',
        line: line(-0.1),
        paint: 'highlight',
        opacity: 1,
        widthPx: 1,
      },
    ],
  }
  const mountComposed = () => {
    stub.composition = COMPOSITION
    try {
      mount([richText('a', WAVE), richText('b')])
    } finally {
      stub.composition = undefined
    }
  }

  it('keeps today’s no-mask rule as it was, and adds one for the parts beside it', () => {
    expect(NO_MASK).toEqual(['[data-section-edge-frame] > svg', '[data-edge-part]'])
  })

  it('hides only the parts, and Elevated’s shadow, in forced colours', () => {
    expect(FORCED).toEqual(['[data-edge-part]', '[data-edge-shadow]'])
  })

  it('reaches every part of a composed edge with both, the over parts inside the section included', () => {
    mountComposed()
    const parts = new Set(document.querySelectorAll('[data-edge-part]'))
    expect(parts.size).toBe(4)
    expect(document.querySelectorAll('section > [data-edge-part]')).toHaveLength(2)
    expect(matched(FORCED)).toEqual(parts)
    for (const part of parts) expect(matched(NO_MASK).has(part)).toBe(true)
  })

  it('reaches nothing of today’s edges with the new rules: the back wave and accent lines keep their behaviour', () => {
    mount([
      richText('a', { edge: 'layered', edgeAccent: 'accent' }),
      richText('b', { edge: 'wave', edgeAccent: 'highlight' }),
      richText('c'),
    ])
    const today = new Set(document.querySelectorAll('[data-edge-layer]'))
    expect(today.size).toBe(3)
    expect(matched(FORCED).size).toBe(0)
    expect(matched(['[data-edge-part]']).size).toBe(0)
    // Without mask support, today's rule hides them exactly as before.
    expect(matched(NO_MASK)).toEqual(today)
  })
})

describe('a composed edge’s parts in its frame take the tone of the section below (task 151, Slice 2)', () => {
  const below = (pattern: string) =>
    selectorsSetting('--color-accent', pattern, tokensCss).filter((selector) =>
      selector.includes('data-edge-part'),
    )
  const INVERSE = below('color-mix\\(in oklab, var\\(--tone-accent\\) 55%')
  const ACCENT = below('var\\(--tone-accent-ink\\)')
  const ECHO = selectorsSetting('--edge-echo', undefined, tokensCss)
  const TIDE = { edge: 'tide', edgeHeight: 'large' }

  /** The parts in the frame of the section with this key (the ones over the section below). */
  const partsOf = (key: string) =>
    new Set(wrapperOf(key).querySelectorAll(':scope [data-section-edge-frame] > [data-edge-part]'))
  const toneOf = (key: string) => {
    const parts = partsOf(key)
    expect(parts.size).toBeGreaterThan(0)
    const inverse = [...parts].every((part) => matched(INVERSE).has(part))
    const accent = [...parts].every((part) => matched(ACCENT).has(part))
    const none = [...parts].every((part) => !matched([...INVERSE, ...ACCENT]).has(part))
    return inverse && !accent ? 'inverse' : accent && !inverse ? 'accent' : none ? 'page' : 'mixed'
  }

  it('is generated for the two tones that recolour their contents, one :has() each', () => {
    // A plain section below, one in an edge's frame, and (Slice 6) one in Elevated's frame.
    expect(INVERSE).toHaveLength(3)
    expect(ACCENT).toHaveLength(3)
    // The two that were there are exactly as they were.
    for (const selectors of [INVERSE, ACCENT]) {
      expect(
        selectors.filter((selector) => !selector.includes('data-section-elevated')),
      ).toHaveLength(2)
      expect(
        selectors.filter((selector) => selector.includes('data-section-elevated')),
      ).toHaveLength(1)
    }
  })

  it('follows a plain section below, in its tone', () => {
    mount([richText('a', TIDE), richText('b', { tone: 'inverse' })])
    expect(toneOf('a')).toBe('inverse')
    mount([richText('a', TIDE), richText('b', { tone: 'accent' })])
    expect(toneOf('a')).toBe('accent')
  })

  it('follows an Elevated section below, whose frame sits between its wrapper and its section (task 151, Slice 6)', () => {
    // Tide and Contour before Elevated, over Contrast (inverse) and Primary (accent): the parts take the
    // Elevated section's tone, as they would a plain section's.
    for (const shape of ['tide', 'contour']) {
      for (const [tone, expected] of [
        ['inverse', 'inverse'],
        ['accent', 'accent'],
      ] as const) {
        mount([
          richText('a', { edge: shape, edgeHeight: 'large' }),
          richText('b', { tone, edge: 'elevated' }),
          richText('c'),
        ])
        expect(toneOf('a'), `${shape} before Elevated, ${tone}`).toBe(expected)
        // Draft mode wraps every section once more: the same.
        mount(
          [
            richText('a', { edge: shape, edgeHeight: 'large' }),
            richText('b', { tone, edge: 'elevated' }),
            richText('c'),
          ],
          { editable: true },
        )
        expect(toneOf('a'), `${shape} before Elevated, ${tone}, draft mode`).toBe(expected)
      }
    }
  })

  it('keeps the page’s colours before an Elevated section that recolours nothing', () => {
    for (const tone of ['surface', 'alt']) {
      mount([richText('a', TIDE), richText('b', { tone, edge: 'elevated' })])
      expect(toneOf('a')).toBe('page')
    }
  })

  it('keeps the page’s colours over a surface or alternate section, which recolour nothing', () => {
    for (const tone of ['surface', 'alt']) {
      mount([richText('a', TIDE), richText('b', { tone })])
      expect(toneOf('a')).toBe('page')
    }
  })

  it('follows a section below that has an edge of its own, in its own frame', () => {
    mount([richText('a', TIDE), richText('b', { tone: 'inverse', edge: 'contour' }), richText('c')])
    expect(toneOf('a')).toBe('inverse')
    // The lower edge's own parts follow the section below it, not the one above.
    expect(toneOf('b')).toBe('page')
  })

  it('does the same in draft mode, where every section sits in an editable wrapper', () => {
    mount([richText('a', TIDE), richText('b', { tone: 'inverse' })], { editable: true })
    expect(toneOf('a')).toBe('inverse')
  })

  it('keeps the page’s colours with no section below: an empty one, the footer’s band, a Minimal page', () => {
    mount([richText('a', TIDE), empty('u', { tone: 'inverse' })])
    expect(toneOf('a')).toBe('page')
    mount([richText('a'), richText('b', TIDE)])
    expect(document.querySelector('[data-edge-backdrop]')).toBeTruthy()
    expect(toneOf('b')).toBe('page')
    mount([richText('a'), richText('b', TIDE)], {}, true)
    expect(toneOf('b')).toBe('page')
  })

  it('keeps the page’s colours while the section below is still streaming in, then follows it', () => {
    mount([richText('a', TIDE), richText('b', { tone: 'inverse' })])
    const follower = wrapperOf('b')
    const section = follower.firstElementChild
    section?.remove()
    follower.insertAdjacentHTML('beforeend', '<!--$?--><template id="B:0"></template><!--/$-->')
    expect(toneOf('a')).toBe('page')
    if (section) follower.append(section)
    expect(toneOf('a')).toBe('inverse')
  })

  it('reaches nothing of today’s edges: the back wave and accent line keep the page’s colours', () => {
    mount([
      richText('a', { edge: 'layered', edgeAccent: 'accent' }),
      richText('b', { tone: 'inverse' }),
    ])
    expect(document.querySelectorAll('[data-edge-layer]')).toHaveLength(2)
    expect(matched([...INVERSE, ...ACCENT]).size).toBe(0)
  })

  it('reaches no part inside a section, which takes that section’s own tone', () => {
    stub.composition = {
      cut: 'M0 0.5L1 0.5',
      parts: [
        { kind: 'fill', side: 'over', line: 'M0 0.3L1 0.3', paint: 'accent', opacity: 0.3 },
        { kind: 'fill', side: 'under', line: 'M0 0.7L1 0.7', paint: 'accent', opacity: 0.3 },
      ],
    }
    try {
      mount([richText('a', { edge: 'wave' }), richText('b', { tone: 'inverse' })])
    } finally {
      stub.composition = undefined
    }
    const over = document.querySelector('section [data-edge-part="over-1"]')
    const under = document.querySelector('[data-section-edge-frame] > [data-edge-part="under-1"]')
    if (!over || !under) throw new Error('The composed parts were not drawn.')
    expect(matched(INVERSE).has(over)).toBe(false)
    expect(matched(INVERSE).has(under)).toBe(true)
  })

  it('resolves Echo on the frame, from the tone of the section the edge belongs to', () => {
    expect(ECHO).toEqual([
      "[data-edge-echo='surface']",
      "[data-edge-echo='alt']",
      "[data-edge-echo='inverse']",
      "[data-edge-echo='accent']",
    ])
    mount([richText('a', { ...TIDE, tone: 'alt', edgeTideLayer: 'echo' }), richText('b')])
    const frame = document.querySelector('[data-section-edge-frame]')
    expect(frame?.getAttribute('data-edge-echo')).toBe('alt')
    expect(matched(ECHO)).toEqual(new Set([frame]))
  })
})
