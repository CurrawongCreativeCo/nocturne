import { createHash } from 'node:crypto'

import { createElement, useId, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { SectionFrame } from '@/components/ui/section-frame'
import type { SectionStyleInput } from '@/components/ui/section-style'
import { renderToHtml } from '@/lib/design/capability-harness'
import {
  SECTION_EDGE_ACCENTS,
  SECTION_EDGE_HEIGHTS,
  SECTION_EDGE_LAYERS,
  SECTION_EDGES,
} from '@/lib/sanity/section-style-options'

import type { PageSection, SectionGate } from '../types'
import { SectionRenderer } from './section-renderer'

/**
 * Section edge parity (task 151, Stage 3 section 12): what every existing edge draws today, captured from
 * main after PR #190 and committed before any Slice 1 code. Slice 1 and every later slice must leave this
 * snapshot unchanged: new shapes add their own markup, and no existing shape, option or stored value may
 * change by a byte. If it changes, stop and report it; never update it to make a slice pass.
 *
 * Unlike the section parity snapshots, the markup is hashed raw: React's generated ids are NOT renamed,
 * because the useId sequence itself must not move (a new slot rendered before the content shifts it).
 * Each case also records the edge attributes in order, so a reviewer can read what changed.
 */

// A picture keeps its URL and classes: the hero background case draws one.
vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', { src: props.src, className: props.className, alt: '' }),
}))
vi.mock('server-only', () => ({}))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))
// A section with a panel reads the site's colours; none are stored in a unit test.
vi.mock('@/lib/sanity/site-design', () => ({
  getSiteDesign: () => Promise.resolve({ colours: undefined, gradients: [] }),
}))

const hash = (html: string) => createHash('sha256').update(html).digest('hex').slice(0, 16)

/** The edge attributes and variables in document order: frames, followers, stacking, layers, band. */
const EDGE_PARTS =
  /data-section-edge-frame="[a-z]+"|data-edge-custom=""|data-edge-layer="[a-z]+"|data-edge-above(?:-custom)?=""|data-edge-backdrop=""|--edge-(?:z|h|above|custom-[a-z]+):[^;"]+|data-members-gate=""|<section id="[a-z0-9-]+"/g
const partsOf = (html: string) => (html.match(EDGE_PARTS) ?? []).join(' · ')

/** Content that takes generated ids, so a shifted useId sequence changes the markup. */
function Content() {
  const id = useId()
  return (
    <>
      <h2 id={id}>Heading</h2>
      <p aria-describedby={id}>A paragraph of copy.</p>
    </>
  )
}

const frame = (style: SectionStyleInput, extra: { background?: ReactNode } = {}) => (
  <SectionFrame style={style} background={extra.background}>
    <Content />
  </SectionFrame>
)

const SHAPES = SECTION_EDGES.filter((shape) => shape !== 'none')
const FLIPS = [false, true] as const
const INVERTS = [false, true] as const
/** Every token height, a full custom set and a phone-only custom set (the others fall back to it). */
const HEIGHTS: readonly [label: string, style: SectionStyleInput][] = [
  ...SECTION_EDGE_HEIGHTS.map((size): [string, SectionStyleInput] => [size, { edgeHeight: size }]),
  ['custom 40/72/120', { edgeHeightMobile: 40, edgeHeightTablet: 72, edgeHeightDesktop: 120 }],
  ['custom phone 48', { edgeHeightMobile: 48 }],
]

const styleOf = (
  shape: string,
  options: {
    flip: boolean
    invert: boolean
    accent: string
    layer: string
    height: SectionStyleInput
  },
): SectionStyleInput => ({
  tone: 'inverse',
  edge: shape,
  edgeFlip: options.flip,
  edgeInvert: options.invert,
  edgeAccent: options.accent,
  edgeLayer: options.layer,
  ...options.height,
})

describe('section edge parity: every existing shape and option, drawn by SectionFrame', () => {
  it.each(SHAPES)(
    '%s keeps its markup for every Flip, Invert, accent, back wave and height',
    (shape) => {
      const cases: Record<string, string> = {}
      for (const flip of FLIPS)
        for (const invert of INVERTS)
          for (const accent of SECTION_EDGE_ACCENTS)
            for (const layer of SECTION_EDGE_LAYERS)
              for (const [label, height] of HEIGHTS) {
                const html = renderToStaticMarkup(
                  frame(styleOf(shape, { flip, invert, accent, layer, height })),
                )
                const key = `${flip ? 'flip' : 'no flip'} · ${invert ? 'invert' : 'no invert'} · accent ${accent} · back ${layer} · ${label}`
                cases[key] = hash(html)
              }
      expect(Object.keys(cases)).toHaveLength(
        FLIPS.length * INVERTS.length * 4 * 2 * HEIGHTS.length,
      )
      expect(cases).toMatchSnapshot()
    },
  )

  it('keeps the full markup of each shape with Flip and Invert, and with only the shape stored', () => {
    const markup: Record<string, string> = {}
    for (const shape of SHAPES) {
      markup[`${shape} · nothing else stored`] = renderToStaticMarkup(frame({ edge: shape }))
      for (const flip of FLIPS)
        for (const invert of INVERTS)
          markup[
            `${shape} · ${flip ? 'flip' : 'no flip'} · ${invert ? 'invert' : 'no invert'} · accent`
          ] = renderToStaticMarkup(
            frame(
              styleOf(shape, { flip, invert, accent: 'accent', layer: 'accent-2', height: {} }),
            ),
          )
    }
    expect(markup).toMatchSnapshot()
  })

  it('keeps its markup beside a mark, a hero background and a panel', async () => {
    const background = createElement('div', { 'data-hero-background': '' })
    const contexts: readonly [label: string, style: SectionStyleInput, background?: ReactNode][] = [
      ['mark', { mark: { kind: 'icon', icon: 'heart' } }],
      ['hero background', {}, background],
      ['panel', { panel: 'glass', panelStrength: 'strong' }],
      [
        'mark, hero background and panel',
        { mark: { kind: 'icon', icon: 'heart' }, panel: 'solid' },
        background,
      ],
    ]
    const cases: Record<string, { hash: string; parts: string }> = {}
    for (const shape of SHAPES)
      for (const [label, extra, node] of contexts) {
        // Streamed, so a panel's async frame finishes before the HTML is read.
        const html = await renderToHtml(
          frame(
            { tone: 'inverse', edge: shape, edgeAccent: 'highlight', ...extra },
            { background: node },
          ),
        )
        cases[`${shape} · ${label}`] = { hash: hash(html), parts: partsOf(html) }
      }
    expect(cases).toMatchSnapshot()
  })
})

const richText = (key: string, style?: SectionStyleInput, access: string | null = null) =>
  ({
    _key: key,
    _type: 'richText',
    access,
    style: { anchorId: key, ...style },
    body: [],
  }) as unknown as PageSection
/** A form section with no form: it renders nothing, however its style is set. */
const empty = (key: string, style?: SectionStyleInput) =>
  ({
    _key: key,
    _type: 'formSection',
    access: null,
    style: { anchorId: key, ...style },
  }) as unknown as PageSection
const stub = (key: string) =>
  ({ _key: key, _type: 'richText', access: 'members' }) as unknown as PageSection

/** A members-only section that stays locked: the gate draws its own placeholder. */
const lockedGate: SectionGate = {
  callbackUrl: '/fixture-page',
  render: () => createElement('div', { 'data-members-gate': '' }),
  load: () => Promise.resolve(undefined),
}

const page = (sections: PageSection[], options: { editable?: boolean; gate?: SectionGate } = {}) =>
  renderToHtml(
    createElement(SectionRenderer, {
      documentId: 'fixture-page',
      documentType: 'page',
      sections,
      ...options,
    }),
  )

const MIXED: PageSection[] = [
  richText('a', { edge: 'wave', edgeAccent: 'accent' }),
  richText('b'),
  richText('c', { edge: 'curve', edgeHeightMobile: 40, edgeHeightDesktop: 96 }),
  richText('d', { tone: 'alt' }),
  richText('e', { edge: 'layered', edgeLayer: 'highlight', edgeFlip: true, edgeHeight: 'large' }),
  richText('f', { edge: 'arch', edgeInvert: true }),
  richText('g', { edge: 'diagonal', edgeHeight: 'small' }),
]

describe('section edge parity: pages, drawn by SectionRenderer', () => {
  it('keeps the frames, followers, stacking and footer band of each page', async () => {
    const pages: Record<string, PageSection[]> = {
      'mixed edges, last one drawn': MIXED,
      'mixed edges, last one plain': [...MIXED, richText('h')],
      'an empty edge section between two': [
        richText('a', { edge: 'wave' }),
        empty('u', { edge: 'wave', edgeHeight: 'large' }),
        richText('c'),
      ],
      'an edge right above an empty edge section': [
        richText('a', { edge: 'wave', edgeHeight: 'large' }),
        empty('u', { edge: 'curve', edgeHeight: 'large' }),
        richText('c'),
      ],
      'an empty last edge section': [richText('a'), empty('u', { edge: 'curve' })],
      'a long page: 45 edges in a row': Array.from({ length: 45 }, (_, n) =>
        richText(`s${String(n)}`, { edge: n % 2 ? 'wave' : 'curve' }),
      ),
    }
    const cases: Record<string, { hash: string; parts: string }> = {}
    for (const [label, sections] of Object.entries(pages)) {
      const html = await page(sections)
      cases[label] = { hash: hash(html), parts: partsOf(html) }
    }
    expect(cases).toMatchSnapshot()
  })

  it('keeps draft mode, where every section sits in an editable wrapper', async () => {
    const html = await page(MIXED, { editable: true })
    expect({ hash: hash(html), parts: partsOf(html) }).toMatchSnapshot()
  })

  it('keeps a members-only stub neutral: it has no edge, and nothing is pulled up under it', async () => {
    const cases: Record<string, { hash: string; parts: string }> = {}
    const pages: Record<string, PageSection[]> = {
      'a stub below an edge': [richText('a', { edge: 'wave' }), stub('m'), richText('c')],
      'a stub between plain sections, then an edge': [
        richText('a'),
        stub('m'),
        richText('c', { edge: 'arch' }),
        richText('d'),
      ],
    }
    for (const [label, sections] of Object.entries(pages)) {
      const html = await page(sections, { gate: lockedGate })
      cases[label] = { hash: hash(html), parts: partsOf(html) }
    }
    expect(cases).toMatchSnapshot()
  })
})
