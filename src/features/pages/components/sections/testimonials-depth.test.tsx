import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import {
  fixturePictureId,
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '../section-renderer.fixtures'

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

/** Testimonials at a layout, every author with a picture, and whatever extra is stored. */
async function draw(layout: string, extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('testimonials', layout)
  const avatar = {
    _type: 'image',
    alt: 'An author',
    asset: { _type: 'reference', _ref: await fixturePictureId() },
  }
  const items = ((seed.items as Record<string, unknown>[] | undefined) ?? []).map((item) => ({
    ...item,
    avatar,
  }))
  const raw = {
    ...seed,
    variant: layout,
    items,
    avatarDesign: null,
    pictureDepthDesign: null,
    ...extra,
  } as RawSection
  const html = await renderSections(await projectSections([raw]), { belowHeading: true })
  return { html, document: parseHtml(html) }
}

const SOFT_RING = { _type: 'avatarDesign', size: 'large', ring: 'line' }
const GRADIENT_RING = { _type: 'avatarDesign', ring: 'gradient' }
const FLOATING = { _type: 'object', shadow: 'floating', glow: 'soft' }
const UNSET = [
  {},
  { shadow: null, glow: null },
  { shadow: 'flat' },
  { glow: 'off' },
  { shadow: 'flat', glow: 'off' },
  { shadow: 'gigantic', glow: 'blinding' },
]
const AVATARS = {
  'a plain avatar': null,
  'a large ring': SOFT_RING,
  'a gradient ring': GRADIENT_RING,
}

describe.each(['grid', 'slider'])('Testimonials %s: picture depth', (layout) => {
  it('is drawn exactly as before while nothing is chosen, with every kind of avatar', async () => {
    for (const [name, avatarDesign] of Object.entries(AVATARS)) {
      const base = await draw(layout, { avatarDesign })
      expect(base.document.querySelectorAll('[data-profile-image]').length).toBeGreaterThan(0)
      expect(base.html, name).not.toContain('depth-filter')
      for (const stored of UNSET) {
        const same = await draw(layout, { avatarDesign, pictureDepthDesign: stored })
        expect(same.html, `${name} ${JSON.stringify(stored)}`).toBe(base.html)
      }
    }
  })

  it('puts the filter on every avatar’s outer element, whatever its ring', async () => {
    for (const [name, avatarDesign] of Object.entries(AVATARS)) {
      const { document } = await draw(layout, { avatarDesign, pictureDepthDesign: FLOATING })
      const avatars = [...document.querySelectorAll('[data-profile-image]')]
      expect(avatars.length, name).toBeGreaterThan(0)
      for (const avatar of avatars) {
        expect(avatar.className, name).toContain('[filter:var(--depth-filter)]')
        expect(avatar.getAttribute('style'), name).toContain('--depth-picture-floating')
        // Only that element: the picture and the ring inside it are not filtered a second time.
        for (const inner of avatar.querySelectorAll('*')) {
          expect(inner.className, name).not.toContain('depth-filter')
          expect(inner.getAttribute('style') ?? '', name).not.toContain('--depth-filter')
        }
      }
    }
  })

  it('keeps the ring’s variables, shape and the avatar’s place beside the filter', async () => {
    const plain = await draw(layout, { avatarDesign: SOFT_RING })
    const { document } = await draw(layout, {
      avatarDesign: SOFT_RING,
      pictureDepthDesign: FLOATING,
    })
    const before = plain.document.querySelector('[data-profile-image]')
    const after = document.querySelector('[data-profile-image]')
    expect(after?.getAttribute('data-profile-image')).toBe(
      before?.getAttribute('data-profile-image'),
    )
    expect([...(after?.classList ?? [])].filter((name) => !name.includes('depth-filter'))).toEqual([
      ...(before?.classList ?? []),
    ])
    // The ring's own custom properties and radius survive; the filter's variable is added.
    for (const property of ['--ring-width', '--ring-offset', 'border-radius']) {
      expect(after?.getAttribute('style')).toContain(property)
    }
    expect(after?.getAttribute('style')).toContain('--depth-filter')
    expect(after?.querySelector('.image-ring')).not.toBeNull()
  })

  it('draws each level through the shared tokens, and a glow alone, and Floating with Strong glow', async () => {
    const styleOf = async (stored: Record<string, unknown>) =>
      (await draw(layout, { pictureDepthDesign: stored })).document
        .querySelector('[data-profile-image]')
        ?.getAttribute('style')
    expect(await styleOf({ shadow: 'soft' })).toBe('--depth-filter:var(--depth-picture-soft)')
    expect(await styleOf({ shadow: 'raised' })).toBe('--depth-filter:var(--depth-picture-raised)')
    expect(await styleOf({ shadow: 'floating' })).toBe(
      '--depth-filter:var(--depth-picture-floating)',
    )
    expect(await styleOf({ glow: 'strong' })).toMatch(/^--depth-filter:drop-shadow\(0 0 14px/)
    expect(await styleOf({ shadow: 'flat', glow: 'soft' })).toMatch(
      /^--depth-filter:drop-shadow\(0 0 9px/,
    )
    const strong = await styleOf({
      shadow: 'floating',
      glow: 'strong',
      glowColour: { colour: 'highlight' },
    })
    expect(strong).toContain('var(--depth-picture-floating) drop-shadow(0 0 14px')
    expect(strong).toContain('var(--color-highlight')
  })

  it('leaves the avatar’s accessibility semantics unchanged', async () => {
    const before = await draw(layout)
    const after = await draw(layout, { pictureDepthDesign: FLOATING })
    const semantics = (document: Document) =>
      [...document.querySelectorAll('[data-profile-image], [data-profile-image] *')].map((el) =>
        [
          el.tagName,
          el.getAttribute('alt'),
          el.getAttribute('role'),
          el.getAttribute('aria-hidden'),
          el.getAttribute('aria-label'),
          el.getAttribute('tabindex'),
        ].join('|'),
      )
    expect(semantics(after.document)).toEqual(semantics(before.document))
    expect(semantics(after.document).length).toBeGreaterThan(0)
  })

  it('does not touch the card’s own depth, and the card’s depth does not reach the avatar', async () => {
    const card = await draw(layout, { cardDesign: { shadow: 'floating' } })
    expect(card.html).toContain('--depth-shadow')
    expect(card.html).not.toContain('depth-filter')
    const avatar = await draw(layout, { pictureDepthDesign: { shadow: 'floating' } })
    expect(avatar.document.querySelector('figure')?.getAttribute('style') ?? '').not.toContain(
      '--depth-shadow',
    )
  })
})
