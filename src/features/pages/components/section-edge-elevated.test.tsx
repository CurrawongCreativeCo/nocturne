import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SectionFrame } from '@/components/ui/section-frame'
import { resolveEdge, type SectionStyleInput } from '@/components/ui/section-style'
import { parseHtml, renderToHtml } from '@/lib/design/capability-harness'

import type { PageSection } from '../types'
import { EDGE_Z_START, SectionRenderer } from './section-renderer'

/**
 * Elevated (task 151, Slice 6): a straight boundary with a shadow strip outside the section. It draws no mask,
 * reserves no room, pulls nothing up and has no footer band, yet still takes a stacking step and still receives
 * the pull-up of a shaped edge above it. Today's shapes are held by section-edge-parity.test.tsx.
 */

vi.mock('next-sanity/image', () => ({ Image: () => null }))
vi.mock('server-only', () => ({}))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))
vi.mock('@/lib/sanity/site-design', () => ({
  getSiteDesign: () => Promise.resolve({ colours: undefined, gradients: [] }),
}))

const frame = (style: SectionStyleInput, className?: string, child: ReactNode = 'Copy') => (
  <SectionFrame style={style} className={className}>
    {child}
  </SectionFrame>
)
const richText = (key: string, style?: SectionStyleInput) =>
  ({
    _key: key,
    _type: 'richText',
    access: null,
    style: { anchorId: key, ...style },
    body: [],
  }) as unknown as PageSection
const page = (sections: PageSection[]) =>
  renderToHtml(
    createElement(SectionRenderer, {
      documentId: 'fixture-page',
      documentType: 'page',
      sections,
    }),
  )

describe('resolving Elevated', () => {
  it('is a shape with a Soft shadow by default, and Deep when chosen', () => {
    expect(resolveEdge({ edge: 'elevated' })).toMatchObject({ shape: 'elevated', shadow: 'soft' })
    expect(resolveEdge({ edge: 'elevated', edgeShadow: 'deep' })?.shadow).toBe('deep')
    expect(resolveEdge({ edge: 'elevated', edgeShadow: 'bogus' })?.shadow).toBe('soft')
  })

  it('ignores every setting of the cut stored from another shape, and deletes none', () => {
    const stored: SectionStyleInput = {
      edge: 'elevated',
      edgeFlip: true,
      edgeInvert: true,
      edgeAccent: 'accent',
      edgeLayer: 'highlight',
      edgeHeight: 'large',
      edgeHeightMobile: 60,
      edgeCrest: 'shifted',
      edgeLayerBelow: true,
    }
    const before = JSON.stringify(stored)
    const edge = resolveEdge(stored)
    expect(edge).toMatchObject({ flip: false, invert: false, accent: 'none' })
    expect(edge?.layered).toBeUndefined()
    expect(JSON.stringify(stored)).toBe(before)
  })

  it('leaves every other shape’s resolved edge without a shadow', () => {
    for (const edge of ['wave', 'layered', 'tide', 'still-water'])
      expect(resolveEdge({ edge })).not.toHaveProperty('shadow')
  })
})

describe('the frame Elevated draws', () => {
  const html = renderToStaticMarkup(frame({ tone: 'inverse', edge: 'elevated' }))

  it('is its own frame, not an edge frame: none of the cut’s rules can reach it', () => {
    expect(html).toContain('data-section-elevated="soft"')
    expect(html).not.toContain('data-section-edge-frame')
    expect(html).not.toContain('--edge-mask')
    expect(html).not.toContain('--edge-h')
    expect(html).not.toContain('data-edge-above')
    expect(html).not.toContain('data-edge-part')
    expect(html).not.toContain('data-edge-layer')
  })

  it('puts a decorative strip after the section, outside it and with no pointer events', () => {
    const doc = parseHtml(html)
    const root = doc.querySelector('[data-section-elevated]')
    const strip = doc.querySelector('[data-edge-shadow]')
    expect(strip?.parentElement).toBe(root)
    expect(strip?.closest('section')).toBeNull()
    expect(root?.firstElementChild?.tagName).toBe('SECTION')
    expect(root?.lastElementChild).toBe(strip)
    expect(strip?.getAttribute('aria-hidden')).toBe('true')
    expect(strip?.className).toContain('pointer-events-none')
    // It takes no room: absolutely placed, from the section's foot.
    expect(strip?.className).toMatch(/absolute/)
    expect(strip?.className).toMatch(/top-full/)
    expect(strip?.children).toHaveLength(0)
  })

  it('carries the chosen shadow on the frame, and draws the section unchanged', () => {
    expect(renderToStaticMarkup(frame({ edge: 'elevated', edgeShadow: 'deep' }))).toContain(
      'data-section-elevated="deep"',
    )
    // A section that clips its own overflow still draws the strip outside it.
    const clipped = parseHtml(renderToStaticMarkup(frame({ edge: 'elevated' }, 'overflow-hidden')))
    expect(clipped.querySelector('section')?.className).toContain('overflow-hidden')
    expect(clipped.querySelector('section [data-edge-shadow]')).toBeNull()
  })

  it('does not change the section: it has no extra padding or mask attributes of an edge', () => {
    const plain = renderToStaticMarkup(frame({ tone: 'inverse' }))
    const section = (h: string) => /<section[\s\S]*<\/section>/.exec(h)?.[0]
    expect(section(html)).toBe(section(plain))
  })
})

describe('Elevated in a page', () => {
  it('does not pull the next section up, or give it a follower', async () => {
    const html = await page([richText('a', { edge: 'elevated' }), richText('b')])
    expect(html).not.toContain('data-edge-above')
    expect(html).not.toContain('--edge-above')
  })

  it('draws no footer band under a last Elevated section', async () => {
    const html = await page([richText('a'), richText('b', { edge: 'elevated' })])
    expect(html).not.toContain('data-edge-backdrop')
    // A last section with a shaped edge still has its band: the footer follows its cut.
    expect(await page([richText('a'), richText('b', { edge: 'wave' })])).toContain(
      'data-edge-backdrop',
    )
  })

  it('still receives the overlap of a shaped edge above it', async () => {
    const html = await page([
      richText('a', { edge: 'wave', edgeHeight: 'large' }),
      richText('b', { edge: 'elevated' }),
      richText('c'),
    ])
    // The wave's follower is the Elevated section's wrapper, and it carries its own stacking step too.
    const doc = parseHtml(html)
    const wrappers = [...doc.querySelectorAll('div[data-edge-above]')]
    expect(wrappers).toHaveLength(1)
    expect(wrappers[0]?.getAttribute('style')).toContain('--edge-above:')
    expect(wrappers[0]?.getAttribute('style')).toContain(`--edge-z:${String(EDGE_Z_START - 1)}`)
    expect(wrappers[0]?.querySelector('[data-section-elevated]')).not.toBeNull()
    // …and the section after the Elevated one is not pulled up.
    expect(doc.querySelectorAll('[data-edge-above]')).toHaveLength(1)
  })

  it('takes a stacking step for each Elevated section, so each shadow falls on the ones after it', async () => {
    const html = await page([
      richText('a', { edge: 'elevated' }),
      richText('b', { edge: 'elevated' }),
      richText('c', { edge: 'wave' }),
      richText('d'),
    ])
    const steps = [...html.matchAll(/--edge-z:(\d+)/g)].map((m) => Number(m[1]))
    expect(steps).toEqual([EDGE_Z_START, EDGE_Z_START - 1, EDGE_Z_START - 2])
  })

  it('draws two Elevated sections in a row with a shadow each', async () => {
    const html = await page([
      richText('a', { edge: 'elevated' }),
      richText('b', { edge: 'elevated', edgeShadow: 'deep' }),
      richText('c'),
    ])
    expect(html.match(/data-edge-shadow=""/g)).toHaveLength(2)
    expect(html).toContain('data-section-elevated="soft"')
    expect(html).toContain('data-section-elevated="deep"')
  })
})
