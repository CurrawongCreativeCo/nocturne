import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import {
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '../../section-renderer.fixtures'

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-06T09:00:00+11:00'))
})
vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', {
      src: props.src,
      className: props.className,
      style: props.style,
      alt: '',
    }),
}))
vi.mock('next/dynamic', async () => {
  const { lazy } = await import('react')
  return {
    default: (load: () => Promise<unknown>) =>
      lazy(async () => {
        const loaded = (await load()) as { default?: ComponentType } | undefined
        return { default: (loaded?.default ?? loaded) as ComponentType }
      }),
  }
})
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }))
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

type Projected = Awaited<ReturnType<typeof projectSections>>[number]

/** The Featured layout, with whatever extra is stored, and optionally every event's picture taken away. */
async function draw(extra: Record<string, unknown> = {}, options: { noPictures?: boolean } = {}) {
  const seed = await gallerySeed('events', 'featured')
  const raw = { ...seed, variant: 'featured', pictureDepthDesign: null, ...extra } as RawSection
  const [section] = await projectSections([raw])
  const shown = (
    options.noPictures && section && 'events' in section
      ? {
          ...section,
          events: (section.events as { image?: unknown }[]).map((e) => ({ ...e, image: null })),
        }
      : section
  ) as Projected
  const html = await renderSections([shown], { belowHeading: true })
  return { html, document: parseHtml(html) }
}

const FLOATING = { _type: 'object', shadow: 'floating', glow: 'soft' }
const UNSET = [
  {},
  { shadow: null, glow: null },
  { shadow: 'flat' },
  { glow: 'off' },
  { shadow: 'flat', glow: 'off' },
  { shadow: 'gigantic', glow: 'blinding' },
]
const card = (document: Document) => document.querySelector('article')
const slot = (document: Document) => card(document)?.firstElementChild

describe('Events Featured: picture depth', () => {
  it('is drawn exactly as before while nothing is chosen, however it is stored empty', async () => {
    const base = await draw()
    expect(card(base.document)?.querySelector('img')).not.toBeNull()
    expect(base.html).not.toContain('depth-filter')
    for (const stored of UNSET) {
      const same = await draw({ pictureDepthDesign: stored })
      expect(same.html, JSON.stringify(stored)).toBe(base.html)
    }
  })

  it('insets the picture by the room its depth needs, inside the 16:9 space it already has', async () => {
    const expected = {
      soft: [{ shadow: 'soft' }, '4px 8px 5px'],
      raised: [{ shadow: 'raised' }, '6px 16px 12px'],
      floating: [{ shadow: 'floating' }, '12px 28px 19.5px'],
      'a strong glow': [{ glow: 'strong' }, '22px 22px 2.75px'],
      'floating and a strong glow': [{ shadow: 'floating', glow: 'strong' }, '24px 34px 14.25px'],
    } as const
    for (const [name, [stored, padding]] of Object.entries(expected)) {
      const { document } = await draw({ pictureDepthDesign: stored })
      expect(slot(document)?.className, name).toBe('aspect-video')
      expect(slot(document)?.getAttribute('style'), name).toBe(`padding:${padding}`)
    }
  })

  it('keeps the picture 16:9, gives it the card’s corners and puts the filter on it', async () => {
    const { document } = await draw({ pictureDepthDesign: FLOATING })
    const img = slot(document)?.querySelector('img')
    expect(img?.className).toContain('aspect-video')
    expect(img?.className).toContain('rounded-card')
    expect(img?.className).toContain('[filter:var(--depth-filter)]')
    expect(img?.getAttribute('style')).toContain('--depth-picture-floating')
    // The slot is the one element between the card and the picture, and the text block still follows it.
    expect(card(document)?.children[1]?.className).toBe('p-6 sm:p-8')
  })

  it('leaves the card’s own classes, style and surface exactly as they were', async () => {
    const before = await draw()
    const after = await draw({ pictureDepthDesign: FLOATING })
    expect(card(after.document)?.className).toBe(card(before.document)?.className)
    expect(card(after.document)?.getAttribute('style')).toBe(
      card(before.document)?.getAttribute('style'),
    )
    expect(card(after.document)?.children.length).toBe(card(before.document)?.children.length)
  })

  it('does nothing without a picture: the date badge stays, and no filter or inset is drawn', async () => {
    const plain = await draw({}, { noPictures: true })
    const withDepth = await draw({ pictureDepthDesign: FLOATING }, { noPictures: true })
    expect(withDepth.html).toBe(plain.html)
    expect(card(withDepth.document)?.querySelector('img')).toBeNull()
    expect(withDepth.html).not.toContain('depth-filter')
    expect(slot(withDepth.document)?.className).toContain('bg-surface-alt')
  })

  it('does not touch the card’s own depth, and the card’s depth does not reach the picture', async () => {
    const cardDepth = await draw({ cardDesign: { shadow: 'floating' } })
    expect(cardDepth.html).toContain('--depth-shadow')
    expect(cardDepth.html).not.toContain('depth-filter')
    expect(slot(cardDepth.document)?.getAttribute('style')).toBeNull()
  })

  it('leaves the picture’s accessibility semantics unchanged', async () => {
    const semantics = (document: Document) =>
      [...(card(document)?.querySelectorAll('img') ?? [])].map((el) =>
        [el.getAttribute('alt'), el.getAttribute('role'), el.getAttribute('aria-hidden')].join('|'),
      )
    const before = await draw()
    const after = await draw({ pictureDepthDesign: FLOATING })
    expect(semantics(after.document)).toEqual(semantics(before.document))
    expect(semantics(after.document).length).toBeGreaterThan(0)
  })
})

describe.each(['list', 'agenda'])('Events %s: picture depth', (layout) => {
  it('draws no picture, so a stored picture depth changes nothing', async () => {
    const seed = await gallerySeed('events', layout)
    const base = await renderSections(await projectSections([{ ...seed, variant: layout }]), {
      belowHeading: true,
    })
    const stored = await renderSections(
      await projectSections([{ ...seed, variant: layout, pictureDepthDesign: FLOATING }]),
      { belowHeading: true },
    )
    expect(stored).toBe(base)
    expect(stored).not.toContain('depth-filter')
  })
})
