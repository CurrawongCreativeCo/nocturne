import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import { location } from '../../../schemas/sections/location'
import {
  fixturePictureId,
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '../../section-renderer.fixtures'

vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', { src: props.src, className: props.className, alt: '' }),
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

async function draw(extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('location', null)
  const raw = { ...seed, mapImage: null, ...extra } as RawSection
  return parseHtml(await renderSections(await projectSections([raw]), { belowHeading: true }))
}
const withPicture = async () => ({
  mapImage: {
    _type: 'image',
    alt: 'Map',
    asset: { _type: 'reference', _ref: await fixturePictureId() },
  },
})
const panels = (document: Document) => [...document.querySelectorAll('div.rounded-card.p-8')]
const ACCENT = { colour: { colour: 'accent' } }

describe('Location: the details on cards, without a map image', () => {
  it('keeps its panels and the accent rule on the first, with nothing set', async () => {
    const [first, second] = panels(await draw())
    expect(first?.className).toBe(
      'rounded-card bg-surface-alt p-8 shadow-(--card-depth,0_0_#0000) ring-1 ring-line border-t-4 border-accent',
    )
    expect(second?.className.trim()).toBe(
      'rounded-card bg-surface-alt p-8 shadow-(--card-depth,0_0_#0000) ring-1 ring-line',
    )
  })

  it('takes the fill, border and mark on every panel, keeping the accent rule', async () => {
    const document = await draw({
      cardDesign: { border: 'thick', mark: { kind: 'icon', icon: 'heart' } },
    })
    const found = panels(document)
    expect(found.length).toBeGreaterThan(1)
    for (const panel of found) {
      expect(panel.className).toContain('ring-3')
      expect(panel.firstElementChild?.getAttribute('data-decorative-mark')).toBe('card')
    }
    expect(found[0]?.className).toContain('border-t-4 border-accent')
  })
})

describe('Location: beside a map image, where the details have no card', () => {
  it('draws no panel, border or mark, whatever is stored', async () => {
    const document = await draw({
      ...(await withPicture()),
      cardDesign: { border: 'thick', mark: { kind: 'icon', icon: 'heart' } },
    })
    expect(panels(document)).toHaveLength(0)
    expect(document.querySelector('[data-decorative-mark]')).toBeNull()
    expect(document.querySelector('.ring-3')).toBeNull()
  })

  it('still takes the text roles', async () => {
    const document = await draw({
      ...(await withPicture()),
      cardDesign: { title: { size: 'large' } },
    })
    const titles = [...document.querySelectorAll('[data-text-role="title"]')]
    expect(titles.length).toBeGreaterThan(0)
    for (const title of titles) expect(title.className).toContain('text-h3')
  })
})

describe('Location: a chosen role reaches text that sets its own classes', () => {
  it('colours the address lines, which are muted of their own', async () => {
    const plain = await draw()
    expect(plain.querySelector('address span:last-child')?.className).toBe('block text-ink-muted')
    const coloured = await draw({ cardDesign: { body: ACCENT } })
    expect(coloured.querySelector('address')?.getAttribute('style')).toContain('color:')
    expect(coloured.querySelector('address span:last-child')?.className).toBe('block')
  })

  it('colours and weights the contact links, which set their own', async () => {
    const plain = (await draw()).querySelector('a[href^="tel:"]')
    expect(plain?.className).toContain('font-medium')
    expect(plain?.className).toContain('text-ink')
    const chosen = (
      await draw({ cardDesign: { body: { ...ACCENT, weight: 'regular' } } })
    ).querySelector('a[href^="tel:"]')
    expect(chosen?.className).not.toContain('font-medium')
    expect(chosen?.className).not.toContain('text-ink')
    expect(chosen?.className).toContain('underline')
  })

  it('takes the hours’ size and colour on the list, over the rows’ own', async () => {
    const plain = (await draw()).querySelector('[data-text-role="meta"]')
    expect(plain?.className).toContain('text-small')
    expect(plain?.querySelector('dd')?.className).toContain('text-ink')
    const chosen = (
      await draw({ cardDesign: { meta: { ...ACCENT, size: 'large' } } })
    ).querySelector('[data-text-role="meta"]')
    expect(chosen?.className).toContain('text-body')
    expect(chosen?.getAttribute('style')).toContain('color:')
    expect(chosen?.querySelector('dd')?.className ?? '').not.toContain('text-ink')
  })
})

describe('Location’s Studio controls', () => {
  interface Field {
    name: string
    hidden?: unknown
    fields?: Field[]
  }
  const box = (location.fields as unknown as Field[]).find(({ name }) => name === 'cardDesign')
  const hiddenWith = (mapImage: unknown, name: string) =>
    (box?.fields?.find((field) => field.name === name)?.hidden as (c: unknown) => boolean)({
      document: { pageBuilder: [{ _key: 's', _type: 'location', mapImage }] },
      path: ['pageBuilder', { _key: 's' }, 'cardDesign', name],
    })

  it('offers the fill, border and mark only when the details draw cards', () => {
    for (const name of ['background', 'border', 'mark']) {
      expect(hiddenWith(undefined, name)).toBe(false)
      expect(hiddenWith({ asset: { _ref: 'x' } }, name)).toBe(true)
    }
    expect(hiddenWith({ asset: { _ref: 'x' } }, 'title')).toBe(false)
  })
})

describe('Location depth and glow', () => {
  const depthOf = (card: Element | undefined) =>
    card?.getAttribute('style')?.match(/--depth-shadow:([^;]*)/)?.[1]

  it('draws no shadow of its own, reading the site’s Card depth only when one is chosen', async () => {
    const found = panels(await draw())
    expect(found.length).toBeGreaterThan(0)
    for (const card of found) {
      expect(card.className).toContain('shadow-(--card-depth,0_0_#0000)')
      expect(depthOf(card)).toBeUndefined()
    }
  })

  it('draws a chosen level and glow on every card, in place of the site’s depth', async () => {
    for (const card of panels(await draw({ cardDesign: { shadow: 'raised', glow: 'soft' } }))) {
      expect(card.className).toContain('shadow-(--depth-shadow)')
      expect(depthOf(card)).toMatch(/^var\(--shadow-raised\), var\(--depth-glow-soft\)/)
    }
  })
})
