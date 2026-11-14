import { useId } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { parseHtml, renderToHtml } from '@/lib/design/capability-harness'
import { SECTION_EDGE_ACCENTS } from '@/lib/sanity/section-style-options'

import { bump, pathFromFunction } from './edge-crest'
import {
  closeToBottom,
  closeToTop,
  cutMaskImage,
  type EdgeComposition,
  type ResolvedEdge,
} from './section-edges'
import type * as SectionEdges from './section-edges'
import type { SectionStyleInput } from './section-style'

/**
 * The composed-edge path through SectionFrame (task 151, Slice 1), drawn with a test-only composition: no
 * shape is a composition yet, so `edgeComposition` is stubbed here for the renders that ask for one and
 * left real for every other. What today's shapes draw is held byte for byte, ids included, by
 * section-edge-parity.test.tsx; this checks the new path's order, attributes and isolation.
 */

const stub = vi.hoisted(() => ({ composition: undefined as EdgeComposition | undefined }))
vi.mock('./section-edges', async (importOriginal) => {
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
// The site's colours, which the mark reads; none are stored in a unit test.
vi.mock('@/lib/sanity/site-design', () => ({
  getSiteDesign: () => Promise.resolve({ colours: undefined, gradients: [] }),
}))

const { SectionFrame } = await import('./section-frame')

const crest = (x: number) => 0.5 - 0.3 * bump(x, 0.6, 0.3, 0.2)
const line = (offset: number) => pathFromFunction((x) => crest(x) + offset)

/** Every kind of part, interleaved, so the renderer's grouping and order are what is tested. */
const COMPOSITION: EdgeComposition = {
  cut: line(0),
  parts: [
    { kind: 'fill', side: 'under', line: line(0.2), paint: 'accent', opacity: 0.25 },
    { kind: 'fill', side: 'over', line: line(-0.2), paint: 'accent-2', opacity: 0.3 },
    { kind: 'stroke', side: 'under', line: line(0.1), paint: 'ink', opacity: 0.65, widthPx: 1.5 },
    { kind: 'fill', side: 'over', line: line(-0.3), paint: 'highlight', opacity: 0.2 },
    { kind: 'stroke', side: 'over', line: line(-0.1), paint: 'highlight', opacity: 1, widthPx: 1 },
    { kind: 'fill', side: 'under', line: line(0.3), paint: 'ink', opacity: 0.1 },
  ],
}
const UNDER_ONLY: EdgeComposition = {
  cut: COMPOSITION.cut,
  parts: COMPOSITION.parts.filter((part) => part.side === 'under'),
}

function Content() {
  const id = useId()
  return (
    <>
      <h2 id={id}>Heading</h2>
      <p aria-describedby={id}>Copy</p>
    </>
  )
}

/** A brand gradient, so the section draws its own background layer, and a mark beside it. */
const STYLE: SectionStyleInput = {
  tone: 'inverse',
  edge: 'wave',
  gradient: 'forest-dusk',
  mark: { kind: 'icon', icon: 'heart' },
}

/**
 * Draws a frame, with `composition` standing in for the shape's, and returns its root element. Streamed in
 * Node, as the site renders, so the mark's lazily loaded icon finishes before the HTML is read.
 */
async function draw(style: SectionStyleInput, composition?: EdgeComposition) {
  stub.composition = composition
  try {
    const html = await renderToHtml(
      <SectionFrame style={style} background={<div data-hero-background="" />}>
        <Content />
      </SectionFrame>,
    )
    const root = parseHtml(html).body.firstElementChild
    if (!root) throw new Error('Nothing drawn.')
    return root
  } finally {
    stub.composition = undefined
  }
}

const label = (element: Element) =>
  element.getAttribute('data-edge-part') ??
  (element.hasAttribute('data-section-background')
    ? 'background'
    : element.hasAttribute('data-hero-background')
      ? 'hero background'
      : element.hasAttribute('data-decorative-mark')
        ? 'mark'
        : element.tagName.toLowerCase())

beforeEach(() => {
  stub.composition = undefined
})

describe('a composed edge in SectionFrame', () => {
  it('draws under fills before the section, under lines after it, and over parts inside it after the background and mark, before the content', async () => {
    const frame = await draw(STYLE, COMPOSITION)
    expect(frame.getAttribute('data-section-edge-frame')).toBe('wave')
    expect([...frame.children].map(label)).toEqual(['under-1', 'under-2', 'section', 'line-1'])
    const section = frame.querySelector(':scope > section')
    expect([...(section?.children ?? [])].map(label)).toEqual([
      'background',
      'hero background',
      'mark',
      'over-1',
      'over-2',
      'over-3',
      'div',
    ])
    expect(section?.lastElementChild?.querySelector('h2')).not.toBeNull()
  })

  it('makes every part decoration: hidden, unfocusable, no pointer events, stretched over the band', async () => {
    const parts = [...(await draw(STYLE, COMPOSITION)).querySelectorAll('[data-edge-part]')]
    expect(parts).toHaveLength(6)
    for (const part of parts) {
      expect(part.tagName.toLowerCase()).toBe('svg')
      expect(part.getAttribute('aria-hidden')).toBe('true')
      expect(part.getAttribute('focusable')).toBe('false')
      expect(part.getAttribute('viewBox')).toBe('0 0 1 1')
      expect(part.getAttribute('preserveAspectRatio')).toBe('none')
      expect(part.getAttribute('style')).toBe('height:var(--edge-h)')
      const classes = part.getAttribute('class')?.split(' ') ?? []
      expect(classes).toEqual(
        expect.arrayContaining(['pointer-events-none', 'absolute', 'bottom-0']),
      )
      // Only over parts sit behind the section's content, inside it.
      expect(classes.includes('-z-10')).toBe(
        part.getAttribute('data-edge-part')?.startsWith('over'),
      )
    }
  })

  it('fills to the band’s far side in a theme role, and keeps lines at their width', async () => {
    const frame = await draw(STYLE, COMPOSITION)
    const path = (id: string) => frame.querySelector(`[data-edge-part="${id}"] path`)
    const [under1, over1, line1, , over3] = COMPOSITION.parts
    expect(path('under-1')?.getAttribute('d')).toBe(closeToTop(under1?.line ?? ''))
    expect(path('under-1')?.getAttribute('fill')).toBe('var(--color-accent)')
    expect(path('under-1')?.getAttribute('fill-opacity')).toBe('0.25')
    expect(path('over-1')?.getAttribute('d')).toBe(closeToBottom(over1?.line ?? ''))
    expect(path('over-1')?.getAttribute('fill')).toBe('var(--color-accent-2)')
    for (const [id, part] of [
      ['line-1', line1],
      ['over-3', over3],
    ] as const) {
      expect(path(id)?.getAttribute('d')).toBe(part?.line)
      expect(path(id)?.getAttribute('fill')).toBe('none')
      expect(path(id)?.getAttribute('vector-effect')).toBe('non-scaling-stroke')
      expect(path(id)?.getAttribute('stroke-width')).toBe(
        part?.kind === 'stroke' ? String(part.widthPx) : '',
      )
    }
    expect(path('line-1')?.getAttribute('stroke')).toBe('var(--color-ink)')
    expect(path('line-1')?.getAttribute('stroke-opacity')).toBe('0.65')
  })

  it('cuts the section along the composition’s own cut', async () => {
    const style = (await draw(STYLE, COMPOSITION)).getAttribute('style') ?? ''
    expect(style).toContain(`--edge-mask:${cutMaskImage(COMPOSITION.cut)}`)
  })

  it('takes none of today’s branches: no back wave and no accent line, even on Layered with an accent', async () => {
    const frame = await draw({ ...STYLE, edge: 'layered', edgeAccent: 'accent' }, COMPOSITION)
    expect(frame.querySelectorAll('[data-edge-layer]')).toHaveLength(0)
    expect(frame.querySelectorAll('[data-edge-part]')).toHaveLength(6)
  })

  it('without over parts leaves the section exactly as it is without a composition, ids included', async () => {
    const plain = (await draw(STYLE)).querySelector(':scope > section')?.outerHTML
    const composed = (await draw(STYLE, UNDER_ONLY)).querySelector(':scope > section')?.outerHTML
    expect(plain).toContain('aria-describedby=')
    expect(composed).toBe(plain)
  })
})

describe('Tide and Contour, drawn as compositions (task 151, Slice 2)', () => {
  it('draws Tide’s crest before the section and no line, with no Echo on the frame unless chosen', async () => {
    const frame = await draw({ tone: 'inverse', edge: 'tide', edgeAccent: 'highlight' })
    expect([...frame.children].map(label)).toEqual(['under-1', 'section'])
    expect(frame.hasAttribute('data-edge-echo')).toBe(false)
    const crest = frame.querySelector('[data-edge-part="under-1"] path')
    expect(crest?.getAttribute('fill')).toBe('var(--color-accent)')
    expect(crest?.getAttribute('fill-opacity')).toBe('0.25')
  })

  it('paints Echo from the frame, which carries the section’s tone', async () => {
    const frame = await draw({ tone: 'alt', edge: 'tide', edgeTideLayer: 'echo' })
    expect(frame.getAttribute('data-edge-echo')).toBe('alt')
    const crest = frame.querySelector('[data-edge-part="under-1"] path')
    expect(crest?.getAttribute('fill')).toBe('var(--edge-echo)')
    expect(crest?.getAttribute('fill-opacity')).toBe('0.4')
  })

  it('draws Contour’s three lines after the section, in Primary or the muted text colour', async () => {
    for (const [edgeLineColour, paint] of [
      [undefined, 'var(--color-accent)'],
      ['muted', 'var(--color-ink-muted)'],
    ] as const) {
      const frame = await draw({ tone: 'surface', edge: 'contour', edgeLineColour })
      expect([...frame.children].map(label)).toEqual(['section', 'line-1', 'line-2', 'line-3'])
      for (const line of frame.querySelectorAll('[data-edge-part] path')) {
        expect(line.getAttribute('stroke')).toBe(paint)
        expect(line.getAttribute('stroke-width')).toBe('1.5')
      }
    }
  })
})

/** Today's shapes, drawn from their lines. */
const LINE_SHAPES = ['diagonal', 'wave', 'curve', 'arch', 'layered'] as const

describe('today’s shapes', () => {
  it.each(LINE_SHAPES)(
    '%s takes its original branches with every accent: no composed part is drawn',
    async (shape) => {
      for (const edgeAccent of SECTION_EDGE_ACCENTS) {
        const frame = await draw({ ...STYLE, edge: shape, edgeAccent })
        expect(frame.querySelectorAll('[data-edge-part]')).toHaveLength(0)
        expect(frame.querySelectorAll('[data-edge-layer="back"]')).toHaveLength(
          shape === 'layered' ? 1 : 0,
        )
        expect(frame.querySelectorAll('[data-edge-layer="line"]')).toHaveLength(
          edgeAccent === 'none' ? 0 : 1,
        )
      }
    },
  )
})

describe('Still water in SectionFrame (task 151, Slice 3), drawn by the real generator', () => {
  const still: SectionStyleInput = { tone: 'inverse', edge: 'still-water', edgeLayerBelow: true }

  it('draws its layer above inside the section and its layer below in the frame, in the existing slots', async () => {
    const frame = await draw(still)
    expect(frame.getAttribute('data-section-edge-frame')).toBe('still-water')
    expect([...frame.children].map(label)).toEqual(['under-1', 'section'])
    const section = frame.querySelector(':scope > section')
    // After the background, before the content.
    expect([...(section?.children ?? [])].map(label)).toEqual(['hero background', 'over-1', 'div'])
    expect(frame.querySelector('[data-edge-part="over-1"] path')?.getAttribute('fill')).toBe(
      'var(--color-accent)',
    )
    expect(frame.querySelector('[data-edge-part="under-1"] path')?.getAttribute('fill')).toBe(
      'var(--color-accent)',
    )
  })

  it('draws no layer below by default, and none at Shallow even when one is stored', async () => {
    for (const style of [
      { ...still, edgeLayerBelow: undefined },
      { ...still, edgeDepth: 'shallow' },
    ]) {
      const frame = await draw(style)
      expect([...frame.children].map(label)).toEqual(['section'])
      expect(frame.querySelectorAll('[data-edge-part]')).toHaveLength(1)
    }
  })

  it('masks the section with its own cut and keeps the line shapes’ attributes off it', async () => {
    const frame = await draw(still)
    expect(frame.getAttribute('style')).toContain('--edge-mask:url(')
    expect(frame.querySelector('[data-edge-layer]')).toBeNull()
  })
})
