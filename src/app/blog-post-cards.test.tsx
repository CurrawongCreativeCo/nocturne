import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { VIEW_DRAWERS } from '@/app/design-capability-views'
import { COMPONENT_SCHEMAS, lookupType } from '@/app/design-components'
import { DESIGN_CONTEXTS } from '@/lib/design/capability-design-contexts'
import { parseHtml } from '@/lib/design/capability-harness'
import { privateFields, type SchemaField } from '@/lib/design/schema-capabilities'

vi.mock('next-sanity/image', () => ({
  Image: (props: Record<string, unknown>) =>
    createElement('img', { src: props.src, className: props.className, alt: '' }),
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
