import { createElement, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { parseHtml } from '@/lib/design/capability-harness'

import {
  gallerySeed,
  projectSections,
  renderSections,
  type RawSection,
} from '../section-renderer.fixtures'

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

async function banner(extra: Record<string, unknown> = {}) {
  const seed = await gallerySeed('ctaBanner', null)
  const raw = { ...seed, ...extra } as RawSection
  const document = parseHtml(
    await renderSections(await projectSections([raw]), { belowHeading: true }),
  )
  return document.querySelector('div.rounded-panel')
}
const depthOf = (card: Element | null) =>
  card?.getAttribute('style')?.match(/--depth-shadow:([^;]*)/)?.[1]

describe('CTA banner depth and glow', () => {
  it('draws no shadow of its own, reading the site’s Card depth only when one is chosen', async () => {
    const card = await banner()
    expect(card?.className).toContain('shadow-(--card-depth,0_0_#0000)')
    expect(depthOf(card)).toBeUndefined()
  })

  it('draws a chosen level and glow on the card, in place of the site’s depth', async () => {
    const card = await banner({ cardDesign: { shadow: 'floating', glow: 'strong' } })
    expect(card?.className).toContain('shadow-(--depth-shadow)')
    expect(card?.className).not.toContain('--card-depth')
    expect(depthOf(card)).toMatch(/^var\(--shadow-floating\), var\(--depth-glow-strong\)/)
  })

  it('keeps an explicit Soft through its own token', async () => {
    expect(depthOf(await banner({ cardDesign: { shadow: 'soft' } }))).toBe(
      'var(--shadow-soft, var(--shadow-card))',
    )
  })
})
