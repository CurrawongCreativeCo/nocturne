import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import { events } from '../../../schemas/sections/events'
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

const LAYOUTS = ['list', 'agenda', 'featured'] as const

async function draw(layout: (typeof LAYOUTS)[number], extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('events', layout)
  const raw = { ...seed, ...extra } as RawSection
  return parseHtml(await renderSections(await projectSections([raw]), { belowHeading: true }))
}

const roles = (document: Document, role: string) => [
  ...document.querySelectorAll(`[data-text-role="${role}"]`),
]

describe.each(LAYOUTS)('Events on the %s layout', (layout) => {
  it('draws its title, meta and body in their own roles', async () => {
    const document = await draw(layout)
    expect(roles(document, 'title').length).toBeGreaterThan(0)
    expect(roles(document, 'meta').length).toBeGreaterThan(0)
    expect(roles(document, 'body').length).toBeGreaterThan(0)
  })

  it('applies the Cards box’s text to every event, in each role', async () => {
    const document = await draw(layout, {
      cardDesign: {
        title: { weight: 'regular' },
        meta: { size: 'large' },
        body: { size: 'small' },
      },
    })
    for (const title of roles(document, 'title')) expect(title.className).toContain('font-normal')
    for (const meta of roles(document, 'meta')) expect(meta.className).toContain('text-body')
    for (const body of roles(document, 'body')) expect(body.className).toContain('text-small')
  })

  it('draws the header in its own roles inside the div it always had', async () => {
    const document = await draw(layout, { eyebrow: 'What’s on', text: 'An intro.' })
    expect(roles(document, 'eyebrow')[0]?.textContent).toBe('What’s on')
    expect(roles(document, 'intro')[0]?.parentElement?.tagName).toBe('DIV')
    expect(roles(document, 'intro')[0]?.parentElement?.className).toContain('mb-12')
  })
})

describe('Events’ header', () => {
  it('spaces the intro under a title and draws it as lead text (the old class had no space)', async () => {
    const document = await draw('list', { title: 'What’s on', text: 'An intro.' })
    const classes = roles(document, 'intro')[0]?.className.split(' ')
    expect(classes).toContain('mt-4')
    expect(classes).toContain('text-lead')
    expect(classes).not.toContain('mt-4text-lead')
  })

  it('needs no margin on an intro with no title above it', async () => {
    const document = await draw('list', { title: null, heading: null, text: 'An intro.' })
    expect(roles(document, 'intro')[0]?.className).toBe('text-lead text-pretty text-ink-muted')
  })
})

describe('Events: the card only Featured draws', () => {
  const design = { border: 'thick', mark: { kind: 'icon', icon: 'heart' } }

  it('gives the featured card its fill, border and mark, and no row any', async () => {
    const document = await draw('featured', { cardDesign: design })
    const card = document.querySelector('article')
    expect(card?.className).toContain('ring-3')
    expect(card?.firstElementChild?.getAttribute('data-decorative-mark')).toBe('card')
    expect(document.querySelectorAll('[data-decorative-mark]')).toHaveLength(1)
    for (const row of document.querySelectorAll('ul.divide-y > li')) {
      expect(row.className).not.toContain('ring-3')
    }
  })

  it.each(['list', 'agenda'] as const)(
    'draws no card, border or mark on %s, whatever is stored',
    async (layout) => {
      const document = await draw(layout, { cardDesign: design })
      expect(document.querySelector('article')).toBeNull()
      expect(document.querySelector('[data-decorative-mark="card"]')).toBeNull()
      expect(document.querySelector('.ring-3')).toBeNull()
    },
  )

  it('shows the fill, border and mark controls in Studio only on Featured', () => {
    const box = (
      events.fields as unknown as { name: string; fields?: { name: string; hidden?: unknown }[] }[]
    ).find(({ name }) => name === 'cardDesign')
    const hiddenOn = (variant: string | undefined, name: string) => {
      const field = box?.fields?.find((candidate) => candidate.name === name)
      const context = {
        document: { pageBuilder: [{ _key: 's', _type: 'events', variant }] },
        path: ['pageBuilder', { _key: 's' }, 'cardDesign', name],
      }
      return typeof field?.hidden === 'function'
        ? (field.hidden as (c: unknown) => boolean)(context)
        : undefined
    }
    for (const name of ['background', 'border', 'mark']) {
      expect(hiddenOn(undefined, name), `${name} by default (list)`).toBe(true)
      expect(hiddenOn('agenda', name)).toBe(true)
      expect(hiddenOn('featured', name)).toBe(false)
    }
    // The text roles are for every layout.
    expect(hiddenOn('list', 'title')).toBe(false)
  })
})

describe('Events’ action indicator', () => {
  const arrows = (document: Document) => [...document.querySelectorAll('[data-link-arrow]')]

  it('keeps the List’s own chevron, nudge and small-screen hiding when nothing is chosen', async () => {
    const document = await draw('list')
    const chevrons = arrows(document)
    expect(chevrons.length).toBeGreaterThan(0)
    for (const chevron of chevrons) {
      expect(chevron.getAttribute('data-link-arrow')).toBe('chevron')
      expect(chevron.querySelector('path')?.getAttribute('d')).toBe('M9 6l6 6-6 6')
      expect(chevron.getAttribute('data-action-motion')).toBe('nudge')
      expect(chevron.getAttribute('data-action-distance')).toBe('legacy-large')
      const classes = chevron.getAttribute('class')?.split(' ') ?? []
      expect(classes).toEqual(expect.arrayContaining(['hidden', 'sm:block', 'mt-5', 'size-6']))
      expect(chevron.getAttribute('aria-hidden')).toBe('true')
      // The row is the group the indicator moves with, and its one link is the stretched title link.
      expect(chevron.closest('li')?.className).toContain('group')
      expect(chevron.closest('li')?.querySelectorAll('a')).toHaveLength(1)
    }
  })

  it('draws nothing on Featured or the Agenda when nothing is chosen', async () => {
    expect(arrows(await draw('featured'))).toHaveLength(0)
    expect(arrows(await draw('agenda'))).toHaveLength(0)
    expect((await draw('featured')).querySelector('article')?.className).not.toContain('group')
  })

  it('draws the chosen glyph on every linked Featured card and row, in one group each', async () => {
    const document = await draw('featured', {
      cardDesign: { actionStyle: 'arrow', actionColour: { colour: 'accent' } },
    })
    const found = arrows(document)
    expect(found.length).toBeGreaterThan(0)
    for (const arrow of found) {
      expect(arrow.getAttribute('data-link-arrow')).toBe('arrow')
      expect(arrow.getAttribute('data-action-motion')).toBe('nudge')
      expect(arrow.getAttribute('data-action-distance')).toBe('standard')
      expect(arrow.getAttribute('style')).toContain('color')
      const card = arrow.closest('.group')
      expect(card?.querySelectorAll('a')).toHaveLength(1)
    }
  })

  it('takes a motion choice, and None keeps it still', async () => {
    const lift = await draw('list', { cardDesign: { actionMotion: 'lift' } })
    expect(arrows(lift)[0]?.getAttribute('data-action-motion')).toBe('lift')
    expect(arrows(lift)[0]?.getAttribute('data-action-distance')).toBe('standard')
    const still = await draw('list', { cardDesign: { actionMotion: 'none' } })
    expect(arrows(still)[0]?.hasAttribute('data-action-motion')).toBe(false)
  })

  it('lets the List drop its chevron with None, and never draws on the Agenda', async () => {
    expect(arrows(await draw('list', { cardDesign: { actionStyle: 'none' } }))).toHaveLength(0)
    expect(arrows(await draw('agenda', { cardDesign: { actionStyle: 'arrow' } }))).toHaveLength(0)
  })
})

describe('Events depth and glow', () => {
  const card = (document: Document) => document.querySelector('article.relative.rounded-card')
  const depthOf = (element: Element | null) =>
    element?.getAttribute('style')?.match(/--depth-shadow:([^;]*)/)?.[1]

  it('keeps the featured card’s shadow until a level is chosen', async () => {
    const element = card(await draw('featured'))
    expect(element?.className).toContain('shadow-(--card-depth,var(--shadow-card))')
    expect(depthOf(element)).toBeUndefined()
  })

  it('draws a chosen level and glow on the featured card', async () => {
    const element = card(
      await draw('featured', { cardDesign: { shadow: 'raised', glow: 'strong' } }),
    )
    expect(element?.className).toContain('shadow-(--depth-shadow)')
    expect(depthOf(element)).toMatch(/^var\(--shadow-raised\), var\(--depth-glow-strong\)/)
  })

  it('draws no card, so no depth, on the list and agenda layouts', async () => {
    for (const layout of ['list', 'agenda'] as const) {
      const document = await draw(layout, { cardDesign: { shadow: 'floating' } })
      expect(card(document)).toBeNull()
      expect(document.body.innerHTML).not.toContain('--depth-shadow')
    }
  })
})
