import { writeFileSync } from 'node:fs'

import { evaluate, parse } from 'groq-js'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { edgeLine } from '@/components/ui/section-edges'
import { resolveSectionEdge } from '@/components/ui/section-style'
import { PAGE_QUERY } from '@/features/pages/api/queries'
import { parseHtml, renderToHtml } from '@/lib/design/capability-harness'
import { resolveComposedEdge } from '@/lib/sanity/composed-edge'
import { composedEdgeField } from '@/lib/sanity/schema/composed-edge'
import { sectionStyle } from '@/lib/sanity/schema/section-style'

import type { PageSection } from '../types'
import { SectionRenderer } from './section-renderer'

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
// Keep the normal SanityImage call and alt treatment. The fake asset's bytes are local in browser review.
vi.mock('next-sanity/image', () => ({
  Image: ({ alt, className }: { alt: string; className: string }) =>
    createElement('img', {
      src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Ccircle cx="32" cy="32" r="28" fill="%230d6062"/%3E%3Cpath d="M17 35q14 11 30-13M17 41q16 10 30-12" fill="none" stroke="%23f5f4e8" stroke-width="4"/%3E%3C/svg%3E',
      alt,
      className,
    }),
}))

const contour = (pairs: [number, number][], interpolation = 'linear') => ({
  interpolation,
  points: pairs.map(([x, y], index) => ({ _type: 'contourPoint', _key: `point-${index}`, x, y })),
})

const slant = {
  version: 1,
  mode: 'transition',
  contour: contour([
    [0, 0],
    [100, 100],
  ]),
}
const gradient = { kind: 'gradient', from: 'accent', to: 'accent-2' }
const waves = {
  version: 1,
  mode: 'transition',
  height: 'large',
  width: 78,
  contour: contour(
    [
      [0, 76],
      [21, 44],
      [53, 83],
      [82, 32],
      [100, 47],
    ],
    'smooth',
  ),
  layers: [
    {
      _type: 'edgePaintLayer',
      _key: 'sea-glass',
      placement: 'above',
      contour: contour(
        [
          [0, 23],
          [30, 69],
          [56, 31],
          [84, 49],
          [100, 31],
        ],
        'smooth',
      ),
      opacity: 43,
      paint: { kind: 'solid', colour: 'accent' },
    },
    {
      _type: 'edgePaintLayer',
      _key: 'ink',
      placement: 'above',
      contour: contour(
        [
          [0, 52],
          [21, 23],
          [51, 63],
          [79, 27],
          [100, 38],
        ],
        'smooth',
      ),
      opacity: 27,
      paint: { kind: 'solid', colour: 'ink-muted' },
    },
    {
      _type: 'edgePaintLayer',
      _key: 'gradient',
      placement: 'stroke',
      strokeWidth: 4,
      paint: gradient,
    },
  ],
  centre: { kind: 'icon', icon: 'sun', gap: 18 },
  shadow: { blur: 10, distance: 14, opacity: 55 },
}

const zigzag = {
  version: 1,
  mode: 'transition',
  contour: contour([
    [0, 60],
    [20, 32],
    [37, 72],
    [59, 28],
    [80, 65],
    [100, 39],
  ]),
  layers: [
    {
      _type: 'edgePaintLayer',
      _key: 'left',
      placement: 'stroke',
      offsetX: -2,
      offsetY: -4,
      strokeWidth: 3,
      paint: { colour: 'accent' },
    },
    {
      _type: 'edgePaintLayer',
      _key: 'right',
      placement: 'stroke',
      offsetX: 2,
      offsetY: 3,
      strokeWidth: 3,
      paint: { colour: 'accent-2' },
    },
    {
      _type: 'edgePaintLayer',
      _key: 'underlay',
      placement: 'below',
      offsetY: 14,
      opacity: 32,
      paint: { colour: 'highlight' },
    },
  ],
}

const imageId = 'image-edgeFixture-64x64-png'
const imageRule = {
  ...waves,
  mode: 'rule',
  width: 58,
  align: 'end',
  layers: [waves.layers[0], waves.layers[2]],
  centre: {
    kind: 'image',
    gap: 25,
    image: { _type: 'image', asset: { _type: 'reference', _ref: imageId } },
  },
}

const mark = { kind: 'icon', icon: 'sun', size: 'small', anchor: 'bottom-right', opacity: 18 }

function richText(
  key: string,
  tone: string,
  copy: string,
  edge?: unknown,
  watermark?: typeof mark,
) {
  return {
    _type: 'richText',
    _key: key,
    style: {
      _type: 'sectionStyle',
      anchorId: key,
      spacing: 'compact',
      tone,
      composedEdge: edge,
      mark: watermark,
    },
    body: [
      {
        _type: 'block',
        _key: 'copy',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', _key: 'text', text: copy, marks: [] }],
      },
    ],
  }
}

async function fromStore(pageBuilder: Record<string, unknown>[], members = false) {
  const dataset = [
    { _type: 'page', _id: 'edge-fixture', slug: { current: 'edges' }, title: 'Edges', pageBuilder },
    { _type: 'sanity.imageAsset', _id: imageId },
  ]
  const data = await evaluate(parse(PAGE_QUERY), { dataset, params: { slug: 'edges', members } })
  return ((await data.get()) as { pageBuilder: PageSection[] }).pageBuilder
}

const renderer = (sections: PageSection[], editable = false) => (
  <SectionRenderer
    sections={sections}
    documentId="edge-fixture"
    documentType="page"
    editable={editable}
  />
)

const render = (sections: PageSection[], editable = false) =>
  renderToHtml(renderer(sections, editable))

const sceneSections = (edge: unknown, prefix = '') =>
  fromStore([
    richText(
      `${prefix}upper`,
      'surface',
      'The section above',
      edge,
      edge === waves ? mark : undefined,
    ),
    richText(`${prefix}lower`, 'alt', 'The section below'),
  ])

const scenes = async (edge: unknown, editable = false) =>
  render(await sceneSections(edge), editable)

describe('composable section edges', () => {
  it('uses the same compiler for the original diagonal, smooth waves and offset angular strokes', () => {
    expect(resolveComposedEdge(slant)?.cut).toBe(edgeLine('diagonal'))
    expect(resolveComposedEdge(waves)?.cut).toContain('C')
    const offset = resolveComposedEdge(zigzag)
    expect(offset?.cut).not.toContain('C')
    expect(offset?.layers).toHaveLength(3)
    expect(offset?.layers[0]?.path).toMatch(/^M-0\.02.*L1 /)
    expect(offset?.layers[1]?.path).toMatch(/^M0 .*L1\.02 /)
  })

  it('uses bounded defaults for incomplete paint, size and placement values', () => {
    expect(
      resolveComposedEdge({
        ...slant,
        mode: 'rule',
        height: 'unknown',
        align: 'start',
        width: -20,
        layers: [
          {
            placement: 'stroke',
            offsetY: 800,
            opacity: 500,
            paint: { kind: 'gradient', from: 'unknown' },
          },
        ],
        centre: { kind: 'icon', icon: 'unknown' },
        shadow: { opacity: 50 },
      }),
    ).toMatchObject({
      height: { kind: 'token', size: 'medium' },
      span: { start: 0, end: 0.05 },
      layers: [
        {
          paint: { kind: 'gradient', from: 'accent', to: 'accent-2', fadeEnds: true },
          path: 'M0 0.3L1 1',
          strokeWidth: 2,
          opacity: 1,
        },
      ],
    })
  })

  it('puts an underlay below the cut and its offset strokes, even when stored after them', async () => {
    const doc = parseHtml(await scenes(zigzag))
    const frame = doc.querySelector('[data-section-edge-frame=composed]')
    expect(
      [...(frame?.children ?? [])].map(
        (child) => child.getAttribute('data-composed-edge-artwork') ?? child.tagName,
      ),
    ).toEqual(['below', 'SECTION', 'stroke'])
    expect(frame?.querySelector('[data-composed-edge-artwork=stroke] g')?.children).toHaveLength(2)
  })

  it('places a partial-width gradient and an icon over layered geometry in both output modes', async () => {
    for (const editable of [false, true]) {
      const html = await scenes(waves, editable)
      const doc = parseHtml(html)
      const frame = doc.querySelector('[data-section-edge-frame=composed]')
      const tint = frame?.querySelector('section [data-composed-edge-artwork=above]')
      const foreground = frame?.querySelector(':scope > [data-composed-edge-artwork=stroke]')
      expect(tint?.querySelectorAll('g > path')).toHaveLength(2)
      expect(
        tint?.previousElementSibling?.matches('[data-decorative-mark][aria-hidden=true]'),
      ).toBe(true)
      // Each class stands alone: a glued "overflow-hidden-z-10" would put the tint over the mark and content.
      expect([...(tint?.classList ?? [])]).toEqual(
        expect.arrayContaining(['overflow-hidden', '-z-10']),
      )
      expect(foreground?.classList.contains('-z-10')).toBe(false)
      expect(Number(foreground?.querySelector('linearGradient')?.getAttribute('x1'))).toBeCloseTo(
        0.11,
      )
      expect(foreground?.querySelectorAll('clipPath rect')).toHaveLength(2)
      expect(foreground?.querySelector('g path')?.getAttribute('stroke')).toMatch(
        /^url\(#.+gradient-0\)$/,
      )
      expect(doc.querySelector('[data-edge-above] #lower')).toBeTruthy()
      expect(
        doc.querySelector('span[data-composed-edge-centre][aria-hidden=true] svg[focusable=false]'),
      ).toBeTruthy()
      expect(Boolean(doc.querySelector('[data-sanity]'))).toBe(editable)
    }
  })

  it('projects a saved image centre, preserves layer order and leaves the next section in flow in rule mode', async () => {
    const doc = parseHtml(await scenes(imageRule))
    const rule = doc.querySelector('[data-composed-edge-rule]')
    expect(
      rule?.querySelector('[data-composed-edge-centre][aria-hidden=true] img[alt=""]'),
    ).toBeTruthy()
    expect(rule?.querySelectorAll('[data-composed-edge-artwork=all] g > path')).toHaveLength(2)
    expect(rule?.querySelector('g > path')?.getAttribute('fill')).toBe('var(--color-accent)')
    expect(rule?.querySelector('g > path:last-child')?.getAttribute('stroke')).toMatch(
      /^url\(#.+gradient-1\)$/,
    )
    expect(doc.querySelector('[data-edge-above]')).toBeNull()
    expect(doc.querySelector('[data-composed-edge-shadow]')).toBeNull()
  })

  it('casts a separate shadow without shifting the cut or layer positions', async () => {
    const before = resolveComposedEdge(waves)
    const light = { ...waves, shadow: { blur: 21, distance: 24, opacity: 12 } }
    const after = resolveComposedEdge(light)
    expect(after?.cut).toBe(before?.cut)
    expect(after?.layers).toEqual(before?.layers)
    expect(after?.shadow).toEqual({ blur: 0.21, distance: 0.24, opacity: 0.12 })
    const doc = parseHtml(await scenes(light))
    expect(doc.querySelector('[data-composed-edge-shadow] feOffset')?.getAttribute('dy')).toBe(
      '0.24',
    )
    expect(
      doc.querySelector('[data-composed-edge-shadow] feGaussianBlur')?.getAttribute('stdDeviation'),
    ).toBe('0 0.21')
    expect(
      doc
        .querySelector('[data-composed-edge-shadow] feComposite:last-child')
        ?.getAttribute('operator'),
    ).toBe('out')
  })

  it('keeps legacy data for invalid versions, self-crossing geometry and duplicate layer keys', () => {
    const old = resolveSectionEdge({ edge: 'diagonal' })
    for (const edge of [
      { ...slant, version: 9 },
      {
        ...slant,
        contour: contour([
          [0, 24],
          [51, 40],
          [30, 72],
          [100, 82],
        ]),
      },
      { ...zigzag, layers: [zigzag.layers[0], zigzag.layers[0]] },
      {
        ...slant,
        contour: contour([
          [2, 0],
          [100, 100],
        ]),
      },
    ]) {
      expect(resolveSectionEdge({ edge: 'diagonal', composedEdge: edge })).toEqual(old)
    }
    // Task 2 shows the field through its one editor; the Design tab it sits in is already agency only.
    expect(composedEdgeField).not.toHaveProperty('hidden')
    expect(composedEdgeField.options).toMatchObject({ edgeEditor: true })
  })

  it('closes the opening if a reference cannot be resolved and hides a locked member’s payload', async () => {
    const missing = {
      ...imageRule,
      centre: { kind: 'image', image: { asset: { _ref: 'missing' } } },
    }
    const doc = parseHtml(await scenes(missing))
    expect(doc.querySelector('[data-composed-edge-centre]')).toBeNull()
    expect(doc.querySelectorAll('[data-composed-edge-artwork=all] clipPath rect')).toHaveLength(1)
    const restricted = await fromStore([
      { ...richText('member', 'surface', 'Private', waves), access: 'members' },
    ])
    expect(restricted[0]).not.toHaveProperty('style')
  })

  describe('when no paint layer is left', () => {
    const bare = { ...waves, layers: waves.layers.map((layer) => ({ ...layer, opacity: 0 })) }

    it('drops the centre, and a transition still draws its cut, shadow and overlap', async () => {
      expect(resolveComposedEdge(bare)).toMatchObject({
        layers: [],
        cut: resolveComposedEdge(waves)?.cut,
      })
      expect(resolveComposedEdge(bare)).not.toHaveProperty('centre')
      for (const edge of [bare, { ...waves, layers: undefined }]) {
        const doc = parseHtml(await scenes(edge))
        expect(doc.querySelector('[data-section-edge-frame=composed]')).toBeTruthy()
        expect(
          doc.querySelector('[data-composed-edge-artwork], [data-composed-edge-centre]'),
        ).toBeNull()
        expect(doc.querySelector('[data-composed-edge-shadow]')).toBeTruthy()
        expect(doc.querySelector('[data-edge-above] #lower')).toBeTruthy()
      }
    })

    it('keeps a rule’s band as empty space, with nothing drawn in it', async () => {
      const doc = parseHtml(await scenes({ ...bare, mode: 'rule' }))
      expect(doc.querySelector('[data-composed-edge-rule]')).toBeTruthy()
      expect(
        doc.querySelector('[data-composed-edge-artwork], [data-composed-edge-centre]'),
      ).toBeNull()
    })
  })

  it('flattens a layer moved past the band’s edge against it, and never moves the cut or the shadow', () => {
    const low = {
      ...slant,
      contour: contour([
        [0, 80],
        [100, 95],
      ]),
      shadow: { blur: 8, distance: 8, opacity: 30 },
    }
    const moved = (offsetY: number) =>
      resolveComposedEdge({ ...low, layers: [{ _key: 'line', placement: 'stroke', offsetY }] })
    expect(moved(30)?.layers[0]?.path).toBe('M0 1L1 1')
    expect(moved(-30)?.layers[0]?.path).toBe('M0 0.5L1 0.65')
    // Out of range is held to 30% of the band.
    expect(moved(500)?.layers[0]?.path).toBe(moved(30)?.layers[0]?.path)
    for (const offset of [-30, 0, 30, 500]) {
      expect(moved(offset)?.cut).toBe('M0 0.8L1 0.95')
      expect(moved(offset)?.shadow).toEqual({ blur: 0.08, distance: 0.08, opacity: 0.3 })
    }
  })

  it('can never block publishing from the hidden field: every rule on it is a warning', () => {
    // A rule that records the level each validation ends on.
    const levels: string[] = []
    const rule = new Proxy(
      {},
      {
        get:
          (_, method: string) =>
          (..._args: unknown[]) => {
            if (method === 'warning' || method === 'error' || method === 'info') levels.push(method)
            return rule
          },
      },
    )
    let validations = 0
    const visit = (field: { validation?: unknown; fields?: unknown[]; of?: unknown[] }) => {
      if (typeof field.validation === 'function') {
        validations += 1
        const before = levels.length
        ;(field.validation as (r: unknown) => unknown)(rule)
        expect(levels.slice(before)).toEqual(['warning'])
      }
      for (const child of [...(field.fields ?? []), ...(field.of ?? [])])
        visit(child as Parameters<typeof visit>[0])
    }
    visit(composedEdgeField)
    expect(validations).toBeGreaterThan(10)
  })

  it('keeps shadow depth, vertical offset and layer spacing apart, with the saved spacing values kept', () => {
    interface Field {
      name: string
      title?: string
      fields?: Field[]
      of?: Field[]
      options?: { list?: { value: string; title: string }[] }
    }
    const fields = composedEdgeField.fields as unknown as Field[]
    const shadow = fields.find((field) => field.name === 'shadow')
    expect(shadow?.title).toBe('Shadow depth')
    expect(shadow?.fields?.map((field) => field.name)).toEqual(['blur', 'distance', 'opacity'])
    const layer = fields.find((field) => field.name === 'layers')?.of?.[0]
    expect(layer?.fields?.find((field) => field.name === 'offsetY')?.title).toBe('Vertical offset')
    const spacing = (sectionStyle.fields as unknown as Field[]).find(
      (field) => field.name === 'edgeDepth',
    )
    expect(spacing?.title).toBe('Layer spacing')
    expect(spacing?.options?.list?.map(({ value, title }) => `${value}:${title}`)).toEqual([
      'shallow:Close',
      'standard:Standard',
      'deep:Wide',
    ])
    const titles = JSON.stringify(composedEdgeField) + JSON.stringify(spacing)
    expect(titles).not.toMatch(/"title":"Depth"/)
  })

  describe('which edge a section draws through SectionRenderer', () => {
    const page = async (upper: Record<string, unknown>) => {
      const section = richText('upper', 'surface', 'The section above')
      return render(
        await fromStore([
          { ...section, style: { ...section.style, ...upper } },
          richText('lower', 'alt', 'The section below'),
        ]),
      )
    }
    const frameOf = (html: string) =>
      parseHtml(html)
        .querySelector('[data-section-edge-frame]')
        ?.getAttribute('data-section-edge-frame')

    it('draws the composition, not the saved shape, when both are stored', async () => {
      const html = await page({ edge: 'wave', composedEdge: slant })
      const doc = parseHtml(html)
      expect(frameOf(html)).toBe('composed')
      expect(doc.querySelectorAll('[data-section-edge-frame]')).toHaveLength(1)
      expect(doc.querySelector('[data-edge-layer]')).toBeNull()
      expect(doc.querySelector('[data-edge-above] #lower')).toBeTruthy()
    })

    it.each([
      ['an unknown version', { ...slant, version: 2 }],
      [
        'a contour that turns back on itself',
        {
          ...slant,
          contour: contour([
            [0, 10],
            [60, 40],
            [40, 60],
            [100, 90],
          ]),
        },
      ],
      [
        'a layer with no placement',
        { ...slant, layers: [{ _key: 'x', paint: { colour: 'accent' } }] },
      ],
      ['a missing mode', { ...slant, mode: undefined }],
    ])('keeps the saved shape exactly as it was for %s', async (_, composedEdge) => {
      expect(await page({ edge: 'wave', composedEdge })).toBe(await page({ edge: 'wave' }))
    })

    it('stays a straight, unframed section when the composition cannot render and no shape is saved', async () => {
      const html = await page({ composedEdge: { ...slant, version: 2 } })
      expect(html).toBe(await page({}))
      expect(
        parseHtml(html).querySelector('[data-section-edge-frame], [data-edge-above]'),
      ).toBeNull()
    })
  })

  it.runIf(Boolean(process.env.COMPOSED_EDGE_REVIEW_BODY))(
    'exports real SectionRenderer output for local browser review',
    async () => {
      const destination = process.env.COMPOSED_EDGE_REVIEW_BODY
      const examples = [
        { id: 'layered', title: 'Layered gradient and icon', edge: waves },
        { id: 'slant', title: 'Diagonal', edge: slant },
        { id: 'offset', title: 'Offset angular strokes', edge: zigzag },
        { id: 'rule', title: 'Right-aligned rule and image', edge: imageRule },
      ]
      for (const editable of [false, true]) {
        const rows = await Promise.all(
          examples.map(async ({ id, title, edge }) => (
            <article key={id} id={id} className="edge-example">
              <h2>{title}</h2>
              <div className="edge-example-body">
                {renderer(await sceneSections(edge, `${id}-`), editable)}
              </div>
            </article>
          )),
        )
        if (destination)
          writeFileSync(
            editable ? `${destination}.editable` : destination,
            await renderToHtml(<>{rows}</>),
          )
        expect(rows).toHaveLength(4)
      }
    },
  )
})
