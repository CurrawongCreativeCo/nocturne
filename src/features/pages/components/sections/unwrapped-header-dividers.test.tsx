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

/**
 * The six places `SectionHeader` is drawn with no wrapper (`as={null}`), so the divider can't inherit the
 * section's alignment from a parent and is given it as `dividerBlock` (task 151): a centred section
 * centres the divider (`mx-auto`), a start-aligned one leaves it at the start.
 */
const UNWRAPPED = [
  ['ctaBanner', null],
  ['embed', null],
  ['video', 'embed'],
  ['video', 'ambient'],
  ['logoCloud', 'grid'],
  ['logoCloud', 'marquee'],
] as const

const LINE = { _type: 'decorativeDivider', style: 'line', width: 'short' }

async function dividerOf(type: string, layout: string | null, align: 'center' | 'start') {
  const seed = await gallerySeed(type, layout)
  const raw = {
    ...seed,
    title: 'A title',
    // A heading and an intro in every one of the six, whatever the seed has.
    intro: 'An introduction.',
    text: 'An introduction.',
    style: { ...(seed.style as object | undefined), _type: 'sectionStyle', align },
    headerDesign: { _type: 'object', divider: LINE },
  } as RawSection
  const html = await renderSections(await projectSections([raw]), { belowHeading: true })
  return parseHtml(html).querySelector('[data-decorative-divider]')
}

describe('the six headers drawn with no wrapper', () => {
  it.each(UNWRAPPED)('%s %s: the divider centres in a centred section', async (type, layout) => {
    const rule = await dividerOf(type, layout, 'center')
    expect(rule, 'the divider is drawn').not.toBeNull()
    expect(rule?.className).toContain('mx-auto')
  })

  it.each(UNWRAPPED)(
    '%s %s: the divider starts in a start-aligned section',
    async (type, layout) => {
      const rule = await dividerOf(type, layout, 'start')
      expect(rule, 'the divider is drawn').not.toBeNull()
      expect(rule?.className).not.toContain('mx-auto')
    },
  )
})
