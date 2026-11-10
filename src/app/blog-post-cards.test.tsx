import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { VIEW_DRAWERS } from '@/app/design-capability-views'
import { COMPONENT_SCHEMAS, lookupType } from '@/app/design-components'
import { DESIGN_CONTEXTS } from '@/lib/design/capability-design-contexts'
import { parseHtml } from '@/lib/design/capability-harness'
import { privateFields, type SchemaField } from '@/lib/design/schema-capabilities'

vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', {
      src: props.src,
      className: props.className,
      style: props.style,
      alt: props.alt,
    }),
}))
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

const drawer = VIEW_DRAWERS.blogPostCards
async function draw(cardDesign?: Record<string, unknown>) {
  if (!drawer) throw new Error('blogPostCards has no drawer.')
  const state = { ...(await drawer.seed()), settings: cardDesign ? { cardDesign } : {} }
  return parseHtml(await drawer.draw(state))
}

/** A card with a picture depth from Blog settings (task 147), and optionally no main image. */
async function drawDepth(settings: Record<string, unknown>, options: { noPicture?: boolean } = {}) {
  if (!drawer) throw new Error('blogPostCards has no drawer.')
  const seed = (await drawer.seed()) as { post: Record<string, unknown> }
  const post = options.noPicture ? { ...seed.post, mainImage: undefined } : seed.post
  const html = await drawer.draw({ ...seed, post, settings })
  return { html, document: parseHtml(html) }
}

describe('a post card with nothing in Blog settings', () => {
  it('draws what it always drew: no surface, no mark and its own classes', async () => {
    const document = await draw()
    const card = document.querySelector('article')
    expect(card?.className).toBe('group relative flex h-full flex-col')
    expect(card?.getAttribute('style')).toBeNull()
    expect(document.querySelector('[data-decorative-mark]')).toBeNull()
    expect(document.querySelector('[data-text-role="meta"]')?.className).toBe(
      'mt-4 text-small text-ink-muted',
    )
    expect(document.querySelector('[data-text-role="title"]')?.className).toBe(
      'mt-2 text-h4 font-semibold text-balance',
    )
    expect(document.querySelector('[data-text-role="body"]')?.className).toBe('mt-2 text-ink-muted')
    // No indicator, and the title link's hover underline is still the card's own feedback.
    expect(document.querySelector('[data-link-arrow]')).toBeNull()
    expect(document.querySelector('article a')?.className).toBe(
      'group-hover:underline after:absolute after:inset-0',
    )
  })
})

describe('a post card’s action indicator', () => {
  it('is drawn when Blog settings chooses a glyph, inside the card’s group, with one link', async () => {
    const document = await draw({ actionStyle: 'arrow', actionColour: { colour: 'accent' } })
    const arrow = document.querySelector('article [data-link-arrow]')
    expect(arrow?.getAttribute('data-link-arrow')).toBe('arrow')
    expect(arrow?.getAttribute('aria-hidden')).toBe('true')
    expect(arrow?.getAttribute('data-action-motion')).toBe('nudge')
    expect(arrow?.getAttribute('data-action-distance')).toBe('standard')
    expect(arrow?.getAttribute('style')).toContain('color')
    expect(arrow?.closest('.group')?.tagName).toBe('ARTICLE')
    expect(document.querySelectorAll('article a')).toHaveLength(1)
    expect(document.querySelector('article a')?.className).toContain('after:inset-0')
  })

  it('takes a motion, and None keeps it still', async () => {
    const lift = await draw({ actionStyle: 'chevron', actionMotion: 'lift' })
    expect(lift.querySelector('[data-link-arrow]')?.getAttribute('data-action-motion')).toBe('lift')
    const still = await draw({ actionStyle: 'chevron', actionMotion: 'none' })
    expect(still.querySelector('[data-link-arrow]')?.hasAttribute('data-action-motion')).toBe(false)
  })
})

describe('a post card with a design', () => {
  it('gains its corners and padding only when a fill or border is chosen', async () => {
    const card = (await draw({ border: 'thin' })).querySelector('article')
    expect(card?.className).toContain('rounded-card p-4')
    expect(card?.className).toContain('ring-1')
    const textOnly = (await draw({ title: { size: 'large' } })).querySelector('article')
    expect(textOnly?.className).toBe('group relative flex h-full flex-col')
  })

  it('takes each role on its own element', async () => {
    const document = await draw({
      meta: { weight: 'semibold' },
      title: { size: 'large' },
      body: { size: 'small' },
    })
    expect(document.querySelector('[data-text-role="meta"]')?.className).toContain('font-semibold')
    expect(document.querySelector('[data-text-role="title"]')?.className).toContain('text-h3')
    expect(document.querySelector('[data-text-role="body"]')?.className).toContain('text-small')
  })

  it('draws a mark behind the card’s text', async () => {
    const card = (await draw({ mark: { kind: 'icon', icon: 'heart' } })).querySelector('article')
    expect(card?.className).toContain('isolate')
    expect(card?.firstElementChild?.getAttribute('data-decorative-mark')).toBe('card')
  })
})

describe('a post card’s depth and glow', () => {
  const depthOf = (card: Element | null) =>
    card?.getAttribute('style')?.match(/--depth-shadow:([^;]*)/)?.[1]

  it('draws no shadow class while it has no fill or border, whatever depth is chosen', async () => {
    const card = (await draw({ shadow: 'floating', glow: 'soft' })).querySelector('article')
    expect(card?.className).toBe('group relative flex h-full flex-col')
    expect(depthOf(card ?? null)).toBeUndefined()
  })

  it('reads the site’s Card depth once a border is chosen, and nothing before one is', async () => {
    const card = (await draw({ border: 'thin' })).querySelector('article')
    expect(card?.className).toContain('shadow-(--card-depth,0_0_#0000)')
    expect(depthOf(card ?? null)).toBeUndefined()
  })

  it('draws a chosen level and glow once it has a surface, in place of the site’s depth', async () => {
    const card = (await draw({ border: 'thin', shadow: 'raised', glow: 'strong' })).querySelector(
      'article',
    )
    expect(card?.className).toContain('shadow-(--depth-shadow)')
    expect(card?.className).not.toContain('--card-depth')
    expect(depthOf(card ?? null)).toMatch(/^var\(--shadow-raised\), var\(--depth-glow-strong\)/)
  })

  it('draws none on a transparent card', async () => {
    const card = (
      await draw({ background: { colour: 'transparent' }, shadow: 'raised' })
    ).querySelector('article')
    expect(card?.className).not.toContain('shadow-')
  })
})

describe('a post card’s hover lift', () => {
  it('draws no lift wrapper until Lift is chosen, and None keeps the card as it was', async () => {
    for (const design of [undefined, { lift: 'none' }]) {
      expect((await draw(design)).querySelector('.card-lift')).toBeNull()
    }
  })

  it('wraps the card, which is one link, in the lift block when Lift is chosen', async () => {
    const document = await draw({ lift: 'lift' })
    const wrapper = document.querySelector('.card-lift')
    expect(wrapper?.querySelector(':scope > .card-lift__shadow')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
    expect(wrapper?.querySelectorAll('article a')).toHaveLength(1)
  })
})

describe('Blog settings in the contract', () => {
  const schema = COMPONENT_SCHEMAS.get('blogPostCards')

  it('is a field of the listing’s schema, in the design group, and a registered context', () => {
    const settings = schema?.fields?.find(({ name }) => name === 'settings')
    expect(settings).toMatchObject({ type: 'blogSettings', group: 'design' })
    expect(DESIGN_CONTEXTS).toContainEqual(
      expect.objectContaining({ component: 'blogPostCards', path: 'settings', reviewer: 'owner' }),
    )
  })

  it('holds no private design control, and would refuse one', () => {
    if (!schema) throw new Error('blogPostCards has no schema.')
    expect(privateFields(schema, lookupType, [], DESIGN_CONTEXTS)).toEqual([])
    const real = lookupType('blogSettings')
    const withPrivate = (name: string): SchemaField | undefined =>
      name === 'blogSettings' && real
        ? { ...real, fields: [...(real.fields ?? []), { name: 'cardTint', type: 'string' }] }
        : lookupType(name)
    expect(privateFields(schema, withPrivate, [], DESIGN_CONTEXTS)).toEqual([
      { path: 'settings.cardTint', problem: 'unbuilt' },
    ])
  })
})

describe('a post card’s picture depth (Blog settings › Post card pictures)', () => {
  const FLOATING = { shadow: 'floating', glow: 'soft' }
  const UNSET = [
    {},
    { shadow: null, glow: null },
    { shadow: 'flat' },
    { glow: 'off' },
    { shadow: 'flat', glow: 'off' },
    { shadow: 'gigantic', glow: 'blinding' },
  ]
  const picture = (document: Document) => document.querySelector('article img')

  it('is drawn exactly as before while nothing is chosen, however it is stored empty', async () => {
    const base = await drawDepth({})
    expect(picture(base.document)).not.toBeNull()
    expect(base.html).not.toContain('depth-filter')
    for (const stored of UNSET) {
      const same = await drawDepth({ pictureDepthDesign: stored })
      expect(same.html, JSON.stringify(stored)).toBe(base.html)
    }
  })

  it('puts the filter on the picture, keeping its shape classes first, and nowhere else', async () => {
    const { document } = await drawDepth({ pictureDepthDesign: FLOATING })
    const img = picture(document)
    expect(img?.className).toBe(
      'aspect-video w-full rounded-card object-cover [filter:var(--depth-filter)]',
    )
    expect(img?.getAttribute('style')).toContain('--depth-picture-floating')
    // Not the card, not its link, not its text.
    const card = document.querySelector('article')
    expect(card?.className).toBe('group relative flex h-full flex-col')
    expect(card?.getAttribute('style')).toBeNull()
    expect(
      document.querySelectorAll('[class*="depth-filter"], [style*="depth-filter"]'),
    ).toHaveLength(1)
  })

  it('draws each level through the shared tokens, a glow alone and a glow colour', async () => {
    const styleOf = async (stored: Record<string, unknown>) =>
      picture((await drawDepth({ pictureDepthDesign: stored })).document)?.getAttribute('style')
    expect(await styleOf({ shadow: 'soft' })).toBe('--depth-filter:var(--depth-picture-soft)')
    expect(await styleOf({ shadow: 'raised' })).toBe('--depth-filter:var(--depth-picture-raised)')
    expect(await styleOf({ shadow: 'floating' })).toBe(
      '--depth-filter:var(--depth-picture-floating)',
    )
    expect(await styleOf({ glow: 'strong' })).toMatch(/^--depth-filter:drop-shadow\(0 0 14px/)
    expect(await styleOf({ glow: 'soft', glowColour: { colour: 'highlight' } })).toContain(
      'var(--color-highlight',
    )
  })

  it('needs no card surface, and is separate from the card’s own depth', async () => {
    // No fill or border: the card draws nothing of its own, and the picture still has its shadow.
    const bare = await drawDepth({ pictureDepthDesign: FLOATING })
    expect(picture(bare.document)?.className).toContain('[filter:var(--depth-filter)]')
    // A surfaced card with its own Floating depth: the card's shadow is its own, the picture's is its own.
    const both = await drawDepth({
      cardDesign: { border: 'thin', shadow: 'raised' },
      pictureDepthDesign: { shadow: 'floating' },
    })
    expect(both.document.querySelector('article')?.getAttribute('style')).toContain(
      '--depth-shadow',
    )
    expect(both.document.querySelector('article')?.getAttribute('style')).not.toContain(
      'depth-filter',
    )
    expect(picture(both.document)?.getAttribute('style')).toContain('--depth-picture-floating')
    expect(picture(both.document)?.getAttribute('style')).not.toContain('--depth-shadow')
    // The card's own depth does not reach the picture without a picture depth.
    const cardOnly = await drawDepth({ cardDesign: { border: 'thin', shadow: 'floating' } })
    expect(picture(cardOnly.document)?.getAttribute('style')).toBeNull()
  })

  it('leaves a card with no picture exactly as it was', async () => {
    const plain = await drawDepth({}, { noPicture: true })
    const stored = await drawDepth({ pictureDepthDesign: FLOATING }, { noPicture: true })
    expect(picture(plain.document)).toBeNull()
    expect(stored.html).toBe(plain.html)
    expect(stored.html).not.toContain('depth-filter')
  })

  it('keeps the card one link, with the same hover feedback, and the picture’s semantics', async () => {
    const before = await drawDepth({})
    const after = await drawDepth({ pictureDepthDesign: FLOATING })
    const describeCard = (document: Document) => [
      document.querySelectorAll('article a').length,
      document.querySelector('article a')?.className,
      document.querySelector('article a')?.getAttribute('href'),
      picture(document)?.getAttribute('alt'),
      picture(document)?.getAttribute('role'),
      picture(document)?.getAttribute('aria-hidden'),
    ]
    expect(describeCard(after.document)).toEqual(describeCard(before.document))
    expect(describeCard(after.document)[0]).toBe(1)
  })
})
